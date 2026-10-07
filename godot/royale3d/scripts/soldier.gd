class_name RoyaleSoldier
extends Node3D
## The tactical soldier used by the player (third person), bots and classmates in room matches.
## One Mixamo rig (assets/soldier/soldier.scn, built by tools/build_assets.gd) with mocap clips
## driven by an AnimationTree:
##   legs   — blend spaces for standing / crouched / prone / unarmed movement, picked from the
##            real ground speed and direction (so walking, strafing and backpedalling match)
##   upper  — aim, fire, reload, heal, throw, punch and hit reactions layered over the legs on
##            the spine and arms only
##   full   — skydive, parachute and death clips replace everything
## The owner sets the public fields each frame (state, stance, aiming, firing…); movement is
## measured from the node's own position, so bots, puppets and remote players all work the same.
## Faces +Z (like the old KayKit characters).

const SCENE := "res://assets/soldier/soldier.scn"
const HAND_BONE := "mixamorig_RightHand"
const BACK_BONE := "mixamorig_Spine2"
## Gun placement in the right hand bone's space (tuned against the rifle clips)
static var gun_rot_deg := Vector3(50.0, -11.4, -93.4)   ## from tools/calib_gun.gd (aim pose → rifle straight ahead)
static var gun_pos := Vector3(0.0, 0.08, 0.03)
const UPPER_BONES := ["Spine1", "Spine2", "Neck", "Head", "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
	"RightShoulder", "RightArm", "RightForeArm", "RightHand"]
const FINGER_PREFIXES := ["LeftHand", "RightHand"]

static var _packed: PackedScene

## Inputs (set by the owner every frame)
var state := "ground"          ## plane, freefall, parachute, ground, dead
var stance := "stand"          ## stand, crouch, prone
var aiming := false
var firing := false            ## hold true while shooting (the fire clip loops)
var reloading := false
var healing := false
var throwing := false
var punching := false
var has_gun := false
var seated := false            ## driving a car or riding a motorcycle
var in_car := false            ## seated inside a car: the backpack is stowed
var aim_pitch := 0.0           ## radians, + looks up (bends the spine)
var detail := 1                ## 0 = frozen (far away), 1 = every frame, 2+ = every Nth frame

var model: Node3D
var skeleton: Skeleton3D
var tree: AnimationTree
var hand: BoneAttachment3D
var back: BoneAttachment3D
var gun: Node3D
var gun_id := ""
var muzzle: Node3D
var body_mesh: MeshInstance3D
var _flash: MeshInstance3D
var _shells: CPUParticles3D
var _last_pos := Vector3.ZERO
var _vel := Vector3.ZERO
var _base := ""
var _upper := ""
var _upper_w := 0.0
var _hit_t := 0.0
var _fire_t := 0.0
var _frame := 0
var _dt_acc := 0.0
var _dead_clip := ""
var _aim_mod: AimBend

func _ready() -> void:
	if _packed == null:
		_packed = load(SCENE)
	model = _packed.instantiate()
	add_child(model)
	skeleton = model.find_children("*", "Skeleton3D", true, false)[0]
	body_mesh = model.find_children("*", "MeshInstance3D", true, false)[0]
	body_mesh.visibility_range_end = 320.0
	_build_tree()
	hand = BoneAttachment3D.new()
	hand.bone_name = HAND_BONE
	skeleton.add_child(hand)
	back = BoneAttachment3D.new()
	back.bone_name = BACK_BONE
	skeleton.add_child(back)
	_aim_mod = AimBend.new()
	skeleton.add_child(_aim_mod)
	_build_fx()
	_last_pos = global_position

# ── Animation tree ───────────────────────────────────────────

func _clip(name: String) -> AnimationNodeAnimation:
	var a := AnimationNodeAnimation.new()
	a.animation = name
	return a

