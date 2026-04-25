# Alarm Checker - Supabase Edge Function

Background alarm notifications for the CLASS-APP using Web Push API.

## Overview

This Edge Function checks for alarms that should fire and sends Web Push notifications to subscribed users. It's designed to run periodically (via Supabase cron or external scheduler) to enable background alarms even when the web app is closed.

## Architecture

### Database Schema

**Migration**: `supabase/migrations/009_alarms_and_push.sql`

Tables:
- `user_alarms` — user's alarms with time, label, sound, enabled/triggered state
- `alarm_push_subscriptions` — user's Web Push subscriptions (endpoint + keys)

Functions:
- `get_alarms_to_fire()` — alarms ready to trigger
- `get_user_alarm_subscriptions(uuid)` — subscriptions for a user
- `alarm_mark_triggered(bigint)` — mark alarm as fired
- `delete_alarm_subscription(bigint)` — remove invalid subscription

### Edge Function

**Path**: `supabase/functions/check-alarms/index.ts`

Flow:
1. Fetch all alarms where `enabled=true` and `triggered=false` and `alarm_time <= current_time`
2. For each alarm:
   - Get user's push subscriptions from database
   - Send Web Push to each subscription
   - If subscription returns 410 (Gone), delete it
   - Mark alarm as triggered
3. Return summary (processed count, failures)

## Deployment

### 1. Apply Database Migration

```bash
supabase migration up --local
# or in production:
# supabase migration up --linked
```

### 2. Deploy Edge Function

```bash
supabase functions deploy check-alarms
```

### 3. Set Environment Variables

In your Supabase dashboard (`Project Settings → Edge Functions → Secrets`):

```
VAPID_PUBLIC_KEY=<your-vapid-public-key>
VAPID_PRIVATE_KEY=<your-vapid-private-key>
ALARM_CHECK_SECRET=<random-secret-for-webhook-auth>
```

**Generate VAPID Keys** (if not already created):
```bash
npm install -g web-push
web-push generate-vapid-keys
```

### 4. Set Up Cron Job (Optional)

To check alarms automatically every minute, use a cron service:

**Option A: Supabase (Database) Cron**  
*Not yet available in Supabase; use external scheduler instead.*

**Option B: External Cron (e.g., EasyCron, AWS Lambda, GitHub Actions)**

```bash
curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/check-alarms \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  --data '{}'
```

Replace `[PROJECT_ID]` with your Supabase project ID and add the `Authorization: Bearer $ALARM_CHECK_SECRET` token.

**GitHub Actions** example (`.github/workflows/check-alarms.yml`):
```yaml
name: Check Alarms
on:
  schedule:
    - cron: '* * * * *'  # Every minute
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Check alarms
        run: |
          curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/check-alarms \
            -H "Authorization: Bearer ${{ secrets.ALARM_CHECK_SECRET }}" \
            -H "Content-Type: application/json"
```

## Client-Side Setup

### 1. Load Push Module

Add to `index.html`:
```html
<script src="features/personal-tools/alarm-push.js?v=1" defer></script>
```

### 2. Initialize on App Load

In your main script:
```javascript
// After Supabase is initialized:
window.sb = supabase; // Make Supabase client available
alarmPushModule.db = window.sb;
alarmPushModule.init();
```

### 3. Set VAPID Public Key

In `index.html` or as a global:
```html
<script>
  window.VAPID_PUBLIC_KEY = 'your-vapid-public-key-here';
</script>
```

Or store in localStorage:
```javascript
localStorage.setItem('vapid-public', 'your-key');
```

### 4. Use Database Alarms (Optional)

To sync alarms to the database (enables background push):
```javascript
// Save alarm to database
await alarmPushModule.saveAlarmToDb({
  time: '09:00',
  label: 'Wake up',
  sound: 'beep',
  active: true,
  repeatDays: [1, 2, 3, 4, 5] // Mon-Fri
});

// Load alarms from database
const alarms = await alarmPushModule.getAlarmsFromDb();

// Update alarm
await alarmPushModule.updateAlarmInDb(alarmId, { enabled: false });

// Delete alarm
await alarmPushModule.deleteAlarmFromDb(alarmId);
```

## Testing

### Manual Test (Local)

1. **Deploy locally**:
   ```bash
   supabase start
   supabase functions serve check-alarms --env-file .env.local
   ```

2. **Create test alarm** (via Supabase Dashboard or direct insert):
   ```sql
   insert into public.user_alarms (user_id, alarm_time, label, sound_id, enabled)
   values (
     'user-uuid-here',
     to_char(now() + interval '1 minute', 'HH24:MI'),
     'Test Alarm',
     'beep',
     true
   );
   ```

3. **Call function**:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/check-alarms \
     -H "Content-Type: application/json"
   ```

4. **Check logs**:
   ```bash
   supabase functions logs check-alarms
   ```

### Manual Test (Production)

1. **Subscribe to push**:
   ```javascript
   alarmPushModule.subscribeToPush();
   ```

2. **Create alarm via web app** (will go to database if push module is initialized):
   ```javascript
   await alarmPushModule.saveAlarmToDb({
     time: '14:30',
     label: 'Meeting',
     sound: 'chime',
     active: true
   });
   ```

3. **Trigger cron job** (manually call the function):
   ```bash
   curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/check-alarms \
     -H "Authorization: Bearer $ALARM_CHECK_SECRET"
   ```

4. **Verify**:
   - Check browser console for subscription logs
   - Look for Web Push notification on device (even if browser is closed, if Service Worker is active)
   - Check Supabase function logs

### Debugging

1. **View function logs**:
   ```bash
   supabase functions logs check-alarms --limit 50
   ```

2. **Test payload encryption** (if Web Push fails):
   - Ensure VAPID keys are correctly set
   - Verify subscription endpoint is accessible
   - Check push service response headers

3. **Check database state**:
   ```sql
   select * from public.user_alarms where enabled = true limit 10;
   select * from public.alarm_push_subscriptions where user_id = 'user-id' limit 5;
   ```

## Known Limitations

- **No Web Push in Safari Desktop** — iOS Safari doesn't support Web Push API
- **Cron frequency** — Typical cron resolution is 1 minute; for sub-minute precision, run more frequently or use a different scheduler
- **VAPID keys required** — Web Push requires valid VAPID public/private keypair
- **Service Worker required** — Background notifications only work if Service Worker is active (available after first visit)

## Future Enhancements

- [ ] Implement proper ECDSA VAPID signing (currently simplified)
- [ ] Add repeat/recurring alarm support
- [ ] Integrate with FCM for better Android background support
- [ ] Add alarm snooze/dismiss via notification actions
- [ ] Rate limiting per user to avoid notification spam

## References

- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/draft-thomson-webpush-vapid)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
