class_name RoyalePlayer
extends CharacterBody3D
## First-person survivor (same POV and touch feel as the Dungeon of Knowledge explorer).
## States: plane → freefall → parachute → ground → dead. Stand / crouch / prone, two weapon
## slots, aim-down-sights with scope zoom, recoil, reload, vest/helmet, timed healing and boost.

signal fired(gun_id: String)
signal died(killer: String)
signal message(text: String)

const WALK_SPEED := 4.4
const RUN_SPEED := 6.4
const CROUCH_SPEED := 2.4
const PRONE_SPEED := 1.1
const ACCELERATION := 26.0
const GRAVITY := 19.0
const JUMP_VELOCITY := 5.6
const EYE := {"stand": 1.62, "crouch": 1.05, "prone": 0.38}
const FREEFALL_SPEED := 58.0      ## level fall; diving (looking down) goes up to ~75 m/s
const PARACHUTE_FALL := 9.0
const PARACHUTE_GLIDE := 14.0
const AUTO_CHUTE_HEIGHT := 60.0

var game: Node
var state := "plane"
var stance := "stand"
var controls_enabled := true
var health := 100.0
var boost := 0.0                ## 0-100, heals over time and adds a little speed above 60
var vest := 0
var vest_hp := 0.0
var helmet := 0
var helmet_hp := 0.0
var slots: Array[Dictionary] = [{}, {}]   ## {id, mag}
var active := 0
var ammo := {"9mm": 0, "556": 0, "762": 0, "12g": 0}
var meds := {"bandage": 0, "firstaid": 0, "medkit": 0, "drink": 0}
var grenades := 0
var kills := 0
var aiming := false
var reloading := 0.0
var healing := 0.0
var healing_item := ""
var fire_cooldown := 0.0
var trigger_was_down := false
var spread_bloom := 0.0
var recoil_pitch := 0.0

var mouse_sensitivity := 0.0022
var touch_sensitivity := 1.0
var scope_sensitivity := 0.8
var invert_y := false
var base_fov := 78.0
var yaw := 0.0
var pitch := 0.0
var head: Node3D
var camera: Camera3D
var view_model: Node3D
var gun_holder: Node3D
var muzzle_light: OmniLight3D
var muzzle_flash: MeshInstance3D
var chute: Node3D
var arms: Node3D
var wind: CPUParticles3D
var land_dip := 0.0
var chute_jolt := 0.0
var bob_phase := 0.0
var kick := 0.0
var shake_left := 0.0
var touch_look := Vector2.ZERO
var _gun_cache := {}
var _shown_gun := ""

func _ready() -> void:
	collision_layer = 2
	collision_mask = 1
	floor_max_angle = deg_to_rad(48.0)
	floor_snap_length = 0.4
	var collider := CollisionShape3D.new()
	collider.name = "Body"
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.32
	capsule.height = 1.74
	collider.shape = capsule
	collider.position.y = 0.87
	add_child(collider)
	head = Node3D.new()
	head.position.y = EYE.stand
	add_child(head)
	camera = Camera3D.new()
	camera.fov = base_fov
	camera.near = 0.05
	camera.far = 900.0
	camera.current = true
	head.add_child(camera)
	view_model = Node3D.new()
	view_model.position = Vector3(0.2, -0.22, -0.4)
	camera.add_child(view_model)
	gun_holder = Node3D.new()
	view_model.add_child(gun_holder)
	muzzle_light = OmniLight3D.new()
	muzzle_light.light_color = Color("ffc66b")
	muzzle_light.omni_range = 6.0
	muzzle_light.light_energy = 0.0
	view_model.add_child(muzzle_light)
	muzzle_flash = MeshInstance3D.new()
	var quad := QuadMesh.new()
	quad.size = Vector2(0.16, 0.16)
	var flash_mat := StandardMaterial3D.new()
	flash_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	flash_mat.albedo_color = Color(1.0, 0.85, 0.45, 0.95)
	flash_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	flash_mat.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	quad.material = flash_mat
	muzzle_flash.mesh = quad
	muzzle_flash.visible = false
	view_model.add_child(muzzle_flash)
	_build_chute()
	_build_arms()
	_build_wind()

