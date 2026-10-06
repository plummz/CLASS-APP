class_name RoyaleHud
extends Control
## Heads-up display in the PUBG / Rules of Survival style: compass, alive and kill counts,
## minimap with the safe zone, health / boost bars, vest and helmet, weapon slots with ammo,
## crosshair, scope, hit markers, kill feed, damage flash, full map, pause menu and results.

signal play_again
signal quit_to_arcade
signal settings_changed

var game: Node
var compass: Control
var minimap: Control
var crosshair: Control
var scope: Control
var big_map: Control
var alive_label: Label
var kills_label: Label
var zone_label: Label
var prompt_label: Label
var message_label: Label
var progress_label: Label
var feed: VBoxContainer
var health_back: ColorRect
var health_fill: ColorRect
var boost_fill: ColorRect
var gear_label: Label
var slot_panels: Array[PanelContainer] = []
var slot_labels: Array[Label] = []
var meds_label: Label
var vignette: ColorRect
var pause_panel: PanelContainer
var end_panel: PanelContainer
var end_title: Label
var end_stats: Label
var message_time := 0.0
var hit_time := 0.0
var hit_kill := false
var map_open := false
var paused := false
var ui_scale := 1.0
var _redraw_clock := 0.0

func setup(game_ref: Node) -> void:
	game = game_ref
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	z_index = 50
	var touch := RoyalePlayer.is_touch_platform() or DisplayServer.is_touchscreen_available()
	ui_scale = 1.25 if touch else 1.0
	_build()

func _label(text: String, size: int, color := Color.WHITE) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", int(size * ui_scale))
	l.add_theme_color_override("font_color", color)
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	l.add_theme_constant_override("outline_size", int(5 * ui_scale))
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l

func _panel_style(alpha := 0.45, radius := 10) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.05, 0.07, 0.09, alpha)
	sb.set_corner_radius_all(radius)
	sb.content_margin_left = 10
	sb.content_margin_right = 10
	sb.content_margin_top = 6
	sb.content_margin_bottom = 6
	return sb

