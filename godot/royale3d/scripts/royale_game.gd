extends Node3D
## Battle Royale 3D — match flow: plane → drop → loot → fight → shrinking zone → last one standing.
## First-person like the Dungeon of Knowledge. Rules follow PUBG / Rules of Survival: a plane
## crosses the island, everyone drops, loot is in houses, a blue zone shrinks in phases and
## deals more damage each phase, an airdrop brings the best gear, and the last survivor wins.
##
## Developer flags (after "--"): --smoke (headless match test), --screenshots=<dir>,
## --touch-preview (show touch controls on desktop), --bench (print fps).

const BOT_COUNT := 29
const PLANE_HEIGHT := 330.0
const PLANE_SPEED := 85.0
const SETTINGS_PATH := "user://royale3d.cfg"
const ZONE_PHASES := [
	{"wait": 100.0, "shrink": 60.0, "radius": 300.0, "dps": 1.0},
	{"wait": 70.0, "shrink": 45.0, "radius": 180.0, "dps": 2.0},
	{"wait": 55.0, "shrink": 40.0, "radius": 105.0, "dps": 4.0},
	{"wait": 45.0, "shrink": 32.0, "radius": 55.0, "dps": 6.0},
	{"wait": 35.0, "shrink": 26.0, "radius": 22.0, "dps": 9.0},
	{"wait": 25.0, "shrink": 22.0, "radius": 0.0, "dps": 14.0},
]

var world: RoyaleWorld
var player: RoyalePlayer
var bots: Array[RoyaleBot] = []
var combatants: Array[Node3D] = []
var hud: RoyaleHud
var touch: RoyaleTouchControls
var sfx: RoyaleSfx
var env: WorldEnvironment
var sun: DirectionalLight3D
var rng := RandomNumberGenerator.new()
var phase := "plane"
var plane_start := Vector2.ZERO
var plane_end := Vector2.ZERO
var plane_t := 0.0
var plane_node: Node3D
var zone := {"center": Vector2.ZERO, "radius": 780.0, "next_center": Vector2.ZERO, "next_radius": 780.0,
	"from_center": Vector2.ZERO, "from_radius": 780.0, "phase": -1, "timer": 0.0, "shrinking": false, "dps": 0.6}
var zone_wall: MeshInstance3D
var zone_tick := 0.0
var loot_items: Array[Dictionary] = []
var loot_grid := {}
var loot_reserved := {}
var recent_shots: Array[Dictionary] = []
var zone_alert := ""        ## shown by the HUD: "", "soon", "shrinking"
var crates: Array[Dictionary] = []      ## {pos, items, node, kind, label, ready}
var falling_crates: Array[Dictionary] = []
var _nearby_crate: Dictionary = {}
var _crate_frame := -1
var airdrop_pos := Vector3.ZERO
var airdrop_node: Node3D
var airdrop_done := false
var total_players := BOT_COUNT + 1
var bot_accuracy := 0.85
var settings := {"sensitivity": 1.0, "scope_sensitivity": 0.8, "volume": 0.8, "low": false, "fov": 78.0,
	"invert": false, "vibration": true, "lefty": false, "btn_scale": 1.0, "btn_opacity": 0.85, "show_fps": false, "view": "tps", "aim_assist": true, "auto_quality": true,
	"layout": {}}
var paused := false
var map_open := false
var ended := false
var match_time := 0.0
var death_log: Array[String] = []
var smoke_mode := false
var _nearby_cache: Dictionary = {}
var _nearby_frame := -1
var _tracer_pool: Array[MeshInstance3D] = []
var _tracer_index := 0
var _gun_scene_cache := {}
var _loot_mats := {}
var _next_loot_id := 0
var _bench := false
var _bench_frames := 0
var _bench_time := 0.0
var net: RoyaleNet
var loadout := {"weapon": "", "outfit": "standard", "level": 1}
var rockets: Array[Dictionary] = []
var vehicles: Array = []
var bot_count := BOT_COUNT
var loot_by_uid := {}
var crates_by_id := {}
var _loot_ready := false
var _supply_n := 0
var _wait_layer: CanvasLayer

func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	smoke_mode = "--smoke" in args
	_bench = "--bench" in args
	rng.randomize()
	net = RoyaleNet.new()
	net.name = "Net"
	net.game = self
	add_child(net)
	net.debug = _query_flag("nettest") == "1"
	if not smoke_mode and net.read_match():
		rng.seed = net.seed_value   # same island and starting loot for everyone in the room
		bot_count = BOT_COUNT + 1 - net.players.size()
	total_players = bot_count + (net.players.size() if net.active else 1)
	_load_settings()
	if "--quality=low" in args or _query_flag("quality") == "low":
		settings.low = true
	sfx = RoyaleSfx.new()
	add_child(sfx)
	sfx.set_volume(float(settings.volume))
	# Show something while the island is generated (it blocks for a few seconds on phones)
	var loading_layer := CanvasLayer.new()
	var loading := Label.new()
	loading.text = "Preparing the island…"
	loading.add_theme_font_size_override("font_size", 30)
	loading.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	loading.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var backdrop := ColorRect.new()
	backdrop.color = Color("0d1a12")
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	loading_layer.add_child(backdrop)
	loading_layer.add_child(loading)
	add_child(loading_layer)
	if not smoke_mode:
		await get_tree().process_frame
		await get_tree().process_frame
	_build_environment()
	# Wind direction for the match (grass and trees sway along it); from the seed so everyone in
	# a room match sees the same wind
	RoyaleMaterials.wind_dir = Vector2.from_angle(float(rng.seed % 628) / 100.0)
	world = RoyaleWorld.new()
	world.name = "World"
	add_child(world)
	var t_gen := Time.get_ticks_msec()
	world.generate(rng.randi(), bool(settings.low) or smoke_mode)
	var t_loot := Time.get_ticks_msec()
	_spawn_loot()
	_loot_ready = true
	_spawn_vehicles()
	print("ROYALE_TIMING world=%dms loot=%dms" % [t_loot - t_gen, Time.get_ticks_msec() - t_loot])
	_build_zone_wall()
	_build_tracers()
	player = RoyalePlayer.new()
	player.game = self
	add_child(player)
	player.message.connect(func(t): hud.flash_message(t))
	loadout = Skins.read_loadout()
	player.set_loadout(String(loadout.weapon), int(loadout.level), String(loadout.outfit))
	player.died.connect(_on_player_died)
	combatants.append(player)
	for i in bot_count:
		var bot := RoyaleBot.new()
		bot.setup(i, self, rng)
		add_child(bot)
		bots.append(bot)
		combatants.append(bot)
	if net.active:
		_setup_room_match()
	hud = RoyaleHud.new()
	var layer := CanvasLayer.new()
	add_child(layer)
	hud.setup(self)
	layer.add_child(hud)
	hud.play_again.connect(_restart)
	hud.quit_to_arcade.connect(_quit_to_arcade)
	hud.settings_changed.connect(_apply_settings)
	touch = RoyaleTouchControls.new()
	touch.game = self
	layer.add_child(touch)
	_apply_settings()
	# Phones render the 3D view below native resolution (their screens are ~2.5 MP); the HUD stays sharp
	if RoyalePlayer.is_touch_platform():
		get_viewport().scaling_3d_scale = 0.7
		_q_level = 1
	if net.active:
		# Wait (behind the loading screen) until everyone's island is ready
		loading.text = "Waiting for your classmates to load the island…"
		loading_layer.layer = 20
		_wait_layer = loading_layer
		player.global_position = Vector3(0, PLANE_HEIGHT, 0)
		return
	loading_layer.queue_free()
	_start_plane()
	if "--benchscene" in args:
		_run_bench_scene.call_deferred()
	elif "--doortest" in args:
		_run_door_test.call_deferred()
	elif smoke_mode:
		_run_smoke.call_deferred()
	else:
		for a in args:
			if a.begins_with("--screenshots="):
				_run_screenshots.call_deferred(a.get_slice("=", 1))

func _query_flag(key: String) -> String:
	if not OS.has_feature("web"):
		return ""
	var v: Variant = JavaScriptBridge.eval("new URLSearchParams(window.location.search).get('%s') || ''" % key, true)
	return String(v) if v != null else ""

# ── Settings ─────────────────────────────────────────────────

func _load_settings() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(SETTINGS_PATH) == OK:
		for k in settings.keys():
			settings[k] = cfg.get_value("settings", k, settings[k])

func _apply_settings() -> void:
	var cfg := ConfigFile.new()
	for k in settings.keys():
		cfg.set_value("settings", k, settings[k])
	cfg.save(SETTINGS_PATH)
	if player:
		player.touch_sensitivity = float(settings.sensitivity)
		player.mouse_sensitivity = 0.0022 * float(settings.sensitivity)
		player.scope_sensitivity = float(settings.scope_sensitivity)
		player.invert_y = bool(settings.invert)
		player.base_fov = float(settings.fov)
		player.view_mode = String(settings.get("view", "tps"))
		player.aim_assist = bool(settings.get("aim_assist", true))
	if touch: touch.apply_settings(settings)
	if hud: hud.apply_settings(settings)
	if sfx: sfx.set_volume(float(settings.volume))
	if sun: sun.shadow_enabled = not bool(settings.low) and not RoyalePlayer.is_touch_platform()
	if env:
		env.environment.fog_density = 0.0022 if bool(settings.low) else 0.0012

# ── Environment ──────────────────────────────────────────────

func _build_environment() -> void:
	env = WorldEnvironment.new()
	var e := Environment.new()
	var sky := Sky.new()
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color("4f8fd6")
	sky_mat.sky_horizon_color = Color("bcd8ef")
	sky_mat.ground_horizon_color = Color("bcd8ef")
	sky_mat.ground_bottom_color = Color("3d6c8f")
	sky.sky_material = sky_mat
	e.background_mode = Environment.BG_SKY
	e.sky = sky
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.66, 0.69, 0.74)
	e.ambient_light_energy = 0.45
	# Linear: the filmic tonemapper washed colours out in the Compatibility renderer
	e.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	e.fog_enabled = true
	e.fog_light_color = Color("b9cde0")
	e.fog_density = 0.0012
	e.fog_sky_affect = 0.4
	if "--nofog" in OS.get_cmdline_user_args(): e.fog_enabled = false
	env.environment = e
	add_child(env)
	sun = DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-52, 35, 0)
	sun.light_energy = 1.0
	sun.light_color = Color("fff1dc")
	sun.shadow_enabled = false
	sun.directional_shadow_max_distance = 70.0
	add_child(sun)

func _build_zone_wall() -> void:
	zone_wall = MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = 1.0
	cyl.bottom_radius = 1.0
	cyl.height = 500.0
	cyl.radial_segments = 96
	cyl.cap_top = false
	cyl.cap_bottom = false
	zone_wall.mesh = cyl
	var shader := Shader.new()
	shader.code = """
shader_type spatial;
render_mode unshaded, cull_disabled, blend_mix, depth_draw_never;
uniform float shrinking = 0.0;
void fragment() {
	// A smooth glowing curtain: strongest at the ground and fading upward, with a slow soft
	// shimmer (thin stripes looked like rain from inside the zone). It brightens and pulses
	// while the zone is shrinking.
	float height = 1.0 - UV.y;                       // 0 at the top of the wall, 1 at the base
	float fade = smoothstep(0.0, 0.85, height);
	float shimmer = 0.5 + 0.5 * sin(UV.x * 40.0 + TIME * 0.6) * sin(UV.x * 17.0 - TIME * 0.4);
	float pulse = 0.5 + 0.5 * sin(TIME * mix(1.2, 5.0, shrinking));
	vec3 calm = vec3(0.25, 0.5, 1.0);
	vec3 hot = vec3(0.6, 0.4, 1.0);
	ALBEDO = mix(calm, hot, shrinking * pulse);
	ALPHA = fade * (0.16 + shimmer * 0.06 + shrinking * 0.14 * pulse);
}
"""
	var m := ShaderMaterial.new()
	m.shader = shader
	zone_wall.material_override = m
	zone_wall.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(zone_wall)

