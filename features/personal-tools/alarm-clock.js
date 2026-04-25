// ═══════════════════════════════════════════════════════════
// ALARM CLOCK - Module (Refactored)
// ═══════════════════════════════════════════════════════════

window.alarmModule = {
  alarms: [],
  clockInterval: null,

  init: function() {
    this.loadAlarms();
    this.startClock();
    this.render();
  },

  destroy: function() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  },

  loadAlarms: function() {
    const saved = localStorage.getItem('alarm-alarms');
    this.alarms = saved ? JSON.parse(saved) : [];
  },

  saveAlarms: function() {
    localStorage.setItem('alarm-alarms', JSON.stringify(this.alarms));
  },

  startClock: function() {
    this.updateClock();
    this.clockInterval = setInterval(() => {
      this.updateClock();
      this.checkAlarms();
    }, 1000);
  },

  updateClock: function() {
    const now = new Date();
    const timeEl = document.getElementById('alarm-time');
    const dateEl = document.getElementById('alarm-date');

    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString();
    }
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  },

  checkAlarms: function() {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    this.alarms.forEach((alarm, index) => {
      if (alarm.time === currentTime && alarm.active && !alarm.triggered) {
        this.triggerAlarm(alarm, index);
      }
    });
  },

  triggerAlarm: function(alarm, index) {
    this.alarms[index].triggered = true;
    this.saveAlarms();

    // Show notification
    customAlert(`🔔 Alarm: ${alarm.label}`);

    // Play sound if available
    const sound = document.getElementById('notif-sound');
    if (sound) sound.play();

    // Add to announcements if connected
    this.addToAnnouncements(alarm);

    // Add to calendar if connected
    this.addToCalendar(alarm);

    // Reset triggered after 1 minute
    setTimeout(() => {
      const currentAlarm = this.alarms.find((a, i) => i === index);
      if (currentAlarm) {
        currentAlarm.triggered = false;
        this.saveAlarms();
      }
    }, 60000);
  },

  addToAnnouncements: function(alarm) {
    if (window.shareAnnouncementPayload) {
      window.shareAnnouncementPayload({
        title: `Alarm: ${alarm.label}`,
        body: `Alarm triggered at ${alarm.time}.`,
        schedule: 'Alarm',
        source_type: 'alarm_trigger',
      });
    }
  },

  addToCalendar: function(alarm) {
    const today = new Date().toISOString().split('T')[0];
    if (window.calendarNotes && window.sb) {
      const note = `Alarm: ${alarm.label} at ${alarm.time}`;
      window.calendarNotes[today] = (window.calendarNotes[today] || '') + '\n' + note;
      window.sb.from('calendar_notes').upsert([{
        date_key: today,
        note: window.calendarNotes[today],
        updated_by: window.currentUser?.username || 'alarm'
      }]).catch(() => {});
    }
  },

  render: function() {
    const page = document.getElementById('page-alarm');
    if (!page) return;

    page.innerHTML = `
      <div class="tool-page-header">
        <button class="tool-back-btn" onclick="window.goToPage('personal-tools')">← Back</button>
        <h1 class="tool-page-title">Alarm Clock</h1>
      </div>

      <div class="alarm-container">
        <div class="alarm-clock">
          <div class="alarm-time" id="alarm-time">--:--:--</div>
          <div class="alarm-date" id="alarm-date">--/--/----</div>
        </div>

        <div class="alarm-controls">
          <button class="alarm-btn" onclick="alarmModule.showForm()">+ New Alarm</button>
          <button class="alarm-btn" onclick="alarmModule.toggleAllAlarms()">Toggle All</button>
        </div>

        <div class="alarm-list" id="alarm-list">
          ${this.alarms.length === 0 ? '<p style="color: #888; text-align: center; padding: 20px;">No alarms set yet.</p>' : ''}
        </div>

        <div class="alarm-form" id="alarm-form" style="display: none;">
          <input type="time" id="alarm-time-input" placeholder="Set time">
          <input type="text" id="alarm-label" placeholder="Alarm label" maxlength="50">
          <select id="alarm-note">
            <option value="">Select from notepad (optional)</option>
          </select>
          <div class="alarm-form-buttons">
            <button onclick="alarmModule.saveAlarm()">Set Alarm</button>
            <button class="cancel" onclick="alarmModule.hideForm()">Cancel</button>
          </div>
        </div>
      </div>
    `;

    this.renderAlarms();
    this.populateNoteOptions();
  },

  renderAlarms: function() {
    const listEl = document.getElementById('alarm-list');
    if (!listEl) return;

    if (this.alarms.length === 0) {
      listEl.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No alarms set yet.</p>';
      return;
    }

    const alarmsHtml = this.alarms.map((alarm, index) => `
      <div class="alarm-item ${alarm.active ? 'active' : ''}">
        <div class="alarm-item-info">
          <div class="alarm-item-time">${alarm.time}</div>
          <div class="alarm-item-label">${this.escapeHtml(alarm.label)}</div>
        </div>
        <div class="alarm-item-actions">
          <button onclick="alarmModule.toggleAlarm(${index})">
            ${alarm.active ? '✓ ON' : 'OFF'}
          </button>
          <button onclick="alarmModule.editAlarm(${index})">Edit</button>
          <button class="delete" onclick="alarmModule.deleteAlarm(${index})">Delete</button>
        </div>
      </div>
    `).join('');

    listEl.innerHTML = alarmsHtml;
  },

  populateNoteOptions: function() {
    const select = document.getElementById('alarm-note');
    if (!select) return;

    const notes = window.notepadModule ? window.notepadModule.getNotes() : [];
    const options = notes.map((note, index) =>
      `<option value="${index}">${this.escapeHtml(note.title)}</option>`
    ).join('');

    select.innerHTML = '<option value="">Select from notepad (optional)</option>' + options;
  },

  showForm: function(editIndex = -1) {
    const form = document.getElementById('alarm-form');
    if (!form) return;

    form.style.display = 'block';

    if (editIndex >= 0 && this.alarms[editIndex]) {
      const alarm = this.alarms[editIndex];
      document.getElementById('alarm-time-input').value = alarm.time;
      document.getElementById('alarm-label').value = alarm.label;
      document.getElementById('alarm-note').value = alarm.noteIndex || '';
      form.dataset.editIndex = editIndex;
    } else {
      document.getElementById('alarm-time-input').value = '';
      document.getElementById('alarm-label').value = '';
      document.getElementById('alarm-note').value = '';
      delete form.dataset.editIndex;
    }

    document.getElementById('alarm-time-input').focus();
  },

  hideForm: function() {
    const form = document.getElementById('alarm-form');
    if (form) form.style.display = 'none';
  },

  saveAlarm: function() {
    const time = document.getElementById('alarm-time-input').value;
    const label = document.getElementById('alarm-label').value.trim();
    const noteIndex = document.getElementById('alarm-note').value;

    if (!time) {
      customAlert('Please set a time for the alarm.');
      return;
    }

    if (!label) {
      customAlert('Please enter a label for the alarm.');
      return;
    }

    const alarm = {
      time,
      label,
      noteIndex: noteIndex ? parseInt(noteIndex) : null,
      active: true,
      triggered: false
    };

    const form = document.getElementById('alarm-form');
    const editIndex = form.dataset.editIndex;

    if (editIndex !== undefined) {
      this.alarms[editIndex] = alarm;
    } else {
      this.alarms.push(alarm);
    }

    this.saveAlarms();
    this.hideForm();
    this.renderAlarms();
  },

  toggleAlarm: function(index) {
    if (this.alarms[index]) {
      this.alarms[index].active = !this.alarms[index].active;
      this.saveAlarms();
      this.renderAlarms();
    }
  },

  toggleAllAlarms: function() {
    const allActive = this.alarms.every(a => a.active);
    this.alarms.forEach(a => a.active = !allActive);
    this.saveAlarms();
    this.renderAlarms();
  },

  editAlarm: function(index) {
    this.showForm(index);
  },

  deleteAlarm: function(index) {
    if (confirm('Delete this alarm?')) {
      this.alarms.splice(index, 1);
      this.saveAlarms();
      this.renderAlarms();
    }
  },

  getNotes: function() {
    return [];
  },

  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};