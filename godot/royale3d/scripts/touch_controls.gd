class_name RoyaleTouchControls
extends Control
## PUBG-Mobile-style landscape touch layout, built on the Dungeon of Knowledge controls:
## floating move stick bottom-left with a second FIRE above it; a big FIRE bottom-right with
## AIM, RELOAD, JUMP, CROUCH and PRONE around it; contextual PICK UP / OPEN / TAKE ALL, HEAL
## and GRENADE; BAG, MAP and PAUSE top-left. Drag the right half (or FIRE) to look.
## Every button can be moved in the layout editor (Settings → Move buttons); sizes and opacity
## come from the settings, and left-handed mode mirrors the layout.

const FILL := Color(0.08, 0.1, 0.12, 0.42)
const FILL_ON := Color(0.95, 0.85, 0.45, 0.85)
const RING := Color(1, 1, 1, 0.65)
const INK := Color(1, 1, 1, 0.95)
const INK_ON := Color(0.1, 0.1, 0.1)

var game: Node
var buttons: Array[Dictionary] = []
var finger_button: Dictionary = {}
var stick_finger := -1
var stick_origin := Vector2.ZERO
var stick_home := Vector2.ZERO
var stick_vector := Vector2.ZERO
var stick_radius := 110.0
var look_fingers: Dictionary = {}
var unit := 1.0
var run_latched := false
var btn_scale := 1.0
var opacity := 0.85
var lefty := false
var vibration := true
var overrides: Dictionary = {}       ## button id -> [dx, dy] in layout units
var editing := false
var drag_id := ""
var drag_finger := -1
var _last_state := ""

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	z_index = 90
	visible = _should_show()
	resized.connect(_layout)
	_layout()

func _should_show() -> bool:
	return editing or DisplayServer.is_touchscreen_available() or RoyalePlayer.is_touch_platform() or "--touch-preview" in OS.get_cmdline_user_args()

func apply_settings(settings: Dictionary) -> void:
	btn_scale = float(settings.get("btn_scale", 1.0))
	opacity = float(settings.get("btn_opacity", 0.85))
	lefty = bool(settings.get("lefty", false))
	vibration = bool(settings.get("vibration", true))
	overrides = (settings.get("layout", {}) as Dictionary).duplicate()
	_layout()

func layout_overrides() -> Dictionary:
	return overrides.duplicate()

func reset_layout() -> void:
	overrides.clear()
	_layout()

func set_editing(on: bool) -> void:
	editing = on
	visible = _should_show()
	release_all()
	queue_redraw()

func _layout() -> void:
	var s := size
	if s.x <= 0.0 or s.y <= 0.0:
		s = get_viewport_rect().size
	var u := minf(s.x, s.y) / 720.0
	unit = u
	var k := btn_scale
	stick_radius = 110.0 * u * k
	stick_home = Vector2(stick_radius + 80.0 * u, s.y - stick_radius - 70.0 * u)
	var fire := Vector2(s.x - 150.0 * u, s.y - 160.0 * u)
	var defs := [
		["fire_r", "fire", "FIRE", fire, 88.0, "ground"],
		["fire_l", "fire", "FIRE", stick_home + Vector2(170.0, -200.0) * u, 50.0, "ground"],
		["aim", "aim", "AIM", fire + Vector2(-60.0, -170.0) * u, 50.0, "ground"],
		["reload", "reload", "RELOAD", fire + Vector2(-200.0, -70.0) * u, 46.0, "ground"],
		["jump", "jump", "JUMP", fire + Vector2(70.0, -205.0) * u, 46.0, "ground"],
		["crouch", "crouch", "CROUCH", fire + Vector2(-150.0, 90.0) * u, 42.0, "ground"],
		["prone", "prone", "PRONE", fire + Vector2(100.0, 118.0) * u, 38.0, "ground"],
		["interact", "interact", "PICK UP", Vector2(s.x * 0.62, s.y * 0.6), 54.0, "pickup"],
		["heal", "heal", "HEAL", Vector2(s.x * 0.5 - 120.0 * u, s.y - 240.0 * u), 44.0, "heal"],
		["throw", "throw", "GRENADE", fire + Vector2(-235.0, -195.0) * u, 40.0, "grenade"],
		["drop", "jump", "JUMP", Vector2(s.x - 170.0 * u, s.y * 0.55), 90.0, "plane"],
		["chute", "jump", "CHUTE", Vector2(s.x - 170.0 * u, s.y * 0.55), 80.0, "freefall"],
		["pause", "pause", "PAUSE", Vector2(58.0, 62.0) * u, 38.0, "always"],
		["map", "map", "MAP", Vector2(150.0, 62.0) * u, 38.0, "always"],
		["bag", "bag", "BAG", Vector2(242.0, 62.0) * u, 38.0, "always"],
		["run", "run", "RUN", stick_home + Vector2(-20.0, -stick_radius / u - 80.0) * u, 38.0, "ground"],
	]
	buttons.clear()
	for d in defs:
		var center: Vector2 = d[3]
		if lefty:
			center.x = s.x - center.x
		var id := String(d[0])
		if overrides.has(id):
			var o: Array = overrides[id]
			center += Vector2(float(o[0]) * (-1.0 if lefty else 1.0), float(o[1])) * u
		center = center.clamp(Vector2(30, 30) * u, s - Vector2(30, 30) * u)
		buttons.append({"id": id, "action": d[1], "label": d[2], "center": center, "radius": float(d[4]) * u * k, "when": d[5]})
	if lefty:
		stick_home.x = s.x - stick_home.x
	queue_redraw()