func _build_chute() -> void:
	chute = Node3D.new()
	chute.visible = false
	add_child(chute)
	var canopy := MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radius = 3.2
	sphere.height = 2.4
	sphere.is_hemisphere = true
	var m := StandardMaterial3D.new()
	m.albedo_color = Color("ff8a3c")
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	sphere.material = m
	canopy.mesh = sphere
	canopy.position = Vector3(0, 5.6, 0.6)
	chute.add_child(canopy)
	# Straps from the shoulders up to the canopy edge
	var strap_mat := StandardMaterial3D.new()
	strap_mat.albedo_color = Color("2b2b2b")
	for sx in [-1.0, 1.0]:
		for sz in [-1.0, 1.0]:
			var strap := MeshInstance3D.new()
			var cyl := CylinderMesh.new()
			cyl.top_radius = 0.015
			cyl.bottom_radius = 0.015
			var from := Vector3(sx * 0.25, 1.45, 0.0)
			var to := Vector3(sx * 2.6, 5.0, 0.6 + sz * 2.0)
			cyl.height = from.distance_to(to)
			cyl.material = strap_mat
			strap.mesh = cyl
			strap.position = (from + to) * 0.5
			strap.look_at_from_position(strap.position, to, Vector3.FORWARD)
			strap.rotate_object_local(Vector3.RIGHT, PI * 0.5)
			chute.add_child(strap)

## Arms reaching forward while skydiving / holding the parachute toggles.
func _build_arms() -> void:
	arms = Node3D.new()
	arms.visible = false
	camera.add_child(arms)
	var skin := StandardMaterial3D.new()
	skin.albedo_color = Color("c98f6b")
	var sleeve := StandardMaterial3D.new()
	sleeve.albedo_color = Color("3e5a3a")
	for sx in [-1.0, 1.0]:
		var arm := Node3D.new()
		arm.name = "Arm%d" % int(sx)
		arm.position = Vector3(sx * 0.32, -0.32, -0.25)
		arms.add_child(arm)
		var upper := MeshInstance3D.new()
		var cap := CapsuleMesh.new()
		cap.radius = 0.06
		cap.height = 0.5
		cap.material = sleeve
		upper.mesh = cap
		upper.rotation_degrees = Vector3(-70, 0, sx * 25)
		upper.position = Vector3(sx * 0.05, 0.05, -0.18)
		arm.add_child(upper)
		var hand := MeshInstance3D.new()
		var sphere := SphereMesh.new()
		sphere.radius = 0.06
		sphere.height = 0.11
		sphere.material = skin
		hand.mesh = sphere
		hand.position = Vector3(sx * 0.14, 0.12, -0.42)
		arm.add_child(hand)
	for m: MeshInstance3D in arms.find_children("*", "MeshInstance3D", true, false):
		m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

## Thin streaks rushing past the camera while falling fast.
func _build_wind() -> void:
	wind = CPUParticles3D.new()
	wind.emitting = false
	wind.amount = 70
	wind.lifetime = 0.35
	wind.local_coords = true
	wind.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	wind.emission_box_extents = Vector3(3.0, 2.2, 0.5)
	wind.direction = Vector3(0, 0, 1)
	wind.spread = 4.0
	wind.gravity = Vector3.ZERO
	wind.initial_velocity_min = 30.0
	wind.initial_velocity_max = 45.0
	var streak := BoxMesh.new()
	streak.size = Vector3(0.012, 0.012, 1.2)
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = Color(1, 1, 1, 0.35)
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	streak.material = m
	wind.mesh = streak
	wind.position = Vector3(0, 0, -6.0)
	camera.add_child(wind)

# ── Input ────────────────────────────────────────────────────

static func is_touch_platform() -> bool:
	return OS.has_feature("mobile") or OS.has_feature("web_android") or OS.has_feature("web_ios")

