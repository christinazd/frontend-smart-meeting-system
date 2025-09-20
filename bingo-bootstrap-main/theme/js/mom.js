const API_BASE = "http://127.0.0.1:8000/api";
const token = localStorage.getItem("token");

document.addEventListener("DOMContentLoaded", init);

async function init() {
  if (!token) {
    console.warn("No token — redirect to login or show anon state");
    return;
  }

  ensureMeetingSelect();
  await loadMeetings();

  const sel = document.getElementById("meetingSelect");
  sel.addEventListener("change", async (e) => {
    const meetingId = e.target.value;
    if (meetingId) {
      const attendees = await loadAttendees(meetingId);
      populateAttendees(attendees);
    } else {
      clearAttendees();
    }
  });

  // document.getElementById('saveDraft').addEventListener('click', saveDraftToServer);
  document
    .getElementById("saveDraft")
    .addEventListener("click", async function () {
      try {
        const meetingId = document.getElementById("meetingSelect").value;
        const roomId =
          document.getElementById("meetingSelect").dataset.roomId || 1;
        const content = document
          .getElementById("agendaEditor")
          .innerText.trim();

        const currentUserId = JSON.parse(localStorage.getItem("user")).id;

        if (!meetingId || !roomId || !currentUserId) {
          alert("Meeting, room, or user ID is missing.");
          return;
        }

        const actionItems = [];
        document
          .querySelectorAll("#actionsContainer .action-item")
          .forEach((item) => {
            const description = item.querySelector(".desc")?.value.trim();
            const assignedTo = item.querySelector(".assignee")?.value || null; // now gets value, not text
            const status =
              item.querySelector(".status-pill")?.dataset.status || "todo";
            const deadline =
              item.querySelector(".deadline-input")?.value || null;
            console.log("Action item:", {
              description,
              assignedTo,
              status,
              deadline,
            });
            if (!description || !status || !deadline) {
              return;
            }

            // Map status string to backend enum
            const statusMap = {
              todo: "pending",
              doing: "in_progress",
              done: "completed",
            };

            actionItems.push({
              description,
              assigned_to: assignedTo ? parseInt(assignedTo) : null, // Convert to integer or null
              status: statusMap[status] || "pending",
              deadline,
            });
          });

        // Build payload
        const payload = {
          meeting_id: meetingId,
          room_id: roomId,
          content: content,
          created_by: currentUserId,
          action_items: actionItems,
        };

        console.log("Saving draft with payload:", payload);

        const response = await fetch(`${API_BASE}/minutes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error(result);
          alert("Failed to save: " + (result.message || "Validation error."));
          return;
        }

        alert("Draft saved successfully!");
        console.log(result);
      } catch (err) {
        console.error(err);
        alert("An unexpected error occurred while saving.");
      }
    });

  document
    .getElementById("finalizeShare")
    .addEventListener("click", finalizeAndShare);
  document
    .getElementById("addAttendeeBtn")
    .addEventListener("click", addSelectedAttendee);
}

// ----- MEETING SELECT -----
function ensureMeetingSelect() {
  if (document.getElementById("meetingSelect")) return;
  const header =
    document.querySelector(".page-header > div") ||
    document.querySelector(".page-header");
  if (!header) return;

  const select = document.createElement("select");
  select.id = "meetingSelect";
  select.className = "form-control";
  select.style.minWidth = "260px";
  select.innerHTML = '<option value="">Select meeting (optional)</option>';
  header.appendChild(select);
}

async function loadMeetings() {
  try {
    const res = await fetch(`${API_BASE}/meetings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed fetching meetings");

    const meetings = await res.json();
    const sel = document.getElementById("meetingSelect");
    sel.innerHTML = '<option value="">Select meeting</option>';

    meetings.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.title || "Untitled"} — ${
        m.booking_start ? new Date(m.booking_start).toLocaleString() : ""
      }`;
      sel.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    document.getElementById("meetingSelect").innerHTML =
      '<option value="">No upcoming meetings</option>';
  }
}

// ----- ATTENDEES -----
async function loadAttendees(meetingId) {
  try {
    const res = await fetch(`${API_BASE}/meetings/${meetingId}/attendees`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load attendees");

    const attendees = await res.json();
    return Array.isArray(attendees) ? attendees : [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

function populateAttendees(attendees) {
  const container = document.getElementById("attendeesList");
  container.innerHTML = "";

  if (!attendees.length) {
    container.innerHTML = '<p class="text-muted">No attendees selected</p>';
    return;
  }

  attendees.forEach((att) => {
    const span = document.createElement("span");
    span.className = "attendee-pill";
    span.dataset.userId = att.user_id || att.id;
    span.dataset.name = att.user?.name || att.name;

    span.innerHTML = `
            <span class="attendee-name">${span.dataset.name}</span>
            <button class="remove" title="Remove">×</button>
        `;

    span.querySelector(".remove").addEventListener("click", () => {
      span.remove();
      const meetingId = document.getElementById("meetingSelect").value;
      if (meetingId) removeAttendeeFromServer(meetingId, span.dataset.userId);
    });

    container.appendChild(span);
  });
}

// async function addSelectedAttendee() {
//   const meetingId = document.getElementById("meetingSelect").value;
//   const dropdown = document.getElementById("attendeesDropdown");
//   const userId = dropdown.value;
//   const name = dropdown.selectedOptions[0]?.textContent;

//   if (!meetingId || !userId)
//     return alert("Select a meeting and attendee first");

//   try {
//     const res = await fetch(`${API_BASE}/meetings/${meetingId}/attendees`, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ attendees: [{ id: userId, name }] }),
//     });

//     if (!res.ok) throw new Error("Failed to add attendee");

//     populateAttendees(await loadAttendees(meetingId));
//   } catch (err) {
//     console.error(err);
//     alert("Error adding attendee");
//   }
// }

// async function removeAttendeeFromServer(meetingId, userId) {
//   try {
//     await fetch(`${API_BASE}/meetings/${meetingId}/attendees/${userId}`, {
//       method: "DELETE",
//       headers: { Authorization: `Bearer ${token}` },
//     });
//   } catch (err) {
//     console.error("Error removing attendee:", err);
//   }
// }

// function clearAttendees() {
//   document.getElementById("attendeesList").innerHTML =
//     '<p class="text-muted">No attendees selected</p>';
// }

// ----- ACTIONS -----
// function collectActions() {
//   return Array.from(document.querySelectorAll(".action-item")).map((ai) => {
//     const descEl = ai.querySelector(".desc");
//     const description = descEl
//       ? descEl.value !== undefined
//         ? descEl.value
//         : descEl.textContent
//       : "";
//     const assignee = ai.querySelector("select.assignee")?.value || "";
//     const status = ai.querySelector(".status-pill")?.dataset.status || "todo";
//     return { description, assignee, status };
//   });
// }

// ----- FILES -----
// function collectFiles() {
//   return Array.from(document.querySelectorAll(".file-card")).map((f) => ({
//     name: f.querySelector(".file-meta > div").textContent,
//   }));
// }

// // ----- COLLECT ALL DATA -----
// function collectDataForSave() {
//   const meetingId = document.getElementById("meetingSelect")?.value || null;
//   const attendees = Array.from(document.querySelectorAll(".attendee-pill")).map(
//     (p) => ({
//       id: p.dataset.userId || null,
//       name: p.dataset.name || p.querySelector(".attendee-name").textContent,
//     })
//   );
//   const agenda = quill.root.innerHTML;
//   const actions = collectActions();
//   const files = collectFiles();

//   return { meetingId, attendees, agenda, actions, files };
// }

// ----- SAVE MOM DRAFT -----
async function saveDraftToServer() {
  const data = collectDataForSave();

  try {
    const payload = {
      meeting_id: data.meetingId,
      content: data.agenda, // <-- agenda goes here
      description: JSON.stringify({ actions: data.actions }),
      status: "draft",
    };
    console.log("Validation error:", result.errors);
    const res = await fetch(`${API_BASE}/minutes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Failed to save draft");

    const mom = await res.json();
    localStorage.setItem(
      "mom_last_saved",
      JSON.stringify({ id: mom.id, time: new Date().toISOString() })
    );
    showToast("Draft saved to server ✔");
    return mom;
  } catch (err) {
    console.error(err);
    alert("Failed to save draft");
  }
}

// ----- FINALIZE & SHARE -----
async function finalizeAndShare() {
  const mom = await saveDraftToServer();
  if (!mom?.id) return alert("Could not create minute on server");

  if (window._momFiles?.length) {
    for (const file of window._momFiles) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("minute_id", mom.id);
      fd.append("meeting_id", mom.meeting_id || "");
      await fetch(`${API_BASE}/attachments`, {
        method: "POST",
        body: fd,
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }

  showToast("Minutes finalized ✔");
  document.getElementById("previewBody").innerHTML = renderPreviewHTML(
    collectDataForSave()
  );
  $("#previewModal").modal("show");
}

// ----- TOAST -----
function showToast(message) {
  // simple toast example
  alert(message);
}