func _build_tree() -> void:
	var ap: AnimationPlayer = model.find_children("*", "AnimationPlayer", true, false)[0]
	var bt := AnimationNodeBlendTree.new()
	# Standing with a rifle: x = strafe speed, y = forward speed (m/s)
	var stand := AnimationNodeBlendSpace2D.new()
	stand.min_space = Vector2(-4.0, -5.0)
	stand.max_space = Vector2(4.0, 7.0)
	stand.sync = true
	for p in [["idle", Vector2(0, 0)], ["walk", Vector2(0, 1.6)], ["run", Vector2(0, 4.0)], ["sprint", Vector2(0, 6.4)],
			["walk_back", Vector2(0, -1.5)], ["run_back", Vector2(0, -4.0)], ["strafe_l", Vector2(-2.2, 0)], ["strafe_r", Vector2(2.2, 0)]]:
		stand.add_blend_point(_clip(p[0]), p[1])
	var crouch := AnimationNodeBlendSpace2D.new()
	crouch.min_space = Vector2(-3.0, -3.0)
	crouch.max_space = Vector2(3.0, 3.0)
	crouch.sync = true
	for p in [["crouch_idle", Vector2(0, 0)], ["crouch_walk", Vector2(0, 1.3)], ["crouch_back", Vector2(0, -1.2)],
			["crouch_strafe_l", Vector2(-1.3, 0)], ["crouch_strafe_r", Vector2(1.3, 0)]]:
		crouch.add_blend_point(_clip(p[0]), p[1])
	var prone := AnimationNodeBlendSpace1D.new()
	prone.min_space = 0.0
	prone.max_space = 1.5
	prone.add_blend_point(_clip("prone_idle"), 0.0)
	prone.add_blend_point(_clip("prone_fwd"), 0.7)
	var unarmed := AnimationNodeBlendSpace1D.new()
	unarmed.min_space = 0.0
	unarmed.max_space = 7.0
	unarmed.add_blend_point(_clip("unarmed_idle"), 0.0)
	unarmed.add_blend_point(_clip("unarmed_run"), 4.6)
	var base := AnimationNodeTransition.new()
	base.xfade_time = 0.2
	var base_inputs := {"stand": stand, "crouch": crouch, "prone": prone, "unarmed": unarmed, "fall": _clip("fall"),
		"chute": _clip("chute"), "death_front": _clip("death_front"), "death_back": _clip("death_back"),
		"prone_reload": _clip("prone_reload"), "land": _clip("land"), "drive": _clip("drive")}
	bt.add_node("base", base)
	var i := 0
	for key in base_inputs:
		base.add_input(key)
		bt.add_node("b_" + key, base_inputs[key])
		bt.connect_node("base", i, "b_" + key)
		i += 1
	var speed := AnimationNodeTimeScale.new()
	bt.add_node("speed", speed)
	bt.connect_node("speed", 0, "base")
	var upper := AnimationNodeTransition.new()
	upper.xfade_time = 0.15
	bt.add_node("upper", upper)
	i = 0
	for key in ["aim_idle", "crouch_aim", "fire", "reload", "heal", "throw", "punch", "unarmed_punch", "hit"]:
		upper.add_input(key)
		bt.add_node("u_" + key, _clip(key))
		bt.connect_node("upper", i, "u_" + key)
		i += 1
	var layer := AnimationNodeBlend2.new()
	layer.filter_enabled = true
	for bone in UPPER_BONES:
		layer.set_filter_path(NodePath("%s:mixamorig_%s" % [model.get_path_to(skeleton), bone]), true)
	for b in skeleton.get_bone_count():
		var bn := skeleton.get_bone_name(b)
		for pre in FINGER_PREFIXES:
			if bn.begins_with("mixamorig_" + pre) and bn != "mixamorig_" + pre:
				layer.set_filter_path(NodePath("%s:%s" % [model.get_path_to(skeleton), bn]), true)
	bt.add_node("layer", layer)
	bt.connect_node("layer", 0, "speed")
	bt.connect_node("layer", 1, "upper")
	bt.connect_node("output", 0, "layer")
	tree = AnimationTree.new()
	tree.tree_root = bt
	model.add_child(tree)
	tree.anim_player = tree.get_path_to(ap)
	tree.root_node = tree.get_path_to(model)
	tree.callback_mode_process = AnimationMixer.ANIMATION_CALLBACK_MODE_PROCESS_MANUAL
	tree.active = true
	_set_base("stand")
	_set_upper("aim_idle")

func _set_base(name: String) -> void:
	if name != _base:
		_base = name
		tree.set("parameters/base/transition_request", name)

func _set_upper(name: String) -> void:
	if name != _upper:
		_upper = name
		tree.set("parameters/upper/transition_request", name)

# ── Gun, gear and effects ────────────────────────────────────

