function convertTo24Hour(time12h) {
  const [time, modifier] = time12h.split(" ");
  let [hours, minutes] = time.split(":");
  if (hours === "12") hours = "00";
  if (modifier === "PM") hours = parseInt(hours, 10) + 12;
  return (hours.length === 1 ? "0" + hours : hours) + ":" + minutes;
}

// Get token & userId from localStorage
function getAuth() {
  return {
    token: localStorage.getItem("token"),
    userId: localStorage.getItem("user_id"),
  };
}

// Get today's date in YYYY-MM-DD
function getToday() {
  return new Date().toISOString().split("T")[0];
}

// Random room image fallback
const getRoomImage = () => {
  const images = [
    "images/brr.jpg",
    "images/mm.jpg",
    "images/mr.jpg",
    "images/hr.jpg",
  ];
  return images[Math.floor(Math.random() * images.length)];
};

// Parse capacity filter
function parseCapacity(value) {
  switch (value) {
    case "2-4 people":
      return { min: 2, max: 4 };
    case "5-8 people":
      return { min: 5, max: 8 };
    case "9-12 people":
      return { min: 9, max: 12 };
    case "13+ people":
      return { min: 13, max: 9999 };
    default:
      return { min: 0, max: 9999 }; // Any
  }
}

// Fetch existing bookings for a room/date
async function fetchExistingBookings(roomId, date) {
  const auth = getAuth();
  try {
    const url = `http://127.0.0.1:8000/api/meetings?room_id=${roomId}&date=${date}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: auth.token ? `Bearer ${auth.token}` : "",
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.data || [];
  } catch (err) {
    console.error("Error fetching bookings:", err);
    return [];
  }
}

// Mark booked time slots in modal
function markBookedSlots(bookings) {
  const bookedSet = new Set();
  bookings.forEach((m) => {
    const start = new Date(m.booking_start);
    bookedSet.add(
      `${String(start.getHours()).padStart(2, "0")}:${String(
        start.getMinutes()
      ).padStart(2, "0")}`
    );
  });

  $(".time-slot").each(function () {
    const t24 = convertTo24Hour($(this).text().trim());
    if (bookedSet.has(t24)) {
      $(this).addClass("booked").off("click");
    } else {
      $(this).removeClass("booked");
    }
  });
}

// ------------------
// Updated renderRooms to filter by selected time
// ------------------
function renderRooms(rooms, selectedStartTime = null) {
  const container = $("#roomsContainer");
  container.empty();

  if (!rooms || !rooms.data || !Array.isArray(rooms.data)) {
    container.append("<p>No rooms found.</p>");
    return;
  }

  rooms.data.forEach((room) => {
    // Skip room if selectedStartTime is set and room doesn't have it
    if (selectedStartTime && !room.available_slots.includes(selectedStartTime))
      return;

    let badgeClass = "badge-success";
    let buttonDisabled = "";
    let badgeText = "Available";
    if (room.available_capacity === 0) {
      badgeClass = "badge-danger";
      buttonDisabled = "disabled";
      badgeText = "Booked";
    } else if (room.available_capacity < room.max_meetings_capacity) {
      badgeClass = "badge-warning";
      badgeText = "Limited";
    }

    const roomHtml = `
      <div class="col-md-6">
        <div class="card room-card">
          <span class="badge ${badgeClass} availability-badge">${badgeText}</span>
          <img src="${
            room.image_url || getRoomImage()
          }" class="card-img-top room-img" alt="${room.name}">
          <div class="card-body">
            <h5 class="card-title">${room.name}</h5>
            <p class="card-text">${
              room.location || "No location available."
            }</p>
            <ul class="room-features">
              <li><i class="tf-ion-ios-people"></i> Room Capacity: ${
                room.capacity
              } people</li>
              ${
                room.features
                  ? room.features
                      .map(
                        (f) =>
                          `<li><i class="${
                            f.icon || "tf-ion-ios-checkmark"
                          }"></i> ${f.name}</li>`
                      )
                      .join("")
                  : ""
              }
            </ul>
            <button class="btn btn-main btn-sm btn-block"
              data-toggle="modal"
              data-target="#bookingModal"
              data-room="${room.name}"
              data-room-id="${room.id}"
              ${buttonDisabled}>${
      buttonDisabled ? "Currently Booked" : "Book Now"
    }</button>
          </div>
        </div>
      </div>
    `;
    container.append(roomHtml);
  });
}

// Fetch rooms with optional filters
async function fetchRooms(filters = {}) {
  const auth = getAuth();
  const params = new URLSearchParams();

  if (filters.date) params.append("date", filters.date);
  if (filters.start_time) params.append("start_time", filters.start_time);
  if (filters.end_time) params.append("end_time", filters.end_time);
  if (filters.capacity_min != null)
    params.append("capacity_min", filters.capacity_min);
  if (filters.capacity_max != null)
    params.append("capacity_max", filters.capacity_max);
  if (filters.feature_id) params.append("feature_id", filters.feature_id);

  const url = `http://127.0.0.1:8000/api/rooms-list?${params.toString()}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: auth.token ? `Bearer ${auth.token}` : "",
      },
    });
    if (!res.ok) return { data: [] };
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error fetching rooms:", err);
    return { data: [] };
  }
}
async function fetchFeatures() {
  const auth = getAuth();
  try {
    const res = await fetch("http://127.0.0.1:8000/api/features", {
      headers: {
        Accept: "application/json",
        Authorization: auth.token ? `Bearer ${auth.token}` : "",
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.data || [];
  } catch (err) {
    console.error("Error fetching features:", err);
    return [];
  }
}
// Populate equipment dropdown
async function populateEquipmentDropdown() {
  const features = await fetchFeatures();
  const select = $("#equipment");
  select.empty();
  select.append('<option value="">Any</option>'); // default option

  features.forEach((f) => {
    select.append(`<option value="${f.id}">${f.name}</option>`);
  });
}

// ------------------
// DOM Ready
// ------------------
$(document).ready(async function () {
  await populateEquipmentDropdown();

  // Populate time selects based on available slots
  async function populateSearchTimes(date) {
    const rooms = await fetchRooms({ date });

    // Collect all available times across all rooms
    let allTimes = new Set();
    rooms.data.forEach((r) => {
      if (r.available_slots) r.available_slots.forEach((t) => allTimes.add(t));
    });

    populateTimeSelect(
      document.getElementById("startTime"),
      Array.from(allTimes).sort()
    );
    populateTimeSelect(
      document.getElementById("endTime"),
      Array.from(allTimes).sort()
    );
  }

  function populateTimeSelect(selectElement, times) {
    selectElement.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select time";
    selectElement.appendChild(placeholder);

    times.forEach((t) => {
      const option = document.createElement("option");
      option.value = t;
      option.textContent = t;
      selectElement.appendChild(option);
    });

    $("#startTime").on("change", function () {
      const start = this.value;
      const endSelect = document.getElementById("endTime");
      const options = Array.from(endSelect.options)
        .map((o) => o.value)
        .filter((v) => v && v > start);
      populateTimeSelect(endSelect, options);
    });
  }

  $("#bookingDate").on("change", function () {
    const date = $(this).val();
    if (!date) return;
    populateSearchTimes(date);
  });

  // Initial populate
  const today = getToday();
  const rooms = await fetchRooms({ date: today });
  renderRooms(rooms);

  // Booking modal open
  $("#bookingModal").on("show.bs.modal", async function (event) {
    const button = $(event.relatedTarget);
    const roomName = button.data("room");
    const roomId = button.data("room-id");
    const modal = $(this);

    modal.find("#selectedRoom").val(roomName);
    modal.data("room-id", roomId);
    modal.find("#modalDate").val(today);
    $("#bookingError").hide().text("");
    $(".time-slot").removeClass("selected");

    const bookings = await fetchExistingBookings(roomId, today);
    markBookedSlots(bookings);
  });

  // Modal date change
  $("#modalDate").on("change", async function () {
    const modal = $("#bookingModal");
    const roomId = modal.data("room-id");
    const date = $(this).val();
    const bookings = await fetchExistingBookings(roomId, date);
    markBookedSlots(bookings);
  });

  // Time-slot selection
  $(document).on("click", ".time-slot:not(.booked)", function () {
    $(".time-slot").removeClass("selected");
    $(this).addClass("selected");
    const time24 = convertTo24Hour($(this).text().trim());
    $("#startTimeModal").val(time24);

    const end = new Date(`1970-01-01T${time24}:00`);
    end.setHours(end.getHours() + 1);
    $("#endTimeModal").val(end.toTimeString().substring(0, 5));
  });

  // Confirm booking
  $("#confirmBooking").on("click", async function () {
    const auth = getAuth();
    if (!auth.token || !auth.userId) {
      alert("You must be logged in to book a room.");
      window.location.href = "login.html";
      return;
    }

    const modal = $("#bookingModal");
    const roomId = modal.data("room-id");
    const date = $("#modalDate").val();
    const start = $("#startTimeModal").val();
    const end = $("#endTimeModal").val();
    const title = $("#meetingTitle").val();
    const agenda = $("#specialRequests").val();

    if (!roomId || !date || !start || !end || !title) {
      $("#bookingError")
        .show()
        .text("Please fill required fields (room/date/time/title).");
      return;
    }

    const existing = await fetchExistingBookings(roomId, date);
    const newStart = new Date(`${date}T${start}:00`);
    const newEnd = new Date(`${date}T${end}:00`);

    for (const m of existing) {
      const s = new Date(m.booking_start);
      const e = new Date(m.booking_end);
      if (!(newEnd <= s || newStart >= e)) {
        $("#bookingError")
          .show()
          .text(
            `Time overlaps with "${m.title || "existing meeting"}" (${
              m.booking_start
            } - ${m.booking_end})`
          );
        return;
      }
    }

    const payload = {
      room_id: roomId,
      organized_by: auth.userId,
      booking_start: `${date}T${start}:00`,
      booking_end: `${date}T${end}:00`,
      title,
      agenda,
      status: "scheduled",
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/api/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (res.ok) {
        $("#bookingError").hide();
        alert("Booking confirmed!");
        $("#bookingModal").modal("hide");
      } else {
        $("#bookingError")
          .show()
          .text(
            body.errors
              ? Object.values(body.errors).flat().join(" | ")
              : body.message || "Booking failed"
          );
      }
    } catch (err) {
      console.error(err);
      $("#bookingError").show().text("Server error. Try again later.");
    }
  });

  // ------------------
  // Updated search form
  // ------------------
  $("#searchForm").on("submit", async function (e) {
    e.preventDefault();
    const date = $("#bookingDate").val() || today;
    const startTime = $("#startTime").val() || "";
    const endTime = $("#endTime").val() || "";
    //const featureId = $('#equipment').val();
    const equipmentSelect = $("#equipment");
    const featureId = equipmentSelect.val() || null;
    const cap = $("#capacity").val();
    const capacityRange = parseCapacity(cap);

    const filters = {
      date,
      start_time: startTime,
      end_time: endTime,
      capacity_min: capacityRange.min,
      capacity_max: capacityRange.max,
      feature_id: featureId,
      //equipment: equipment && equipment !== 'Any' ? equipment : ''
    };

    const rooms = await fetchRooms(filters);
    // if (equipment && equipment !== 'Any') {
    //         rooms.data = rooms.data.filter(room =>
    //             room.features.some(f => f.name.toLowerCase() === equipment.toLowerCase())
    //         );
    //     }

    // Pass startTime to renderRooms so rooms without selected slot are skipped
    renderRooms(rooms, startTime);
  });
});
