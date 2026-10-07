/* Battle Royale 3D rooms: a player makes a room, invites classmates who are online, and the
 * host starts one match for everyone in it. During the match the server only relays game
 * messages between the room's players (the host's game runs the bots and the zone).
 * Identity comes from the socket's verified 'identify' (socket.data.username), never from
 * the message body. */
const crypto = require('crypto');

const MAX_PLAYERS = 8;
const MAX_NET_BYTES = 8000;        // one game message (the host's bot snapshot is ~2 KB)
const NET_PER_SECOND = 60;         // per socket
const RECONNECT_GRACE_MS = 15000;  // a dropped phone connection can come back without losing its seat

module.exports = function setupRoyaleRooms(io) {
  const rooms = new Map();         // roomId -> { id, host, members: [{ username, displayName }], invited: Set, state, seed }
  const roomOf = new Map();        // username -> roomId
  const leaveTimers = new Map();   // username -> timeout while reconnecting
  const lastInvite = new Map();    // "from>to" -> time

  const socketsOf = (username) => [...io.sockets.sockets.values()].filter((s) => s.data.username === username);
  const cleanName = (value, fallback) => String(value || fallback || '').replace(/[<>\n\r\t]/g, '').trim().slice(0, 24) || fallback;
  const channel = (room) => `royale-room:${room.id}`;

  function publicRoom(room) {
    return { id: room.id, host: room.host, state: room.state, members: room.members, invited: [...room.invited], max: MAX_PLAYERS };
  }

  function sendUpdate(room) {
    io.to(channel(room)).emit('room:update', publicRoom(room));
  }

  function leaveRoom(username, reason = 'left') {
    const id = roomOf.get(username);
    const room = id && rooms.get(id);
    roomOf.delete(username);
    if (!room) return;
    room.members = room.members.filter((m) => m.username !== username);
    socketsOf(username).forEach((s) => { s.leave(channel(room)); s.emit('room:update', null); });
    if (!room.members.length) { rooms.delete(room.id); return; }
    io.to(channel(room)).emit('room:net', { from: 'server', t: 'left', u: username, why: reason });
    if (room.host === username) {
      room.host = room.members[0].username;
      io.to(channel(room)).emit('room:net', { from: 'server', t: 'host', u: room.host });
    }
    sendUpdate(room);
  }

  function joinSocketToRoom(socket, room) {
    socket.join(channel(room));
    socket.emit('room:update', publicRoom(room));
  }

  io.on('connection', (socket) => {
    const me = () => socket.data.username;
    let budget = NET_PER_SECOND;
    let budgetAt = Date.now();

    const fail = (ack, message) => { if (typeof ack === 'function') ack({ ok: false, error: message }); };

    // After a reconnect the app asks to get its seat back
    socket.on('room:resume', () => {
      const username = me();
      if (!username) return;
      clearTimeout(leaveTimers.get(username));
      leaveTimers.delete(username);
      const room = rooms.get(roomOf.get(username));
      if (room) joinSocketToRoom(socket, room);
      else socket.emit('room:update', null);
    });

    socket.on('room:create', (payload = {}, ack) => {
      const username = me();
      if (!username) return fail(ack, 'Sign in again to make a room.');
      const current = rooms.get(roomOf.get(username));
      if (current) { joinSocketToRoom(socket, current); if (typeof ack === 'function') ack({ ok: true, room: publicRoom(current) }); return; }
      const room = {
        id: crypto.randomBytes(5).toString('hex'),
        host: username,
        members: [{ username, displayName: cleanName(payload.displayName, username) }],
        invited: new Set(),
        state: 'lobby',
        seed: 0,
      };
      rooms.set(room.id, room);
      roomOf.set(username, room.id);
      socketsOf(username).forEach((s) => joinSocketToRoom(s, room));
      if (typeof ack === 'function') ack({ ok: true, room: publicRoom(room) });
    });

    socket.on('room:invite', (payload = {}, ack) => {
      const username = me();
      const room = rooms.get(roomOf.get(username));
      const to = String(payload.to || '').trim();
      if (!room) return fail(ack, 'Make a room first.');
      if (!to || to === username) return fail(ack, 'Pick someone else to invite.');
      if (room.members.some((m) => m.username === to)) return fail(ack, 'They are already in your room.');
      if (room.members.length >= MAX_PLAYERS) return fail(ack, `Rooms hold up to ${MAX_PLAYERS} players.`);
      const targets = socketsOf(to);
      if (!targets.length) return fail(ack, 'They are not online right now.');
      const key = `${username}>${to}`;
      if (Date.now() - (lastInvite.get(key) || 0) < 4000) return fail(ack, 'Invite already sent.');
      lastInvite.set(key, Date.now());
      room.invited.add(to);
      const from = room.members.find((m) => m.username === username);
      targets.forEach((s) => s.emit('room:invited', { roomId: room.id, from: username, fromName: from?.displayName || username, count: room.members.length }));
      sendUpdate(room);
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('room:decline', (payload = {}) => {
      const username = me();
      const room = rooms.get(String(payload.roomId || ''));
      if (!username || !room || !room.invited.has(username)) return;
      room.invited.delete(username);
      socketsOf(room.host).forEach((s) => s.emit('room:declined', { username }));
      sendUpdate(room);
    });

    socket.on('room:join', (payload = {}, ack) => {
      const username = me();
      const room = rooms.get(String(payload.roomId || ''));
      if (!username) return fail(ack, 'Sign in again to join.');
      if (!room) return fail(ack, 'That room is closed.');
      if (!room.invited.has(username) && !room.members.some((m) => m.username === username)) return fail(ack, 'You need an invite to join this room.');
      if (room.state !== 'lobby') return fail(ack, 'That match already started.');
      if (room.members.length >= MAX_PLAYERS && !room.members.some((m) => m.username === username)) return fail(ack, 'That room is full.');
      if (roomOf.get(username) && roomOf.get(username) !== room.id) leaveRoom(username);
      if (!room.members.some((m) => m.username === username)) {
        room.members.push({ username, displayName: cleanName(payload.displayName, username) });
      }
      room.invited.delete(username);
      roomOf.set(username, room.id);
      socketsOf(username).forEach((s) => joinSocketToRoom(s, room));
      sendUpdate(room);
      if (typeof ack === 'function') ack({ ok: true, room: publicRoom(room) });
    });

    socket.on('room:leave', () => { if (me()) leaveRoom(me()); });

    socket.on('room:start', (payload = {}, ack) => {
      const username = me();
      const room = rooms.get(roomOf.get(username));
      if (!room || room.host !== username) return fail(ack, 'Only the host can start.');
      if (room.members.length < 2) return fail(ack, 'Invite at least one classmate first.');
      room.state = 'playing';
      room.seed = crypto.randomInt(1, 2147483647);
      io.to(channel(room)).emit('room:start', { roomId: room.id, seed: room.seed, host: room.host, players: room.members });
      sendUpdate(room);
      if (typeof ack === 'function') ack({ ok: true });
    });

    // The host returns the room to the lobby so a new match can be started
    socket.on('room:back', () => {
      const room = rooms.get(roomOf.get(me()));
      if (!room || room.host !== me() || room.state === 'lobby') return;
      room.state = 'lobby';
      sendUpdate(room);
    });

    socket.on('room:net', (payload) => {
      const username = me();
      const room = rooms.get(roomOf.get(username));
      if (!room || !payload || typeof payload !== 'object' || typeof payload.t !== 'string') return;
      const now = Date.now();
      budget = Math.min(NET_PER_SECOND, budget + ((now - budgetAt) / 1000) * NET_PER_SECOND);
      budgetAt = now;
      if (budget < 1) return;
      budget -= 1;
      let size = 0;
      try { size = JSON.stringify(payload).length; } catch { return; }
      if (size > MAX_NET_BYTES) return;
      socket.to(channel(room)).emit('room:net', { ...payload, from: username });
    });

    socket.on('disconnect', () => {
      const username = me();
      if (!username || !roomOf.has(username)) return;
      if (socketsOf(username).some((s) => s.id !== socket.id)) return;
      clearTimeout(leaveTimers.get(username));
      leaveTimers.set(username, setTimeout(() => {
        leaveTimers.delete(username);
        if (!socketsOf(username).length) leaveRoom(username, 'disconnected');
      }, RECONNECT_GRACE_MS));
    });
  });
};