func _unhandled_input(event: InputEvent) -> void:
	if not controls_enabled or state == "dead":
		return
	if event.device == InputEvent.DEVICE_ID_EMULATION or is_touch_platform():
		return
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		_apply_look(event.relative * mouse_sensitivity * (current_zoom_scale()))
	elif event is InputEventMouseButton and event.pressed and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
		if game == null or not game.has_method("_ui_blocking") or not game._ui_blocking():
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func add_touch_look(delta_screens: Vector2) -> void:
	if controls_enabled and state != "dead":
		_apply_look(delta_screens * 1.35 * touch_sensitivity * current_zoom_scale())

func _apply_look(amount: Vector2) -> void:
	yaw -= amount.x
	pitch -= amount.y * (-1.0 if invert_y else 1.0)
	pitch = clampf(pitch, deg_to_rad(-85.0), deg_to_rad(80.0))

## Slower look while zoomed so scopes stay controllable.
func current_zoom_scale() -> float:
	return scope_sensitivity / sqrt(maxf(1.0, current_zoom())) if aiming else 1.0

func current_zoom() -> float:
	var g := current_gun()
	return float(Items.gun(String(g.id)).zoom) if not g.is_empty() else 1.15

# ── Weapons ──────────────────────────────────────────────────

func current_gun() -> Dictionary:
	return slots[active]

func has_gun() -> bool:
	return not slots[0].is_empty() or not slots[1].is_empty()

func give_gun(id: String, mag := -1) -> Dictionary:
	## Returns the dropped gun (if any) so it can go back on the ground.
	var entry := {"id": id, "mag": Items.gun(id).mag if mag < 0 else mag}
	var target := -1
	if slots[active].is_empty(): target = active
	elif slots[1 - active].is_empty(): target = 1 - active
	var dropped := {}
	if target < 0:
		target = active
		dropped = slots[active]
	slots[target] = entry
	active = target
	reloading = 0.0
	_refresh_gun_model()
	return dropped

func switch_slot(index := -1) -> void:
	var next := (1 - active) if index < 0 else clampi(index, 0, 1)
	if next == active or slots[next].is_empty():
		return
	active = next
	reloading = 0.0
	aiming = false
	cancel_heal()
	_refresh_gun_model()

func _refresh_gun_model() -> void:
	var g := current_gun()
	var id := "" if g.is_empty() else String(g.id)
	if id == _shown_gun:
		return
	_shown_gun = id
	for c in gun_holder.get_children():
		c.queue_free()
	if id.is_empty():
		return
	var path := Items.GUN_DIR + String(Items.gun(id).model) + ".glb"
	if not _gun_cache.has(path):
		_gun_cache[path] = load(path) if ResourceLoader.exists(path) else null
	if _gun_cache[path] == null:
		return
	var model: Node3D = _gun_cache[path].instantiate()
	# Kenney blasters point down -Z; keep them small and to the right of the view
	model.rotation_degrees = Vector3(0, 180, 0)
	model.scale = Vector3.ONE * 0.46
	for m: MeshInstance3D in model.find_children("*", "MeshInstance3D", true, false):
		m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	gun_holder.add_child(model)
	var length: float = {"pistol": 0.3, "smg": 0.34, "shotgun": 0.38, "ar": 0.42, "dmr": 0.6, "sniper": 0.85, "lmg": 0.5}.get(String(Items.gun(id).kind), 0.4)
	muzzle_flash.position = Vector3(0, 0.08, -length)
	muzzle_light.position = muzzle_flash.position

func start_reload() -> void:
	var g := current_gun()
	if g.is_empty() or reloading > 0.0:
		return
	var data := Items.gun(String(g.id))
	if int(g.mag) >= int(data.mag) or int(ammo[String(data.ammo)]) <= 0:
		return
	cancel_heal()
	reloading = float(data.reload)
	if game: game.play_sfx("reload", global_position)

func _finish_reload() -> void:
	var g := current_gun()
	if g.is_empty():
		return
	var data := Items.gun(String(g.id))
	var need := int(data.mag) - int(g.mag)
	var take := mini(need, int(ammo[String(data.ammo)]))
	g.mag = int(g.mag) + take
	ammo[String(data.ammo)] = int(ammo[String(data.ammo)]) - take