func _build_tracers() -> void:
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = Color(1.0, 0.9, 0.55, 0.85)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	for i in 24:
		var mi := MeshInstance3D.new()
		var box := BoxMesh.new()
		box.size = Vector3(0.025, 0.025, 1.0)
		box.material = mat
		mi.mesh = box
		mi.visible = false
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(mi)
		_tracer_pool.append(mi)

func _tracer(from: Vector3, to: Vector3) -> void:
	if smoke_mode:
		return
	var mi := _tracer_pool[_tracer_index]
	_tracer_index = (_tracer_index + 1) % _tracer_pool.size()
	var length := from.distance_to(to)
	if length < 0.5:
		return
	mi.global_position = from.lerp(to, 0.5)
	mi.look_at_from_position(mi.global_position, to, Vector3.UP if absf((to - from).normalized().y) < 0.98 else Vector3.RIGHT)
	mi.scale = Vector3(1, 1, minf(length, 60.0))
	mi.visible = true
	get_tree().create_timer(0.05).timeout.connect(func(): mi.visible = false)

# ── Plane and drop ───────────────────────────────────────────

## Room matches: the host calls this with no route (and sends it); guests get the host's route.
func begin_plane(route_start := Vector2.INF, route_end := Vector2.INF) -> void:
	if _wait_layer:
		_wait_layer.queue_free()
		_wait_layer = null
	_start_plane(route_start, route_end)

func _start_plane(route_start := Vector2.INF, route_end := Vector2.INF) -> void:
	phase = "plane"
	if route_start == Vector2.INF:
		var a := rng.randf() * TAU
		var offset := Vector2(-sin(a), cos(a)) * rng.randf_range(-180.0, 180.0)
		plane_start = Vector2(cos(a), sin(a)) * 640.0 + offset
		plane_end = -Vector2(cos(a), sin(a)) * 640.0 + offset
	else:
		plane_start = route_start
		plane_end = route_end
	plane_t = 0.0
	plane_node = _build_plane()
	add_child(plane_node)
	player.state = "plane"
	var dir := (plane_end - plane_start).normalized()
	player.yaw = atan2(-dir.x, -dir.y) - PI * 0.5
	player.pitch = deg_to_rad(-25.0)
	for bot in bots:
		bot.state = "plane"
		bot.visible = false
		bot.set_meta("jump_at", rng.randf_range(0.12, 0.85))
	sfx.set_loop("plane")
	hud.flash_message("Tap JUMP (or press Space) to jump from the plane", 5.0)

func _build_plane() -> Node3D:
	var n := Node3D.new()
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color("d9dde3")
	var parts := [[Vector3(0, 0, 0), Vector3(3.2, 3.2, 22.0)], [Vector3(0, 0.3, 1.0), Vector3(24.0, 0.5, 4.0)], [Vector3(0, 2.6, -9.5), Vector3(0.4, 4.0, 3.0)], [Vector3(0, 0.3, -9.5), Vector3(8.0, 0.4, 2.4)]]
	for p in parts:
		var mi := MeshInstance3D.new()
		var box := BoxMesh.new()
		box.size = p[1]
		box.material = mat
		mi.mesh = box
		mi.position = p[0]
		n.add_child(mi)
	return n

func _update_plane(delta: float) -> void:
	var length := plane_start.distance_to(plane_end)
	plane_t += delta * PLANE_SPEED / length
	var flat := plane_start.lerp(plane_end, clampf(plane_t, 0.0, 1.0))
	var dir := (plane_end - plane_start).normalized()
	plane_node.global_position = Vector3(flat.x, PLANE_HEIGHT, flat.y)
	plane_node.rotation.y = atan2(dir.x, dir.y)
	if player.state == "plane":
		# Ride at the tail ramp looking out
		player.global_position = plane_node.global_position - Vector3(dir.x, 0, dir.y) * 13.0 + Vector3(0, -2.5, 0)
		# Auto-jump before the plane leaves the island (landing past the coast meant open sea)
		var leaving := plane_t > 0.55 and not world.is_land(flat.x, flat.y)
		if (Input.is_action_just_pressed("jump") and not _ui_blocking()) or plane_t > 0.93 or leaving:
			_player_jump()
	for bot in bots:
		if not bot.puppet and bot.state == "plane" and plane_t >= float(bot.get_meta("jump_at")):
			_bot_jump(bot)
	if plane_t >= 1.0:
		plane_node.queue_free()
		plane_node = null
		phase = "match"
		for bot in bots:
			if not bot.puppet and bot.state == "plane": _bot_jump(bot)

func _player_jump() -> void:
	player.start_freefall()
	sfx.set_loop("wind")
	hud.flash_message("Steer with the stick · look down to dive faster · CHUTE to open", 4.0)

func _bot_jump(bot: RoyaleBot) -> void:
	bot.visible = true
	bot.global_position = player.global_position if plane_node == null else plane_node.global_position + Vector3(0, -3, 0)
	bot.state = "freefall"
	# Pick a town near the flight path (or anywhere on land)
	var choice: Vector3
	if rng.randf() < 0.6:
		var best := world.towns[0]
		var best_score := INF
		for town in world.towns:
			var score := _distance_to_path(town.pos) + rng.randf_range(0.0, 450.0)
			if score < best_score:
				best_score = score
				best = town
		var p: Vector2 = best.pos + Vector2(rng.randf_range(-1, 1), rng.randf_range(-1, 1)) * float(best.radius) * 0.8
		choice = Vector3(p.x, 0, p.y)
	else:
		choice = world.random_land_point()
	bot.drop_target = choice

func _distance_to_path(p: Vector2) -> float:
	var ab := plane_end - plane_start
	var t := clampf((p - plane_start).dot(ab) / ab.length_squared(), 0.0, 1.0)
	return p.distance_to(plane_start + ab * t)

func on_player_landed() -> void:
	sfx.set_loop("")
	hud.flash_message("Find a weapon in the houses!", 3.0)
	Input.action_release("jump")

# ── Zone ─────────────────────────────────────────────────────

func _start_zone_phase(index: int) -> void:
	zone.phase = index
	var data: Dictionary = ZONE_PHASES[index]
	zone.from_center = zone.center
	zone.from_radius = zone.radius
	var new_r: float = data.radius
	# The next circle sits inside the current one, on land where possible
	var c: Vector2 = zone.center
	for attempt in 20:
		var a := rng.randf() * TAU
		var d := rng.randf() * maxf(0.0, float(zone.radius) - new_r) * 0.85
		var cand: Vector2 = zone.center + Vector2(cos(a), sin(a)) * d
		if world.is_land(cand.x, cand.y) or attempt == 19:
			c = cand
			break
	zone.next_center = c
	zone.next_radius = new_r
	zone.timer = float(data.wait)
	zone.shrinking = false
	if index == 1 and not airdrop_done:
		_spawn_airdrop()
	elif index >= 1 and index <= 4:
		_spawn_supply_drop()
	if net.active and net.is_host:
		net.send({"t": "zone", "ph": index, "fc": [zone.from_center.x, zone.from_center.y], "fr": zone.from_radius,
			"nc": [c.x, c.y], "nr": new_r, "tm": zone.timer})
	if index > 0 and not smoke_mode:
		hud.flash_message("New safe zone marked on the map", 3.0)

func _update_zone(delta: float) -> void:
	if zone.phase < 0:
		if (phase == "match" or player.state == "ground") and (not net.active or net.is_host):
			zone.center = Vector2.ZERO
			zone.radius = 780.0   # wide enough to include Isla Verde at the start
			_start_zone_phase(0)
		return
	var before := float(zone.timer)
	zone.timer -= delta
	var data: Dictionary = ZONE_PHASES[zone.phase]
	if not zone.shrinking and not smoke_mode:
		for warn in [30.0, 10.0]:
			if before > warn and float(zone.timer) <= warn:
				hud.flash_message("The zone starts shrinking in %d seconds!" % int(warn), 3.0)
				sfx.play("zone", 1.4)
	zone_alert = "shrinking" if zone.shrinking else ("soon" if float(zone.timer) <= 30.0 else "")
	var wall_mat := zone_wall.material_override as ShaderMaterial
	wall_mat.set_shader_parameter("shrinking", 1.0 if zone.shrinking else 0.0)
	if not zone.shrinking and zone.timer <= 0.0:
		zone.shrinking = true
		zone.timer = float(data.shrink)
		if not smoke_mode:
			hud.flash_message("⚠ The zone is shrinking! Move to the safe area.", 3.0)
			sfx.play("zone", 0.7)
	elif zone.shrinking:
		var t := 1.0 - clampf(zone.timer / float(data.shrink), 0.0, 1.0)
		zone.center = Vector2(zone.from_center).lerp(zone.next_center, t)
		zone.radius = lerpf(float(zone.from_radius), float(zone.next_radius), t)
		zone.dps = float(data.dps)
		if zone.timer <= 0.0 and int(zone.phase) < ZONE_PHASES.size() - 1 and (not net.active or net.is_host):
			_start_zone_phase(int(zone.phase) + 1)
	zone_wall.global_position = Vector3(zone.center.x, 150.0, zone.center.y)
	zone_wall.scale = Vector3(maxf(0.5, float(zone.radius)), 1.0, maxf(0.5, float(zone.radius)))
	# Damage everyone outside, once per second
	zone_tick -= delta
	if zone_tick <= 0.0:
		zone_tick = 1.0
		for c in combatants:
			if not c.is_alive():
				continue
			if c is RoyalePlayer and (c as RoyalePlayer).state != "ground": continue
			if c is RoyaleBot and (c as RoyaleBot).state != "ground": continue
			if Vector2(c.global_position.x, c.global_position.z).distance_to(zone.center) > float(zone.radius):
				c.take_damage(float(zone.dps), false, "the zone", true)
				if c == player:
					hud.damage_flash(25.0)
					sfx.play("zone")

func zone_text() -> String:
	if zone.phase < 0:
		return "Zone appears after landing"
	var p := Vector2(player.global_position.x, player.global_position.z)
	var outside := p.distance_to(zone.next_center) > float(zone.next_radius)
	var t := "%d:%02d" % [int(zone.timer) / 60, int(zone.timer) % 60]
	var what := "Shrinking" if zone.shrinking else "Next shrink in"
	var dist := ""
	if outside:
		dist = " · Safe zone %dm" % int(p.distance_to(zone.next_center) - float(zone.next_radius))
	return "%s %s%s" % [what, t, dist]

# ── Shooting ─────────────────────────────────────────────────

func _ray(from: Vector3, to: Vector3, mask: int, exclude: Array[RID]) -> Dictionary:
	var q := PhysicsRayQueryParameters3D.create(from, to, mask, exclude)
	q.collide_with_areas = false
	return get_world_3d().direct_space_state.intersect_ray(q)

func has_line_of_sight(from: Vector3, to: Vector3, exclude_node: Node3D) -> bool:
	var ex: Array[RID] = []
	if exclude_node is CollisionObject3D: ex.append((exclude_node as CollisionObject3D).get_rid())
	return _ray(from, to, 1, ex).is_empty()

func ray_blocked(from: Vector3, to: Vector3, exclude_node: Node3D) -> bool:
	return not has_line_of_sight(from, to, exclude_node)

func fire_hitscan(shooter: RoyalePlayer, origin: Vector3, dir: Vector3, gun_id: String, muzzle: Vector3) -> void:
	var data := Items.gun(gun_id)
	var reach := float(data.range) * 2.5
	var hit := _ray(origin, origin + dir * reach, 1 | 4, [shooter.get_rid()])
	var end := origin + dir * reach
	if not hit.is_empty():
		end = hit.position
		var target: Object = hit.collider
		if (target is RoyaleBot or target is RoyaleRemote) and target.is_alive():
			var victim: Node3D = target
			var headshot: bool = float(hit.position.y) >= victim.head_y() - 0.22
			var dmg := Items.damage_at(gun_id, origin.distance_to(hit.position)) * (2.1 if headshot else 1.0)
			victim.take_damage(dmg, headshot, shooter.combatant_name)
			hud.hitmarker(not victim.is_alive())
			sfx.play("kill" if not victim.is_alive() else "hit", 1.3 if headshot else 1.0)
	_tracer(muzzle, end)
	if net.active:
		net.send({"t": "shot", "o": RoyaleNet.v3(muzzle), "e": RoyaleNet.v3(end), "g": gun_id})
	sfx.play(RoyaleSfx.shot_key(gun_id))
	recent_shots.append({"pos": Vector2(origin.x, origin.z), "t": Time.get_ticks_msec() * 0.001, "mine": true})

