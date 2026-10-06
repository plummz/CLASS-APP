class_name RoyaleBot
extends CharacterBody3D
## An AI survivor: parachutes in, loots houses (through their doors), fights anyone it can see,
## heals when hurt and keeps ahead of the shrinking zone. Far from the player it switches to a
## cheap kinematic update with no animation or collision.

const CHAR_DIR := "res://assets/characters_trim/"
const MODELS := ["Barbarian.scn", "Knight.scn", "Rogue.scn", "Rogue_Hooded.scn", "Mage.scn"]
const NAMES := ["Juan", "Maria", "Jose", "Ana", "Pedro", "Liza", "Carlo", "Bea", "Miguel", "Ella", "Rico", "Nina",
	"Paolo", "Jasmin", "Andres", "Kiko", "Tala", "Dante", "Mika", "Lara", "Enzo", "Bianca", "Gab", "Rhea", "Ivan",
	"Sofia", "Marco", "Kat", "Leo", "Yna", "Jun", "Pia"]
const RUN_SPEED := 5.6
const WALK_SPEED := 3.2
const FAR_DISTANCE := 170.0
const GRAVITY := 19.0

static var _scene_cache := {}

var game: Node
var combatant_name := "Bot"
var skill := 0.5
var health := 100.0
var vest := 0
var vest_hp := 0.0
var helmet := 0
var helmet_hp := 0.0
var gun_id := ""
var mag := 0
var meds := 0
var grenades := 0
var kills := 0
var state := "plane"       ## plane, freefall, parachute, ground, dead
var mode := "roam"         ## loot, fight, zone, roam, heal
var drop_target := Vector3.ZERO
var path: Array[Vector3] = []
var loot_target: Dictionary = {}
var enemy: Node3D
var enemy_seen_at := -100.0
var react_timer := 0.0
var think_timer := 0.0
var fire_timer := 0.0
var burst_left := 0
var reload_timer := 0.0
var heal_timer := 0.0
var strafe := 1.0
var strafe_timer := 0.0
var crouched := false
var detour := Vector3.ZERO
var detour_timer := 0.0
var stuck_timer := 0.0
var last_pos := Vector3.ZERO
var far := false
var model: Node3D
var anim: AnimationPlayer
var hand: Node3D
var chute_mesh: MeshInstance3D
var current_anim := ""
var _gun_node: Node3D

func setup(index: int, game_ref: Node, rng: RandomNumberGenerator) -> void:
	game = game_ref
	combatant_name = NAMES[index % NAMES.size()]
	skill = clampf(rng.randf_range(0.25, 0.85), 0.0, 1.0)
	var model_name: String = MODELS[index % MODELS.size()]
	var path_str := CHAR_DIR + model_name
	if not _scene_cache.has(path_str):
		_scene_cache[path_str] = load(path_str)
	model = _scene_cache[path_str].instantiate()
	model.scale = Vector3.ONE * 0.6
	add_child(model)
	for m: MeshInstance3D in model.find_children("*", "MeshInstance3D", true, false):
		m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	# Hide the swords, shields and hats held in the hand slots; a gun goes in the right hand
	for slot: BoneAttachment3D in model.find_children("*", "BoneAttachment3D", true, false):
		if slot.name.begins_with("handslot"):
			for c in slot.get_children():
				if c is Node3D: (c as Node3D).visible = false
			if slot.name == "handslot_r":
				hand = slot
	var players := model.find_children("*", "AnimationPlayer", true, false)
	if not players.is_empty():
		anim = players[0]
		# Imported clips don't loop by default; locomotion and aiming must
		for clip in ["Idle", "Running_A", "Walking_A", "2H_Ranged_Aiming", "2H_Ranged_Shoot", "Jump_Idle", "Use_Item"]:
			if anim.has_animation(clip):
				anim.get_animation(clip).loop_mode = Animation.LOOP_LINEAR
	chute_mesh = MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radius = 2.6
	sphere.height = 1.9
	sphere.is_hemisphere = true
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color.from_hsv(rng.randf(), 0.6, 0.95)
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	sphere.material = mat
	chute_mesh.mesh = sphere
	chute_mesh.position.y = 4.6
	chute_mesh.visible = false
	add_child(chute_mesh)

func _ready() -> void:
	collision_layer = 4
	collision_mask = 1
	floor_max_angle = deg_to_rad(50.0)
	var cs := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.34
	capsule.height = 1.75
	cs.shape = capsule
	cs.position.y = 0.875
	add_child(cs)
	think_timer = randf() * 0.4

func is_alive() -> bool:
	return state != "dead"

func head_y() -> float:
	return global_position.y + (1.0 if crouched else 1.5)

func chest_point() -> Vector3:
	return global_position + Vector3(0, 0.75 if crouched else 1.15, 0)