func current_spread() -> float:
	var g := current_gun()
	if g.is_empty():
		return 3.0
	var data := Items.gun(String(g.id))
	var s := float(data.aim_spread if aiming else data.spread)
	var planar := Vector2(velocity.x, velocity.z).length()
	s *= 1.0 + clampf(planar / RUN_SPEED, 0.0, 1.0) * (0.8 if aiming else 1.4)
	s *= {"stand": 1.0, "crouch": 0.78, "prone": 0.6}[stance]
	if not is_on_floor(): s *= 2.0
	return s + spread_bloom

func try_fire(trigger_down: bool) -> void:
	var just_pressed := trigger_down and not trigger_was_down
	trigger_was_down = trigger_down
	if not trigger_down or state != "ground" or fire_cooldown > 0.0:
		return
	var g := current_gun()
	if g.is_empty():
		if just_pressed: _punch()
		return
	var data := Items.gun(String(g.id))
	if not bool(data.auto) and not just_pressed:
		return
	if reloading > 0.0:
		return
	if int(g.mag) <= 0:
		if just_pressed:
			if game: game.play_sfx("empty", global_position)
			start_reload()
		return
	cancel_heal()
	g.mag = int(g.mag) - 1
	fire_cooldown = Items.seconds_per_shot(String(g.id))
	var origin := camera.global_position
	var forward := -camera.global_transform.basis.z
	for i in int(data.pellets):
		var s := deg_to_rad(current_spread())
		var dir := forward.rotated(camera.global_transform.basis.x, randf_range(-s, s) * 0.5).rotated(camera.global_transform.basis.y, randf_range(-s, s) * 0.5)
		if game: game.fire_hitscan(self, origin, dir.normalized(), String(g.id), muzzle_flash.global_position)
	spread_bloom = minf(spread_bloom + 0.35 * float(data.recoil), 2.5)
	var r: float = float(data.recoil) * (0.55 if aiming else 1.0) * ({"stand": 1.0, "crouch": 0.8, "prone": 0.6}[stance])
	pitch = clampf(pitch + deg_to_rad(r * 0.9), deg_to_rad(-85.0), deg_to_rad(80.0))
	yaw += deg_to_rad(randf_range(-0.35, 0.35) * r)
	kick = 1.0
	_flash()
	fired.emit(String(g.id))
	if int(g.mag) == 0 and int(ammo[String(data.ammo)]) > 0:
		start_reload()

func _punch() -> void:
	fire_cooldown = 0.5
	kick = 0.6
	if game: game.melee(self)

func _flash() -> void:
	muzzle_flash.visible = true
	muzzle_flash.rotation.z = randf() * TAU
	muzzle_light.light_energy = 2.5
	get_tree().create_timer(0.05).timeout.connect(func():
		muzzle_flash.visible = false
		muzzle_light.light_energy = 0.0)

# ── Healing ──────────────────────────────────────────────────

## Best item for the current health (bandages when lightly hurt, kits when badly hurt).
func best_heal() -> String:
	if health < 60.0 and int(meds.medkit) > 0: return "medkit"
	if health < 70.0 and int(meds.firstaid) > 0: return "firstaid"
	if health < 75.0 and int(meds.bandage) > 0: return "bandage"
	if boost < 70.0 and int(meds.drink) > 0: return "drink"
	if health < 100.0 and int(meds.medkit) > 0: return "medkit"
	return ""

func start_heal(item := "") -> void:
	if item.is_empty(): item = best_heal()
	if item.is_empty() or int(meds.get(item, 0)) <= 0 or healing > 0.0 or state != "ground":
		if item.is_empty(): message.emit("Nothing to heal with" if health < 100.0 else "Already at full health")
		return
	var data: Dictionary = Items.MEDS[item]
	if data.has("cap") and health >= float(data.cap):
		message.emit("Can't heal above %d with %s" % [int(data.cap), data.name])
		return
	reloading = 0.0
	aiming = false
	healing_item = item
	healing = float(data.time)
	if game: game.play_sfx("heal", global_position)

func cancel_heal() -> void:
	healing = 0.0
	healing_item = ""

