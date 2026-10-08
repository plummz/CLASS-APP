class_name RoyaleRemote
extends CharacterBody3D
## Another classmate in a room match. Their own game moves them and sends ~15 updates a second;
## this node smooths between updates, shows their gun, name and parachute, and can be shot
## (the hit is sent to their game, which applies armour and health).

var game: Node
var username := ""
var combatant_name := ""
var state := "plane"
var stance := "stand"
var health := 100.0
var kills := 0
var gun_id := ""
var skin_id := ""
var outfit := "standard"
var left_match := false
var death_items: Array = []
var soldier: RoyaleSoldier
var chute_mesh: MeshInstance3D
var tag: Label3D
var _target := Vector3.ZERO
var _target_yaw := 0.0
var _has_update := false

func setup(game_ref: Node, user: String, display: String, _index: int) -> void:
	game = game_ref
	username = user
	combatant_name = display
	soldier = RoyaleSoldier.new()
	add_child(soldier)
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
	tag.modulate = Color("7dff9a") if game_ref.team_mode else Color("8fd0ff")
	tag.pixel_size = 0.005
	tag.position.y = 2.2
	tag.visibility_range_end = 70.0
	add_child(tag)
	visible = false

func _ready() -> void:
	collision_layer = 4
	collision_mask = 0
	var cs := CollisionShape3D.new()
	cs.name = "Hitbox"
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.34
	capsule.height = 1.75
	cs.shape = capsule
	cs.position.y = 0.875
	add_child(cs)

func is_alive() -> bool:
	return state != "dead" and not left_match

func head_y() -> float:
	return global_position.y + {"stand": 1.62, "crouch": 1.08, "prone": 0.4}.get(stance, 1.62)

func chest_point() -> Vector3:
	return global_position + Vector3(0, {"stand": 1.25, "crouch": 0.8, "prone": 0.3}.get(stance, 1.25), 0)

## Damage is decided by whoever shot; their game sends it to this player's game.
func take_damage(amount: float, headshot: bool, attacker: String, zone_damage := false) -> void:
	if zone_damage or not is_alive() or game == null:
		return
	if game.team_mode and game.find_combatant(attacker) == game.player:
		return   # no friendly fire between teammates
	game.net.send({"t": "hit", "to": username, "d": snappedf(amount, 0.1), "h": headshot, "by": attacker})

func apply_state(m: Dictionary) -> void:
	if not is_alive():
		return
	var p: Array = m.get("p", [0, 0, 0])
	_target = Vector3(float(p[0]), float(p[1]), float(p[2]))
	_target_yaw = float(m.get("y", 0.0))
	state = String(m.get("s", "ground"))
	stance = String(m.get("c", "stand"))
	health = float(m.get("hp", health))
	var g := String(m.get("g", ""))
	var k := String(m.get("k", ""))
	if g != gun_id or k != skin_id:
		gun_id = g
		skin_id = k
		soldier.set_gun(g, k)
	var o := String(m.get("o", "standard"))
	if o != outfit:
		outfit = o
		soldier.set_outfit(o)
	var f := int(m.get("f", 0))
	soldier.aiming = f & 1 != 0
	soldier.reloading = f & 2 != 0
	soldier.healing = f & 4 != 0
	soldier.throwing = f & 8 != 0
	soldier.aim_pitch = float(m.get("ap", 0.0))
	soldier.state = state
	soldier.stance = stance
	soldier.has_gun = not g.is_empty()
	soldier.seated = f & 16 != 0
	soldier.in_car = f & 32 != 0
	# Hitbox follows the stance
	var cs: CollisionShape3D = get_node_or_null("Hitbox")
	if cs:
		var hh: float = {"stand": 1.75, "crouch": 1.2, "prone": 0.6}.get(stance, 1.75)
		(cs.shape as CapsuleShape3D).height = hh
		cs.position.y = hh * 0.5
	if not _has_update or global_position.distance_to(_target) > 40.0:
		global_position = _target
		rotation.y = _target_yaw
	_has_update = true
	visible = state != "plane"
	chute_mesh.visible = state == "parachute"

func show_shot() -> void:
	soldier.shoot_fx()

func die() -> void:
	state = "dead"
	collision_layer = 0
	chute_mesh.visible = false
	tag.visible = false
	soldier.die()

func leave() -> void:
	left_match = true
	collision_layer = 0
	visible = false

func _physics_process(delta: float) -> void:
	if not _has_update or not is_alive():
		return
	# Updates arrive ~15 times a second; glide between them
	global_position = global_position.lerp(_target, 1.0 - exp(-delta * 12.0))
	rotation.y = lerp_angle(rotation.y, _target_yaw, 1.0 - exp(-delta * 12.0))
	if game and game.player:
		var d := global_position.distance_to(game.player.global_position)
		soldier.detail = 1 if d < 40.0 else (2 if d < 100.0 else (4 if d < 220.0 else 0))