func melee(shooter: RoyalePlayer) -> void:
	var origin := shooter.camera.global_position
	var dir := -shooter.camera.global_transform.basis.z
	var hit := _ray(origin, origin + dir * 2.0, 1 | 4, [shooter.get_rid()])
	sfx.play("punch")
	if not hit.is_empty() and (hit.collider is RoyaleBot or hit.collider is RoyaleRemote):
		hit.collider.take_damage(18.0, false, shooter.combatant_name)
		hud.hitmarker(not hit.collider.is_alive())

func bot_shot(bot: RoyaleBot, target: Node3D, hit: bool, dmg: float, headshot: bool, gun_id: String) -> void:
	var muzzle := bot.global_position + Vector3(0, 1.25, 0) + bot.global_transform.basis.z * 0.6
	var aim: Vector3 = target.chest_point() if target.has_method("chest_point") else target.global_position + Vector3(0, 1.2, 0)
	if not hit:
		aim += Vector3(rng.randf_range(-1.2, 1.2), rng.randf_range(-0.6, 0.9), rng.randf_range(-1.2, 1.2))
	# Walls still stop bullets even if the bot "rolled" a hit
	if hit and not has_line_of_sight(muzzle, aim, bot):
		hit = false
	if hit and target.is_alive():
		# Bots are gentler on each other so fights last into the late zones
		target.take_damage(dmg * (0.45 if target is RoyaleBot else 1.0), headshot, bot.combatant_name)
		if target == player:
			hud.damage_flash(dmg)
	if net.active:
		net.bot_shot(bots.find(bot), aim)
	var near_player := bot.global_position.distance_to(player.global_position) < 260.0
	if near_player and bot.soldier:
		bot.soldier.shoot_fx()
		if bot.soldier.muzzle:
			muzzle = bot.soldier.muzzle.global_position
	if near_player:
		_tracer(muzzle, aim)
		sfx.play_at(RoyaleSfx.shot_key(gun_id), muzzle)
	recent_shots.append({"pos": Vector2(bot.global_position.x, bot.global_position.z), "t": Time.get_ticks_msec() * 0.001, "mine": false})
	if recent_shots.size() > 40:
		recent_shots.remove_at(0)

func find_combatant(name: String) -> Node3D:
	for c in combatants:
		if c.combatant_name == name:
			return c
	return null

func alive_count() -> int:
	var n := 0
	for c in combatants:
		if c.is_alive(): n += 1
	return n

func on_combatant_died(victim: Node3D, killer: String) -> void:
	var killer_node := find_combatant(killer)
	death_log.append("%.0fs %s <- %s" % [match_time, victim.combatant_name, killer])
	if killer_node and killer_node != victim:
		killer_node.kills += 1
	var mine := killer_node == player
	if not smoke_mode:
		hud.add_feed("%s ✖ %s" % [killer, victim.combatant_name] if killer != "the zone" else "%s was caught by the zone" % victim.combatant_name, mine)
		if mine: hud.flash_message("You eliminated %s" % victim.combatant_name, 2.0)
	var items := _death_items(victim)
	if net.active and net.is_host and victim is RoyaleBot:
		net.send({"t": "bdied", "i": bots.find(victim), "by": killer, "items": RoyaleNet.clean_items(items)})
	_drop_death_loot(victim, items)
	_check_end()

func _on_player_died(killer: String) -> void:
	if not smoke_mode:
		hud.add_feed("%s ✖ You" % killer if killer != "the zone" else "You were caught by the zone", true)
	var items := _death_items(player)
	if net.active:
		net.send({"t": "died", "by": killer, "items": RoyaleNet.clean_items(items)})
	_drop_death_loot(player, items)
	await get_tree().create_timer(1.8).timeout
	_finish(false)

func _check_end() -> void:
	if ended:
		return
	if player.is_alive() and alive_count() == 1 and player.state == "ground":
		_finish(true)

func _finish(won: bool) -> void:
	if ended:
		return
	ended = true
	var placement := 1 if won else alive_count() + 1
	var coins := player.kills * 5 + (50 if won else (20 if placement <= 5 else (10 if placement <= 10 else 2)))
	_award_coins(coins)
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	touch.release_all()
	sfx.set_loop("")
	if won: sfx.play("kill", 0.7)
	if not smoke_mode:
		hud.show_end(won, placement, player.kills, coins)

## Adds to the same coin balance the 2D Battle Royale uses (localStorage 'rl_coins_v1').
func _award_coins(amount: int) -> void:
	if not OS.has_feature("web") or amount <= 0:
		return
	JavaScriptBridge.eval("""(function(n){
		function add(s){ var c = parseInt(s.getItem('rl_coins_v1') || '0', 10) || 0; s.setItem('rl_coins_v1', String(c + n)); }
		try { add(window.parent.localStorage); } catch (e) { try { add(window.localStorage); } catch (e2) {} }
		try { window.parent.postMessage({ type: 'royale3d-coins', amount: n }, '*'); } catch (e3) {}
	})(%d)""" % amount, true)

func _quit_to_arcade() -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("""(function(){
			try { if (window.parent && window.parent !== window && window.parent.goToPage) { window.parent.goToPage('games'); return; } } catch (e) {}
			try { window.parent.postMessage({ type: 'royale3d-exit' }, '*'); } catch (e) {}
			if (window.parent === window) history.back();
		})()""", true)
	else:
		get_tree().quit()

func _restart() -> void:
	if net.active and OS.has_feature("web"):
		JavaScriptBridge.eval("(function(){try{window.parent.classAppRooms.backToRoom();}catch(e){}})()", true)
		return
	get_tree().reload_current_scene()

# ── Loot ─────────────────────────────────────────────────────

func _cell(p: Vector3) -> Vector2i:
	return Vector2i(floori(p.x / 24.0), floori(p.z / 24.0))

func _spawn_loot() -> void:
	for point in world.loot_points:
		var tier: int = point.tier
		var count := rng.randi_range(1, 2) + (1 if tier == 2 else 0)
		for i in count:
			var pos: Vector3 = point.pos + Vector3(rng.randf_range(-0.5, 0.5), 0, rng.randf_range(-0.5, 0.5))
			var roll := rng.randf()
			if roll < 0.42:
				var gid := Items.pick_weighted(Items.GUN_WEIGHTS[tier], rng)
				_add_loot({"type": "gun", "id": gid}, pos, point.path)
				_add_loot({"type": "ammo", "id": Items.gun(gid).ammo, "count": int(Items.AMMO[Items.gun(gid).ammo].box) * 2}, pos + Vector3(0.4, 0, 0.3), point.path)
			elif roll < 0.6:
				var types := ["9mm", "556", "762", "12g"]
				var t: String = types[rng.randi_range(0, 3)]
				_add_loot({"type": "ammo", "id": t, "count": int(Items.AMMO[t].box)}, pos, point.path)
			elif roll < 0.8:
				var med: String = ["bandage", "bandage", "bandage", "firstaid", "firstaid", "drink", "drink", "medkit"][rng.randi_range(0, 7)]
				_add_loot({"type": "med", "id": med, "count": 5 if med == "bandage" else 1}, pos, point.path)
			elif roll < 0.92:
				var level := 1
				var lr := rng.randf()
				if tier == 2: level = 3 if lr < 0.25 else 2
				elif tier == 1: level = 2 if lr < 0.4 else 1
				else: level = 2 if lr < 0.22 else 1
				_add_loot({"type": "vest" if rng.randf() < 0.5 else "helmet", "level": level}, pos, point.path)
			else:
				_add_loot({"type": "grenade", "count": 1}, pos, point.path)

func _loot_material(color: Color) -> StandardMaterial3D:
	var key := color.to_html()
	if not _loot_mats.has(key):
		var m := StandardMaterial3D.new()
		m.albedo_color = color
		m.emission_enabled = true
		m.emission = color
		m.emission_energy_multiplier = 0.35
		_loot_mats[key] = m
	return _loot_mats[key]

func _add_loot(item: Dictionary, pos: Vector3, path: Array, uid := "") -> Dictionary:
	if uid.is_empty():
		if _loot_ready and net.active:
			uid = net.next_drop_id()
			net.send({"t": "add", "item": RoyaleNet.clean_item(item), "p": RoyaleNet.v3(pos), "u": uid})
		else:
			uid = str(_next_loot_id)
			_next_loot_id += 1
	item.pos = pos
	item.path = path
	item.taken = false
	item.uid = uid
	loot_by_uid[uid] = item
	if not item.has("count"): item.count = 1
	if not smoke_mode:
		item.node = _make_loot_node(item)
		item.node.global_position = pos + Vector3(0, 0.12, 0)
	var key := _cell(pos)
	if not loot_grid.has(key): loot_grid[key] = []
	loot_grid[key].append(item)
	loot_items.append(item)
	return item

func _make_loot_node(item: Dictionary) -> Node3D:
	var n := Node3D.new()
	add_child(n)
	match String(item.type):
		"gun":
			var g := Items.gun_node(String(item.id))
			g.rotation_degrees = Vector3(0, rng.randf_range(0, 360), 90)
			g.position.y = 0.06
			n.add_child(g)
		_:
			var mi := MeshInstance3D.new()
			var color := Color.WHITE
			var size := Vector3(0.35, 0.22, 0.25)
			match String(item.type):
				"ammo": color = Items.AMMO[String(item.id)].color
				"med":
					color = Items.MEDS[String(item.id)].color
					size = Vector3(0.3, 0.12, 0.3) if String(item.id) != "drink" else Vector3(0.12, 0.3, 0.12)
				"vest":
					color = [Color.WHITE, Color("8aa36b"), Color("5b7fa6"), Color("2e2e38")][int(item.level)]
					size = Vector3(0.5, 0.15, 0.6)
				"helmet":
					color = [Color.WHITE, Color("8aa36b"), Color("5b7fa6"), Color("2e2e38")][int(item.level)]
					var sphere := SphereMesh.new()
					sphere.radius = 0.2
					sphere.height = 0.3
					sphere.is_hemisphere = true
					sphere.material = _loot_material(color)
					mi.mesh = sphere
				"grenade":
					color = Color("4d6b3a")
					size = Vector3(0.14, 0.18, 0.14)
			if mi.mesh == null:
				var box := BoxMesh.new()
				box.size = size
				box.material = _loot_material(color)
				mi.mesh = box
			mi.position.y = size.y * 0.5
			n.add_child(mi)
	for m: MeshInstance3D in n.find_children("*", "MeshInstance3D", true, false):
		m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		m.visibility_range_end = 90.0
	return n

func loot_available(item: Dictionary) -> bool:
	if item.is_empty():
		return false
	if item.has("crate"):
		return crates.has(item.crate) and not (item.crate.items as Array).is_empty()
	return not bool(item.get("taken", false))

func _remove_loot(item: Dictionary, sync := true) -> void:
	if sync and net.active and not bool(item.get("taken", false)):
		net.send({"t": "take", "u": item.uid})
	loot_by_uid.erase(item.uid)
	item.taken = true
	if item.has("node") and is_instance_valid(item.node):
		item.node.queue_free()
	var key := _cell(item.pos)
	if loot_grid.has(key):
		loot_grid[key].erase(item)
	loot_items.erase(item)
	loot_reserved.erase(item.uid)

func _items_near(pos: Vector3, radius: float) -> Array:
	var out := []
	var r := int(ceil(radius / 24.0))
	var c := _cell(pos)
	for dz in range(-r, r + 1):
		for dx in range(-r, r + 1):
			var key := Vector2i(c.x + dx, c.y + dz)
			if loot_grid.has(key):
				for item in loot_grid[key]:
					if not bool(item.taken) and Vector3(item.pos).distance_to(pos) <= radius:
						out.append(item)
	return out