func _finish_heal() -> void:
	var data: Dictionary = Items.MEDS[healing_item]
	meds[healing_item] = int(meds[healing_item]) - 1
	match healing_item:
		"drink": boost = minf(100.0, boost + float(data.boost))
		"bandage": health = maxf(health, minf(float(data.cap), health + float(data.heal)))
		_: health = maxf(health, float(data.cap))  # first aid → 75, med kit → 100
	message.emit("Used %s" % data.name)
	healing_item = ""

# ── Damage ───────────────────────────────────────────────────

var combatant_name := "You"

func is_alive() -> bool:
	return state != "dead"

func head_y() -> float:
	return global_position.y + float(EYE[stance]) - 0.1

func chest_point() -> Vector3:
	return global_position + Vector3(0, float(EYE[stance]) * 0.7, 0)

func take_damage(amount: float, headshot: bool, attacker: String, zone_damage := false) -> void:
	if state == "dead":
		return
	var dmg := amount
	if not zone_damage:
		if headshot and helmet > 0:
			dmg *= 1.0 - Items.HELMET_REDUCTION[helmet]
			helmet_hp -= amount
			if helmet_hp <= 0.0:
				helmet = 0
				message.emit("Your helmet broke")
		elif not headshot and vest > 0:
			dmg *= 1.0 - Items.VEST_REDUCTION[vest]
			vest_hp -= amount
			if vest_hp <= 0.0:
				vest = 0
				message.emit("Your vest broke")
		kick = 1.0
		shake_left = 0.25
		cancel_heal()
	health -= dmg
	if health <= 0.0:
		health = 0.0
		die(attacker)

func die(attacker: String) -> void:
	if state == "dead":
		return
	state = "dead"
	controls_enabled = false
	aiming = false
	var tween := create_tween().set_parallel(true)
	tween.tween_property(view_model, "position", Vector3(0.4, -1.0, -0.3), 0.5)
	tween.tween_property(head, "position:y", 0.3, 0.9).set_trans(Tween.TRANS_BOUNCE).set_ease(Tween.EASE_OUT)
	tween.tween_property(head, "rotation:z", 1.2, 0.8).set_delay(0.2)
	died.emit(attacker)

# ── Drop ─────────────────────────────────────────────────────

func start_freefall() -> void:
	state = "freefall"
	velocity = Vector3(0, -8.0, 0)
	pitch = deg_to_rad(-55.0)
	arms.visible = true
	wind.emitting = true

func open_chute() -> void:
	if state != "freefall":
		return
	state = "parachute"
	chute.visible = true
	chute.scale = Vector3(0.2, 0.2, 0.2)
	chute.create_tween().tween_property(chute, "scale", Vector3.ONE, 0.45).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	chute_jolt = 1.0   # the canopy catching air jerks the view
	shake_left = 0.35
	wind.emitting = false
	if game: game.play_sfx("chute", global_position)

func ground_height_below() -> float:
	return float(game.world.height_at(global_position.x, global_position.z)) if game else 0.0

# ── Frame update ─────────────────────────────────────────────

func _physics_process(delta: float) -> void:
	fire_cooldown = maxf(0.0, fire_cooldown - delta)
	spread_bloom = move_toward(spread_bloom, 0.0, delta * 3.0)
	if reloading > 0.0:
		reloading -= delta
		if reloading <= 0.0:
			reloading = 0.0
			_finish_reload()
	if healing > 0.0:
		healing -= delta
		if healing <= 0.0:
			healing = 0.0
			_finish_heal()
	if boost > 0.0 and state == "ground":
		boost = maxf(0.0, boost - delta * 1.6)
		health = minf(100.0, health + delta * (1.0 if boost > 0.0 else 0.0))
	rotation.y = yaw
	head.rotation.x = pitch
	match state:
		"plane":
			velocity = Vector3.ZERO
		"freefall":
			_freefall(delta)
		"parachute":
			_parachute(delta)
		"ground":
			_ground(delta)
		"dead":
			velocity.x = move_toward(velocity.x, 0.0, ACCELERATION * delta)
			velocity.z = move_toward(velocity.z, 0.0, ACCELERATION * delta)
			if not is_on_floor(): velocity.y -= GRAVITY * delta
			move_and_slide()
	_update_feel(delta)

