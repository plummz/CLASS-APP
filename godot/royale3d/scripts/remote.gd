class_name RoyaleRemote
extends CharacterBody3D
## Another classmate in a room match. Their own game moves them and sends ~15 updates a second;
## this node smooths between updates, shows their gun, name and parachute, and can be shot
## (the hit is sent to their game, which applies armour and health).

const MODELS := ["Knight.scn", "Rogue.scn", "Barbarian.scn", "Mage.scn", "Rogue_Hooded.scn"]

var game: Node
var username := ""
var combatant_name := ""
var state := "plane"
var stance := "stand"
var health := 100.0
var kills := 0
var gun_id := ""
var left_match := false
var death_items: Array = []
var model: Node3D
var anim: AnimationPlayer
var hand: Node3D
var chute_mesh: MeshInstance3D
var tag: Label3D
var current_anim := ""
var _target := Vector3.ZERO
var _target_yaw := 0.0
var _speed := 0.0
var _shoot_t := 0.0
var _has_update := false
var _gun_node: Node3D

func setup(game_ref: Node, user: String, display: String, index: int) -> void:
	game = game_ref
	username = user
	combatant_name = display
	var path_str: String = RoyaleBot.CHAR_DIR + MODELS[index % MODELS.size()]
	if not RoyaleBot._scene_cache.has(path_str):
		RoyaleBot._scene_cache[path_str] = load(path_str)
	model = RoyaleBot._scene_cache[path_str].instantiate()
	model.scale = Vector3.ONE * 0.6
	add_child(model)
	for slot: BoneAttachment3D in model.find_children("*", "BoneAttachment3D", true, false):
		if slot.name.begins_with("handslot"):
			for c in slot.get_children():
				if c is Node3D: (c as Node3D).visible = false
			if slot.name == "handslot_r":
				hand = slot
	var players := model.find_children("*", "AnimationPlayer", true, false)
	if not players.is_empty():
		anim = players[0]
		for clip in ["Idle", "Running_A", "Walking_A", "2H_Ranged_Aiming", "2H_Ranged_Shoot", "Jump_Idle"]:
			if anim.has_animation(clip):
				anim.get_animation(clip).loop_mode = Animation.LOOP_LINEAR
	chute_mesh = MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radius = 2.6
	sphere.height = 1.9
	sphere.is_hemisphere = true
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color("2f7cf6")
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	sphere.material = mat
	chute_mesh.mesh = sphere
	chute_mesh.position.y = 4.6
	chute_mesh.visible = false
	add_child(chute_mesh)
	# Classmates get a name tag so they stand out from the bots
	tag = Label3D.new()
	tag.text = display
	tag.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	tag.font_size = 30
	tag.outline_size = 10
	tag.modulate = Color("8fd0ff")
	tag.pixel_size = 0.005
	tag.position.y = 2.15
	tag.visibility_range_end = 70.0
	add_child(tag)
	visible = false

func _ready() -> void:
	collision_layer = 4
	collision_mask = 0
	var cs := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.34
	capsule.height = 1.75
	cs.shape = capsule
	cs.position.y = 0.875
	add_child(cs)

func is_alive() -> bool:
	return state != "dead" and not left_match

func head_y() -> float:
	return global_position.y + {"stand": 1.5, "crouch": 1.0, "prone": 0.35}.get(stance, 1.5)

func chest_point() -> Vector3:
	return global_position + Vector3(0, {"stand": 1.15, "crouch": 0.75, "prone": 0.25}.get(stance, 1.15), 0)

## Damage is decided by whoever shot; their game sends it to this player's game.
func take_damage(amount: float, headshot: bool, attacker: String, zone_damage := false) -> void:
	if zone_damage or not is_alive() or game == null:
		return
	game.net.send({"t": "hit", "to": username, "d": snappedf(amount, 0.1), "h": headshot, "by": attacker})

func apply_state(m: Dictionary) -> void:
	if not is_alive():
		return
	var p: Array = m.get("p", [0, 0, 0])
	_target = Vector3(float(p[0]), float(p[1]), float(p[2]))
	_target_yaw = float(m.get("y", 0.0))
	_speed = float(m.get("v", 0.0))
	state = String(m.get("s", "ground"))
	stance = String(m.get("c", "stand"))
	health = float(m.get("hp", health))
	var g := String(m.get("g", ""))
	if g != gun_id:
		_set_gun(g)
	if not _has_update or global_position.distance_to(_target) > 40.0:
		global_position = _target
		rotation.y = _target_yaw
	_has_update = true
	visible = state != "plane"
	chute_mesh.visible = state == "parachute"

func show_shot() -> void:
	_shoot_t = 0.25

func die() -> void:
	state = "dead"
	collision_layer = 0
	chute_mesh.visible = false
	tag.visible = false
	_play("Death_A", 0.1)

func leave() -> void:
	left_match = true
	collision_layer = 0
	visible = false

func _set_gun(id: String) -> void:
	gun_id = id
	if _gun_node:
		_gun_node.queue_free()
		_gun_node = null
	if hand == null or id.is_empty():
		return
	var path_str := Items.GUN_DIR + String(Items.gun(id).model) + ".glb"
	if not RoyaleBot._scene_cache.has(path_str):
		RoyaleBot._scene_cache[path_str] = load(path_str)
	_gun_node = RoyaleBot._scene_cache[path_str].instantiate()
	_gun_node.scale = Vector3.ONE * 1.5
	_gun_node.rotation_degrees = Vector3(0, 180, 0)
	hand.add_child(_gun_node)

func _physics_process(delta: float) -> void:
	if not _has_update or not is_alive():
		return
	# Updates arrive ~15 times a second; glide between them
	global_position = global_position.lerp(_target, 1.0 - exp(-delta * 12.0))
	rotation.y = lerp_angle(rotation.y, _target_yaw, 1.0 - exp(-delta * 12.0))
	model.position.y = -0.45 if stance == "prone" else (-0.3 if stance == "crouch" else 0.0)
	_shoot_t -= delta
	match state:
		"freefall", "parachute":
			_play("Jump_Idle")
		"ground":
			if _shoot_t > 0.0 and not gun_id.is_empty():
				_play("2H_Ranged_Shoot", 0.05)
			elif _speed > 4.8:
				_play("Running_A")
			elif _speed > 0.6:
				_play("Walking_A")
			else:
				_play("2H_Ranged_Aiming" if not gun_id.is_empty() else "Idle")

func _play(name: String, blend := 0.2) -> void:
	if anim == null or current_anim == name or not anim.has_animation(name):
		return
	current_anim = name
	anim.play(name, blend)