func set_gun(id: String, skin := "") -> void:
	if id == gun_id and gun != null and String(gun.get_meta("skin", "")) == skin:
		return
	gun_id = id
	if gun:
		gun.queue_free()
		gun = null
		muzzle = null
	has_gun = not id.is_empty()
	if id.is_empty():
		return
	gun = Items.gun_node(id, skin)
	gun.set_meta("skin", skin)
	gun.transform = Transform3D(Basis.from_euler(gun_rot_deg * (PI / 180.0)), gun_pos)
	hand.add_child(gun)
	muzzle = gun.get_node_or_null("Muzzle")
	_shells.reparent(gun, false)
	_shells.position = Vector3(0.04, 0.05, -0.1)
	_flash.reparent(muzzle if muzzle else gun, false)
	_flash.position = Vector3.ZERO

func set_outfit(outfit_id: String) -> void:
	Skins.apply_outfit(self, outfit_id)

func _build_fx() -> void:
	_flash = MeshInstance3D.new()
	var quad := QuadMesh.new()
	quad.size = Vector2(0.28, 0.28)
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.albedo_color = Color(1.0, 0.75, 0.35)
	m.albedo_texture = _flash_texture()
	m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	quad.material = m
	_flash.mesh = quad
	_flash.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_flash.visible = false
	add_child(_flash)
	# Brass casings flicked out to the right of the gun
	_shells = CPUParticles3D.new()
	_shells.emitting = false
	_shells.amount = 8
	_shells.lifetime = 0.7
	_shells.local_coords = false
	_shells.direction = Vector3(1, 0.8, 0.2)
	_shells.spread = 18.0
	_shells.initial_velocity_min = 2.0
	_shells.initial_velocity_max = 3.2
	_shells.gravity = Vector3(0, -9.8, 0)
	_shells.angular_velocity_min = 400.0
	_shells.angular_velocity_max = 900.0
	var shell := CylinderMesh.new()
	shell.top_radius = 0.006
	shell.bottom_radius = 0.006
	shell.height = 0.025
	shell.radial_segments = 6
	var sm := StandardMaterial3D.new()
	sm.albedo_color = Color("d9a441")
	sm.metallic = 0.9
	sm.roughness = 0.3
	shell.material = sm
	_shells.mesh = shell
	add_child(_shells)

static var _flash_tex: Texture2D
static func _flash_texture() -> Texture2D:
	if _flash_tex == null:
		var g := Gradient.new()
		g.set_color(0, Color(1, 1, 1, 1))
		g.set_color(1, Color(1, 1, 1, 0))
		var t := GradientTexture2D.new()
		t.gradient = g
		t.fill = GradientTexture2D.FILL_RADIAL
		t.fill_from = Vector2(0.5, 0.5)
		t.fill_to = Vector2(0.5, 0.0)
		t.width = 64
		t.height = 64
		_flash_tex = t
	return _flash_tex

## One shot: flash, casing and a short fire-clip pulse.
func shoot_fx() -> void:
	_fire_t = 0.18
	if _flash:
		_flash.visible = true
		_flash.rotation.z = randf() * TAU
		_flash.scale = Vector3.ONE * randf_range(0.8, 1.25)
		get_tree().create_timer(0.045).timeout.connect(func(): if is_instance_valid(_flash): _flash.visible = false)
	if _shells and detail > 0 and detail <= 2:
		_shells.emitting = true
		_shells.restart()

func hit_reaction() -> void:
	_hit_t = 0.45

func die() -> void:
	state = "dead"
	_dead_clip = "death_front" if randf() < 0.5 else "death_back"

## Hide the body (first-person view) but keep its shadow.
func set_body_visible(v: bool) -> void:
	var mode := GeometryInstance3D.SHADOW_CASTING_SETTING_ON if v else GeometryInstance3D.SHADOW_CASTING_SETTING_SHADOWS_ONLY
	for mi: MeshInstance3D in find_children("*", "MeshInstance3D", true, false):
		if mi == _flash:
			continue
		mi.cast_shadow = mode

# ── Per frame ────────────────────────────────────────────────

