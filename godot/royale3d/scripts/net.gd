class_name RoyaleNet
extends Node
## Room matches with classmates. The app page (features/rooms/rooms.js) owns the Socket.IO
## connection; this node reads the match with classAppRooms.takeMatch() and exchanges messages
## through classAppRooms.send() / drain() via JavaScriptBridge.
##
## Who decides what:
## - every player moves their own survivor and reports hits they land ("hit" to a classmate,
##   "bhit" to the host for a bot); the victim's game applies armour, health and death;
## - the host runs the bots, the zone, supply drops and the plane route, and sends them out;
## - everyone builds the same island and starting loot from the room's seed, and reports
##   pickups, drops, crate changes and doors so the loot stays the same for everybody.

const STATE_EVERY := 0.066      ## my survivor, ~15 a second
const BOTS_EVERY := 0.12        ## host: bot positions, ~8 a second
const READY_TIMEOUT := 25.0     ## host starts the plane even if a slow phone is still loading
const BOT_STATES := ["plane", "freefall", "parachute", "ground", "dead"]
const BOT_ANIMS := ["Idle", "Running_A", "Walking_A", "2H_Ranged_Aiming", "2H_Ranged_Shoot", "2H_Ranged_Reload",
	"Jump_Idle", "Use_Item", "Unarmed_Melee_Attack_Punch_A", "Death_A"]

var game: Node
var active := false
var is_host := false
var me := ""                     ## my username
var my_name := ""                ## my name in this match
var host := ""
var seed_value := 0
var players: Array = []          ## [{username, name}]
var remotes := {}                ## username -> RoyaleRemote
var started := false             ## the plane has left
var mode := "room"               ## "duo" / "squad" = everyone in the room is one team
var map_id := "sentinel"
var _ready_users := {}
var _wait := 0.0
var _state_t := 0.0
var _bots_t := 0.0
var _drop_n := 0
var _out: Array = []
var _flush_t := 0.0
var _bot_shots: Array = []
var _gone := {}                 ## players who closed their game or left the room

func read_match() -> bool:
	if not OS.has_feature("web"):
		return false
	var raw = JavaScriptBridge.eval("(function(){try{var r=window.parent.classAppRooms;return r?r.takeMatch():'';}catch(e){return '';}})()", true)
	if typeof(raw) != TYPE_STRING or String(raw).is_empty():
		return false
	var m = JSON.parse_string(raw)
	if typeof(m) != TYPE_DICTIONARY or not m.has("players"):
		return false
	me = String(m.get("me", ""))
	host = String(m.get("host", ""))
	seed_value = int(m.get("seed", 1))
	mode = String(m.get("mode", "room"))
	map_id = String(m.get("map", "sentinel"))
	players = m.players
	is_host = me == host
	for p in players:
		if String(p.username) == me:
			my_name = String(p.name)
	active = not me.is_empty() and players.size() > 1
	return active

func human_names() -> Array:
	return players.map(func(p): return String(p.name))

## Messages are queued and sent together ~20 times a second (the server limits messages per second).
func send(msg: Dictionary) -> void:
	if active:
		_out.append(msg)

func _flush() -> void:
	var batch: Array = []
	var size := 0
	for msg in _out:
		var text := JSON.stringify(msg)
		if size + text.length() > 7000 and not batch.is_empty():
			_emit(batch)
			batch = []
			size = 0
		batch.append(text)
		size += text.length() + 1
	if not batch.is_empty():
		_emit(batch)
	_out.clear()

func _emit(texts: Array) -> void:
	JavaScriptBridge.eval("(function(m){try{window.parent.classAppRooms.send(m);}catch(e){}})({\"t\":\"batch\",\"m\":[%s]})" % ",".join(texts), true)

func _drain() -> Array:
	var raw = JavaScriptBridge.eval("(function(){try{return window.parent.classAppRooms.drain();}catch(e){return '[]';}})()", true)
	if typeof(raw) != TYPE_STRING:
		return []
	var list = JSON.parse_string(raw)
	return list if typeof(list) == TYPE_ARRAY else []

static func v3(a: Vector3) -> Array:
	return [snappedf(a.x, 0.01), snappedf(a.y, 0.01), snappedf(a.z, 0.01)]

static func to_v3(a) -> Vector3:
	if typeof(a) != TYPE_ARRAY or (a as Array).size() < 3:
		return Vector3.ZERO
	return Vector3(float(a[0]), float(a[1]), float(a[2]))

