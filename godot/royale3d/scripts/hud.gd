class_name RoyaleHud
extends Control
## Heads-up display in the PUBG / Rules of Survival style: compass, alive and kill counts,
## minimap with the safe zone and crates, health / boost bars, armour, weapon slots, crosshair,
## scope, hit markers, kill feed, damage flash, zone alerts, drop altimeter, crate loot list,
## backpack, settings (with a touch-button layout editor), pause menu and results.

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
var zone_tint: ColorRect
var zone_banner: Label
var safe_hint: Label
var drop_label: Label
var fps_label: Label
var crate_panel: PanelContainer
var crate_list: VBoxContainer
var crate_title: Label
var _crate_shown: Dictionary = {}
var _crate_count := -1
var pause_layer: CenterContainer
var pause_panel: PanelContainer
var settings_layer: CenterContainer
var settings_panel: PanelContainer
var bag_layer: CenterContainer
var bag_panel: PanelContainer
var bag_list: VBoxContainer
var end_layer: CenterContainer
var end_panel: PanelContainer
var end_title: Label
var end_stats: Label
var edit_bar: PanelContainer
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
	ui_scale = 1.2 if touch else 1.0
	_build()

## Panels that take over input (the game ignores look / fire while one is open).
func modal_open() -> bool:
	return bag_layer.visible or settings_layer.visible or edit_bar.visible

## Touch controls skip touches that land on these on-screen panels.
func blocks_touch(point: Vector2) -> bool:
	for c: Control in [crate_panel, edit_bar]:
		if c.visible and c.get_global_rect().has_point(point):
			return true
	for s: Control in slot_panels:
		if s.get_global_rect().has_point(point):
			return true
	return false

func apply_settings(settings: Dictionary) -> void:
	fps_label.visible = bool(settings.get("show_fps", false))

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
	sb.content_margin_left = 14
	sb.content_margin_right = 14
	sb.content_margin_top = 10
	sb.content_margin_bottom = 10
	return sb

func _button(text: String, cb: Callable, width := 280.0) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(width, 50) * ui_scale
	b.add_theme_font_size_override("font_size", int(19 * ui_scale))
	b.pressed.connect(cb)
	return b

## A full-screen layer that keeps a panel centred whatever the screen size.
func _centered_layer(dim := 0.55) -> CenterContainer:
	var layer := CenterContainer.new()
	layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	layer.mouse_filter = Control.MOUSE_FILTER_STOP
	layer.visible = false
	add_child(layer)
	layer.draw.connect(func(): layer.draw_rect(Rect2(Vector2.ZERO, layer.size), Color(0, 0, 0, dim)))
	return layer

func _build() -> void:
	var s := ui_scale
	vignette = ColorRect.new()
	vignette.color = Color(0.8, 0.0, 0.0, 0.0)
	vignette.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(vignette)
	zone_tint = ColorRect.new()
	zone_tint.color = Color(0.2, 0.4, 1.0, 0.0)
	zone_tint.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	zone_tint.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(zone_tint)

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

	zone_banner = _label("", 22, Color("ffd36b"))
	zone_banner.set_anchors_preset(Control.PRESET_CENTER_TOP)
	zone_banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	zone_banner.size = Vector2(640, 34) * s
	zone_banner.position = Vector2(-320 * s, 46 * s)
	add_child(zone_banner)
	safe_hint = _label("", 18, Color("9fd0ff"))
	safe_hint.set_anchors_preset(Control.PRESET_CENTER_TOP)
	safe_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	safe_hint.size = Vector2(640, 30) * s
	safe_hint.position = Vector2(-320 * s, 78 * s)
	add_child(safe_hint)

	var top_right := VBoxContainer.new()
	top_right.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	top_right.position = Vector2(-230 * s, 10)
	top_right.size = Vector2(220 * s, 260 * s)
	top_right.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(top_right)
	minimap = Control.new()
	minimap.custom_minimum_size = Vector2(200, 200) * s
	minimap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	minimap.clip_contents = true
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
	zone_label.autowrap_mode = TextServer.AUTOWRAP_WORD
	zone_label.custom_minimum_size = Vector2(210, 0) * s
	top_right.add_child(zone_label)
	fps_label = _label("", 13, Color(1, 1, 1, 0.7))
	fps_label.visible = false
	top_right.add_child(fps_label)

	feed = VBoxContainer.new()
	feed.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	feed.position = Vector2(-470 * s, 52 * s)
	feed.size = Vector2(230 * s, 160 * s)
	feed.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(feed)

	drop_label = _label("", 20, Color("e8f4ff"))
	drop_label.set_anchors_preset(Control.PRESET_CENTER_LEFT)
	drop_label.position = Vector2(24 * s, -60 * s)
	add_child(drop_label)

	message_label = _label("", 21, Color("ffe7a3"))
	message_label.set_anchors_preset(Control.PRESET_CENTER)
	message_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	message_label.size = Vector2(760, 40) * s
	message_label.position = Vector2(-380 * s, -150 * s)
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

	crate_panel = PanelContainer.new()
	crate_panel.add_theme_stylebox_override("panel", _panel_style(0.78, 12))
	# Top-centre, below the compass: clear of the fire / aim cluster and the move stick
	crate_panel.set_anchors_preset(Control.PRESET_CENTER_TOP)
	crate_panel.position = Vector2(-160 * s, 112 * s)
	crate_panel.custom_minimum_size = Vector2(300, 0) * s
	crate_panel.visible = false
	add_child(crate_panel)
	var cbox := VBoxContainer.new()
	cbox.add_theme_constant_override("separation", int(6 * s))
	crate_panel.add_child(cbox)
	crate_title = _label("Crate", 18, Color("ffd36b"))
	cbox.add_child(crate_title)
	crate_list = VBoxContainer.new()
	crate_list.add_theme_constant_override("separation", int(4 * s))
	cbox.add_child(crate_list)

	big_map = Control.new()
	big_map.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	big_map.mouse_filter = Control.MOUSE_FILTER_IGNORE
	big_map.visible = false
	big_map.draw.connect(_draw_big_map)
	add_child(big_map)

	_build_edit_bar()
	_build_backpack()
	_build_pause()
	_build_settings()
	_build_end()