## The item the PICK UP button would take (guns first, then upgrades).
func nearby_loot() -> Dictionary:
	if Engine.get_process_frames() == _nearby_frame:
		return _nearby_cache
	_nearby_frame = Engine.get_process_frames()
	_nearby_cache = {}
	if player == null or player.state != "ground":
		return _nearby_cache
	var best_d := 2.4
	for item in _items_near(player.global_position, 2.4):
		if absf(float(item.pos.y) - player.global_position.y) > 1.8:
			continue
		var d := Vector3(item.pos).distance_to(player.global_position)
		var bonus := 0.6 if String(item.type) == "gun" else 0.0
		if d - bonus < best_d:
			best_d = d - bonus
			_nearby_cache = item
	return _nearby_cache

func prompt_text() -> String:
	if player == null or player.state != "ground" or ended:
		return ""
	var key := "" if RoyalePlayer.is_touch_platform() else " [F]"
	var item := nearby_loot()
	if not item.is_empty():
		return "Pick up %s%s" % [Items.describe(item), key]
	if not nearby_crate().is_empty():
		return ""   # the crate's loot list is on screen
	var door := nearby_door()
	if not door.is_empty():
		return ("Close door%s" if bool(door.open) else "Open door%s") % key
	return ""

## Label for the context button: PICK UP, OPEN or CLOSE (empty = hide the button).
func interact_label() -> String:
	if player == null or player.state != "ground":
		return ""
	if player.vehicle:
		return "EXIT"
	if not nearby_loot().is_empty():
		return "PICK UP"
	if not nearby_crate().is_empty():
		return ""   # the crate list has its own Take / Take all buttons
	var door := nearby_door()
	if not door.is_empty():
		return "CLOSE" if bool(door.open) else "OPEN"
	if player.vehicle:
		return "EXIT"
	var v := nearby_vehicle()
	if v:
		return v.label()
	return ""

func nearby_door() -> Dictionary:
	if player == null or world == null:
		return {}
	return world.nearest_door(player.global_position + Vector3(0, 1.0, 0) - player.global_transform.basis.z * 0.4, 2.2)

## F / context button: pick up loot first, otherwise open or close the nearest door, otherwise
## get in (or out of) a vehicle.
func pickup_nearby() -> void:
	if player.vehicle:
		_leave_vehicle()
		return
	var item := nearby_loot()
	if not item.is_empty():
		_player_take(item, true)
		return
	var crate := nearby_crate()
	if not crate.is_empty():
		take_from_crate(crate, -1)
		return
	var door := nearby_door()
	if not door.is_empty():
		set_door(door, not bool(door.open))
		sfx.play("pickup", 0.6)
		return
	var v := nearby_vehicle()
	if v:
		_enter_vehicle(v)

var _door_clock := 0.0
## Bots open doors they walk up to (like players pressing F).
func _bots_open_doors(delta: float) -> void:
	_door_clock -= delta
	if _door_clock > 0.0:
		return
	_door_clock = 0.3
	for bot in bots:
		if bot.puppet or bot.state != "ground" or not bot.is_alive() or bot.far:
			continue
		var door := world.nearest_door(bot.global_position + Vector3(0, 1.0, 0), 1.9)
		if not door.is_empty() and not bool(door.open):
			set_door(door, true)

func set_door(door: Dictionary, open: bool) -> void:
	world.set_door_open(door, open)
	if net.active:
		net.send({"t": "door", "i": world.doors.find(door), "o": open})

## Applies an item to the player. Auto-pickup only takes things that are clearly useful.
func _player_take(item: Dictionary, manual: bool) -> bool:
	if not _apply_item_to_player(item, manual):
		return false
	hud.flash_message("Picked up %s" % Items.describe(item), 1.4)
	sfx.play("pickup")
	_remove_loot(item)
	return true

func _apply_item_to_player(item: Dictionary, manual: bool) -> bool:
	var p := player
	match String(item.type):
		"gun":
			if not manual:
				return false
			var dropped := p.give_gun(String(item.id), int(item.get("mag", -1)))
			if not dropped.is_empty():
				_add_loot({"type": "gun", "id": dropped.id, "mag": dropped.mag}, p.global_position + Vector3(0.6, 0.0, 0.0), [])
		"ammo":
			var have := int(p.ammo[String(item.id)])
			if have >= Items.MAX_AMMO: return false
			p.ammo[String(item.id)] = mini(Items.MAX_AMMO, have + int(item.count))
		"med":
			var max_n := int(Items.MEDS[String(item.id)].max)
			if int(p.meds[String(item.id)]) >= max_n: return false
			p.meds[String(item.id)] = mini(max_n, int(p.meds[String(item.id)]) + int(item.count))
		"vest":
			if int(item.level) <= p.vest and not manual: return false
			if p.vest > 0 and manual: _add_loot({"type": "vest", "level": p.vest, "hp": p.vest_hp}, p.global_position + Vector3(0.5, 0, 0.3), [])
			p.vest = int(item.level)
			p.vest_hp = float(item.get("hp", Items.ARMOR_DURABILITY[p.vest]))
		"helmet":
			if int(item.level) <= p.helmet and not manual: return false
			if p.helmet > 0 and manual: _add_loot({"type": "helmet", "level": p.helmet, "hp": p.helmet_hp}, p.global_position + Vector3(-0.5, 0, 0.3), [])
			p.helmet = int(item.level)
			p.helmet_hp = float(item.get("hp", Items.ARMOR_DURABILITY[p.helmet]))
		"grenade":
			if p.grenades >= Items.MAX_GRENADES: return false
			p.grenades = mini(Items.MAX_GRENADES, p.grenades + int(item.count))
	return true

func _auto_pickup() -> void:
	if player.state != "ground":
		return
	for item in _items_near(player.global_position, 1.3):
		if String(item.type) != "gun" and absf(float(item.pos.y) - player.global_position.y) < 1.5:
			_player_take(item, false)

func find_loot_for_bot(bot: RoyaleBot, radius: float) -> Dictionary:
	var best := {}
	var best_score := INF
	for item in _items_near(bot.global_position, radius):
		if loot_reserved.has(item.uid) and loot_reserved[item.uid] != bot:
			continue
		var useful := false
		match String(item.type):
			"gun": useful = bot.gun_id.is_empty() or Items.gun(String(item.id)).tier > Items.gun(bot.gun_id).tier
			"vest": useful = int(item.level) > bot.vest
			"helmet": useful = int(item.level) > bot.helmet
			"med": useful = bot.meds < 3
			"grenade": useful = bot.grenades < 2
		if not useful:
			continue
		var score := Vector3(item.pos).distance_to(bot.global_position) - (25.0 if String(item.type) == "gun" else 0.0)
		if score < best_score:
			best_score = score
			best = item
	# Crates (death boxes and supply drops) count as loot too
	for c in crates:
		if not bool(c.ready) or (c.items as Array).is_empty():
			continue
		var d := Vector3(c.pos).distance_to(bot.global_position)
		if d > radius:
			continue
		for it in c.items:
			var good: bool = (String(it.type) == "gun" and (bot.gun_id.is_empty() or Items.gun(String(it.id)).tier > Items.gun(bot.gun_id).tier)) \
				or (String(it.type) == "vest" and int(it.level) > bot.vest) or (String(it.type) == "helmet" and int(it.level) > bot.helmet)
			if good and d - 20.0 < best_score:
				best_score = d - 20.0
				best = {"crate": c, "pos": c.pos, "path": [], "uid": -1}
				break
	if not best.is_empty() and not best.has("crate"):
		loot_reserved[best.uid] = bot
	return best

func bot_pickup(bot: RoyaleBot, item: Dictionary) -> void:
	if item.has("crate"):
		var crate: Dictionary = item.crate
		if not crates.has(crate) or Vector3(crate.pos).distance_to(bot.global_position) > 3.0:
			return
		for it in (crate.items as Array).duplicate():
			match String(it.type):
				"gun":
					if bot.gun_id.is_empty() or Items.gun(String(it.id)).tier > Items.gun(bot.gun_id).tier:
						bot.set_gun(String(it.id)); crate.items.erase(it)
				"vest":
					if int(it.level) > bot.vest:
						bot.vest = int(it.level); bot.vest_hp = Items.ARMOR_DURABILITY[bot.vest]; crate.items.erase(it)
				"helmet":
					if int(it.level) > bot.helmet:
						bot.helmet = int(it.level); bot.helmet_hp = Items.ARMOR_DURABILITY[bot.helmet]; crate.items.erase(it)
				"med":
					if bot.meds < 3: bot.meds += 1; crate.items.erase(it)
		_crate_changed(crate)
		return
	if not loot_available(item) or Vector3(item.pos).distance_to(bot.global_position) > 2.5:
		loot_reserved.erase(item.get("uid", -1))
		return
	match String(item.type):
		"gun": bot.set_gun(String(item.id))
		"vest":
			bot.vest = int(item.level)
			bot.vest_hp = Items.ARMOR_DURABILITY[bot.vest]
		"helmet":
			bot.helmet = int(item.level)
			bot.helmet_hp = Items.ARMOR_DURABILITY[bot.helmet]
		"med": bot.meds += 1
		"grenade": bot.grenades += 1
	_remove_loot(item)

## What the victim carried. In a room match a classmate's or a host-run bot's list comes
## with its "died" / "bdied" message.
func _death_items(victim: Node3D) -> Array:
	var items: Array = []
	if victim.has_meta("death_items"):
		return victim.get_meta("death_items")
	if victim is RoyaleRemote:
		return (victim as RoyaleRemote).death_items
	if victim is RoyaleBot:
		var b := victim as RoyaleBot
		if not b.gun_id.is_empty():
			items.append({"type": "gun", "id": b.gun_id, "mag": b.mag})
			items.append({"type": "ammo", "id": Items.gun(b.gun_id).ammo, "count": 60})
		if b.vest > 0: items.append({"type": "vest", "level": b.vest, "hp": b.vest_hp})
		if b.helmet > 0: items.append({"type": "helmet", "level": b.helmet, "hp": b.helmet_hp})
		if b.meds > 0: items.append({"type": "med", "id": "firstaid", "count": b.meds})
		items.append({"type": "med", "id": "bandage", "count": 3})
		if b.grenades > 0: items.append({"type": "grenade", "count": b.grenades})
	elif victim is RoyalePlayer:
		var p := victim as RoyalePlayer
		for g in p.slots:
			if not g.is_empty(): items.append({"type": "gun", "id": g.id, "mag": g.mag})
		for a in p.ammo: if int(p.ammo[a]) > 0: items.append({"type": "ammo", "id": a, "count": p.ammo[a]})
		if p.vest > 0: items.append({"type": "vest", "level": p.vest, "hp": p.vest_hp})
		if p.helmet > 0: items.append({"type": "helmet", "level": p.helmet, "hp": p.helmet_hp})
		for m in p.meds: if int(p.meds[m]) > 0: items.append({"type": "med", "id": m, "count": p.meds[m]})
		if p.grenades > 0: items.append({"type": "grenade", "count": p.grenades})
	return items

## PUBG-style death crate: a box holding exactly what the victim carried.
func _drop_death_loot(victim: Node3D, items: Array) -> void:
	if items.is_empty():
		return
	var at := victim.global_position
	at.y = world.height_at(at.x, at.z) if at.y < world.height_at(at.x, at.z) + 0.5 else at.y
	_make_crate(at, items.duplicate(true), "death", "%s's crate" % victim.combatant_name, true, "d:" + victim.combatant_name)

