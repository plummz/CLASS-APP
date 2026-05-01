// ═══════════════════════════════════════════════════════════
// ALARM CLOCK - Module (with sounds, vibration, notifications)
// ═══════════════════════════════════════════════════════════

window.alarmModule = {
  alarms: [],
  clockInterval: null,
  audioCtx: null,
  notifPermission: 'default',
  _alarmSoundInterval: null,
  _alarmCountdownInterval: null,
  _currentAlarm: null,

  // 20 license-safe sounds generated via Web Audio API
  sounds: [
    { id: 'beep',         label: 'Classic Beep',      fn: 'playBeep' },
    { id: 'double',       label: 'Double Beep',       fn: 'playDoubleBeep' },
    { id: 'triple',       label: 'Triple Beep',       fn: 'playTripleBeep' },
    { id: 'rising',       label: 'Rising Tone',       fn: 'playRisingTone' },
    { id: 'falling',      label: 'Falling Tone',      fn: 'playFallingTone' },
    { id: 'siren',        label: 'Alarm Siren',       fn: 'playSiren' },
    { id: 'chime',        label: 'Gentle Chime',      fn: 'playChime' },
    { id: 'bell',         label: 'School Bell',       fn: 'playBell' },
    { id: 'digital',      label: 'Digital Pulse',     fn: 'playDigitalPulse' },
    { id: 'emergency',    label: 'Emergency Alert',   fn: 'playEmergency' },
    { id: 'space',        label: 'Space Alarm',       fn: 'playSpaceAlarm' },
    { id: 'cascade',      label: 'Cascade',           fn: 'playCascade' },
    { id: 'heartbeat',    label: 'Heartbeat',         fn: 'playHeartbeat' },
    { id: 'ping',         label: 'High Ping',         fn: 'playPing' },
    { id: 'buzz',         label: 'Low Buzz',          fn: 'playBuzz' },
    { id: 'melody',       label: 'Beep Melody',       fn: 'playMelody' },
    { id: 'cuckoo',       label: 'Cuckoo Clock',      fn: 'playCuckoo' },
    { id: 'urgent',       label: 'Urgent Horn',       fn: 'playUrgentHorn' },
    { id: 'fanfare',      label: 'Short Fanfare',     fn: 'playFanfare' },
    { id: 'softchime',    label: 'Soft Morning',      fn: 'playSoftMorning' },
  ],

  getAudioCtx: function() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (autoplay policy)
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    return this.audioCtx;
  },

  // ── Sound generators ─────────────────────────────────────

  _tone: function(freq, dur, type = 'sine', vol = 0.4, start = 0) {
    const ctx = this.getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    gain.gain.setValueAtTime(vol, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur);
  },

  _sweep: function(f1, f2, dur, type = 'sine', vol = 0.4, start = 0) {
    const ctx = this.getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, ctx.currentTime + start);
    osc.frequency.linearRampToValueAtTime(f2, ctx.currentTime + start + dur);
    gain.gain.setValueAtTime(vol, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur);
  },

  playBeep:         function() { this._tone(880, 0.4); },
  playDoubleBeep:   function() { this._tone(880, 0.2); this._tone(880, 0.2, 'sine', 0.4, 0.3); },
  playTripleBeep:   function() { [0, 0.25, 0.5].forEach(s => this._tone(880, 0.15, 'sine', 0.4, s)); },
  playRisingTone:   function() { this._sweep(300, 1200, 0.6); },
  playFallingTone:  function() { this._sweep(1200, 300, 0.6); },
  playSiren:        function() {
    for (let i = 0; i < 3; i++) {
      this._sweep(600, 1200, 0.3, 'sawtooth', 0.3, i * 0.6);
      this._sweep(1200, 600, 0.3, 'sawtooth', 0.3, i * 0.6 + 0.3);
    }
  },
  playChime:        function() {
    [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.5, 'sine', 0.3, i * 0.18));
  },
  playBell:         function() {
    this._tone(880, 1.2, 'sine', 0.5);
    this._tone(1760, 0.6, 'sine', 0.15, 0.05);
  },
  playDigitalPulse: function() {
    for (let i = 0; i < 6; i++) this._tone(1200, 0.06, 'square', 0.3, i * 0.12);
  },
  playEmergency:    function() {
    for (let i = 0; i < 4; i++) {
      this._tone(1500, 0.1, 'square', 0.35, i * 0.2);
      this._tone(800,  0.1, 'square', 0.35, i * 0.2 + 0.1);
    }
  },
  playSpaceAlarm:   function() { this._sweep(200, 800, 0.4, 'sawtooth', 0.3); this._sweep(800, 200, 0.4, 'sawtooth', 0.3, 0.4); },
  playCascade:      function() { [1047, 880, 698, 523].forEach((f, i) => this._tone(f, 0.25, 'sine', 0.35, i * 0.15)); },
  playHeartbeat:    function() {
    this._tone(80, 0.08, 'sine', 0.5);
    this._tone(80, 0.08, 'sine', 0.5, 0.12);
    this._tone(80, 0.08, 'sine', 0.5, 0.7);
    this._tone(80, 0.08, 'sine', 0.5, 0.82);
  },
  playPing:         function() { this._tone(2000, 0.5, 'sine', 0.3); },
  playBuzz:         function() { this._tone(120, 0.8, 'sawtooth', 0.4); },
  playMelody:       function() {
    const notes = [523, 659, 784, 659, 523];
    notes.forEach((f, i) => this._tone(f, 0.2, 'sine', 0.35, i * 0.18));
  },
  playCuckoo:       function() {
    this._tone(528, 0.25, 'sine', 0.4);
    this._tone(440, 0.35, 'sine', 0.4, 0.3);
    this._tone(528, 0.25, 'sine', 0.4, 0.75);
    this._tone(440, 0.35, 'sine', 0.4, 1.05);
  },
  playUrgentHorn:   function() {
    for (let i = 0; i < 3; i++) this._tone(440, 0.2, 'sawtooth', 0.5, i * 0.25);
  },
  playFanfare:      function() {
    const seq = [[523,0],[659,0.15],[784,0.3],[1047,0.45],[784,0.65],[1047,0.8]];
    seq.forEach(([f,s]) => this._tone(f, 0.2, 'triangle', 0.4, s));
  },
  playSoftMorning:  function() {
    [440, 494, 523, 587, 659].forEach((f,i) => this._tone(f, 0.4, 'sine', 0.2, i * 0.22));
  },

  playSound: function(soundId) {
    const sound = this.sounds.find(s => s.id === soundId) || this.sounds[0];
    try { this[sound.fn](); } catch(e) {}
  },

  // ── Vibration ─────────────────────────────────────────────
  vibrate: function() {
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 100, 300, 100, 300]);
    }
  },

  // ── Notifications ─────────────────────────────────────────
  requestNotifPermission: async function() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      this.notifPermission = perm;
    } else {
      this.notifPermission = Notification.permission;
    }
    this.updateNotifBanner();
    if (Notification.permission === 'granted') this.subscribePush();
  },

  // ── Web Push subscription (background alarm delivery) ─────
  subscribePush: async function() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (!window.sb || !window.currentUser?.username) return;

    try {
      // Fetch VAPID public key from server
      const resp = await fetch('/api/push/public-key');
      const { publicKey, enabled } = await resp.json();
      if (!enabled || !publicKey) {
        console.log('[alarm] Push not enabled on server (missing VAPID keys)');
        return;
      }

      const reg = await navigator.serviceWorker.ready;

      // Reuse existing subscription or create a new one
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this._b64urlToUint8(publicKey),
        });
        console.log('[alarm] New push subscription created');
      }

      // Upsert subscription into Supabase alarm_push_subscriptions
      const subJson = sub.toJSON();
      const { error } = await window.sb.from('alarm_push_subscriptions').upsert({
        username: window.currentUser.username,
        endpoint: subJson.endpoint,
        subscription: subJson,
      }, { onConflict: 'endpoint' });

      if (error) {
        console.warn('[alarm] Failed to save push subscription:', error.message);
      } else {
        console.log('[alarm] Push subscription saved for', window.currentUser.username);
      }
    } catch (err) {
      console.warn('[alarm] subscribePush error:', err.message);
    }
  },

  _b64urlToUint8: function(b64url) {
    const pad = '='.repeat((4 - b64url.length % 4) % 4);
    const b64 = (b64url + pad).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  },

  updateNotifBanner: function() {
    const banner = document.getElementById('alarm-notif-banner');
    if (!banner) return;
    if (!('Notification' in window)) {
      banner.textContent = 'Notifications not supported by this browser.';
      banner.style.display = 'block';
      banner.className = 'alarm-notif-banner warn';
    } else if (Notification.permission === 'denied') {
      banner.textContent = '⚠ Notification permission blocked. Background alarms will only work while app is open.';
      banner.style.display = 'block';
      banner.className = 'alarm-notif-banner warn';
    } else if (Notification.permission === 'granted') {
      banner.textContent = '✓ Notifications enabled. Alarm will show as a system notification.';
      banner.style.display = 'block';
      banner.className = 'alarm-notif-banner ok';
    } else {
      banner.textContent = 'Allow notifications so alarms can fire even when the screen is locked.';
      banner.style.display = 'block';
      banner.className = 'alarm-notif-banner info';
    }
  },

  showNotification: function(alarm) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(`🔔 Alarm: ${alarm.label}`, {
            body: `Set for ${alarm.time}`,
            icon: 'icons/icon-192.png',
            badge: 'icons/icon-192.png',
            vibrate: [300, 100, 300, 100, 300],
            tag: `alarm-${alarm.time}`,
            renotify: true
          });
        }).catch(() => new Notification(`🔔 Alarm: ${alarm.label}`, { body: `Set for ${alarm.time}` }));
      } else {
        new Notification(`🔔 Alarm: ${alarm.label}`, { body: `Set for ${alarm.time}`, icon: 'icons/icon-192.png' });
      }
    } catch(e) {}
  },

  // ── Persistence ───────────────────────────────────────────
  loadAlarms: function() {
    try {
      const saved = localStorage.getItem('alarm-alarms');
      this.alarms = saved ? JSON.parse(saved) : [];
    } catch(e) { this.alarms = []; }
  },

  saveAlarms: function() {
    localStorage.setItem('alarm-alarms', JSON.stringify(this.alarms));
  },

  // ── Clock ────────────────────────────────────────────────
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
    if (timeEl) timeEl.textContent = now.toLocaleTimeString();
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  },

  checkAlarms: function() {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    this.alarms.forEach((alarm, index) => {
      if (alarm.time === currentTime && alarm.active && !alarm.triggered) {
        this.triggerAlarm(alarm, index);
      }
    });
  },

  triggerAlarm: function(alarm, index) {
    if (index >= 0 && this.alarms[index]) {
      this.alarms[index].triggered = true;
      this.saveAlarms();
    }

    const soundId = alarm.sound || 'beep';
    this.vibrate();
    this.showNotification(alarm);
    this.showAlarmOverlay(alarm, soundId);

    this.addToCalendar(alarm);

    if (index >= 0) {
      setTimeout(() => {
        const a = this.alarms[index];
        if (a) { a.triggered = false; this.saveAlarms(); }
      }, 60000);
    }
  },

  // ── Persistent alarm overlay ──────────────────────────────
  showAlarmOverlay: function(alarm, soundId) {
    this.stopAlarmSound();

    const existing = document.getElementById('alarm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'alarm-overlay';
    overlay.className = 'alarm-overlay';
    overlay.innerHTML = `
      <div class="alarm-overlay-inner">
        <div class="alarm-overlay-icon">⏰</div>
        <div class="alarm-overlay-time">${alarm.time || ''}</div>
        <div class="alarm-overlay-label">${this.escapeHtml(alarm.label || 'Alarm')}</div>
        <div class="alarm-overlay-countdown"><span id="alarm-countdown">30</span>s auto-dismiss</div>
        <div class="alarm-overlay-actions">
          <button class="alarm-overlay-btn snooze" onclick="alarmModule.snoozeAlarm()">💤 Snooze 5m</button>
          <button class="alarm-overlay-btn dismiss" onclick="alarmModule.dismissAlarm()">✕ Dismiss</button>
        </div>
        <div class="alarm-overlay-hint">Tap to unmute if silent</div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Play sound immediately, then repeat every 2s
    this.playSound(soundId);
    this._alarmSoundInterval = setInterval(() => this.playSound(soundId), 2000);

    // Countdown to auto-dismiss at 30s
    let secondsLeft = 30;
    this._alarmCountdownInterval = setInterval(() => {
      secondsLeft--;
      const el = document.getElementById('alarm-countdown');
      if (el) el.textContent = secondsLeft;
      if (secondsLeft <= 0) this.dismissAlarm();
    }, 1000);

    this._currentAlarm = { ...alarm, soundId };

    // Tapping overlay resumes audio context (helps after notification click)
    overlay.addEventListener('click', () => {
      if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
    }, { once: true });
  },

  stopAlarmSound: function() {
    if (this._alarmSoundInterval)   { clearInterval(this._alarmSoundInterval);   this._alarmSoundInterval = null; }
    if (this._alarmCountdownInterval) { clearInterval(this._alarmCountdownInterval); this._alarmCountdownInterval = null; }
  },

  dismissAlarm: function() {
    this.stopAlarmSound();
    const overlay = document.getElementById('alarm-overlay');
    if (overlay) overlay.remove();
    this._currentAlarm = null;
  },

  snoozeAlarm: function() {
    const alarm = this._currentAlarm;
    this.dismissAlarm();
    if (!alarm) return;

    // Re-trigger after 5 minutes
    setTimeout(() => {
      this.triggerAlarm(alarm, -1);
    }, 5 * 60 * 1000);

    customAlert('💤 Snoozed for 5 minutes');
  },

  // ── Listen for push alarm messages from service worker ────
  listenForPushAlarms: function() {
    if (!navigator.serviceWorker) return;
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (!event.data) return;
      const { type, soundId, label, body } = event.data;

      if (type === 'ALARM_TRIGGERED') {
        const alarm = {
          label: label || 'Alarm',
          body: body || '',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sound: soundId || 'beep',
        };
        this.vibrate();
        this.showAlarmOverlay(alarm, alarm.sound);
      }

      if (type === 'ALARM_SNOOZED') {
        // Relay snooze to dismissAlarm + re-trigger if overlay is open
        if (this._currentAlarm) this.snoozeAlarm();
      }
    });
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

  // ── Init & Render ─────────────────────────────────────────
  init: function() {
    this.loadAlarms();
    this.startClock();
    this.render();
    this.requestNotifPermission();
    if (Notification.permission === 'granted') this.subscribePush();
    this.listenForPushAlarms();
  },

  destroy: function() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  },

  render: function() {
    const page = document.getElementById('page-alarm');
    if (!page) return;

    const soundOptions = this.sounds.map(s =>
      `<option value="${s.id}">${s.label}</option>`
    ).join('');

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

        <div id="alarm-notif-banner" class="alarm-notif-banner info" style="display:none;"></div>

        <div class="alarm-controls">
          <button class="alarm-btn" onclick="alarmModule.showForm()">+ New Alarm</button>
          <button class="alarm-btn" onclick="alarmModule.toggleAllAlarms()">Toggle All</button>
          <button class="alarm-btn" onclick="alarmModule.requestNotifPermission()">🔔 Allow Notifications</button>
        </div>

        <div class="alarm-list" id="alarm-list"></div>

        <div class="alarm-form" id="alarm-form" style="display: none;">
          <h3 style="color:#00d4ff;margin-top:0;">Set Alarm</h3>
          <input type="time" id="alarm-time-input" placeholder="Set time">
          <input type="text" id="alarm-label" placeholder="Alarm label" maxlength="50">

          <div class="alarm-sound-row">
            <label class="alarm-sound-label">Alarm Sound</label>
            <div class="alarm-sound-picker">
              <select id="alarm-sound-select" class="alarm-sound-select">
                ${soundOptions}
              </select>
              <button class="alarm-preview-btn" onclick="alarmModule.previewSound()">▶ Preview</button>
            </div>
          </div>

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
    this.updateNotifBanner();
  },

  renderAlarms: function() {
    const listEl = document.getElementById('alarm-list');
    if (!listEl) return;

    if (this.alarms.length === 0) {
      listEl.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">No alarms set yet.</p>';
      return;
    }

    listEl.innerHTML = this.alarms.map((alarm, index) => {
      const soundLabel = this.sounds.find(s => s.id === alarm.sound)?.label || 'Classic Beep';
      return `
        <div class="alarm-item ${alarm.active ? 'active' : ''}">
          <div class="alarm-item-info">
            <div class="alarm-item-time">${alarm.time}</div>
            <div class="alarm-item-label">${this.escapeHtml(alarm.label)}</div>
            <div class="alarm-item-sound">🔊 ${soundLabel}</div>
          </div>
          <div class="alarm-item-actions">
            <button onclick="alarmModule.toggleAlarm(${index})">${alarm.active ? '✓ ON' : 'OFF'}</button>
            <button onclick="alarmModule.editAlarm(${index})">Edit</button>
            <button onclick="alarmModule.previewAlarmSound(${index})">▶</button>
            <button class="delete" onclick="alarmModule.deleteAlarm(${index})">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  },

  populateNoteOptions: function() {
    const select = document.getElementById('alarm-note');
    if (!select) return;
    const notes = window.notepadModule ? window.notepadModule.getNotes() : [];
    select.innerHTML = '<option value="">Select from notepad (optional)</option>' +
      notes.map((note, i) => `<option value="${i}">${this.escapeHtml(note.title)}</option>`).join('');
  },

  previewSound: function() {
    const select = document.getElementById('alarm-sound-select');
    if (select) this.playSound(select.value);
  },

  previewAlarmSound: function(index) {
    const soundId = this.alarms[index]?.sound || 'beep';
    this.playSound(soundId);
  },

  showForm: function(editIndex = -1) {
    const form = document.getElementById('alarm-form');
    if (!form) return;
    form.style.display = 'block';

    if (editIndex >= 0 && this.alarms[editIndex]) {
      const alarm = this.alarms[editIndex];
      document.getElementById('alarm-time-input').value = alarm.time;
      document.getElementById('alarm-label').value = alarm.label;
      document.getElementById('alarm-sound-select').value = alarm.sound || 'beep';
      document.getElementById('alarm-note').value = alarm.noteIndex || '';
      form.dataset.editIndex = editIndex;
    } else {
      document.getElementById('alarm-time-input').value = '';
      document.getElementById('alarm-label').value = '';
      document.getElementById('alarm-sound-select').value = 'beep';
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
    const time  = document.getElementById('alarm-time-input').value;
    const label = document.getElementById('alarm-label').value.trim();
    const sound = document.getElementById('alarm-sound-select').value;
    const noteIndex = document.getElementById('alarm-note').value;

    if (!time)  { customAlert('Please set a time for the alarm.'); return; }
    if (!label) { customAlert('Please enter a label for the alarm.'); return; }

    const alarm = { time, label, sound, noteIndex: noteIndex ? parseInt(noteIndex) : null, active: true, triggered: false };
    const form = document.getElementById('alarm-form');
    const editIndex = form.dataset.editIndex;

    if (editIndex !== undefined) this.alarms[editIndex] = alarm;
    else this.alarms.push(alarm);

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

  editAlarm: function(index) { this.showForm(index); },

  deleteAlarm: function(index) {
    if (confirm('Delete this alarm?')) {
      this.alarms.splice(index, 1);
      this.saveAlarms();
      this.renderAlarms();
    }
  },

  getNotes: function() { return []; },

  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
