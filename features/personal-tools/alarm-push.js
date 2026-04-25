// ═══════════════════════════════════════════════════════════
// ALARM PUSH SUBSCRIPTIONS & DATABASE SYNC
// ═══════════════════════════════════════════════════════════

window.alarmPushModule = {
  db: null, // Will be set to window.sb (Supabase client) on init

  init: async function() {
    this.db = window.sb;
    if (!this.db) {
      console.warn('Supabase client not available for alarm push');
      return;
    }

    // Request notification permission on first init
    this.requestPushPermission();

    // Subscribe to push notifications
    this.subscribeToPush();
  },

  // ── Push Notification Registration ───────────────────────

  requestPushPermission: async function() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return;
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        console.log('Notification permission:', perm);
      });
    }
  },

  subscribeToPush: async function() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (!this.db) return;

    try {
      // Get the current user
      const { data: { user }, error: authError } = await this.db.auth.getUser();
      if (authError || !user) {
        console.log('Not authenticated for push subscriptions');
        return;
      }

      // Get service worker registration
      const reg = await navigator.serviceWorker.ready;

      // Get VAPID public key from environment (set in index.html or server)
      const vapidPublicKey = window.VAPID_PUBLIC_KEY || localStorage.getItem('vapid-public');
      if (!vapidPublicKey) {
        console.warn('VAPID public key not available');
        return;
      }

      // Subscribe to push notifications
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
      });

      // Save subscription to database
      await this.savePushSubscription(user.id, subscription);
      console.log('Push subscription saved');
    } catch (error) {
      console.error('Push subscription error:', error);
    }
  },

  savePushSubscription: async function(userId, subscription) {
    if (!this.db) return;

    const { endpoint, keys } = subscription;

    const { data, error } = await this.db
      .from('alarm_push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint,
        auth: keys.auth,
        p256dh: keys.p256dh,
      }, {
        onConflict: 'user_id,endpoint'
      });

    if (error) {
      console.error('Error saving push subscription:', error);
    }
    return data;
  },

  // ── Alarm Database Sync ──────────────────────────────────

  saveAlarmToDb: async function(alarm) {
    if (!this.db) {
      console.warn('Supabase not available, storing in localStorage only');
      return null;
    }

    const { data: { user }, error: authError } = await this.db.auth.getUser();
    if (authError || !user) {
      console.log('Not authenticated, storing in localStorage only');
      return null;
    }

    const { data, error } = await this.db
      .from('user_alarms')
      .insert([{
        user_id: user.id,
        alarm_time: alarm.time,
        label: alarm.label,
        sound_id: alarm.sound,
        enabled: alarm.active,
        triggered: false,
        repeat_days: alarm.repeatDays || null,
      }]);

    if (error) {
      console.error('Error saving alarm to database:', error);
      return null;
    }

    return data?.[0];
  },

  getAlarmsFromDb: async function() {
    if (!this.db) return [];

    const { data: { user }, error: authError } = await this.db.auth.getUser();
    if (authError || !user) return [];

    const { data, error } = await this.db
      .from('user_alarms')
      .select('*')
      .eq('user_id', user.id)
      .order('alarm_time', { ascending: true });

    if (error) {
      console.error('Error fetching alarms from database:', error);
      return [];
    }

    return data || [];
  },

  updateAlarmInDb: async function(alarmId, updates) {
    if (!this.db) return null;

    const { data, error } = await this.db
      .from('user_alarms')
      .update(updates)
      .eq('id', alarmId);

    if (error) {
      console.error('Error updating alarm:', error);
      return null;
    }

    return data?.[0];
  },

  deleteAlarmFromDb: async function(alarmId) {
    if (!this.db) return;

    const { error } = await this.db
      .from('user_alarms')
      .delete()
      .eq('id', alarmId);

    if (error) {
      console.error('Error deleting alarm:', error);
    }
  },

  // ── Helper ──────────────────────────────────────────────

  urlBase64ToUint8Array: function(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
};