func _make_crate(pos: Vector3, items: Array, kind: String, label: String, ready: bool, id := "") -> Dictionary:
	var crate := {"pos": pos, "items": items, "kind": kind, "label": label, "ready": ready, "id": id}
	crates.append(crate)
	if not id.is_empty():
		crates_by_id[id] = crate
	if smoke_mode:
		return crate
	var n := Node3D.new()
	add_child(n)
	n.global_position = pos
	var mi := MeshInstance3D.new()
	var box := BoxMesh.new()
	if kind == "death":
		box.size = Vector3(0.9, 0.55, 0.6)
		box.material = _loot_material(Color("3b3f45"))
	else:
		box.size = Vector3(1.3, 0.95, 1.3)
		box.material = _loot_material(Color("2f6fd6") if kind == "supply" else Color("d64545"))
	mi.mesh = box
	mi.position.y = box.size.y * 0.5
	n.add_child(mi)
	var stripe := MeshInstance3D.new()
	var sbox := BoxMesh.new()
	sbox.size = Vector3(box.size.x + 0.02, 0.1, box.size.z + 0.02)
	sbox.material = _loot_material(Color("f2c94c"))
	stripe.mesh = sbox
	stripe.position.y = box.size.y * 0.7
	n.add_child(stripe)
	var tag := Label3D.new()
	tag.text = label
	tag.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	tag.font_size = 22
	tag.outline_size = 8
	tag.pixel_size = 0.004
	tag.position.y = box.size.y + 0.6
	tag.visibility_range_end = 40.0
	tag.no_depth_test = false
	n.add_child(tag)
	crate.node = n
	return crate

func _remove_crate_if_empty(crate: Dictionary) -> void:
	if not (crate.items as Array).is_empty():
		return
	crates.erase(crate)
	crates_by_id.erase(String(crate.get("id", "")))
	if crate.has("node") and is_instance_valid(crate.node):
		var n: Node3D = crate.node
		n.create_tween().tween_property(n, "scale", Vector3(0.01, 0.01, 0.01), 0.3)
		get_tree().create_timer(0.35).timeout.connect(n.queue_free)

## The crate the player is standing next to (its contents show in the loot list).
func nearby_crate() -> Dictionary:
	if Engine.get_process_frames() == _crate_frame:
		return _nearby_crate
	_crate_frame = Engine.get_process_frames()
	_nearby_crate = {}
	if player == null or player.state != "ground":
		return _nearby_crate
	var best := 2.8
	for c in crates:
		if not bool(c.ready) or (c.items as Array).is_empty():
			continue
		var d := Vector3(c.pos).distance_to(player.global_position)
		if d < best:
			best = d
			_nearby_crate = c
	return _nearby_crate

## Take one item from a crate (index) — or all of them (index -1).
func take_from_crate(crate: Dictionary, index: int) -> void:
	if crate.is_empty():
		return
	var items: Array = crate.items
	var picks: Array = []
	if index < 0:
		picks = items.duplicate()
	elif index < items.size():
		picks = [items[index]]
	for item in picks:
		var copy: Dictionary = item.duplicate()
		copy.pos = player.global_position
		if _apply_item_to_player(copy, true):
			items.erase(item)
	sfx.play("pickup")
	_crate_changed(crate)

## Someone took from a crate: tell the others what's left, then remove it if empty.
func _crate_changed(crate: Dictionary) -> void:
	if net.active and not String(crate.get("id", "")).is_empty():
		net.send({"t": "crate_set", "c": crate.id, "items": RoyaleNet.clean_items(crate.items)})
	_remove_crate_if_empty(crate)

# ── Grenades and airdrop ─────────────────────────────────────

func throw_grenade() -> void:
	if player.grenades <= 0 or player.state != "ground":
		return
	player.grenades -= 1
	player.note_throw()
	var g := RigidBody3D.new()
	g.collision_layer = 0
	g.collision_mask = 1
	g.mass = 0.4
	var cs := CollisionShape3D.new()
	var sphere := SphereShape3D.new()
	sphere.radius = 0.1
	cs.shape = sphere
	g.add_child(cs)
	var mi := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = 0.1
	mesh.height = 0.2
	mesh.material = _loot_material(Color("4d6b3a"))
	mi.mesh = mesh
	g.add_child(mi)
	add_child(g)
	var dir := -player.camera.global_transform.basis.z
	g.global_position = player.camera.global_position + dir * 0.5
	g.linear_velocity = dir * 17.0 + Vector3(0, 3.5, 0) + player.velocity * 0.5
	hud.flash_message("Grenade out!", 1.2)
	get_tree().create_timer(3.5).timeout.connect(func():
		if is_instance_valid(g):
			if net.active:
				net.send({"t": "nade", "p": RoyaleNet.v3(g.global_position)})
			_explode(g.global_position, player.combatant_name)
			g.queue_free())

func _explode(pos: Vector3, owner_name: String, damage := 115.0, radius := 7.5) -> void:
	explosion_effect(pos)
	for c in combatants:
		if not c.is_alive():
			continue
		var d := c.global_position.distance_to(pos)
		if d < radius and has_line_of_sight(pos + Vector3(0, 0.4, 0), c.global_position + Vector3(0, 1.0, 0), null):
			c.take_damage(damage * (1.0 - d / radius), false, owner_name)
			if c == player: hud.damage_flash(60.0)
			elif owner_name == player.combatant_name: hud.hitmarker(not c.is_alive())

func explosion_effect(pos: Vector3) -> void:
	sfx.play_at("explosion", pos)
	if pos.distance_to(player.global_position) < 40.0:
		player.shake_left = 0.4
	if not smoke_mode:
		var flash := MeshInstance3D.new()
		var s := SphereMesh.new()
		s.radius = 1.0
		s.height = 2.0
		var m := StandardMaterial3D.new()
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.albedo_color = Color(1.0, 0.7, 0.3, 0.8)
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		s.material = m
		flash.mesh = s
		add_child(flash)
		flash.global_position = pos
		var tween := create_tween()
		tween.tween_property(flash, "scale", Vector3.ONE * 6.0, 0.35)
		tween.parallel().tween_property(m, "albedo_color:a", 0.0, 0.35)
		tween.tween_callback(flash.queue_free)

func _spawn_airdrop() -> void:
	airdrop_done = true
	var special: String = ["awm", "m249", "rpg", "gatling"][rng.randi_range(0, 3)]
	var items := [
		{"type": "gun", "id": special},
		{"type": "ammo", "id": Items.gun(special).ammo, "count": 60},
		{"type": "vest", "level": 3},
		{"type": "helmet", "level": 3},
		{"type": "med", "id": "medkit", "count": 1},
	]
	_drop_crate_from_sky(items, "airdrop", "Airdrop")
	if not smoke_mode:
		hud.flash_message("Airdrop incoming! (red marker on the map)", 4.0)

## A supply crate parachutes into the safe zone with a random set of good gear.
func _spawn_supply_drop() -> void:
	var items: Array = []
	var gid := Items.pick_weighted(Items.GUN_WEIGHTS[2], rng)
	items.append({"type": "gun", "id": gid})
	items.append({"type": "ammo", "id": Items.gun(gid).ammo, "count": 60})
	items.append({"type": ["vest", "helmet"][rng.randi_range(0, 1)], "level": rng.randi_range(2, 3)})
	items.append({"type": "med", "id": ["firstaid", "medkit", "drink"][rng.randi_range(0, 2)], "count": 1})
	if rng.randf() < 0.6: items.append({"type": "grenade", "count": 2})
	items.append({"type": "med", "id": "bandage", "count": 5})
	_drop_crate_from_sky(items, "supply", "Supply crate")
	if not smoke_mode:
		hud.flash_message("Supply crate dropping! (blue marker on the map)", 3.5)

func _drop_crate_from_sky(items: Array, kind: String, label: String) -> void:
	var a := rng.randf() * TAU
	var c: Vector2 = zone.next_center + Vector2(cos(a), sin(a)) * float(zone.next_radius) * rng.randf_range(0.0, 0.7)
	if not world.is_land(c.x, c.y):
		c = zone.next_center
	var ground := Vector3(c.x, world.height_at(c.x, c.y), c.y)
	var id := "s:%d" % _supply_n
	_supply_n += 1
	if net.active:
		net.send({"t": "crate", "id": id, "k": kind, "l": label, "items": RoyaleNet.clean_items(items), "p": RoyaleNet.v3(ground)})
	_drop_crate_at(ground, items, kind, label, id)

func _drop_crate_at(ground: Vector3, items: Array, kind: String, label: String, id: String) -> void:
	var crate := _make_crate(ground + Vector3(0, 200.0, 0), items, kind, label, false, id)
	crate.target = ground
	if kind == "airdrop":
		airdrop_pos = ground
	if crate.has("node"):
		var chute := MeshInstance3D.new()
		var sp := SphereMesh.new()
		sp.radius = 2.2
		sp.height = 1.6
		sp.is_hemisphere = true
		sp.material = _loot_material(Color("f2f2f2") if kind == "supply" else Color("ff6b3d"))
		chute.mesh = sp
		chute.position.y = 4.2
		chute.name = "Chute"
		crate.node.add_child(chute)
		# Coloured smoke trail so it can be spotted from far away
		var smoke := CPUParticles3D.new()
		smoke.amount = 24
		smoke.lifetime = 2.5
		smoke.direction = Vector3.UP
		smoke.initial_velocity_min = 2.0
		smoke.initial_velocity_max = 4.0
		smoke.gravity = Vector3(0, 0.6, 0)
		smoke.scale_amount_min = 1.0
		smoke.scale_amount_max = 2.5
		var puff := SphereMesh.new()
		puff.radius = 0.4
		puff.height = 0.8
		var pm := StandardMaterial3D.new()
		pm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		pm.albedo_color = Color(0.3, 0.55, 1.0, 0.45) if kind == "supply" else Color(1.0, 0.35, 0.3, 0.45)
		pm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		puff.material = pm
		smoke.mesh = puff
		smoke.name = "Smoke"
		smoke.emitting = false
		crate.node.add_child(smoke)
	falling_crates.append(crate)

func _update_airdrop(delta: float) -> void:
	for crate in falling_crates.duplicate():
		var target: Vector3 = crate.target
		crate.pos = Vector3(crate.pos) + Vector3(0, -10.0 * delta, 0)
		if Vector3(crate.pos).y <= target.y:
			crate.pos = target
			crate.ready = true
			falling_crates.erase(crate)
			if crate.has("node"):
				var chute: Node = crate.node.get_node_or_null("Chute")
				if chute: chute.queue_free()
				var smoke: CPUParticles3D = crate.node.get_node_or_null("Smoke")
				if smoke: smoke.emitting = true
		if crate.has("node") and is_instance_valid(crate.node):
			(crate.node as Node3D).global_position = crate.pos

# ── Input and frame loop ─────────────────────────────────────

func _ui_blocking() -> bool:
	return paused or map_open or ended or (hud != null and hud.modal_open())

func toggle_pause() -> void:
	if ended:
		return
	paused = not paused
	hud.show_pause(paused)
	if paused:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		touch.release_all()
	# The match keeps running while paused (it's a live battle), only input stops

## Ask the CLASS-APP page to go full screen (and landscape on phones).
func request_fullscreen() -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("""(function(){
			try { if (window.parent && window.parent.royale3dModule) { window.parent.royale3dModule.toggleFullscreen(); return; } } catch (e) {}
			var d = document.documentElement; if (d.requestFullscreen) d.requestFullscreen({ navigationUI: 'hide' }).then(function(){ try { screen.orientation.lock('landscape'); } catch (e) {} }).catch(function(){});
		})()""", true)
	else:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN if DisplayServer.window_get_mode() != DisplayServer.WINDOW_MODE_FULLSCREEN else DisplayServer.WINDOW_MODE_WINDOWED)

func toggle_map() -> void:
	map_open = not map_open
	hud.set_map_open(map_open)
	if map_open: touch.release_all()