func _visible_button(b: Dictionary) -> bool:
	if editing:
		return true
	if game == null or game.player == null:
		return false
	var p: RoyalePlayer = game.player
	if game._ui_blocking():
		return false
	match String(b.when):
		"always": return p.is_alive()
		"ground": return p.state == "ground"
		"plane": return p.state == "plane"
		"freefall": return p.state == "freefall"
		"pickup": return p.state == "ground" and not game.interact_label().is_empty()
		"heal": return p.state == "ground" and not p.best_heal().is_empty()
		"grenade": return p.state == "ground" and p.grenades > 0
	return false

func _button_at(point: Vector2) -> Dictionary:
	for b in buttons:
		if _visible_button(b) and point.distance_to(b.center) <= float(b.radius) + 10.0 * unit:
			return b
	return {}

func _in_stick_zone(point: Vector2) -> bool:
	return point.x > size.x * 0.58 if lefty else point.x < size.x * 0.42

func _input(event: InputEvent) -> void:
	if not visible or game == null:
		return
	if editing:
		_edit_input(event)
		return
	if event is InputEventScreenTouch:
		if event.pressed:
			if game.hud and game.hud.blocks_touch(event.position):
				return
			var b := _button_at(event.position)
			if not b.is_empty():
				_press(event.index, String(b.action))
				if String(b.action) == "fire":
					look_fingers[event.index] = event.position
				get_viewport().set_input_as_handled()
			elif game._ui_blocking():
				return
			elif _in_stick_zone(event.position) and stick_finger < 0:
				stick_finger = event.index
				stick_origin = event.position
				stick_vector = Vector2.ZERO
				get_viewport().set_input_as_handled()
			elif not _in_stick_zone(event.position):
				look_fingers[event.index] = event.position
				get_viewport().set_input_as_handled()
		else:
			if event.index == stick_finger:
				stick_finger = -1
				stick_vector = Vector2.ZERO
				_apply_stick()
			look_fingers.erase(event.index)
			_release(event.index)
		queue_redraw()
	elif event is InputEventScreenDrag:
		if event.index == stick_finger:
			var offset: Vector2 = event.position - stick_origin
			if offset.length() > stick_radius:
				stick_origin = event.position - offset.normalized() * stick_radius
				offset = offset.normalized() * stick_radius
			stick_vector = offset / stick_radius
			_apply_stick()
			get_viewport().set_input_as_handled()
			queue_redraw()
		elif look_fingers.has(event.index):
			var last: Vector2 = look_fingers[event.index]
			look_fingers[event.index] = event.position
			if not game._ui_blocking():
				game.player.add_touch_look((event.position - last) / maxf(1.0, minf(size.x, size.y)))
			get_viewport().set_input_as_handled()

## Layout editor: drag a button to move it (the mouse works too, for testing on a computer).
func _edit_input(event: InputEvent) -> void:
	var pos := Vector2.ZERO
	var pressed := false
	var released := false
	var moved := false
	var finger := 0
	var delta := Vector2.ZERO
	if event is InputEventScreenTouch:
		pos = event.position; finger = event.index
		pressed = event.pressed; released = not event.pressed
	elif event is InputEventScreenDrag:
		pos = event.position; finger = event.index; moved = true; delta = event.relative
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		pos = event.position; pressed = event.pressed; released = not event.pressed
	elif event is InputEventMouseMotion and drag_finger == 0 and not drag_id.is_empty():
		pos = event.position; moved = true; delta = event.relative
	else:
		return
	if pressed and game.hud and game.hud.blocks_touch(pos):
		return
	if pressed:
		var b := _button_at(pos)
		if not b.is_empty():
			drag_id = String(b.id)
			drag_finger = finger
			get_viewport().set_input_as_handled()
	elif moved and not drag_id.is_empty() and finger == drag_finger:
		var o: Array = overrides.get(drag_id, [0.0, 0.0])
		overrides[drag_id] = [float(o[0]) + delta.x / unit * (-1.0 if lefty else 1.0), float(o[1]) + delta.y / unit]
		_layout()
		get_viewport().set_input_as_handled()
	elif released and finger == drag_finger:
		drag_id = ""
		drag_finger = -1
		queue_redraw()