func _process(delta: float) -> void:
	if tree == null:
		return
	var pos := global_position
	var raw := (pos - _last_pos) / maxf(delta, 0.0001)
	_last_pos = pos
	if raw.length() > 40.0:
		raw = Vector3.ZERO   # teleport / snap
	_vel = _vel.lerp(raw, 1.0 - exp(-delta * 10.0))
	_fire_t -= delta
	_hit_t -= delta
	if detail <= 0:
		return
	_frame += 1
	_dt_acc += delta
	if _frame % detail != 0:
		return
	_update_tree(_dt_acc)
	_dt_acc = 0.0

func _update_tree(delta: float) -> void:
	# Movement relative to where the body faces (+Z forward, -X right)
	var fwd := global_basis.z.normalized()
	var right := -global_basis.x.normalized()
	var flat := Vector3(_vel.x, 0, _vel.z)
	var local := Vector2(flat.dot(right), flat.dot(fwd))
	var spd := flat.length()
	var time_scale := 1.0
	match state:
		"plane", "freefall":
			_set_base("fall")
		"parachute":
			_set_base("chute")
		"dead":
			_set_base(_dead_clip if not _dead_clip.is_empty() else "death_front")
		_:
			if seated:
				_set_base("drive")
			elif not has_gun:
				_set_base("unarmed")
				tree.set("parameters/b_unarmed/blend_position", spd)
				time_scale = clampf(spd / 4.6, 1.0, 1.5) if spd > 4.6 else 1.0
			elif stance == "prone":
				_set_base("prone_reload" if reloading else "prone")
				tree.set("parameters/b_prone/blend_position", minf(spd, 1.5))
				time_scale = clampf(spd / 0.7, 0.8, 2.2) if spd > 0.2 else 1.0
			elif stance == "crouch":
				_set_base("crouch")
				tree.set("parameters/b_crouch/blend_position", local)
				time_scale = clampf(spd / 1.3, 0.8, 1.9) if spd > 0.3 else 1.0
			else:
				_set_base("stand")
				tree.set("parameters/b_stand/blend_position", local)
				# Faster than the fastest clip at that blend: speed the legs up a little
				if spd > 6.4: time_scale = clampf(spd / 6.4, 1.0, 1.4)
				elif absf(local.x) > 2.2 and absf(local.x) > absf(local.y): time_scale = clampf(absf(local.x) / 2.2, 1.0, 1.6)
	tree.set("parameters/speed/scale", time_scale)
	# Upper body layer
	var want := 0.0
	var ground := state == "ground" and not seated
	if ground and stance != "prone":
		if healing:
			_set_upper("heal"); want = 1.0
		elif throwing:
			_set_upper("throw"); want = 1.0
		elif punching:
			_set_upper("punch" if has_gun else "unarmed_punch"); want = 1.0
		elif not has_gun:
			want = 0.0
		elif reloading:
			_set_upper("reload"); want = 1.0
		elif firing or _fire_t > 0.0:
			_set_upper("fire"); want = 1.0
		elif _hit_t > 0.0:
			_set_upper("hit"); want = 0.8
		elif aiming:
			_set_upper("crouch_aim" if stance == "crouch" else "aim_idle"); want = 1.0
	_upper_w = move_toward(_upper_w, want, delta / 0.18)
	tree.set("parameters/layer/blend_amount", _upper_w)
	_aim_mod.pitch = aim_pitch if ground and has_gun and stance != "prone" else 0.0
	back.visible = not (seated and in_car)
	# The gun is stowed while skydiving, on the parachute, healing or throwing
	if gun:
		gun.visible = ground and not healing and not throwing
	tree.advance(delta)

## Bends the spine up/down to follow where the soldier looks (after the clips are applied).
class AimBend extends SkeletonModifier3D:
	var pitch := 0.0
	var _smooth := 0.0
	var _ids := []
	func _process_modification() -> void:
		var sk := get_skeleton()
		if sk == null:
			return
		if _ids.is_empty():
			for n in ["mixamorig_Spine", "mixamorig_Spine1", "mixamorig_Spine2"]:
				_ids.append(sk.find_bone(n))
		_smooth = lerpf(_smooth, clampf(pitch, -1.1, 1.1), 0.25)
		if absf(_smooth) < 0.001:
			return
		for id in _ids:
			if id < 0:
				continue
			var q := sk.get_bone_pose_rotation(id)
			sk.set_bone_pose_rotation(id, q * Quaternion(Vector3.RIGHT, -_smooth / 3.0))