func set_gun(id: String) -> void:
	gun_id = id
	mag = int(Items.gun(id).mag)
	if _gun_node:
		_gun_node.queue_free()
		_gun_node = null
	if hand == null:
		return
	var path_str := Items.GUN_DIR + String(Items.gun(id).model) + ".glb"
	if not _scene_cache.has(path_str):
		_scene_cache[path_str] = load(path_str)
	_gun_node = _scene_cache[path_str].instantiate()
	_gun_node.scale = Vector3.ONE * 1.5
	_gun_node.rotation_degrees = Vector3(0, 180, 0)
	hand.add_child(_gun_node)

# ── Damage ───────────────────────────────────────────────────

func take_damage(amount: float, headshot: bool, attacker: String, zone_damage := false) -> void:
	if state == "dead":
		return
	var dmg := amount
	if not zone_damage:
		if headshot and helmet > 0:
			dmg *= 1.0 - Items.HELMET_REDUCTION[helmet]
			helmet_hp -= amount
			if helmet_hp <= 0.0: helmet = 0
		elif not headshot and vest > 0:
			dmg *= 1.0 - Items.VEST_REDUCTION[vest]
			vest_hp -= amount
			if vest_hp <= 0.0: vest = 0
		heal_timer = 0.0
		# Being shot reveals the shooter
		var shooter: Node3D = game.find_combatant(attacker) if game else null
		if shooter and shooter != self and shooter.is_alive():
			enemy = shooter
			enemy_seen_at = Time.get_ticks_msec() * 0.001
			mode = "fight"
	health -= dmg
	if health <= 0.0:
		health = 0.0
		_die(attacker)

func _die(attacker: String) -> void:
	state = "dead"
	mode = "dead"
	collision_layer = 0
	velocity = Vector3.ZERO
	chute_mesh.visible = false
	_play("Death_A", 0.1)
	if game:
		game.on_combatant_died(self, attacker)

# ── Thinking ─────────────────────────────────────────────────

func _now() -> float:
	return Time.get_ticks_msec() * 0.001

func _think() -> void:
	var now := _now()
	if reload_timer > 0.0:
		return
	# Heal when hurt and nobody is shooting
	if health < 50.0 and meds > 0 and now - enemy_seen_at > 4.0 and mode != "heal":
		mode = "heal"
		heal_timer = 5.0
		return
	if mode == "heal":
		return
	# Look for someone to fight
	var target := _scan_for_enemy()
	if target:
		if target != enemy:
			react_timer = randf_range(0.6, 1.5) * (1.4 - skill)
		enemy = target
		enemy_seen_at = now
		mode = "fight"
		return
	if mode == "fight" and now - enemy_seen_at < 3.0 and enemy and enemy.is_alive():
		# Lost sight: move to where they were
		path = [enemy.global_position]
		return
	enemy = null
	# Get inside (or ahead of) the safe zone
	var z: Dictionary = game.zone
	var center := Vector3(z.next_center.x, 0, z.next_center.y)
	var flat := Vector2(global_position.x, global_position.z)
	var danger_r: float = z.next_radius if float(z.timer) < 35.0 or bool(z.shrinking) else z.radius
	if flat.distance_to(z.next_center) > danger_r * 0.9:
		mode = "zone"
		var toward := (Vector2(center.x, center.z) - flat).normalized()
		var dest: Vector2 = z.next_center - toward * danger_r * randf_range(0.2, 0.7)
		path = [Vector3(dest.x, 0, dest.y)]
		return
	# Loot when under-equipped
	var wants_loot: bool = gun_id.is_empty() or Items.gun(gun_id).tier < 2 or vest == 0 or meds < 2
	if wants_loot:
		if loot_target.is_empty() or not game.loot_available(loot_target):
			loot_target = game.find_loot_for_bot(self, 70.0 if not gun_id.is_empty() else 120.0)
			if not loot_target.is_empty():
				path.assign(loot_target.path)
				path.append(Vector3(loot_target.pos))
		if not loot_target.is_empty():
			mode = "loot"
			return
	# Wander somewhere inside the zone
	if path.is_empty() or mode != "roam":
		mode = "roam"
		var a := randf() * TAU
		var dest2: Vector2 = z.next_center + Vector2(cos(a), sin(a)) * float(z.next_radius) * randf_range(0.1, 0.8)
		path = [Vector3(dest2.x, 0, dest2.y)]

func sight_range() -> float:
	if gun_id.is_empty():
		return 8.0
	return clampf(float(Items.gun(gun_id).range) * 0.7, 30.0, 150.0)