func _input_vector() -> Vector2:
	if not controls_enabled:
		return Vector2.ZERO
	return Input.get_vector("move_left", "move_right", "move_forward", "move_back")

func _freefall(delta: float) -> void:
	var input := _input_vector()
	var dive := clampf(-pitch / deg_to_rad(85.0), 0.0, 1.0)
	var forward := -transform.basis.z
	var right := transform.basis.x
	var horizontal := (forward * (-input.y) + right * input.x) * (18.0 + 16.0 * (1.0 - dive))
	velocity.x = move_toward(velocity.x, horizontal.x, 14.0 * delta)
	velocity.z = move_toward(velocity.z, horizontal.z, 14.0 * delta)
	velocity.y = move_toward(velocity.y, -(FREEFALL_SPEED * (0.85 + 0.45 * dive)), 40.0 * delta)
	move_and_slide()
	var agl := global_position.y - ground_height_below()
	if agl < AUTO_CHUTE_HEIGHT:
		open_chute()
	if is_on_floor():
		_land()

func _parachute(delta: float) -> void:
	var input := _input_vector()
	var forward := -transform.basis.z
	var right := transform.basis.x
	var glide := (forward * (1.0 - input.y * 0.6) * 0.6 + forward * maxf(0.0, -input.y) * 0.6 + right * input.x * 0.8) * PARACHUTE_GLIDE
	velocity.x = move_toward(velocity.x, glide.x, 6.0 * delta)
	velocity.z = move_toward(velocity.z, glide.z, 6.0 * delta)
	velocity.y = -PARACHUTE_FALL * (1.0 + maxf(0.0, input.y) * 0.8)
	move_and_slide()
	if is_on_floor() or global_position.y - ground_height_below() < 0.3:
		_land()

func _land() -> void:
	state = "ground"
	chute.visible = false
	arms.visible = false
	wind.emitting = false
	velocity = Vector3.ZERO
	pitch = 0.0
	land_dip = 1.0   # knees bend on touchdown
	if game: game.on_player_landed()

func _ground(delta: float) -> void:
	var input := _input_vector()
	var wants_run := controls_enabled and Input.is_action_pressed("run") and stance == "stand" and not aiming and input.y < -0.2 and healing <= 0.0
	if controls_enabled:
		if Input.is_action_just_pressed("crouch"):
			stance = "stand" if stance == "crouch" else "crouch"
		if Input.is_action_just_pressed("prone"):
			stance = "stand" if stance == "prone" else "prone"
	var speed := WALK_SPEED
	match stance:
		"crouch": speed = CROUCH_SPEED
		"prone": speed = PRONE_SPEED
	if wants_run: speed = RUN_SPEED
	if aiming: speed *= 0.65
	if healing > 0.0: speed *= 0.45
	if boost > 60.0: speed *= 1.06
	var direction := transform.basis * Vector3(input.x, 0.0, input.y)
	direction.y = 0.0
	direction = direction.normalized() * minf(1.0, input.length())
	velocity.x = move_toward(velocity.x, direction.x * speed, ACCELERATION * delta)
	velocity.z = move_toward(velocity.z, direction.z * speed, ACCELERATION * delta)
	if is_on_floor():
		if controls_enabled and Input.is_action_just_pressed("jump"):
			if stance != "stand":
				stance = "stand"
			else:
				velocity.y = JUMP_VELOCITY
	else:
		velocity.y -= GRAVITY * delta
	move_and_slide()
	# Step up small ledges (curbs, sills) instead of stopping dead in front of them
	if is_on_floor() and direction.length_squared() > 0.01 and is_on_wall():
		var step := Vector3(0, 0.38, 0)
		var ahead := direction.normalized() * 0.25
		if not test_move(global_transform, step) and not test_move(global_transform.translated(step), ahead):
			global_position += step + ahead
	# Water: wading slows you and deep water pushes you back to shore
	if global_position.y < -0.6:
		velocity.x *= 0.6
		velocity.z *= 0.6
	var eye: float = EYE[stance]
	head.position.y = move_toward(head.position.y, eye, delta * 4.0)
	var body: CollisionShape3D = get_node("Body")
	var capsule: CapsuleShape3D = body.shape
	var want_h: float = {"stand": 1.74, "crouch": 1.2, "prone": 0.7}[stance]
	capsule.height = want_h
	body.position.y = want_h * 0.5