func _apply_stick() -> void:
	var v := stick_vector if stick_vector.length() > 0.16 else Vector2.ZERO
	for pair in [["move_left", -v.x], ["move_right", v.x], ["move_forward", -v.y], ["move_back", v.y]]:
		if float(pair[1]) > 0.0: Input.action_press(String(pair[0]), clampf(float(pair[1]) * 1.15, 0.0, 1.0))
		else: Input.action_release(String(pair[0]))
	if not run_latched:
		if v.y < -0.92: Input.action_press("run")
		else: Input.action_release("run")

func _press(finger: int, action: String) -> void:
	if vibration:
		Input.vibrate_handheld(12)
	match action:
		"pause": game.toggle_pause(); return
		"map": game.toggle_map(); return
		"bag": game.hud.toggle_backpack(); return
		"aim": game.player.aiming = not game.player.aiming; return
		"reload": game.player.start_reload(); return
		"heal": game.player.start_heal(); return
		"interact": game.pickup_nearby(); return
		"throw": game.throw_grenade(); return
		"run":
			run_latched = not run_latched
			if run_latched: Input.action_press("run")
			else: Input.action_release("run")
			return
	finger_button[finger] = action
	Input.action_press(action)

func _release(finger: int) -> void:
	if not finger_button.has(finger):
		return
	var action := String(finger_button[finger])
	finger_button.erase(finger)
	if not finger_button.values().has(action):
		Input.action_release(action)

func release_all() -> void:
	for action in ["move_left", "move_right", "move_forward", "move_back", "run", "fire", "jump", "crouch", "prone"]:
		Input.action_release(action)
	finger_button.clear()
	look_fingers.clear()
	stick_finger = -1
	stick_vector = Vector2.ZERO
	run_latched = false

func _draw() -> void:
	if game == null or game.player == null:
		return
	if game._ui_blocking() and not editing:
		return
	var u := unit
	var font := ThemeDB.fallback_font
	var a := opacity
	if editing or game.player.state in ["ground", "freefall", "parachute"]:
		var base := stick_origin if stick_finger >= 0 else stick_home
		draw_circle(base, stick_radius, Color(0, 0, 0, 0.25 * a))
		draw_arc(base, stick_radius, 0, TAU, 56, Color(RING, RING.a * a), 3.0 * u, true)
		draw_circle(base + stick_vector * stick_radius, 46.0 * u * btn_scale, FILL_ON if stick_finger >= 0 else Color(1, 1, 1, 0.35 * a))
	for b in buttons:
		if not _visible_button(b):
			continue
		var action := String(b.action)
		var on := Input.is_action_pressed(action) if action in ["fire", "jump", "crouch", "prone"] else false
		if action == "aim": on = game.player.aiming
		if action == "run": on = run_latched
		if action == "crouch": on = game.player.stance == "crouch"
		if action == "prone": on = game.player.stance == "prone"
		var c: Vector2 = b.center
		var r := float(b.radius)
		var fill := FILL_ON if on else FILL
		if action == "fire": fill = Color(0.85, 0.2, 0.2, 0.75) if on else Color(0.75, 0.15, 0.15, 0.5)
		if action == "interact": fill = Color(0.95, 0.75, 0.25, 0.8)
		if editing and String(b.id) == drag_id: fill = Color(0.3, 0.7, 1.0, 0.8)
		draw_circle(c, r, Color(fill, fill.a * a))
		draw_arc(c, r, 0, TAU, 48, Color(RING, RING.a * a) if not editing else Color(0.4, 0.8, 1.0, 0.9), 3.0 * u, true)
		var label: String = String(b.label)
		if action == "interact" and not editing:
			label = game.interact_label()
		draw_string(font, c + Vector2(-r, r * 0.12), label, HORIZONTAL_ALIGNMENT_CENTER, r * 2.0, int(clampf(r * 0.34, 13.0 * u, 24.0 * u)), INK_ON if on or action == "interact" else INK)

## Redraw only when something visible changes (vector redraws every frame cost frame rate).
func _process(_delta: float) -> void:
	if not visible or game == null or game.player == null:
		return
	var p: RoyalePlayer = game.player
	var st := "%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s" % [p.state, p.stance, p.aiming, stick_finger, stick_vector.snapped(Vector2(0.03, 0.03)), Input.is_action_pressed("fire"), game._ui_blocking(), game.interact_label(), p.best_heal().is_empty(), p.grenades > 0, editing, drag_id]
	if st != _last_state:
		_last_state = st
		queue_redraw()