func _build() -> void:
	var s := ui_scale
	vignette = ColorRect.new()
	vignette.color = Color(0.8, 0.0, 0.0, 0.0)
	vignette.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(vignette)

	scope = Control.new()
	scope.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	scope.mouse_filter = Control.MOUSE_FILTER_IGNORE
	scope.visible = false
	scope.draw.connect(_draw_scope)
	add_child(scope)

	crosshair = Control.new()
	crosshair.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	crosshair.mouse_filter = Control.MOUSE_FILTER_IGNORE
	crosshair.draw.connect(_draw_crosshair)
	add_child(crosshair)

	compass = Control.new()
	compass.mouse_filter = Control.MOUSE_FILTER_IGNORE
	compass.set_anchors_preset(Control.PRESET_CENTER_TOP)
	compass.size = Vector2(420, 34) * s
	compass.position = Vector2(-210 * s, 8)
	compass.draw.connect(_draw_compass)
	add_child(compass)

	var top_right := VBoxContainer.new()
	top_right.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	top_right.position = Vector2(-230 * s, 10)
	top_right.size = Vector2(220 * s, 260 * s)
	top_right.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top_right.alignment = BoxContainer.ALIGNMENT_BEGIN
	add_child(top_right)
	minimap = Control.new()
	minimap.custom_minimum_size = Vector2(200, 200) * s
	minimap.clip_contents = true
	minimap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	minimap.draw.connect(_draw_minimap)
	top_right.add_child(minimap)
	var counts := HBoxContainer.new()
	counts.mouse_filter = Control.MOUSE_FILTER_IGNORE
	alive_label = _label("Alive 30", 17)
	kills_label = _label("Kills 0", 17, Color("ffd36b"))
	counts.add_child(alive_label)
	counts.add_child(kills_label)
	counts.add_theme_constant_override("separation", int(16 * s))
	top_right.add_child(counts)
	zone_label = _label("", 15, Color("8fd3ff"))
	top_right.add_child(zone_label)

	feed = VBoxContainer.new()
	feed.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	feed.position = Vector2(-470 * s, 52 * s)
	feed.size = Vector2(230 * s, 160 * s)
	feed.mouse_filter = Control.MOUSE_FILTER_IGNORE
	feed.alignment = BoxContainer.ALIGNMENT_BEGIN
	add_child(feed)

	message_label = _label("", 22, Color("ffe7a3"))
	message_label.set_anchors_preset(Control.PRESET_CENTER)
	message_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	message_label.size = Vector2(700, 40) * s
	message_label.position = Vector2(-350 * s, -150 * s)
	add_child(message_label)

	prompt_label = _label("", 19)
	prompt_label.set_anchors_preset(Control.PRESET_CENTER)
	prompt_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	prompt_label.size = Vector2(600, 40) * s
	prompt_label.position = Vector2(-300 * s, 70 * s)
	add_child(prompt_label)

	progress_label = _label("", 18, Color("b6f5c8"))
	progress_label.set_anchors_preset(Control.PRESET_CENTER)
	progress_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	progress_label.size = Vector2(400, 40) * s
	progress_label.position = Vector2(-200 * s, 30 * s)
	add_child(progress_label)

	# Bottom centre: weapon slots, gear, health and boost
	var bottom := VBoxContainer.new()
	bottom.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	bottom.size = Vector2(440, 120) * s
	bottom.position = Vector2(-220 * s, -128 * s)
	bottom.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bottom.add_theme_constant_override("separation", int(4 * s))
	add_child(bottom)
	var slots_row := HBoxContainer.new()
	slots_row.alignment = BoxContainer.ALIGNMENT_CENTER
	slots_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	slots_row.add_theme_constant_override("separation", int(8 * s))
	bottom.add_child(slots_row)
	for i in 2:
		var panel := PanelContainer.new()
		panel.add_theme_stylebox_override("panel", _panel_style())
		panel.custom_minimum_size = Vector2(150, 0) * s
		panel.mouse_filter = Control.MOUSE_FILTER_STOP
		var lbl := _label("—", 16)
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		panel.add_child(lbl)
		var idx := i
		panel.gui_input.connect(func(ev: InputEvent):
			if (ev is InputEventMouseButton and ev.pressed) or (ev is InputEventScreenTouch and ev.pressed):
				game.player.switch_slot(idx))
		slots_row.add_child(panel)
		slot_panels.append(panel)
		slot_labels.append(lbl)
	meds_label = _label("", 14, Color(1, 1, 1, 0.85))
	meds_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	bottom.add_child(meds_label)
	gear_label = _label("", 14, Color("cfe8ff"))
	gear_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	bottom.add_child(gear_label)
	var bars := Control.new()
	bars.custom_minimum_size = Vector2(440, 22) * s
	bars.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bottom.add_child(bars)
	boost_fill = ColorRect.new()
	boost_fill.color = Color("f2994a")
	boost_fill.position = Vector2(0, 0)
	boost_fill.size = Vector2(0, 4 * s)
	bars.add_child(boost_fill)
	health_back = ColorRect.new()
	health_back.color = Color(0, 0, 0, 0.5)
	health_back.position = Vector2(0, 7 * s)
	health_back.size = Vector2(440, 13) * s
	bars.add_child(health_back)
	health_fill = ColorRect.new()
	health_fill.color = Color(0.95, 0.95, 0.95, 0.95)
	health_fill.position = health_back.position
	health_fill.size = health_back.size
	bars.add_child(health_fill)

	big_map = Control.new()
	big_map.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	big_map.mouse_filter = Control.MOUSE_FILTER_IGNORE
	big_map.visible = false
	big_map.draw.connect(_draw_big_map)
	add_child(big_map)

	_build_pause()
	_build_end()