func _update_feel(delta: float) -> void:
	var planar := Vector2(velocity.x, velocity.z).length()
	var moving := planar > 0.5 and is_on_floor() and state == "ground"
	if moving:
		bob_phase += delta * planar * 2.0
	var bob_amount := 0.0 if aiming else (0.045 if planar > WALK_SPEED + 0.5 else 0.03)
	var bob := Vector3(cos(bob_phase * 0.5) * bob_amount * 0.6, absf(sin(bob_phase * 0.5)) * bob_amount, 0.0) if moving else Vector3.ZERO
	var target := bob
	if shake_left > 0.0:
		shake_left -= delta
		target += Vector3(randf_range(-1, 1), randf_range(-1, 1), 0) * 0.05
	var t := Time.get_ticks_msec() * 0.001
	wind.emitting = state == "freefall"
	if state == "ground" or state == "dead":
		arms.visible = false
	if state == "freefall":
		target += Vector3(sin(t * 7.0) * 0.03, cos(t * 9.0) * 0.03, 0)
		camera.rotation.z = sin(t * 1.3) * 0.04 + (Input.get_axis("move_left", "move_right") * -0.18 if controls_enabled else 0.0)
		arms.position = Vector3(sin(t * 6.0) * 0.01, cos(t * 8.0) * 0.012, 0)
	elif state == "parachute":
		camera.rotation.z = lerpf(camera.rotation.z, (Input.get_axis("move_left", "move_right") * -0.12 if controls_enabled else 0.0), 1.0 - exp(-delta * 4.0))
		arms.visible = true
		arms.position = arms.position.lerp(Vector3(0, 0.22, 0.05), 1.0 - exp(-delta * 6.0))   # hands up on the toggles
	else:
		camera.rotation.z = lerpf(camera.rotation.z, 0.0, 1.0 - exp(-delta * 8.0))
	if chute_jolt > 0.0:
		chute_jolt = move_toward(chute_jolt, 0.0, delta * 2.5)
		target += Vector3(0, -0.35 * sin(chute_jolt * PI), 0)
	if land_dip > 0.0:
		land_dip = move_toward(land_dip, 0.0, delta * 2.8)
		target += Vector3(0, -0.45 * sin(land_dip * PI), 0)
	camera.position = camera.position.lerp(target, 1.0 - exp(-delta * 14.0))
	kick = move_toward(kick, 0.0, delta * 5.0)
	var wanted_fov := base_fov
	if aiming and state == "ground":
		wanted_fov = base_fov / current_zoom()
	elif state == "freefall":
		wanted_fov = base_fov + 6.0 + 12.0 * clampf(-velocity.y / 75.0, 0.0, 1.0)
	camera.fov = lerpf(camera.fov, wanted_fov, 1.0 - exp(-delta * 12.0))
	# Gun: centred when aiming, lowered while sprinting, healing or reloading
	var vm_target := Vector3(0.2, -0.22, -0.4)
	var vm_rot := Vector3.ZERO
	if aiming:
		vm_target = Vector3(0.0, -0.14, -0.32)
	if healing > 0.0 or state != "ground":
		vm_target = Vector3(0.22, -0.7, -0.4)
	elif reloading > 0.0:
		vm_target = Vector3(0.18, -0.36, -0.4)
		vm_rot = Vector3(-0.6, 0.2, 0.3)
	elif planar > WALK_SPEED + 0.5:
		vm_rot = Vector3(-0.15, 0.6, 0.2)
	vm_target += Vector3(bob.x * 0.8, -bob.y * 0.6, kick * 0.06)
	view_model.position = view_model.position.lerp(vm_target, 1.0 - exp(-delta * 14.0))
	view_model.rotation = view_model.rotation.lerp(vm_rot + Vector3(kick * 0.12, 0, 0), 1.0 - exp(-delta * 12.0))
	# Scoped guns hide the model at high zoom (the HUD draws a scope)
	gun_holder.visible = not (aiming and current_zoom() >= 4.0)