func _scan_for_enemy() -> Node3D:
	var best: Node3D = null
	var best_d := sight_range()
	for c: Node3D in game.combatants:
		if c == self or not c.is_alive():
			continue
		if c is RoyalePlayer and (c as RoyalePlayer).state != "ground":
			continue
		if c is RoyaleBot and (c as RoyaleBot).state != "ground":
			continue
		var d := global_position.distance_to(c.global_position)
		# Crouched / prone targets are harder to notice
		var stealth := 1.0
		if c is RoyalePlayer:
			stealth = {"stand": 1.0, "crouch": 0.7, "prone": 0.45}[(c as RoyalePlayer).stance]
		var to := (c.global_position - global_position).normalized()
		var facing := Vector3(sin(rotation.y), 0, cos(rotation.y))
		if d > 12.0 and facing.dot(to) < -0.15:
			continue
		# Healthy bots sometimes let another bot pass instead of starting a fight
		if c is RoyaleBot and c != enemy and health > 60.0 and d > 25.0 and randf() < 0.45:
			continue
		if d < best_d * stealth and game.has_line_of_sight(chest_point(), c.global_position + Vector3(0, 1.1, 0), self):
			best = c
			best_d = d
	return best

# ── Frame update ─────────────────────────────────────────────

func _physics_process(delta: float) -> void:
	if game == null:
		return
	match state:
		"plane":
			return
		"freefall", "parachute":
			_drop(delta)
			return
		"dead":
			if not is_on_floor() and not far:
				velocity.y -= GRAVITY * delta
				move_and_slide()
			return
	far = global_position.distance_to(game.player.global_position) > FAR_DISTANCE
	model.visible = global_position.distance_to(game.player.global_position) < FAR_DISTANCE * 1.6
	think_timer -= delta
	if think_timer <= 0.0:
		think_timer = (0.35 if not far else 0.9) + randf() * 0.15
		_think()
	if reload_timer > 0.0:
		reload_timer -= delta
		if reload_timer <= 0.0: mag = int(Items.gun(gun_id).mag)
	if mode == "heal":
		heal_timer -= delta
		_move_toward(Vector3.ZERO, 0.0, delta)
		_play("Use_Item")
		if heal_timer <= 0.0:
			meds -= 1
			health = minf(100.0, health + 50.0)
			mode = "roam"
		return
	if mode == "fight" and enemy and enemy.is_alive():
		_fight(delta)
	else:
		_follow_path(delta)
	# Stuck detection: if barely moving while trying to, pick a detour
	stuck_timer += delta
	if stuck_timer > 1.5:
		if global_position.distance_to(last_pos) < 0.6 and not path.is_empty() and mode != "fight":
			detour = Vector3(randf_range(-1, 1), 0, randf_range(-1, 1)).normalized()
			detour_timer = 1.2
		last_pos = global_position
		stuck_timer = 0.0
	# Fell in the sea: swim back
	if global_position.y < -1.5:
		global_position.y = -1.0

func _drop(delta: float) -> void:
	var to := drop_target - global_position
	to.y = 0.0
	var ground: float = game.world.height_at(global_position.x, global_position.z)
	if state == "freefall":
		var horiz := to.normalized() * minf(to.length(), 24.0)
		global_position += Vector3(horiz.x, -42.0, horiz.z) * delta
		_play("Jump_Idle")
		if global_position.y - ground < 80.0:
			state = "parachute"
			chute_mesh.visible = not far
	else:
		var horiz2 := to.normalized() * minf(to.length(), 9.0)
		global_position += Vector3(horiz2.x, -6.0, horiz2.z) * delta
		_play("Jump_Idle")
	if to.length() > 0.5:
		rotation.y = atan2(to.x, to.z)
	if global_position.y <= ground + 0.1:
		global_position.y = ground + 0.1
		state = "ground"
		chute_mesh.visible = false
		path.clear()
		mode = "roam"
		think_timer = 0.0

func _follow_path(delta: float) -> void:
	if path.is_empty():
		_move_toward(Vector3.ZERO, 0.0, delta)
		_play("2H_Ranged_Aiming" if not gun_id.is_empty() and mode == "fight" else "Idle")
		return
	var goal := path[0]
	var flat := Vector2(goal.x - global_position.x, goal.z - global_position.z)
	if flat.length() < 1.0:
		path.remove_at(0)
		if path.is_empty() and mode == "loot" and not loot_target.is_empty():
			game.bot_pickup(self, loot_target)
			loot_target = {}
			mode = "roam"
		return
	var speed := RUN_SPEED if mode in ["zone", "loot"] or gun_id.is_empty() else WALK_SPEED
	_move_toward(Vector3(flat.x, 0, flat.y).normalized(), speed, delta)
	_play("Running_A" if speed > WALK_SPEED else "Walking_A")