func toggle_view() -> void:
	settings.view = "fps" if String(settings.get("view", "tps")) == "tps" else "tps"
	_apply_settings()
	hud.flash_message("Third-person view" if settings.view == "tps" else "First-person view", 1.4)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and (event as InputEventKey).keycode == KEY_V and not _ui_blocking():
		toggle_view()
		return
	if player == null or hud == null:
		return
	if event.is_action_pressed("pause"):
		if map_open: toggle_map()
		else: toggle_pause()
	elif event.is_action_pressed("map") and not ended:
		toggle_map()
	elif event is InputEventKey and event.pressed and not event.echo and (event as InputEventKey).physical_keycode in [KEY_TAB, KEY_B] and not ended and not paused:
		hud.toggle_backpack()
	if _ui_blocking() or player == null or not player.is_alive():
		return
	if event.is_action_pressed("reload"): player.start_reload()
	elif event.is_action_pressed("interact"): pickup_nearby()
	elif event.is_action_pressed("heal"): player.start_heal()
	elif event.is_action_pressed("throw"): throw_grenade()
	elif event.is_action_pressed("swap"): player.switch_slot()
	elif event.is_action_pressed("slot1"): player.switch_slot(0)
	elif event.is_action_pressed("slot2"): player.switch_slot(1)
	elif event is InputEventMouseButton and (event as InputEventMouseButton).button_index == MOUSE_BUTTON_RIGHT and not RoyalePlayer.is_touch_platform():
		player.aiming = (event as InputEventMouseButton).pressed

## Backpack: drop a gun / armour, or use a med item.
func drop_from_backpack(kind: String, key: String) -> void:
	var at := player.global_position + (-player.global_transform.basis.z) * 0.8
	match kind:
		"gun":
			var i := int(key)
			var g: Dictionary = player.slots[i]
			if g.is_empty(): return
			_add_loot({"type": "gun", "id": g.id, "mag": g.mag}, at, [])
			player.slots[i] = {}
			if player.active == i and not player.slots[1 - i].is_empty(): player.active = 1 - i
			player._refresh_gun_model()
		"vest":
			if player.vest == 0: return
			_add_loot({"type": "vest", "level": player.vest, "hp": player.vest_hp}, at, [])
			player.vest = 0
		"helmet":
			if player.helmet == 0: return
			_add_loot({"type": "helmet", "level": player.helmet, "hp": player.helmet_hp}, at, [])
			player.helmet = 0
		"ammo":
			var n := int(player.ammo[key])
			if n <= 0: return
			_add_loot({"type": "ammo", "id": key, "count": n}, at, [])
			player.ammo[key] = 0
		"med":
			var m := int(player.meds[key])
			if m <= 0: return
			_add_loot({"type": "med", "id": key, "count": m}, at, [])
			player.meds[key] = 0
		"grenade":
			if player.grenades <= 0: return
			_add_loot({"type": "grenade", "count": player.grenades}, at, [])
			player.grenades = 0
	sfx.play("pickup", 0.8)

func play_sfx(name: String, _pos: Vector3) -> void:
	sfx.play(name)

func _physics_process(delta: float) -> void:
	if player == null or hud == null:
		return  # still generating the island
	net.tick(delta)
	if _wait_layer:
		return  # room match: waiting for everyone to load
	match_time += delta
	if plane_node != null:
		_update_plane(delta)
	if player.state == "freefall" and Input.is_action_just_pressed("jump") and not _ui_blocking():
		player.open_chute()
	_update_zone(delta)
	_update_airdrop(delta)
	_update_rockets(delta)
	_bots_open_doors(delta)
	# Thin the haze at altitude so the island stays clear from the plane
	var base_fog := 0.0022 if bool(settings.low) else 0.0012
	env.environment.fog_density = base_fog * clampf(1.0 - (player.global_position.y - 40.0) / 260.0, 0.18, 1.0)
	if not ended:
		player.controls_enabled = not _ui_blocking()
		player.try_fire(Input.is_action_pressed("fire") and not _ui_blocking())
		_auto_pickup()
		_check_end()

## Automatic quality: if the frame rate stays low, render at a lower resolution, then drop
## shadows and grass. (Integrated GPUs and phones; the HUD stays sharp.)
var _q_time := 0.0
var _q_frames := 0
var _q_level := 0

func _auto_quality(delta: float) -> void:
	if smoke_mode or _bench or not settings.get("auto_quality", true):
		return
	_q_time += delta
	_q_frames += 1
	if _q_time < 3.0:
		return
	var fps := _q_frames / _q_time
	_q_time = 0.0
	_q_frames = 0
	if fps >= 30.0 or _q_level >= 4:
		return
	_q_level += 1
	var vp := get_viewport()
	match _q_level:
		1: vp.scaling_3d_scale = 0.8
		2: vp.scaling_3d_scale = 0.6
		3:
			sun.shadow_enabled = false
			for g in get_tree().get_nodes_in_group("grass"): (g as Node3D).visible = false
		4: vp.scaling_3d_scale = 0.55
	print("ROYALE_QUALITY level=%d fps=%.0f" % [_q_level, fps])

func _process(delta: float) -> void:
	if player != null and phase == "match":
		_auto_quality(delta)
	if _bench:
		_bench_frames += 1
		_bench_time += delta
		if _bench_time > 5.0:
			print("ROYALE_BENCH fps=%.1f" % (_bench_frames / _bench_time))
			_bench_frames = 0
			_bench_time = 0.0

# ── Rockets (RPG-7) ──────────────────────────────────────────

func fire_rocket(shooter: Node3D, origin: Vector3, dir: Vector3, muzzle: Vector3, gun_id: String) -> void:
	var data := Items.gun(gun_id)
	_launch_rocket(muzzle, (origin + dir * 400.0 - muzzle).normalized() if dir.length() > 0.0 else dir, String(shooter.combatant_name), float(data.speed), float(data.dmg), float(data.splash), float(data.radius), true, shooter)
	sfx.play("explosion", 1.8)
	recent_shots.append({"pos": Vector2(origin.x, origin.z), "t": Time.get_ticks_msec() * 0.001, "mine": shooter == player})
	if net.active:
		net.send({"t": "rocket", "o": RoyaleNet.v3(muzzle), "d": RoyaleNet.v3((origin + dir * 400.0 - muzzle).normalized())})

## Classmate's rocket: same flight, but their game deals the damage.
func remote_rocket(from: Vector3, dir: Vector3) -> void:
	var data := Items.gun("rpg")
	_launch_rocket(from, dir.normalized(), "", float(data.speed), 0.0, 0.0, float(data.radius), false, null)

func _launch_rocket(from: Vector3, dir: Vector3, owner_name: String, speed: float, direct: float, splash: float, radius: float, deals_damage: bool, shooter: Node3D) -> void:
	var node := Node3D.new()
	add_child(node)
	node.global_position = from
	if dir.length() > 0.01:
		node.look_at(from + dir, Vector3.UP if absf(dir.y) < 0.98 else Vector3.RIGHT)
	var body := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.03
	cyl.bottom_radius = 0.045
	cyl.height = 0.6
	var m := StandardMaterial3D.new()
	m.albedo_color = Color("4d5a3a")
	cyl.material = m
	body.mesh = cyl
	body.rotation.x = -PI * 0.5
	node.add_child(body)
	var flame := OmniLight3D.new()
	flame.light_color = Color("ffb04a")
	flame.light_energy = 2.0
	flame.omni_range = 5.0
	flame.position = Vector3(0, 0, 0.35)
	node.add_child(flame)
	var trail := CPUParticles3D.new()
	trail.amount = 40
	trail.lifetime = 1.2
	trail.local_coords = false
	trail.direction = Vector3(0, 0, 1)
	trail.spread = 12.0
	trail.initial_velocity_min = 1.0
	trail.initial_velocity_max = 2.0
	trail.gravity = Vector3(0, 0.8, 0)
	trail.scale_amount_min = 0.6
	trail.scale_amount_max = 1.6
	var puff := SphereMesh.new()
	puff.radius = 0.18
	puff.height = 0.36
	var pm := StandardMaterial3D.new()
	pm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	pm.albedo_color = Color(0.85, 0.85, 0.85, 0.45)
	pm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	puff.material = pm
	trail.mesh = puff
	trail.position = Vector3(0, 0, 0.35)
	node.add_child(trail)
	var ex: Array[RID] = []
	if shooter is CollisionObject3D:
		ex.append((shooter as CollisionObject3D).get_rid())
	rockets.append({"node": node, "dir": dir.normalized(), "speed": speed, "left": 4.5, "owner": owner_name,
		"direct": direct, "splash": splash, "radius": radius, "damage": deals_damage, "exclude": ex})

func _update_rockets(delta: float) -> void:
	for r in rockets.duplicate():
		var node: Node3D = r.node
		var from := node.global_position
		var to := from + Vector3(r.dir) * float(r.speed) * delta
		r.left = float(r.left) - delta
		var hit := _ray(from, to, 1 | 4, r.exclude)
		if hit.is_empty() and r.left > 0.0 and to.y > world.height_at(to.x, to.z) - 0.2:
			node.global_position = to
			continue
		var at: Vector3 = to if hit.is_empty() else hit.position
		rockets.erase(r)
		node.queue_free()
		if bool(r.damage):
			if not hit.is_empty() and (hit.collider is RoyaleBot or hit.collider is RoyaleRemote) and hit.collider.is_alive():
				hit.collider.take_damage(float(r.direct), false, String(r.owner))
				if String(r.owner) == player.combatant_name: hud.hitmarker(not hit.collider.is_alive())
			_explode(at, String(r.owner), float(r.splash), float(r.radius))
		else:
			explosion_effect(at)

# ── Vehicles ─────────────────────────────────────────────────

func _spawn_vehicles() -> void:
	for spawn in world.vehicle_spawns:
		var v := RoyaleVehicle.new()
		v.name = "Vehicle%d" % vehicles.size()
		add_child(v)
		v.setup(self, String(spawn.kind), String(spawn.model), vehicles.size())
		v.place(spawn.pos, float(spawn.yaw))
		vehicles.append(v)

func nearby_vehicle() -> RoyaleVehicle:
	if player == null or player.state != "ground" or player.vehicle != null:
		return null
	var best: RoyaleVehicle = null
	var best_d := 3.6
	for v: RoyaleVehicle in vehicles:
		if not v.is_free():
			continue
		var d := player.global_position.distance_to(v.seat_transform().origin if v.kind == "boat" else v.body.global_position)
		if d < best_d:
			best_d = d
			best = v
	return best

func _enter_vehicle(v: RoyaleVehicle) -> void:
	player.enter_vehicle(v)
	v.driver = player
	hud.flash_message({"car": "Driving: stick to steer, JUMP to brake, EXIT to get out", "moto": "Riding: stick to steer, JUMP to brake, EXIT to get off",
		"boat": "Ferry: stick to steer — park the ramp on a beach to load cars"}.get(v.kind, ""), 4.0)
	sfx.play("pickup", 0.5)
	if net.active:
		net.send({"t": "vin", "i": v.index})

func _leave_vehicle() -> void:
	var v: RoyaleVehicle = player.vehicle
	if v == null:
		return
	v.driver = null
	player.exit_vehicle()
	if net.active:
		net.send({"t": "vout", "i": v.index, "p": RoyaleNet.v3(v.body.global_position), "y": snappedf(v.heading, 0.01)})

func net_vehicle(m: Dictionary, from: String) -> void:
	var i := int(m.get("i", -1))
	if i < 0 or i >= vehicles.size():
		return
	var v: RoyaleVehicle = vehicles[i]
	match String(m.get("t", "")):
		"veh", "vin":
			if v.driver == player and String(m.t) == "vin":
				_leave_vehicle()   # both got in at once: theirs wins
			if m.has("p"):
				v.apply_net(m, from)
			else:
				v.remote_driver = from
		"vout":
			v.remote_driver = ""
			if m.has("p"):
				v.place(RoyaleNet.to_v3(m.get("p")), float(m.get("y", v.heading)))
				v.speed = 0.0

# ── Room matches ─────────────────────────────────────────────

func _setup_room_match() -> void:
	player.combatant_name = net.my_name
	var humans := net.human_names()
	for bot in bots:
		bot.puppet = not net.is_host
		if humans.has(bot.combatant_name):
			bot.combatant_name += " (bot)"
	var index := 0
	for p in net.players:
		if String(p.username) == net.me:
			continue
		var r := RoyaleRemote.new()
		r.setup(self, String(p.username), String(p.name), index)
		index += 1
		add_child(r)
		net.remotes[String(p.username)] = r
		combatants.append(r)

## Distance from a spot to the nearest human (bots run full AI near any of them).
func nearest_human_distance(pos: Vector3) -> float:
	var best := pos.distance_to(player.global_position)
	if net.active:
		for r: RoyaleRemote in net.remotes.values():
			if r.is_alive():
				best = minf(best, pos.distance_to(r.global_position))
	return best