## Item dictionaries without the scene node / path, for sending.
static func clean_item(item: Dictionary) -> Dictionary:
	var out := {}
	for k in ["type", "id", "count", "level", "hp", "mag"]:
		if item.has(k):
			out[k] = item[k]
	return out

static func clean_items(items: Array) -> Array:
	return items.map(func(it): return clean_item(it))

# ── Per-frame ────────────────────────────────────────────────

func tick(delta: float) -> void:
	if not active:
		return
	for m in _drain():
		if typeof(m) == TYPE_DICTIONARY:
			_handle(m)
	_flush_t -= delta
	if _flush_t <= 0.0 and not _out.is_empty():
		_flush_t = 0.05
		_flush()
	if not started:
		_wait += delta
		if is_host and (_ready_users.size() >= players.size() - 1 or _wait > READY_TIMEOUT):
			_host_go()
		elif not is_host and int(_wait * 2.0) != int((_wait - delta) * 2.0):
			send({"t": "ready"})   # repeat until the host starts (the host may load after us)
		return
	if debug:
		_debug_tick(delta)
	_state_t -= delta
	if _state_t <= 0.0:
		_state_t = STATE_EVERY
		_send_my_state()
	if is_host:
		_bots_t -= delta
		if _bots_t <= 0.0:
			_bots_t = BOTS_EVERY
			_send_bots()

func _host_go() -> void:
	started = true
	game.begin_plane()
	send({"t": "go", "a": [snappedf(game.plane_start.x, 0.01), snappedf(game.plane_start.y, 0.01)], "b": [snappedf(game.plane_end.x, 0.01), snappedf(game.plane_end.y, 0.01)]})

func _send_my_state() -> void:
	var p: RoyalePlayer = game.player
	var flags := (1 if p.aiming or p.trigger_held else 0) | (2 if p.reloading > 0.0 else 0) | (4 if p.healing > 0.0 else 0) | (8 if p._throw_t > 0.0 else 0)
	if p.vehicle and p.vehicle.kind != "boat": flags |= 16   # seated in a car / on a motorcycle
	if p.vehicle and p.vehicle.kind == "car": flags |= 32
	send({"t": "p", "p": v3(p.global_position), "y": snappedf(p.global_rotation.y + PI, 0.01), "s": p.state, "c": p.stance,
		"g": String(p.current_gun().get("id", "")), "hp": int(p.health), "f": flags, "ap": snappedf(p.pitch, 0.02),
		"o": p.outfit, "k": p.weapon_skin})

func _send_bots() -> void:
	var list := []
	for b: RoyaleBot in game.bots:
		list.append([snappedf(b.global_position.x, 0.01), snappedf(b.global_position.y, 0.01), snappedf(b.global_position.z, 0.01),
			snappedf(b.rotation.y, 0.01), BOT_STATES.find(b.state), maxi(0, BOT_ANIMS.find(b.current_anim)), int(b.health), b.gun_id, 1 if b.crouched else 0])
	send({"t": "bots", "b": list, "s": _bot_shots.slice(0, 40)})
	_bot_shots.clear()

# ── Messages ─────────────────────────────────────────────────