func _button(text: String, cb: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(260, 52) * ui_scale
	b.add_theme_font_size_override("font_size", int(20 * ui_scale))
	b.pressed.connect(cb)
	return b

func _build_pause() -> void:
	pause_panel = PanelContainer.new()
	pause_panel.add_theme_stylebox_override("panel", _panel_style(0.88, 16))
	pause_panel.set_anchors_preset(Control.PRESET_CENTER)
	pause_panel.visible = false
	add_child(pause_panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", int(10 * ui_scale))
	pause_panel.add_child(box)
	var title := _label("Paused", 28)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(title)
	box.add_child(_slider_row("Look speed", 0.3, 2.5, game.settings.sensitivity, func(v): game.settings.sensitivity = v; settings_changed.emit()))
	box.add_child(_slider_row("Volume", 0.0, 1.0, game.settings.volume, func(v): game.settings.volume = v; settings_changed.emit()))
	var quality := CheckButton.new()
	quality.text = "High graphics (shadows, grass)"
	quality.button_pressed = not bool(game.settings.low)
	quality.add_theme_font_size_override("font_size", int(17 * ui_scale))
	quality.toggled.connect(func(on): game.settings.low = not on; settings_changed.emit())
	box.add_child(quality)
	box.add_child(_button("Resume", func(): game.toggle_pause()))
	box.add_child(_button("Leave match", func(): quit_to_arcade.emit()))
	pause_panel.resized.connect(func(): pause_panel.position = -pause_panel.size * 0.5)

func _slider_row(text: String, lo: float, hi: float, value: float, cb: Callable) -> HBoxContainer:
	var row := HBoxContainer.new()
	var l := _label(text, 17)
	l.custom_minimum_size = Vector2(130, 0) * ui_scale
	row.add_child(l)
	var slider := HSlider.new()
	slider.min_value = lo
	slider.max_value = hi
	slider.step = 0.05
	slider.value = value
	slider.custom_minimum_size = Vector2(200, 36) * ui_scale
	slider.value_changed.connect(cb)
	row.add_child(slider)
	return row

func _build_end() -> void:
	end_panel = PanelContainer.new()
	end_panel.add_theme_stylebox_override("panel", _panel_style(0.9, 18))
	end_panel.set_anchors_preset(Control.PRESET_CENTER)
	end_panel.visible = false
	add_child(end_panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", int(12 * ui_scale))
	end_panel.add_child(box)
	end_title = _label("", 34, Color("ffd36b"))
	end_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(end_title)
	end_stats = _label("", 20)
	end_stats.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(end_stats)
	box.add_child(_button("Play again", func(): play_again.emit()))
	box.add_child(_button("Back to Arcade", func(): quit_to_arcade.emit()))
	end_panel.resized.connect(func(): end_panel.position = -end_panel.size * 0.5)

# ── Updates ──────────────────────────────────────────────────

func flash_message(text: String, seconds := 2.6) -> void:
	message_label.text = text
	message_time = seconds

func add_feed(text: String, mine := false) -> void:
	var l := _label(text, 14, Color("ffd36b") if mine else Color(1, 1, 1, 0.92))
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	feed.add_child(l)
	while feed.get_child_count() > 5:
		feed.get_child(0).queue_free()
	get_tree().create_timer(7.0).timeout.connect(func(): if is_instance_valid(l): l.queue_free())

func hitmarker(kill: bool) -> void:
	hit_time = 0.25
	hit_kill = kill
	crosshair.queue_redraw()

func damage_flash(amount: float) -> void:
	vignette.color.a = clampf(vignette.color.a + amount / 120.0, 0.0, 0.45)

func show_pause(on: bool) -> void:
	paused = on
	pause_panel.visible = on

func show_end(won: bool, placement: int, kills: int, coins: int) -> void:
	end_title.text = "WINNER WINNER\nCHICKEN DINNER!" if won else "#%d of %d" % [placement, game.total_players]
	end_stats.text = "Kills: %d\nPlace: #%d\nCoins earned: +%d" % [kills, placement, coins]
	end_panel.visible = true

func _process(delta: float) -> void:
	if game == null or game.player == null:
		return
	var p: RoyalePlayer = game.player
	if message_time > 0.0:
		message_time -= delta
		message_label.modulate.a = clampf(message_time, 0.0, 1.0)
	vignette.color.a = move_toward(vignette.color.a, 0.0, delta * 0.6)
	if p.health < 25.0 and p.is_alive():
		vignette.color.a = maxf(vignette.color.a, 0.12 + sin(Time.get_ticks_msec() * 0.006) * 0.05)
	alive_label.text = "Alive %d" % game.alive_count()
	kills_label.text = "Kills %d" % p.kills
	zone_label.text = game.zone_text()
	var w := health_back.size.x
	health_fill.size.x = w * clampf(p.health / 100.0, 0.0, 1.0)
	health_fill.color = Color(0.95, 0.95, 0.95, 0.95) if p.health > 50.0 else (Color("ffb347") if p.health > 25.0 else Color("ff4d4d"))
	boost_fill.size.x = w * clampf(p.boost / 100.0, 0.0, 1.0)
	gear_label.text = ("Vest Lv%d %d%%" % [p.vest, int(p.vest_hp / Items.ARMOR_DURABILITY[p.vest] * 100.0)] if p.vest > 0 else "No vest") + "   ·   " + ("Helmet Lv%d %d%%" % [p.helmet, int(p.helmet_hp / Items.ARMOR_DURABILITY[p.helmet] * 100.0)] if p.helmet > 0 else "No helmet")
	meds_label.text = "Bandage %d · First Aid %d · Med Kit %d · Drink %d · Grenade %d" % [p.meds.bandage, p.meds.firstaid, p.meds.medkit, p.meds.drink, p.grenades]
	for i in 2:
		var g: Dictionary = p.slots[i]
		var sb: StyleBoxFlat = slot_panels[i].get_theme_stylebox("panel")
		sb.border_color = Color("ffd36b")
		sb.set_border_width_all(2 if i == p.active and not g.is_empty() else 0)
		if g.is_empty():
			slot_labels[i].text = "Slot %d — empty" % (i + 1)
		else:
			var data := Items.gun(String(g.id))
			slot_labels[i].text = "%s\n%d / %d" % [data.name, int(g.mag), int(p.ammo[String(data.ammo)])]
	if p.reloading > 0.0:
		progress_label.text = "Reloading… %.1fs" % p.reloading
	elif p.healing > 0.0:
		progress_label.text = "Using %s… %.1fs" % [Items.MEDS[p.healing_item].name, p.healing]
	else:
		progress_label.text = ""
	prompt_label.text = game.prompt_text()
	var scoped := p.aiming and p.current_zoom() >= 4.0 and p.state == "ground"
	scope.visible = scoped
	crosshair.visible = not scoped and p.is_alive() and p.state == "ground"
	if hit_time > 0.0:
		hit_time -= delta
	# Redraw the vector parts at ~20 fps (cheap on phones)
	_redraw_clock -= delta
	if _redraw_clock <= 0.0:
		_redraw_clock = 0.05
		compass.queue_redraw()
		minimap.queue_redraw()
		crosshair.queue_redraw()
		if scoped: scope.queue_redraw()
		if map_open: big_map.queue_redraw()

func set_map_open(on: bool) -> void:
	map_open = on
	big_map.visible = on
	big_map.queue_redraw()

# ── Drawing ──────────────────────────────────────────────────

func _draw_compass() -> void:
	var p: RoyalePlayer = game.player
	var s := compass.size
	compass.draw_rect(Rect2(Vector2.ZERO, s), Color(0, 0, 0, 0.3))
	var heading := fposmod(rad_to_deg(-p.yaw), 360.0)   # 0 = north (-Z)
	var px_per_deg := s.x / 120.0
	var font := ThemeDB.fallback_font
	for d in range(int(heading) - 60, int(heading) + 61):
		if d % 15 != 0:
			continue
		var x := s.x * 0.5 + (d - heading) * px_per_deg
		var deg := posmod(d, 360)
		var label: String = {0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SW", 270: "W", 315: "NW"}.get(deg, str(deg))
		var major := deg % 45 == 0
		compass.draw_line(Vector2(x, s.y - 8), Vector2(x, s.y), Color.WHITE, 2.0 if major else 1.0)
		compass.draw_string(font, Vector2(x - 20, s.y - 12), label, HORIZONTAL_ALIGNMENT_CENTER, 40, int((16 if major else 12) * ui_scale), Color("ffd36b") if deg == 0 else Color.WHITE)
	compass.draw_line(Vector2(s.x * 0.5, 0), Vector2(s.x * 0.5, 6), Color("ffd36b"), 3.0)

func _map_draw(target: Control, rect: Rect2, center_world: Vector2, world_span: float, rotate_with_player: bool) -> void:
	var world: RoyaleWorld = game.world
	var tex: Texture2D = world.map_texture
	var p: RoyalePlayer = game.player
	# Source rectangle in texture pixels
	var tex_size := Vector2(tex.get_width(), tex.get_height())
	var uv_center := Vector2(center_world.x / world.MAP_SIZE + 0.5, center_world.y / world.MAP_SIZE + 0.5)
	var uv_span := world_span / world.MAP_SIZE
	var src := Rect2((uv_center - Vector2.ONE * uv_span * 0.5) * tex_size, Vector2.ONE * uv_span * tex_size)
	target.draw_texture_rect_region(tex, rect, src)
	var to_screen := func(w: Vector2) -> Vector2:
		return rect.position + (w - center_world + Vector2.ONE * world_span * 0.5) / world_span * rect.size
	# Town names on the big map
	if not rotate_with_player:
		var font := ThemeDB.fallback_font
		for town in world.towns:
			var tp: Vector2 = to_screen.call(town.pos)
			target.draw_string(font, tp + Vector2(-60, 4), String(town.name), HORIZONTAL_ALIGNMENT_CENTER, 120, int(13 * ui_scale), Color(1, 1, 1, 0.9))
	# Zones: current (blue edge) and next (white)
	var z: Dictionary = game.zone
	var scale := rect.size.x / world_span
	target.draw_arc(to_screen.call(z.center), float(z.radius) * scale, 0, TAU, 96, Color(0.25, 0.55, 1.0, 0.95), 2.5)
	target.draw_arc(to_screen.call(z.next_center), float(z.next_radius) * scale, 0, TAU, 96, Color(1, 1, 1, 0.95), 2.0)
	# Plane path while in the plane
	if game.phase == "plane":
		target.draw_line(to_screen.call(game.plane_start), to_screen.call(game.plane_end), Color("ffd36b"), 2.0)
	# Airdrop marker
	if game.airdrop_pos != Vector3.ZERO:
		target.draw_circle(to_screen.call(Vector2(game.airdrop_pos.x, game.airdrop_pos.z)), 5.0, Color("ff4d4d"))
	# Recent gunfire (red dots, fade)
	for shot in game.recent_shots:
		var age: float = Time.get_ticks_msec() * 0.001 - float(shot.t)
		if age < 3.0:
			target.draw_circle(to_screen.call(shot.pos), 3.0, Color(1, 0.3, 0.3, 1.0 - age / 3.0))
	# Player arrow
	var pp: Vector2 = to_screen.call(Vector2(p.global_position.x, p.global_position.z))
	var fwd := Vector2(-sin(p.yaw), -cos(p.yaw))
	var right := Vector2(-fwd.y, fwd.x)
	target.draw_colored_polygon(PackedVector2Array([pp + fwd * 9.0, pp - fwd * 6.0 + right * 6.0, pp - fwd * 6.0 - right * 6.0]), Color("ffd36b"))

func _draw_minimap() -> void:
	var s := minimap.size
	var rect := Rect2(Vector2.ZERO, s)
	minimap.draw_rect(rect, Color(0, 0, 0, 0.5))
	var p: RoyalePlayer = game.player
	_map_draw(minimap, rect, Vector2(p.global_position.x, p.global_position.z), 260.0, true)
	minimap.draw_rect(rect, Color(1, 1, 1, 0.6), false, 2.0)

func _draw_big_map() -> void:
	var s := big_map.size
	var side := minf(s.x, s.y) * 0.9
	var rect := Rect2((s - Vector2(side, side)) * 0.5, Vector2(side, side))
	big_map.draw_rect(Rect2(Vector2.ZERO, s), Color(0, 0, 0, 0.6))
	_map_draw(big_map, rect, Vector2.ZERO, RoyaleWorld.MAP_SIZE, false)
	big_map.draw_rect(rect, Color.WHITE, false, 2.0)
	big_map.draw_string(ThemeDB.fallback_font, rect.position + Vector2(0, -10), "MAP — tap MAP or press M to close", HORIZONTAL_ALIGNMENT_LEFT, -1, int(18 * ui_scale), Color.WHITE)

func _draw_crosshair() -> void:
	var p: RoyalePlayer = game.player
	var c := crosshair.size * 0.5
	var gap := 6.0 + p.current_spread() * 7.0
	var col := Color(1, 1, 1, 0.9)
	if p.aiming:
		crosshair.draw_circle(c, 2.0, Color(1, 0.2, 0.2, 0.95))
	else:
		for d in [Vector2.RIGHT, Vector2.LEFT, Vector2.UP, Vector2.DOWN]:
			crosshair.draw_line(c + d * gap, c + d * (gap + 9.0), col, 2.0)
		crosshair.draw_circle(c, 1.5, col)
	if hit_time > 0.0:
		var hc := Color(1, 0.25, 0.25) if hit_kill else Color.WHITE
		for d in [Vector2(1, 1), Vector2(-1, 1), Vector2(1, -1), Vector2(-1, -1)]:
			crosshair.draw_line(c + d * 7.0, c + d * 14.0, hc, 2.5)

func _draw_scope() -> void:
	var s := scope.size
	var c := s * 0.5
	var r := minf(s.x, s.y) * 0.46
	# Black mask around a circular lens: one very thick ring covers everything outside it
	var big := s.length()
	scope.draw_arc(c, r + big * 0.5, 0.0, TAU, 128, Color.BLACK, big)
	scope.draw_arc(c, r, 0.0, TAU, 128, Color(0.1, 0.1, 0.1), 6.0)
	scope.draw_line(Vector2(c.x - r, c.y), Vector2(c.x + r, c.y), Color(0, 0, 0, 0.85), 1.5)
	scope.draw_line(Vector2(c.x, c.y - r), Vector2(c.x, c.y + r), Color(0, 0, 0, 0.85), 1.5)
	scope.draw_circle(c, 2.0, Color(1, 0.2, 0.2))
