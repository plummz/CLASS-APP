/* Battle Royale 3D profiles: every finished match is saved (Supabase table royale_matches, written
 * only by the server with the signed-in username), and profiles add them up: wins, K/D, KDA,
 * damage, accuracy, headshots, survival time, favourite weapon, level and recent matches. */
const MAX_HISTORY = 400;
const lastPost = new Map();   // username -> time (one match per 45 s at most)
const memoryRows = [];        // fallback when Supabase isn't reachable (lost on restart)

const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
const cleanText = (v, max) => String(v || '').replace(/[^\w .\-]/g, '').slice(0, max);

function levelFor(xp) {
  // Level n needs 400 * n * (n + 1) / 2 XP in total
  let level = 1;
  while (xp >= 200 * level * (level + 1)) level += 1;
  const floor = 200 * (level - 1) * level;
  const next = 200 * level * (level + 1);
  return { level, xp, into: xp - floor, need: next - floor };
}

function summarize(rows) {
  const s = { matches: rows.length, wins: 0, top5: 0, kills: 0, assists: 0, deaths: 0, damage: 0, headshots: 0, shots: 0, hits: 0,
    survived_s: 0, longest_kill: 0, best_place: 0, coins: 0, place_sum: 0 };
  const weapons = {};
  const modes = {};
  for (const r of rows) {
    if (r.won) s.wins += 1;
    if (r.place && r.place <= 5) s.top5 += 1;
    for (const k of ['kills', 'assists', 'deaths', 'damage', 'headshots', 'shots', 'hits', 'survived_s', 'coins']) s[k] += Number(r[k]) || 0;
    s.longest_kill = Math.max(s.longest_kill, Number(r.longest_kill) || 0);
    if (r.place && (!s.best_place || r.place < s.best_place)) s.best_place = r.place;
    s.place_sum += Number(r.place) || 0;
    if (r.weapon) weapons[r.weapon] = (weapons[r.weapon] || 0) + (Number(r.kills) || 0) + 0.01;
    modes[r.mode] = (modes[r.mode] || 0) + 1;
  }
  const deaths = Math.max(1, s.deaths);
  const xp = s.kills * 50 + s.assists * 20 + Math.round(s.damage / 2) + s.wins * 300 + s.top5 * 80 + s.matches * 25;
  return {
    ...s,
    kd: +(s.kills / deaths).toFixed(2),
    kda: +((s.kills + s.assists) / deaths).toFixed(2),
    win_rate: s.matches ? Math.round((s.wins / s.matches) * 100) : 0,
    headshot_rate: s.hits ? Math.round((s.headshots / s.hits) * 100) : 0,
    accuracy: s.shots ? Math.round((s.hits / s.shots) * 100) : 0,
    avg_damage: s.matches ? Math.round(s.damage / s.matches) : 0,
    avg_place: s.matches ? +(s.place_sum / s.matches).toFixed(1) : 0,
    favorite_weapon: Object.entries(weapons).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
    modes,
    ...levelFor(xp),
  };
}

module.exports = function setupRoyaleStats(app, { requireAuth, supabaseQuery }) {
  app.post('/api/royale/match', requireAuth, async (req, res) => {
    const username = req.user.username;
    const now = Date.now();
    if (now - (lastPost.get(username) || 0) < 45000) return res.status(429).json({ error: 'Too soon' });
    lastPost.set(username, now);
    const b = req.body || {};
    const players = clampInt(b.players, 2, 40);
    const row = {
      username,
      mode: ['solo', 'duo', 'squad', 'room'].includes(b.mode) ? b.mode : 'solo',
      map: cleanText(b.map, 24) || 'sentinel',
      place: clampInt(b.place, 1, players),
      players,
      won: Boolean(b.won) && clampInt(b.place, 1, players) === 1,
      kills: clampInt(b.kills, 0, 40),
      assists: clampInt(b.assists, 0, 40),
      deaths: clampInt(b.deaths, 0, 1),
      damage: clampInt(b.damage, 0, 20000),
      headshots: clampInt(b.headshots, 0, 2000),
      shots: clampInt(b.shots, 0, 20000),
      hits: clampInt(b.hits, 0, 20000),
      survived_s: clampInt(b.survived_s, 0, 3600),
      longest_kill: Math.max(0, Math.min(1500, Number(b.longest_kill) || 0)),
      weapon: cleanText(b.weapon, 24),
      coins: clampInt(b.coins, 0, 1000),
    };
    row.hits = Math.min(row.hits, row.shots);
    try {
      await supabaseQuery('royale_matches', 'POST', [row]);
    } catch (err) {
      console.error('[royale] save match failed:', err.message);
      memoryRows.push({ ...row, created_at: new Date().toISOString() });
      if (memoryRows.length > 2000) memoryRows.shift();
    }
    res.json({ ok: true });
  });

  app.get('/api/royale/profile/:username', requireAuth, async (req, res) => {
    const username = String(req.params.username || '').slice(0, 64);
    let rows = [];
    try {
      rows = await supabaseQuery('royale_matches', 'GET', null, {
        username: `eq.${username}`, order: 'created_at.desc', limit: String(MAX_HISTORY),
        select: 'created_at,mode,map,place,players,won,kills,assists,deaths,damage,headshots,shots,hits,survived_s,longest_kill,weapon,coins',
      });
    } catch (err) {
      console.error('[royale] load profile failed:', err.message);
    }
    rows = rows.concat(memoryRows.filter((r) => r.username === username)).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    res.json({ username, stats: summarize(rows), history: rows.slice(0, 30) });
  });
};