# ── Pause, settings, backpack, results ───────────────────────

func _build_pause() -> void:
	pause_layer = _centered_layer()
	pause_panel = PanelContainer.new()
	pause_panel.add_theme_stylebox_override("panel", _panel_style(0.9, 16))
	pause_layer.add_child(pause_panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", int(10 * ui_scale))
	pause_panel.add_child(box)
	var title := _label("Paused", 28)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(title)
	box.add_child(_button("Resume", func(): game.toggle_pause()))
	box.add_child(_button("Settings", func(): pause_layer.visible = false; settings_layer.visible = true))
	box.add_child(_button("Full screen", func(): game.request_fullscreen()))
	box.add_child(_button("Leave match", func(): quit_to_arcade.emit()))

func show_pause(on: bool) -> void:
	paused = on
	pause_layer.visible = on
	if not on: settings_layer.visible = false

func _build_settings() -> void:
	settings_layer = _centered_layer(0.6)
	settings_panel = PanelContainer.new()
	settings_panel.add_theme_stylebox_override("panel", _panel_style(0.94, 16))
	settings_layer.add_child(settings_panel)
	var outer := VBoxContainer.new()
	outer.add_theme_constant_override("separation", int(8 * ui_scale))
	settings_panel.add_child(outer)
	var title := _label("Settings", 26)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	outer.add_child(title)
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(500, 330) * ui_scale
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	outer.add_child(scroll)
	var box := VBoxContainer.new()
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	box.add_theme_constant_override("separation", int(8 * ui_scale))
	scroll.add_child(box)
	var st: Dictionary = game.settings
	var changed := func(): settings_changed.emit()
	box.add_child(_section("Controls"))
	box.add_child(_slider_row("Look speed", 0.3, 2.5, st.sensitivity, func(v): st.sensitivity = v; changed.call()))
	box.add_child(_slider_row("Scope look speed", 0.2, 1.5, st.scope_sensitivity, func(v): st.scope_sensitivity = v; changed.call()))
	box.add_child(_check_row("Invert look up/down", st.invert, func(on): st.invert = on; changed.call()))
	box.add_child(_check_row("Vibration", st.vibration, func(on): st.vibration = on; changed.call()))
	box.add_child(_check_row("Left-handed (swap sides)", st.lefty, func(on): st.lefty = on; changed.call()))
	box.add_child(_slider_row("Button size", 0.7, 1.5, st.btn_scale, func(v): st.btn_scale = v; changed.call()))
	box.add_child(_slider_row("Button opacity", 0.3, 1.0, st.btn_opacity, func(v): st.btn_opacity = v; changed.call()))
	var layout_row := HBoxContainer.new()
	layout_row.add_child(_button("Move buttons…", func(): start_layout_edit(), 230.0))
	layout_row.add_child(_button("Reset buttons", func(): st.layout = {}; changed.call(), 200.0))
	box.add_child(layout_row)
	box.add_child(_section("Display"))
	box.add_child(_slider_row("Field of view", 65.0, 95.0, st.fov, func(v): st.fov = v; changed.call()))
	box.add_child(_check_row("High graphics (shadows, grass)", not bool(st.low), func(on): st.low = not on; changed.call()))
	box.add_child(_check_row("Show FPS", st.show_fps, func(on): st.show_fps = on; changed.call()))
	box.add_child(_section("Sound"))
	box.add_child(_slider_row("Volume", 0.0, 1.0, st.volume, func(v): st.volume = v; changed.call()))
	outer.add_child(_button("Done", func():
		settings_layer.visible = false
		if paused: pause_layer.visible = true))

func _section(text: String) -> Label:
	return _label(text.to_upper(), 15, Color("ffd36b"))

func _slider_row(text: String, lo: float, hi: float, value: float, cb: Callable) -> HBoxContainer:
	var row := HBoxContainer.new()
	var l := _label(text, 17)
	l.custom_minimum_size = Vector2(190, 0) * ui_scale
	row.add_child(l)
	var slider := HSlider.new()
	slider.min_value = lo
	slider.max_value = hi
	slider.step = (hi - lo) / 50.0
	slider.value = value
	slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	slider.custom_minimum_size = Vector2(200, 40) * ui_scale
	slider.value_changed.connect(cb)
	row.add_child(slider)
	return row

func _check_row(text: String, value: bool, cb: Callable) -> CheckButton:
	var c := CheckButton.new()
	c.text = text
	c.button_pressed = value
	c.add_theme_font_size_override("font_size", int(17 * ui_scale))
	c.toggled.connect(cb)
	return c

func _build_edit_bar() -> void:
	edit_bar = PanelContainer.new()
	edit_bar.add_theme_stylebox_override("panel", _panel_style(0.85, 12))
	edit_bar.set_anchors_preset(Control.PRESET_CENTER_TOP)
	edit_bar.position = Vector2(-250 * ui_scale, 40 * ui_scale)
	edit_bar.visible = false
	add_child(edit_bar)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", int(8 * ui_scale))
	edit_bar.add_child(row)
	row.add_child(_label("Drag any button to move it", 16))
	row.add_child(_button("Reset", func(): game.touch.reset_layout(), 100.0))
	row.add_child(_button("Done", func(): finish_layout_edit(), 100.0))

func start_layout_edit() -> void:
	settings_layer.visible = false
	pause_layer.visible = false
	edit_bar.visible = true
	game.touch.set_editing(true)

func finish_layout_edit() -> void:
	edit_bar.visible = false
	game.touch.set_editing(false)
	game.settings.layout = game.touch.layout_overrides()
	settings_changed.emit()
	if paused: pause_layer.visible = true

func _build_backpack() -> void:
	bag_layer = _centered_layer(0.5)
	bag_panel = PanelContainer.new()
	bag_panel.add_theme_stylebox_override("panel", _panel_style(0.92, 16))
	bag_layer.add_child(bag_panel)
	var outer := VBoxContainer.new()
	outer.add_theme_constant_override("separation", int(8 * ui_scale))
	bag_panel.add_child(outer)
	var title := _label("Backpack", 26)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	outer.add_child(title)
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(540, 320) * ui_scale
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	outer.add_child(scroll)
	bag_list = VBoxContainer.new()
	bag_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bag_list.add_theme_constant_override("separation", int(6 * ui_scale))
	scroll.add_child(bag_list)
	outer.add_child(_button("Close", func(): toggle_backpack()))

func toggle_backpack() -> void:
	bag_layer.visible = not bag_layer.visible
	if bag_layer.visible:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		game.touch.release_all()
		refresh_backpack()

func _bag_row(text: String, actions: Array) -> HBoxContainer:
	var row := HBoxContainer.new()
	var l := _label(text, 17)
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	l.autowrap_mode = TextServer.AUTOWRAP_WORD
	row.add_child(l)
	for a in actions:
		row.add_child(_button(String(a[0]), a[1], 90.0))
	return row

func refresh_backpack() -> void:
	for c in bag_list.get_children():
		c.queue_free()
	var p: RoyalePlayer = game.player
	bag_list.add_child(_section("Weapons"))
	for i in 2:
		var g: Dictionary = p.slots[i]
		if g.is_empty():
			bag_list.add_child(_bag_row("Slot %d — empty" % (i + 1), []))
		else:
			var data := Items.gun(String(g.id))
			var idx := i
			bag_list.add_child(_bag_row("%s · %d in magazine · %s" % [data.name, int(g.mag), Items.AMMO[String(data.ammo)].name], [
				["Equip", func(): p.switch_slot(idx); refresh_backpack()],
				["Drop", func(): game.drop_from_backpack("gun", str(idx)); refresh_backpack()]]))
	bag_list.add_child(_section("Armour"))
	var vest_actions: Array = [["Drop", func(): game.drop_from_backpack("vest", ""); refresh_backpack()]] if p.vest > 0 else []
	var helmet_actions: Array = [["Drop", func(): game.drop_from_backpack("helmet", ""); refresh_backpack()]] if p.helmet > 0 else []
	bag_list.add_child(_bag_row("Vest: %s" % ("Level %d (%d%%)" % [p.vest, int(p.vest_hp / Items.ARMOR_DURABILITY[p.vest] * 100.0)] if p.vest > 0 else "none"), vest_actions))
	bag_list.add_child(_bag_row("Helmet: %s" % ("Level %d (%d%%)" % [p.helmet, int(p.helmet_hp / Items.ARMOR_DURABILITY[p.helmet] * 100.0)] if p.helmet > 0 else "none"), helmet_actions))
	bag_list.add_child(_section("Healing"))
	for m in ["bandage", "firstaid", "medkit", "drink"]:
		var n := int(p.meds[m])
		var key: String = m
		if n > 0:
			bag_list.add_child(_bag_row("%s ×%d" % [Items.MEDS[m].name, n], [
				["Use", func():
					toggle_backpack()
					p.start_heal(key)],
				["Drop", func(): game.drop_from_backpack("med", key); refresh_backpack()]]))
	bag_list.add_child(_section("Ammo and throwables"))
	for a in ["9mm", "556", "762", "12g"]:
		var n2 := int(p.ammo[a])
		var akey: String = a
		if n2 > 0:
			bag_list.add_child(_bag_row("%s ×%d" % [Items.AMMO[a].name, n2], [["Drop", func(): game.drop_from_backpack("ammo", akey); refresh_backpack()]]))
	if p.grenades > 0:
		bag_list.add_child(_bag_row("Frag grenade ×%d" % p.grenades, [["Drop", func(): game.drop_from_backpack("grenade", ""); refresh_backpack()]]))

func _build_end() -> void:
	end_layer = _centered_layer(0.45)
	end_panel = PanelContainer.new()
	end_panel.add_theme_stylebox_override("panel", _panel_style(0.92, 18))
	end_layer.add_child(end_panel)
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

func show_end(won: bool, placement: int, kills: int, coins: int) -> void:
	end_title.text = "WINNER WINNER\nCHICKEN DINNER!" if won else "#%d of %d" % [placement, game.total_players]
	end_stats.text = "Kills: %d\nPlace: #%d\nCoins earned: +%d" % [kills, placement, coins]
	bag_layer.visible = false
	settings_layer.visible = false
	pause_layer.visible = false
	end_layer.visible = true

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

func set_map_open(on: bool) -> void:
	map_open = on
	big_map.visible = on
	big_map.queue_redraw()

func _update_crate_panel() -> void:
	var crate: Dictionary = game.nearby_crate() if not game._ui_blocking() else {}
	if crate.is_empty():
		crate_panel.visible = false
		_crate_shown = {}
		return
	var count := (crate.items as Array).size()
	if crate == _crate_shown and count == _crate_count and crate_panel.visible:
		return
	_crate_shown = crate
	_crate_count = count
	crate_panel.visible = true
	crate_title.text = String(crate.label)
	for c in crate_list.get_children():
		c.queue_free()
	var items: Array = crate.items
	for i in items.size():
		var idx := i
		var row := HBoxContainer.new()
		var l := _label(Items.describe(items[i]), 16)
		l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(l)
		row.add_child(_button("Take", func(): game.take_from_crate(crate, idx), 80.0))
		crate_list.add_child(row)
	crate_list.add_child(_button("Take all", func(): game.take_from_crate(crate, -1), 260.0))

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
	if fps_label.visible:
		fps_label.text = "%d FPS" % Engine.get_frames_per_second()
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
	if p.state in ["freefall", "parachute"]:
		var agl := p.global_position.y - p.ground_height_below()
		drop_label.text = "%s\nAltitude %d m\nSpeed %d km/h" % ["FREEFALL" if p.state == "freefall" else "PARACHUTE", int(agl), int(p.velocity.length() * 3.6)]
	else:
		drop_label.text = ""
	_update_zone_alerts()
	_update_crate_panel()
	var scoped := p.aiming and p.current_zoom() >= 4.0 and p.state == "ground"
	scope.visible = scoped
	crosshair.visible = not scoped and p.is_alive() and p.state == "ground"
	if hit_time > 0.0:
		hit_time -= delta
	_redraw_clock -= delta
	if _redraw_clock <= 0.0:
		_redraw_clock = 0.05
		compass.queue_redraw()
		minimap.queue_redraw()
		crosshair.queue_redraw()
		if scoped: scope.queue_redraw()
		if map_open: big_map.queue_redraw()

func _update_zone_alerts() -> void:
	var p: RoyalePlayer = game.player
	var z: Dictionary = game.zone
	var t := Time.get_ticks_msec() * 0.001
	if int(z.phase) < 0 or not p.is_alive():
		zone_banner.text = ""
		safe_hint.text = ""
		zone_tint.color.a = 0.0
		return
	match String(game.zone_alert):
		"shrinking":
			zone_banner.text = "⚠ ZONE SHRINKING  ·  %d:%02d" % [int(z.timer) / 60, int(z.timer) % 60]
			zone_banner.modulate = Color(1, 1, 1, 0.65 + 0.35 * sin(t * 6.0))
		"soon":
			zone_banner.text = "Zone shrinks in %d s" % int(z.timer)
			zone_banner.modulate = Color(1, 1, 1, 1)
		_:
			zone_banner.text = ""
	var flat := Vector2(p.global_position.x, p.global_position.z)
	var outside_now: bool = flat.distance_to(z.center) > float(z.radius)
	var outside_next: bool = flat.distance_to(z.next_center) > float(z.next_radius)
	zone_tint.color.a = (0.16 + 0.06 * sin(t * 4.0)) if outside_now and p.state == "ground" else 0.0
	if outside_next and p.state == "ground":
		var to: Vector2 = Vector2(z.next_center) - flat
		var dist := int(to.length() - float(z.next_radius))
		var heading := rad_to_deg(atan2(-to.x, -to.y)) - rad_to_deg(p.yaw)
		heading = fposmod(heading + 180.0, 360.0) - 180.0
		var arrow := "↑"
		if absf(heading) > 157.5: arrow = "↓"
		elif heading > 112.5: arrow = "↙"
		elif heading > 67.5: arrow = "←"
		elif heading > 22.5: arrow = "↖"
		elif heading < -112.5: arrow = "↘"
		elif heading < -67.5: arrow = "→"
		elif heading < -22.5: arrow = "↗"
		safe_hint.text = "%s  Safe zone %d m%s" % [arrow, dist, "  ·  You're taking zone damage!" if outside_now else ""]
		safe_hint.modulate = Color(1, 0.6, 0.6) if outside_now else Color(1, 1, 1)
	else:
		safe_hint.text = ""

# ── Drawing ──────────────────────────────────────────────────

func _draw_compass() -> void:
	var p: RoyalePlayer = game.player
	var s := compass.size
	compass.draw_rect(Rect2(Vector2.ZERO, s), Color(0, 0, 0, 0.3))
	var heading := fposmod(rad_to_deg(-p.yaw), 360.0)
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

func _map_draw(target: Control, rect: Rect2, center_world: Vector2, world_span: float, full: bool) -> void:
	var world: RoyaleWorld = game.world
	var tex: Texture2D = world.map_texture
	var p: RoyalePlayer = game.player
	var tex_size := Vector2(tex.get_width(), tex.get_height())
	var uv_center := Vector2(center_world.x / world.MAP_SIZE + 0.5, center_world.y / world.MAP_SIZE + 0.5)
	var uv_span := world_span / world.MAP_SIZE
	var src := Rect2((uv_center - Vector2.ONE * uv_span * 0.5) * tex_size, Vector2.ONE * uv_span * tex_size)
	target.draw_texture_rect_region(tex, rect, src)
	var to_screen := func(w: Vector2) -> Vector2:
		return rect.position + (w - center_world + Vector2.ONE * world_span * 0.5) / world_span * rect.size
	var scale := rect.size.x / world_span
	for seg in world.roads:
		target.draw_line(to_screen.call(seg[0]), to_screen.call(seg[1]), Color(0.75, 0.62, 0.42, 0.8), maxf(1.5, 5.0 * scale))
	if full:
		var font := ThemeDB.fallback_font
		for town in world.towns:
			var tp: Vector2 = to_screen.call(town.pos)
			target.draw_string(font, tp + Vector2(-60, 4), String(town.name), HORIZONTAL_ALIGNMENT_CENTER, 120, int(13 * ui_scale), Color(1, 1, 1, 0.9))
	var z: Dictionary = game.zone
	var pulse := (0.6 + 0.4 * sin(Time.get_ticks_msec() * 0.008)) if bool(z.shrinking) else 1.0
	target.draw_arc(to_screen.call(z.center), float(z.radius) * scale, 0, TAU, 96, Color(0.3, 0.55, 1.0, 0.95 * pulse), 3.0 if bool(z.shrinking) else 2.5)
	target.draw_arc(to_screen.call(z.next_center), float(z.next_radius) * scale, 0, TAU, 96, Color(1, 1, 1, 0.95), 2.0)
	var pp: Vector2 = to_screen.call(Vector2(p.global_position.x, p.global_position.z))
	var flat := Vector2(p.global_position.x, p.global_position.z)
	if int(z.phase) >= 0 and flat.distance_to(z.next_center) > float(z.next_radius):
		var edge: Vector2 = Vector2(z.next_center) + (flat - Vector2(z.next_center)).normalized() * float(z.next_radius)
		target.draw_dashed_line(pp, to_screen.call(edge), Color(1, 1, 1, 0.85), 2.0, 6.0)
	if game.phase == "plane":
		target.draw_line(to_screen.call(game.plane_start), to_screen.call(game.plane_end), Color("ffd36b"), 2.0)
	for c in game.crates:
		if String(c.kind) == "death":
			continue
		var cp: Vector2 = to_screen.call(Vector2(c.pos.x, c.pos.z))
		target.draw_circle(cp, 5.0 * ui_scale, Color("ff4d4d") if String(c.kind) == "airdrop" else Color("4d8dff"))
		target.draw_arc(cp, 7.0 * ui_scale, 0, TAU, 16, Color.WHITE, 1.5)
	for shot in game.recent_shots:
		var age: float = Time.get_ticks_msec() * 0.001 - float(shot.t)
		if age < 3.0:
			target.draw_circle(to_screen.call(shot.pos), 3.0, Color(1, 0.3, 0.3, 1.0 - age / 3.0))
	var fwd := Vector2(-sin(p.yaw), -cos(p.yaw))
	var right := Vector2(-fwd.y, fwd.x)
	target.draw_colored_polygon(PackedVector2Array([pp + fwd * 9.0, pp - fwd * 6.0 + right * 6.0, pp - fwd * 6.0 - right * 6.0]), Color("ffd36b"))

func _draw_minimap() -> void:
	var s := minimap.size
	var rect := Rect2(Vector2.ZERO, s)
	minimap.draw_rect(rect, Color(0, 0, 0, 0.5))
	var p: RoyalePlayer = game.player
	_map_draw(minimap, rect, Vector2(p.global_position.x, p.global_position.z), 260.0, false)
	minimap.draw_rect(rect, Color(1, 1, 1, 0.6), false, 2.0)

func _draw_big_map() -> void:
	var s := big_map.size
	var side := minf(s.x, s.y) * 0.9
	var rect := Rect2((s - Vector2(side, side)) * 0.5, Vector2(side, side))
	big_map.draw_rect(Rect2(Vector2.ZERO, s), Color(0, 0, 0, 0.6))
	_map_draw(big_map, rect, Vector2.ZERO, RoyaleWorld.MAP_SIZE, true)
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
	var big := s.length()
	scope.draw_arc(c, r + big * 0.5, 0.0, TAU, 128, Color.BLACK, big)
	scope.draw_arc(c, r, 0.0, TAU, 128, Color(0.1, 0.1, 0.1), 6.0)
	scope.draw_line(Vector2(c.x - r, c.y), Vector2(c.x + r, c.y), Color(0, 0, 0, 0.85), 1.5)
	scope.draw_line(Vector2(c.x, c.y - r), Vector2(c.x, c.y + r), Color(0, 0, 0, 0.85), 1.5)
	scope.draw_circle(c, 2.0, Color(1, 0.2, 0.2))