func remote_shot(from: Vector3, to: Vector3, gun_id: String) -> void:
	if from.distance_to(player.global_position) < 260.0:
		_tracer(from, to)
		sfx.play_at(RoyaleSfx.shot_key(gun_id), from)
	recent_shots.append({"pos": Vector2(from.x, from.z), "t": Time.get_ticks_msec() * 0.001, "mine": false})
	if recent_shots.size() > 40:
		recent_shots.remove_at(0)

func remote_left(r: RoyaleRemote) -> void:
	for v: RoyaleVehicle in vehicles:
		if v.remote_driver == r.username:
			v.remote_driver = ""
	if not smoke_mode:
		hud.add_feed("%s left the match" % r.combatant_name, false)
	_check_end()

func net_bot_shot(index: int, aim: Vector3) -> void:
	if index < 0 or index >= bots.size():
		return
	var bot := bots[index]
	var muzzle := bot.global_position + Vector3(0, 1.25, 0) + bot.global_transform.basis.z * 0.6
	if bot.global_position.distance_to(player.global_position) < 260.0:
		if bot.soldier:
			bot.soldier.shoot_fx()
			if bot.soldier.muzzle: muzzle = bot.soldier.muzzle.global_position
		_tracer(muzzle, aim)
		sfx.play_at(RoyaleSfx.shot_key(bot.gun_id), muzzle)
	recent_shots.append({"pos": Vector2(bot.global_position.x, bot.global_position.z), "t": Time.get_ticks_msec() * 0.001, "mine": false})
	if recent_shots.size() > 40:
		recent_shots.remove_at(0)

func net_bot_died(index: int, killer: String, items: Array) -> void:
	if index < 0 or index >= bots.size() or bots[index].state == "dead":
		return
	var bot := bots[index]
	bot.set_meta("death_items", items)
	bot._die(killer)

func net_take(uid: String) -> void:
	var item: Dictionary = loot_by_uid.get(uid, {})
	if not item.is_empty():
		_remove_loot(item, false)

func net_add(item, pos: Vector3, uid: String) -> void:
	if typeof(item) != TYPE_DICTIONARY or uid.is_empty() or loot_by_uid.has(uid):
		return
	_add_loot(item, pos, [], uid)

func net_crate_set(id: String, items) -> void:
	var crate: Dictionary = crates_by_id.get(id, {})
	if crate.is_empty() or typeof(items) != TYPE_ARRAY:
		return
	crate.items = items
	_remove_crate_if_empty(crate)

func net_supply_crate(id: String, kind: String, label: String, items, ground: Vector3) -> void:
	if crates_by_id.has(id) or typeof(items) != TYPE_ARRAY:
		return
	_drop_crate_at(ground, items, kind, label, id)
	if not smoke_mode:
		hud.flash_message("Airdrop incoming! (red marker on the map)" if kind == "airdrop" else "Supply crate dropping! (blue marker on the map)", 3.5)

func net_door(index: int, open: bool) -> void:
	if index >= 0 and index < world.doors.size():
		world.set_door_open(world.doors[index], open)

func net_zone(m: Dictionary) -> void:
	var fc: Array = m.get("fc", [0, 0])
	var nc: Array = m.get("nc", [0, 0])
	zone.phase = int(m.get("ph", 0))
	zone.center = Vector2(float(fc[0]), float(fc[1]))
	zone.radius = float(m.get("fr", 600.0))
	zone.from_center = zone.center
	zone.from_radius = zone.radius
	zone.next_center = Vector2(float(nc[0]), float(nc[1]))
	zone.next_radius = float(m.get("nr", 600.0))
	zone.timer = float(m.get("tm", 60.0))
	zone.shrinking = false
	if int(zone.phase) > 0 and not smoke_mode:
		hud.flash_message("New safe zone marked on the map", 3.0)

# ── Developer checks ─────────────────────────────────────────

func _run_smoke() -> void:
	print("ROYALE_SMOKE start loot=%d points=%d towns=%d" % [loot_items.size(), world.loot_points.size(), world.towns.size()])
	assert(loot_items.size() > 100, "too little loot")
	assert(world.towns.size() == 7, "towns")
	# Skip the plane: put the player in the middle town and let the bots drop in
	_player_jump()
	var t0: Dictionary = world.towns[0]
	player.global_position = Vector3(t0.pos.x, float(t0.y) + 1.0, t0.pos.y)
	player.state = "ground"
	player.health = 100000.0
	player.give_gun("m416")
	player.ammo["556"] = 240
	Engine.time_scale = 8.0
	var start_alive := alive_count()
	var elapsed := 0.0
	while elapsed < 900.0 and alive_count() > 2:
		await get_tree().create_timer(1.0, true, false, true).timeout
		elapsed += 1.0
		if int(elapsed) % 8 == 0:
			var landed := 0
			var armed := 0
			var modes := {}
			for b in bots:
				if b.state == "ground": landed += 1
				if b.is_alive() and not b.gun_id.is_empty(): armed += 1
				if b.is_alive() and b.gun_id.is_empty():
					var key := "%s/%s" % [b.mode, "far" if b.far else "near"]
					modes[key] = int(modes.get(key, 0)) + 1
			print("   unarmed bots by mode: ", modes)
			print("ROYALE_SMOKE game_t=%.0fs alive=%d landed=%d armed=%d zone_phase=%d r=%.0f loot=%d" % [match_time, alive_count(), landed, armed, zone.phase, zone.radius, loot_items.size()])
	var end_alive := alive_count()
	print("ROYALE_SMOKE end game_time=%.0fs alive %d -> %d zone_phase=%d" % [match_time, start_alive, end_alive, zone.phase])
	var zone_deaths := 0
	for line in death_log:
		if line.ends_with("the zone"): zone_deaths += 1
	print("ROYALE_SMOKE deaths: %d by zone, %d by players" % [zone_deaths, death_log.size() - zone_deaths])
	for line in death_log.slice(0, 12): print("  ", line)
	var ok := end_alive < start_alive - 10 and int(zone.phase) >= 2 and match_time > 300.0
	print("ROYALE_SMOKE_PASS" if ok else "ROYALE_SMOKE_FAIL")
	get_tree().quit(0 if ok else 1)

