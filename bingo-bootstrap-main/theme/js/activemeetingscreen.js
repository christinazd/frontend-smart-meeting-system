// js/activemeetingscreen.js
(function () {
  const API_BASE = "http://127.0.0.1:8000/api";
  let token = localStorage.getItem("token") || null;
  let meetingId = null;
  let pollTimer = null;
  const POLL_INTERVAL = 5000; // ms

  // Utility: GET with auth
  async function apiGet(path) {
    const res = await fetch(API_BASE + path, {
      headers: {
        Accept: "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
    });
    return res;
  }

  // Utility: POST with auth & JSON
  async function apiPost(path, payload = {}) {
    const res = await fetch(API_BASE + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(payload),
    });
    return res;
  }

  // Render meeting into DOM
  function renderMeeting(meeting) {
    if (!meeting) {
      document.getElementById("meetingTitle").textContent =
        "No Upcoming Meeting";
      document.getElementById("meetingTime").textContent = "";
      document.getElementById("meetingLocation").textContent = "";
      document.getElementById("meetingStatus").textContent =
        "No Active Meeting";
      document.getElementById("statusDot").style.background = "#dc3545";
      document.getElementById("startMeetingBtn").disabled = true;
      document.getElementById("endMeetingBtn").disabled = true;
      document.getElementById("attendeesList").innerHTML =
        '<p class="p-3 text-muted">No attendees</p>';
      document.getElementById("meetingLinkInput").value = "";
      return;
    }

    meetingId = meeting.id;

    document.getElementById("meetingTitle").textContent =
      meeting.title || "Untitled";
    const start = new Date(meeting.start);
    const end = new Date(meeting.end);
    document.getElementById(
      "meetingTime"
    ).innerHTML = `<i class="tf-ion-ios-clock"></i> ${start.toLocaleDateString()} • ${start.toLocaleTimeString(
      [],
      { hour: "2-digit", minute: "2-digit" }
    )} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    document.getElementById(
      "meetingLocation"
    ).innerHTML = `<i class="tf-ion-ios-location"></i> ${
      meeting.location || ""
    }`;
    document.getElementById("meetingLinkInput").value =
      meeting.link || window.location.href;

    // status
    const status = meeting.status || "scheduled";
    document.getElementById("meetingStatus").textContent =
      status === "active"
        ? "Meeting in Progress"
        : status === "scheduled"
        ? "Scheduled"
        : status;
    document.getElementById("statusDot").style.background =
      status === "active" ? "#28a745" : "#dc3545";
    document.getElementById("startMeetingBtn").disabled = !(
      status === "scheduled"
    );
    document.getElementById("endMeetingBtn").disabled = !(status === "active");

    // attendees
    const attendeesList = document.getElementById("attendeesList");
    attendeesList.innerHTML = "";
    if (meeting.attendees && meeting.attendees.length > 0) {
      document.getElementById("attendeeCount").textContent =
        meeting.attendees.length;
      meeting.attendees.forEach((a) => {
        const div = document.createElement("div");
        div.className = "attendee-item";
        const avatarUrl = a.avatar || "images/attendees/default.jpg";
        div.innerHTML = `<img src="${avatarUrl}" onerror="this.src='images/attendees/default.jpg'"><div><strong>${
          a.name
        }</strong><div class="text-muted small">${a.email || ""}</div></div>`;
        attendeesList.appendChild(div);
      });
    } else {
      document.getElementById("attendeeCount").textContent = 0;
      attendeesList.innerHTML =
        '<p class="p-3 text-muted">No attendees yet</p>';
    }

    // populate invite user selection area (we fetch users lazily)
    fetchAndRenderUsersForInvites();
  }

  // fetch upcoming meeting
  async function fetchUpcoming() {
    if (!token) {
      console.warn("No token found - user likely not authenticated");
      renderMeeting(null);
      return;
    }

    try {
      const res = await apiGet("/meetings/upcoming");
      console.log(res);
      if (res.status === 401) {
        // not auth
        console.warn("Not authenticated (401). Redirect to login if desired.");
        renderMeeting(null);
        return;
      }
      if (res.status === 404) {
        renderMeeting(null);
        return;
      }
      if (!res.ok) {
        console.error("Failed fetching upcoming meeting", res.status);
        renderMeeting(null);
        return;
      }
      const meeting = await res.json();
      renderMeeting(meeting);
    } catch (err) {
      console.error("Network error fetching upcoming meeting", err);
      renderMeeting(null);
    }
  }

  // fetch and render users list for invitations (checkboxes)
  async function fetchAndRenderUsersForInvites() {
    // populate both inline and modal lists
    try {
      const res = await apiGet("/users");
      if (!res.ok) return;
      const users = await res.json();
      // users may be array of objects or resource wrapper
      const list = Array.isArray(users) ? users : users.data || [];

      const container = document.getElementById("inviteUsersSelect");
      const modalContainer = document.getElementById("inviteUsersModalList");
      if (!container || !modalContainer) return;

      container.innerHTML = "";
      modalContainer.innerHTML = "";

      list.forEach((u) => {
        const uid = u.id;
        const label = document.createElement("label");
        label.style.display = "block";
        label.innerHTML = `<input type="checkbox" class="invite-user-checkbox" value="${uid}"> ${u.name} (${u.email})`;
        container.appendChild(label);

        const labelModal = label.cloneNode(true);
        modalContainer.appendChild(labelModal);
      });
    } catch (err) {
      console.error("Error fetching users for invites", err);
    }
  }

  // send invites for meetingId using selected user IDs and/or emails
  async function sendInvites() {
    if (!meetingId) {
      alert("No meeting selected");
      return;
    }
    const checkboxes = Array.from(
      document.querySelectorAll("#inviteUsersSelect .invite-user-checkbox")
    )
      .filter((cb) => cb.checked)
      .map((cb) => parseInt(cb.value));

    const emailsInput = document.getElementById("inviteEmails").value || "";
    const emails = emailsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {};
    if (checkboxes.length) payload.attendees = checkboxes;
    if (emails.length) payload.emails = emails;

    try {
      const res = await apiPost(`/meetings/${meetingId}/invite`, payload);
      const body = await res.json();
      if (res.ok) {
        alert("Invitations sent");
        // refresh meeting to show new attendees
        await fetchUpcoming();
        // clear inputs
        document.getElementById("inviteEmails").value = "";
        document
          .querySelectorAll("#inviteUsersSelect .invite-user-checkbox")
          .forEach((cb) => (cb.checked = false));
      } else {
        alert(body.message || "Invite failed: see console");
        console.error(body);
      }
    } catch (err) {
      console.error("Invite error", err);
      alert("Network error inviting. See console.");
    }
  }

  // start meeting
  async function startMeeting() {
    if (!meetingId) {
      alert("No meeting to start");
      return;
    }
    if (!confirm("Start the meeting?")) return;
    try {
      const res = await apiPost(`/meetings/${meetingId}/start`, {});
      const body = await res.json();
      if (!res.ok) {
        alert(body.message || "Failed to start");
        console.error(body);
        return;
      }
      await fetchUpcoming();
    } catch (err) {
      console.error("Start error", err);
    }
  }

  // end meeting
  async function endMeeting() {
    if (!meetingId) {
      alert("No meeting to end");
      return;
    }
    if (!confirm("End the meeting?")) return;
    try {
      const res = await apiPost(`/meetings/${meetingId}/end`, {});
      const body = await res.json();
      if (!res.ok) {
        alert(body.message || "Failed to end");
        console.error(body);
        return;
      }
      await fetchUpcoming();
    } catch (err) {
      console.error("End error", err);
    }
  }

  // copy meeting link
  function copyMeetingLink() {
    const input = document.getElementById("meetingLinkInput");
    input.select();
    input.setSelectionRange(0, 99999);
    document.execCommand("copy");
    alert("Meeting link copied");
  }

  // simple simulated transcription poll: try to get /api/meetings/{id} and assemble minutes or fallback text
  async function pollTranscription() {
    if (!meetingId) return;
    // check transcription toggle
    const enabled = document.getElementById("transcriptionToggle").checked;
    if (!enabled) return;

    try {
      const res = await apiGet(`/meetings/${meetingId}`);
      if (!res.ok) return;
      const meeting = await res.json();
      // MeetingResource may include minutes or relationships - try these fields:
      let lines = [];

      if (meeting.minutes && Array.isArray(meeting.minutes)) {
        meeting.minutes.forEach((m) => {
          lines.push(`${m.created_at} - ${m.note || m.summary || ""}`);
        });
      } else if (
        meeting.minutesOfMeeting &&
        Array.isArray(meeting.minutesOfMeeting)
      ) {
        meeting.minutesOfMeeting.forEach((m) => {
          lines.push(`${m.created_at} - ${m.content || m.summary || ""}`);
        });
      } else if (
        meeting.transcription &&
        Array.isArray(meeting.transcription)
      ) {
        meeting.transcription.forEach((t) =>
          lines.push(`${t.time || ""} ${t.speaker || ""}: ${t.text || ""}`)
        );
      } else {
        // fallback: show status + attendee names change
        lines = [
          `Status: ${meeting.status || "n/a"}`,
          `Attendees: ${(meeting.attendees || [])
            .map((a) => a.name)
            .join(", ")}`,
        ];
      }

      const panel = document.getElementById("transcriptionText");
      panel.innerHTML = lines
        .map(
          (l) =>
            `<p class="mb-1"><strong>${l.split(" - ")[0]}</strong> ${l
              .split(" - ")
              .slice(1)
              .join(" - ")}</p>`
        )
        .join("");
    } catch (err) {
      console.error("Error polling transcription", err);
    }
  }

  // small helpers for UI toggles
  function setupUiToggles() {
    const muteBtn = document.getElementById("muteBtn");
    const stopVideoBtn = document.getElementById("stopVideoBtn");
    const shareBtn = document.getElementById("shareScreenBtn");
    const startBtn = document.getElementById("startMeetingBtn");
    const endBtn = document.getElementById("endMeetingBtn");
    const copyBtn = document.getElementById("copyMeetingLinkBtn");
    const sendInvitesBtn = document.getElementById("sendInvitesBtn");

    muteBtn.addEventListener("click", () => {
      muteBtn.classList.toggle("active");
      muteBtn.textContent = muteBtn.classList.contains("active")
        ? "Unmute"
        : "Mute";
    });

    stopVideoBtn.addEventListener("click", () => {
      stopVideoBtn.classList.toggle("active");
      stopVideoBtn.textContent = stopVideoBtn.classList.contains("active")
        ? "Start Video"
        : "Stop Video";
    });

    shareBtn.addEventListener("click", () => {
      shareBtn.classList.toggle("active");
      shareBtn.textContent = shareBtn.classList.contains("active")
        ? "Stop Sharing"
        : "Share Screen";
    });

    startBtn.addEventListener("click", startMeeting);
    endBtn.addEventListener("click", endMeeting);
    copyBtn.addEventListener("click", copyMeetingLink);
    sendInvitesBtn.addEventListener("click", sendInvites);

    // modal send button
    const modalSend = document.getElementById("inviteModalSendBtn");
    if (modalSend) {
      modalSend.addEventListener("click", async () => {
        const modalEmails = (
          document.getElementById("inviteEmailsModal").value || ""
        )
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const modalChecked = Array.from(
          document.querySelectorAll(
            "#inviteUsersModalList .invite-user-checkbox"
          )
        )
          .filter((cb) => cb.checked)
          .map((cb) => parseInt(cb.value));
        // send combined
        const payload = {};
        if (modalChecked.length) payload.attendees = modalChecked;
        if (modalEmails.length) payload.emails = modalEmails;
        try {
          const res = await apiPost(`/meetings/${meetingId}/invite`, payload);
          const body = await res.json();
          if (!res.ok) alert(body.message || "Invite failed");
          else {
            alert("Invitations sent");
            $("#inviteModal").modal("hide");
            document.getElementById("inviteEmailsModal").value = "";
            await fetchUpcoming();
          }
        } catch (err) {
          console.error(err);
          alert("Invite failed");
        }
      });
    }
  }

  // start global polling
  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
      await fetchUpcoming();
      await pollTranscription();
    }, POLL_INTERVAL);
  }

  // initialization
  document.addEventListener("DOMContentLoaded", async function () {
    // check token present
    token = localStorage.getItem("token") || null;
    setupUiToggles();
    await fetchUpcoming();
    // first transcription attempt
    await pollTranscription();
    startPolling();
  });
})();