func _fight(delta: float) -> void:
	var to := enemy.global_position - global_position
	var dist := to.length()
	var flat := Vector3(to.x, 0, to.z).normalized()
	rotation.y = atan2(flat.x, flat.z)
	if gun_id.is_empty():
		# No gun: rush for a punch or run for loot
		if dist < 2.0:
			fire_timer -= delta
			if fire_timer <= 0.0:
				fire_timer = 0.7
				game.bot_shot(self, enemy, randf() < 0.6, 12.0, false, "")
				_play("Unarmed_Melee_Attack_Punch_A", 0.05)
		else:
			_move_toward(flat, RUN_SPEED, delta)
			_play("Running_A")
		return
	var data := Items.gun(gun_id)
	var ideal: float = clampf(float(data.range) * 0.5, 6.0, 90.0)
	strafe_timer -= delta
	if strafe_timer <= 0.0:
		strafe_timer = randf_range(0.8, 2.0)
		strafe = -strafe if randf() < 0.6 else strafe
		crouched = randf() < 0.3 * skill
	var side := Vector3(flat.z, 0, -flat.x) * strafe
	var move := side * 0.7
	if dist > ideal * 1.3: move += flat
	elif dist < ideal * 0.5 and String(data.kind) != "shotgun": move -= flat * 0.6
	_move_toward(move.normalized(), WALK_SPEED * (0.5 if crouched else 1.0), delta)
	if reload_timer > 0.0:
		_play("2H_Ranged_Reload")
		return
	if mag <= 0:
		reload_timer = float(data.reload) * 1.1
		return
	if react_timer > 0.0:
		react_timer -= delta
		_play("2H_Ranged_Aiming")
		return
	fire_timer -= delta
	if fire_timer > 0.0:
		_play("2H_Ranged_Aiming")
		return
	# Fire in bursts, with a pause between them
	if burst_left <= 0:
		burst_left = 1 if not bool(data.auto) else randi_range(3, 5)
		fire_timer = randf_range(0.5, 1.2) * (1.5 - skill)
		return
	burst_left -= 1
	mag -= 1
	fire_timer = Items.seconds_per_shot(gun_id) * (1.15 if bool(data.auto) else 1.6)
	var range_factor := clampf(1.0 - (dist / (float(data.range) * 1.8)), 0.12, 1.0)
	var target_factor := 1.0
	if enemy is RoyalePlayer:
		var p := enemy as RoyalePlayer
		target_factor = {"stand": 1.0, "crouch": 0.8, "prone": 0.55}[p.stance]
		if Vector2(p.velocity.x, p.velocity.z).length() > 3.0: target_factor *= 0.75
	var hit: bool = randf() < (0.07 + 0.25 * skill) * range_factor * target_factor * game.bot_accuracy
	var headshot: bool = hit and randf() < 0.08 + 0.12 * skill
	var dmg := Items.damage_at(gun_id, dist) * (2.0 if headshot else 1.0)
	for p_i in int(data.pellets):
		if p_i > 0 and randf() > 0.5: continue
		game.bot_shot(self, enemy, hit, dmg if p_i == 0 else dmg * 0.8, headshot, gun_id)
	_play("2H_Ranged_Shoot", 0.05)

func _move_toward(direction: Vector3, speed: float, delta: float) -> void:
	var dir := direction
	if detour_timer > 0.0:
		detour_timer -= delta
		dir = (dir + detour * 1.5).normalized()
	elif speed > 0.0 and not far:
		# Feel ahead for walls and step around them
		var origin := global_position + Vector3(0, 1.0, 0)
		if game.ray_blocked(origin, origin + dir * 1.6, self):
			for angle in [0.8, -0.8, 1.6, -1.6]:
				var alt := dir.rotated(Vector3.UP, angle)
				if not game.ray_blocked(origin, origin + alt * 1.6, self):
					detour = alt
					detour_timer = 0.6
					dir = alt
					break
	if far:
		# Cheap update: slide along the terrain without physics
		var step := dir * speed * delta
		global_position += step
		global_position.y = maxf(-1.0, game.world.height_at(global_position.x, global_position.z))
		if dir.length() > 0.1 and mode != "fight":
			rotation.y = atan2(dir.x, dir.z)
		return
	velocity.x = dir.x * speed
	velocity.z = dir.z * speed
	if is_on_floor():
		velocity.y = -1.0
	else:
		velocity.y -= GRAVITY * delta
	if dir.length() > 0.1 and mode != "fight":
		rotation.y = lerp_angle(rotation.y, atan2(dir.x, dir.z), 0.25)
	move_and_slide()

func _play(name: String, blend := 0.2) -> void:
	if anim == null or far or current_anim == name:
		return
	if not anim.has_animation(name):
		return
	current_anim = name
	anim.play(name, blend)