func _handle(m: Dictionary) -> void:
	var from := String(m.get("from", ""))
	if String(m.get("t", "")) == "batch":
		for inner in m.get("m", []):
			if typeof(inner) == TYPE_DICTIONARY:
				inner["from"] = from
				_handle(inner)
		return
	var r: RoyaleRemote = remotes.get(from)
	match String(m.get("t", "")):
		"ready":
			_ready_users[from] = true
		"go":
			if not started and from == host:
				started = true
				var a: Array = m.get("a", [0, 0])
				var b: Array = m.get("b", [0, 0])
				game.begin_plane(Vector2(float(a[0]), float(a[1])), Vector2(float(b[0]), float(b[1])))
		"p":
			if r: r.apply_state(m)
		"shot":
			if r:
				r.show_shot()
				game.remote_shot(to_v3(m.get("o")), to_v3(m.get("e")), String(m.get("g", "")))
		"hit":
			if String(m.get("to", "")) == me and game.player.is_alive():
				game.player.take_damage(float(m.get("d", 0.0)), bool(m.get("h", false)), String(m.get("by", "")))
				game.hud.damage_flash(float(m.get("d", 0.0)))
		"died":
			if r and r.is_alive():
				r.death_items = m.get("items", [])
				r.die()
				game.on_combatant_died(r, String(m.get("by", "")))
		"quit":
			_player_left(from)
		"take":
			game.net_take(String(m.get("u", "")))
		"add":
			game.net_add(m.get("item", {}), to_v3(m.get("p")), String(m.get("u", "")))
		"crate_set":
			game.net_crate_set(String(m.get("c", "")), m.get("items", []))
		"crate":
			if from == host:
				game.net_supply_crate(String(m.get("id", "")), String(m.get("k", "supply")), String(m.get("l", "")), m.get("items", []), to_v3(m.get("p")))
		"door":
			game.net_door(int(m.get("i", -1)), bool(m.get("o", false)))
		"veh", "vin", "vout":
			game.net_vehicle(m, from)
		"nade":
			game.explosion_effect(to_v3(m.get("p")))
		"rocket":
			game.remote_rocket(to_v3(m.get("o")), to_v3(m.get("d")))
		"zone":
			if from == host and not is_host:
				game.net_zone(m)
		"bots":
			if from == host and not is_host:
				_apply_bots(m.get("b", []))
				for s in m.get("s", []):
					if typeof(s) == TYPE_ARRAY and (s as Array).size() >= 4:
						game.net_bot_shot(int(s[0]), Vector3(float(s[1]), float(s[2]), float(s[3])))
		"bhit":
			if is_host:
				var i := int(m.get("i", -1))
				if i >= 0 and i < game.bots.size():
					game.bots[i].take_damage(float(m.get("d", 0.0)), bool(m.get("h", false)), String(m.get("by", "")))
		"bdied":
			if from == host and not is_host:
				game.net_bot_died(int(m.get("i", -1)), String(m.get("by", "")), m.get("items", []))
		"left":
			_player_left(String(m.get("u", "")))
		"host":
			_new_host(String(m.get("u", "")))

func _player_left(username: String) -> void:
	_gone[username] = true
	if username == host:
		# The host closed their game: the next player still in the match runs bots and zone
		for p in players:
			if not _gone.has(String(p.username)):
				_new_host(String(p.username))
				break
	var r: RoyaleRemote = remotes.get(username)
	if r == null or r.left_match:
		return
	var was_alive := r.is_alive()
	r.leave()
	if was_alive:
		game.remote_left(r)

## The host left: the next player takes over the bots, the zone and supply drops.
func _new_host(username: String) -> void:
	host = username
	if username != me or is_host:
		return
	is_host = true
	for b: RoyaleBot in game.bots:
		b.puppet = false
		b.think_timer = 0.0
	if not started:
		_wait = READY_TIMEOUT   # start the plane right away
	game.hud.flash_message("You are now the host of this match", 3.0)

func _apply_bots(list: Array) -> void:
	for i in mini(list.size(), game.bots.size()):
		var row = list[i]
		if typeof(row) == TYPE_ARRAY and (row as Array).size() >= 8:
			game.bots[i].apply_snapshot(row)

## Host: a bot fired (guests draw the tracer and play the sound when it's near them).
func bot_shot(index: int, aim: Vector3) -> void:
	_bot_shots.append([index, snappedf(aim.x, 0.01), snappedf(aim.y, 0.01), snappedf(aim.z, 0.01)])

## ?nettest=1 (developer check): print what this game sees every 3 s, and the host lands a
## 150-damage test hit on the first classmate every 4 s once both are on the ground.
var debug := false
var _debug_t := 0.0
var _debug_hit_t := 0.0

func _debug_tick(delta: float) -> void:
	_debug_t -= delta
	if _debug_t <= 0.0:
		_debug_t = 3.0
		var rs := []
		for r: RoyaleRemote in remotes.values():
			rs.append("%s %s %s hp=%d alive=%s" % [r.combatant_name, r.state, v3(r.global_position), int(r.health), r.is_alive()])
		var b0: RoyaleBot = game.bots[0]
		print("NETDBG me=%s host=%s phase=%s my=%s %s hp=%d alive=%d zone=%d loot=%d crates=%d bot0=%s %s %s remotes=%s" % [
			my_name, is_host, game.phase, game.player.state, v3(game.player.global_position), int(game.player.health),
			game.alive_count(), int(game.zone.phase), game.loot_items.size(), game.crates.size(),
			b0.combatant_name, b0.state, v3(b0.global_position), rs])
	if is_host and game.player.state == "ground":
		_debug_hit_t -= delta
		if _debug_hit_t <= 0.0:
			_debug_hit_t = 4.0
			for r: RoyaleRemote in remotes.values():
				if r.is_alive() and r.state == "ground":
					r.take_damage(150.0, false, my_name)
					print("NETDBG test hit -> %s" % r.combatant_name)
					break

func next_drop_id() -> String:
	_drop_n += 1
	return "%s#%d" % [me, _drop_n]