func _run_screenshots(dir: String) -> void:
	player.god = true
	DirAccess.make_dir_recursive_absolute(dir)
	if "--clean" in OS.get_cmdline_user_args():
		hud.visible = false
		touch.visible = false
	await get_tree().create_timer(1.5).timeout
	await _shot(dir + "/01_plane.png")
	_player_jump()
	await get_tree().create_timer(1.2).timeout
	await _shot(dir + "/02_freefall.png")
	var t0: Dictionary = world.towns[0]
	player.global_position = Vector3(t0.pos.x + 6.0, float(t0.y) + 0.5, t0.pos.y + 6.0)
	player.state = "ground"
	player.yaw = 0.6
	player.pitch = -0.05
	player.give_gun("m416")
	player.ammo["556"] = 120
	await get_tree().create_timer(1.0).timeout
	await _shot(dir + "/03_town.png")
	player.yaw += 2.2
	await get_tree().create_timer(0.5).timeout
	await _shot(dir + "/04_town_b.png")
	player.global_position = Vector3(0, world.height_at(0, 200) + 30.0, 200)
	player.pitch = -0.35
	await get_tree().create_timer(0.6).timeout
	await _shot(dir + "/05_overview.png")
	player.global_position = Vector3(t0.pos.x + 6.0, float(t0.y) + 0.5, t0.pos.y + 6.0)
	player.pitch = 0.0
	player.give_gun("kar98k")
	player.aiming = true
	await get_tree().create_timer(0.6).timeout
	await _shot(dir + "/06_scope.png")
	player.aiming = false
	toggle_map()
	await get_tree().create_timer(0.4).timeout
	await _shot(dir + "/07_map.png")
	toggle_map()
	# A bot standing in front of the camera, aiming
	var bot := bots[0]
	bot.state = "ground"
	bot.visible = true
	bot.set_gun("akm")
	var open_ground: Vector2 = t0.pos + Vector2(float(t0.radius) + 45.0, 0.0)
	player.global_position = Vector3(open_ground.x, world.height_at(open_ground.x, open_ground.y) + 0.3, open_ground.y)
	player.yaw = PI * 0.5
	player.pitch = -0.08
	await get_tree().create_timer(0.3).timeout
	var fwd := -player.global_transform.basis.z
	fwd.y = 0.0
	var spot := player.global_position + fwd.normalized() * 5.0
	bot.global_position = Vector3(spot.x, world.height_at(spot.x, spot.z) + 0.05, spot.z)
	bot.rotation.y = atan2(-fwd.x, -fwd.z)
	bot.enemy = player
	bot.mode = "fight"
	player.give_gun("m416")
	player.aiming = false
	await get_tree().create_timer(1.2).timeout
	await _shot(dir + "/08_bot.png")
	# A house door: closed, then opened with the context button
	var house: Dictionary = world.houses[0]
	var to: Vector3 = Vector3(house.door_in) - Vector3(house.door_out)
	player.global_position = Vector3(house.door_out) + to.normalized() * 0.6 + Vector3(0, 0.1, 0)
	player.yaw = atan2(-to.x, -to.z)
	player.pitch = 0.0
	bots[0].global_position = Vector3(0, -50, 0)
	await get_tree().create_timer(0.6).timeout
	await _shot(dir + "/09_door_closed.png")
	pickup_nearby()
	await get_tree().create_timer(0.8).timeout
	await _shot(dir + "/10_door_open.png")
	# Inside: just past the door, looking into the house, then toward the back rooms
	player.global_position = Vector3(house.door_in) + Vector3(0, 0.1, 0)
	player.pitch = -0.12
	await get_tree().create_timer(0.6).timeout
	await _shot(dir + "/11_inside.png")
	player.yaw += 0.6
	await get_tree().create_timer(0.4).timeout
	await _shot(dir + "/12_inside_b.png")
	# The town from a rooftop height
	player.global_position = Vector3(house.door_out) + Vector3(0, 9.0, 0) - to.normalized() * 14.0
	player.yaw = atan2(-to.x, -to.z)
	player.pitch = -0.35
	await get_tree().create_timer(0.6).timeout
	await _shot(dir + "/13_street.png")
	# Crate loot list next to a death crate
	player.global_position = Vector3(house.door_out) - to.normalized() * 3.0 + Vector3(0, 0.2, 0)
	player.pitch = -0.3
	var fake := bots[1]
	fake.global_position = player.global_position + (-player.global_transform.basis.z) * 1.6
	fake.set_gun("akm"); fake.vest = 2; fake.vest_hp = 220.0; fake.meds = 2
	_drop_death_loot(fake, _death_items(fake))
	await get_tree().create_timer(0.6).timeout
	await _shot(dir + "/14_crate.png")
	hud.toggle_backpack()
	await get_tree().create_timer(0.4).timeout
	await _shot(dir + "/15_backpack.png")
	hud.toggle_backpack()
	toggle_pause()
	await get_tree().create_timer(0.4).timeout
	await _shot(dir + "/16_pause.png")
	hud.pause_layer.visible = false
	hud.settings_layer.visible = true
	await get_tree().create_timer(0.4).timeout
	await _shot(dir + "/17_settings.png")
	hud.start_layout_edit()
	await get_tree().create_timer(0.4).timeout
	await _shot(dir + "/18_layout_edit.png")
	hud.finish_layout_edit()
	toggle_pause()
	hud.settings_layer.visible = false
	# New content: skins, heavy weapons, vehicles, the ferry and Isla Verde
	player.set_loadout("lava", 3, "tiger")
	player.slots[0] = {}
	player.slots[1] = {}
	player.give_gun("gatling")
	player.ammo["556"] = 200
	player.global_position = Vector3(house.door_out) - to.normalized() * 6.0 + Vector3(0, 0.3, 0)
	player.yaw = atan2(-to.x, -to.z) + PI * 0.75
	player.pitch = -0.1
	await get_tree().create_timer(0.5).timeout
	for i in 50:
		player.try_fire(true)
		await get_tree().physics_frame
	await _shot(dir + "/20_gatling_lava_tiger.png")
	player.try_fire(false)
	player.give_gun("rpg")
	player.ammo["rocket"] = 4
	player.view_mode = "fps"
	await get_tree().create_timer(0.4).timeout
	await _shot(dir + "/21_rpg_fps.png")
	player.try_fire(true)
	await get_tree().create_timer(0.35).timeout
	await _shot(dir + "/22_rocket_flying.png")
	player.try_fire(false)
	player.view_mode = "tps"
	# Drive a car
	var car: RoyaleVehicle = null
	var moto: RoyaleVehicle = null
	var ferry: RoyaleVehicle = null
	for v: RoyaleVehicle in vehicles:
		if v.kind == "car" and car == null: car = v
		if v.kind == "moto" and moto == null: moto = v
		if v.kind == "boat" and ferry == null: ferry = v
	print("VEHICLES total=%d car=%s moto=%s ferry=%s" % [vehicles.size(), car != null, moto != null, ferry != null])
	for v: RoyaleVehicle in vehicles:
		if v.kind == "boat":
			print("BOAT spawn=%s now=%s" % [world.vehicle_spawns[v.index].pos, v.body.global_position])
	if car:
		player.global_position = car.body.global_position + Vector3(2, 0.5, 0)
		await get_tree().create_timer(0.3).timeout
		_enter_vehicle(car)
		player.yaw = car.heading
		for i in 90:
			car.drive(Vector2(0.3, -1.0), false, 1.0 / 60.0)
			await get_tree().physics_frame
		await _shot(dir + "/23_car.png")
		print("CAR speed=%.1f moved_to=%s" % [car.speed, car.body.global_position])
		_leave_vehicle()
	if moto:
		player.global_position = moto.body.global_position + Vector3(1.5, 0.5, 0)
		await get_tree().create_timer(0.3).timeout
		_enter_vehicle(moto)
		player.yaw = moto.heading
		for i in 70:
			moto.drive(Vector2(-0.4, -1.0), false, 1.0 / 60.0)
			await get_tree().physics_frame
		await _shot(dir + "/24_moto.png")
		_leave_vehicle()
	if ferry:
		player.global_position = ferry.seat_transform().origin + Vector3(0, 0.5, 0)
		await get_tree().create_timer(0.3).timeout
		_enter_vehicle(ferry)
		player.yaw = ferry.heading + PI
		player.pitch = -0.25
		for i in 60:
			ferry.drive(Vector2(0, 1.0), false, 1.0 / 60.0)
			await get_tree().physics_frame
		await _shot(dir + "/25_ferry.png")
		if OS.get_cmdline_user_args().has("--debug-water"):
			for c in world.get_children():
				if c is MeshInstance3D and (c as MeshInstance3D).mesh is PlaneMesh: c.visible = false
			zone_wall.visible = false
			print("DEBUG cam=%s player=%s" % [player.camera.global_position, player.global_position])
			await _shot(dir + "/25b_ferry_nowater.png")
		_leave_vehicle()
	if not world.island2.is_empty():
		var c2: Vector2 = world.island2.center
		player.global_position = Vector3(c2.x - 60, 30, c2.y - 60)
		player.yaw = atan2(-(c2.x - player.global_position.x) * -1.0, (c2.y - player.global_position.z))
		var look := Vector3(c2.x, 4, c2.y) - player.global_position
		player.yaw = atan2(-look.x, -look.z)
		player.pitch = -0.35
		await get_tree().create_timer(0.8).timeout
		await _shot(dir + "/26_isla_verde.png")
	toggle_map()
	await get_tree().create_timer(0.4).timeout
	await _shot(dir + "/27_map_both_islands.png")
	toggle_map()
	# Parachute seen from behind (the canopy must not hide the soldier)
	player.global_position = Vector3(house.door_out) + Vector3(0, 70, 0)
	player.state = "freefall"
	player.open_chute()
	player.pitch = -0.3
	await get_tree().create_timer(1.2).timeout
	await _shot(dir + "/28_parachute.png")
	player.global_position = Vector3(house.door_in) + Vector3(0, 0.3, 0)
	player.state = "ground"
	player.chute.visible = false
	# Looking back at the front door from inside the house
	player.yaw = atan2(to.x, to.z)
	player.pitch = -0.1
	await get_tree().create_timer(0.6).timeout
	await _shot(dir + "/29_door_from_inside.png")
	# Aim assist: a bot a few degrees off the crosshair; aiming should bring it under it
	player.give_gun("m416")
	var tgt := bots[2]
	var fwd_flat := Vector3(-sin(player.yaw), 0, -cos(player.yaw))
	player.global_position = Vector3(house.door_out) - to.normalized() * 2.0 + Vector3(0, 0.3, 0)
	player.yaw = atan2(-(-to.normalized()).x, -(-to.normalized()).z)
	fwd_flat = Vector3(-sin(player.yaw), 0, -cos(player.yaw))
	# Find a direction with a clear view for the test
	for tries in 16:
		tgt.global_position = player.global_position + fwd_flat.rotated(Vector3.UP, deg_to_rad(4.0)) * 14.0
		tgt.global_position.y = world.height_at(tgt.global_position.x, tgt.global_position.z)
		if has_line_of_sight(player.head.global_position, tgt.chest_point(), player):
			break
		player.yaw += TAU / 16.0
		fwd_flat = Vector3(-sin(player.yaw), 0, -cos(player.yaw))
	tgt.state = "ground"
	tgt.mode = "heal"; tgt.heal_timer = 30.0
	player.pitch = 0.0
	player.aiming = true
	await get_tree().physics_frame
	var a0 := (-player.camera.global_transform.basis.z).angle_to(tgt.chest_point() - player.camera.global_position)
	for i in 45:
		await get_tree().physics_frame
	var a1 := (-player.camera.global_transform.basis.z).angle_to(tgt.chest_point() - player.camera.global_position)
	print("AIM_ASSIST before=%.1f deg after=%.1f deg locked=%s" % [rad_to_deg(a0), rad_to_deg(a1), player.assist_target != null])
	player.aiming = false
	await _shot(dir + "/30_aim_assist.png")
	hud.show_end(false, 7, 3, 37)
	await get_tree().create_timer(0.4).timeout
	await _shot(dir + "/19_end.png")
	print("ROYALE_SCREENSHOTS_DONE")
	get_tree().quit()

## Developer check: frame time in a busy town, then with heavy features switched off one at a time.
func _run_bench_scene() -> void:
	await get_tree().create_timer(0.5).timeout
	print("BENCH gpu=%s size=%s" % [RenderingServer.get_video_adapter_name(), get_viewport().get_visible_rect().size])
	if plane_node: plane_node.queue_free(); plane_node = null
	phase = "match"
	var town: Dictionary = world.towns[0]
	var c := Vector3(town.pos.x, float(town.y) + 0.5, town.pos.y)
	player.global_position = c
	player.state = "ground"
	player.give_gun("m416")
	player.god = true
	bot_accuracy = 0.0
	for i in 14:
		var b := bots[i]
		var a := TAU * i / 14.0
		b.global_position = c + Vector3(cos(a), 0, sin(a)) * (8.0 + i * 3.0)
		b.state = "ground"
		b.visible = true
		b.set_gun(["m416", "akm", "ump"][i % 3])
	# Time the main per-frame pieces directly
	for k in 3:
		await get_tree().process_frame
	var t0 := Time.get_ticks_usec()
	for i in 50: hud._process(0.016)
	var t1 := Time.get_ticks_usec()
	for i in 50: prompt_text()
	var t2 := Time.get_ticks_usec()
	for i in 50: interact_label()
	var t3 := Time.get_ticks_usec()
	for i in 50: hud.minimap.queue_redraw(); hud._draw_minimap()
	var t4 := Time.get_ticks_usec()
	for i in 50: touch._process(0.016)
	var t5 := Time.get_ticks_usec()
	for i in 50: alive_count()
	var t6 := Time.get_ticks_usec()
	print("BENCH_MS hud_process=%.2f prompt=%.2f interact=%.2f minimap=%.2f touch=%.2f alive=%.2f" % [(t1 - t0) / 50000.0, (t2 - t1) / 50000.0, (t3 - t2) / 50000.0, (t4 - t3) / 50000.0, (t5 - t4) / 50000.0, (t6 - t5) / 50000.0])
	var stages := [["all", func(): pass],
		["bots_no_shadow", func():
			for bt in bots:
				for m: GeometryInstance3D in bt.find_children("*", "GeometryInstance3D", true, false): m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF],
		["bots_frozen", func():
			for bt in bots: bt.soldier.detail = 0; bt.soldier.set_process(false); bt.set_physics_process(false)],
		["no_bots", func():
			for bt in bots: bt.visible = false],
		["no_shadows", func(): sun.shadow_enabled = false],
		["no_world", func(): world.visible = false]]
	var vrid := get_viewport().get_viewport_rid()
	RenderingServer.viewport_set_measure_render_time(vrid, true)
	for st in stages:
		st[1].call()
		var frames := 0
		var t := 0.0
		var worst := 0.0
		var cpu_sum := 0.0
		while t < 4.0:
			var d := get_process_delta_time()
			player.yaw += d * 0.6
			await get_tree().process_frame
			frames += 1
			t += d
			worst = maxf(worst, d)
			cpu_sum += RenderingServer.viewport_get_measured_render_time_cpu(vrid)
		print("BENCH %-16s avg_cpu_render=%5.1fms draws=%d" % [st[0], cpu_sum / frames, Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)])
		print("BENCH %-16s fps=%5.1f worst=%4.0fms draws=%d prims=%dk objs=%d proc=%.1fms phys=%.1fms" % [st[0], frames / t, worst * 1000.0,
			Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME), Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME) / 1000,
			Performance.get_monitor(Performance.RENDER_TOTAL_OBJECTS_IN_FRAME), Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0, Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS) * 1000.0])
	get_tree().quit()

func _shot(path: String) -> void:
	await RenderingServer.frame_post_draw
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(path)
	print("saved ", path)

## Walks the player into several houses: blocked while the door is closed, inside once it's open.
func _run_door_test() -> void:
	await get_tree().create_timer(0.5).timeout
	if plane_node: plane_node.queue_free(); plane_node = null
	player.state = "ground"
	player.health = 100000.0
	var passed := 0
	var tested := 0
	for house in world.houses.slice(0, 6):
		tested += 1
		var node: Node3D = house.node
		var start: Vector3 = house.door_out
		var target: Vector3 = house.door_in
		var results := []
		for open_first in [false, true]:
			player.global_position = start + Vector3(0, 0.1, 0)
			player.velocity = Vector3.ZERO
			var to := target - start
			player.yaw = atan2(-to.x, -to.z)
			player.pitch = 0.0
			await get_tree().physics_frame
			var door := world.nearest_door(start + to.normalized() * 2.5 + Vector3(0, 1.0, 0), 2.5)
			world.set_door_open(door, false)
			await get_tree().create_timer(0.5).timeout
			if open_first:
				player.global_position = start + to.normalized() * 1.2 + Vector3(0, 0.1, 0)
				await get_tree().physics_frame
				pickup_nearby()   # same as pressing F next to the door
				await get_tree().create_timer(0.6).timeout
				player.global_position = start + Vector3(0, 0.1, 0)
			Input.action_press("move_forward")
			await get_tree().create_timer(3.0).timeout
			Input.action_release("move_forward")
			var local := node.to_local(player.global_position)
			var inside: bool = absf(local.x) < float(house.w) * 0.5 - 0.2 and absf(local.z) < float(house.d) * 0.5 - 0.2
			results.append(inside)
		var ok: bool = results[0] == false and results[1] == true
		if ok: passed += 1
		print("DOORTEST house %d: closed->inside=%s open->inside=%s %s" % [tested, results[0], results[1], "OK" if ok else "FAIL"])
	print("DOORTEST %d/%d passed" % [passed, tested])
	print("DOORTEST_PASS" if passed == tested else "DOORTEST_FAIL")
	get_tree().quit()
