extends SceneTree
## Renders the soldier in every stance / action with a rifle and saves screenshots, to check
## the rig, the gun grip, T-poses and foot placement. Needs a window (not --headless):
##   godot --path . --script res://tools/preview_soldier.gd -- out=C:/tmp/shots [gun=m416] [outfit=woodland] [skin=lava]

var out := "user://preview"
var gun := "m416"
var outfit := "standard"
var skin := ""
var cam: Camera3D
var soldiers: Array = []

func _init() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("out="): out = a.get_slice("=", 1)
		if a.begins_with("gun="): gun = a.get_slice("=", 1)
		if a.begins_with("outfit="): outfit = a.get_slice("=", 1)
		if a.begins_with("skin="): skin = a.get_slice("=", 1)
		if a.begins_with("rot="): var v := a.get_slice("=", 1).split_floats(","); RoyaleSoldier.gun_rot_deg = Vector3(v[0], v[1], v[2])
		if a.begins_with("pos="): var w := a.get_slice("=", 1).split_floats(","); RoyaleSoldier.gun_pos = Vector3(w[0], w[1], w[2])
	DirAccess.make_dir_recursive_absolute(out)
	root.size = Vector2i(1280, 720)
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color("9fb6c8")
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.8, 0.82, 0.85)
	e.ambient_light_energy = 0.6
	env.environment = e
	root.add_child(env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-50, 30, 0)
	sun.shadow_enabled = true
	root.add_child(sun)
	var ground := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(60, 60)
	var gm := StandardMaterial3D.new()
	gm.albedo_color = Color("6f8f5a")
	pm.material = gm
	ground.mesh = pm
	root.add_child(ground)
	cam = Camera3D.new()
	root.add_child(cam)
	_run.call_deferred()

func _spawn(x: float, setup: Callable) -> RoyaleSoldier:
	var s := RoyaleSoldier.new()
	root.add_child(s)
	s.position = Vector3(x, 0, 0)
	s.set_gun(gun, skin)
	s.set_outfit(outfit)
	setup.call(s)
	soldiers.append(s)
	return s

func _frames(n: int) -> void:
	for i in n:
		await process_frame

func _shot(name: String) -> void:
	await _frames(3)
	var img := root.get_texture().get_image()
	img.save_png(out.path_join(name + ".png"))
	print("PREVIEW ", name)

func _clear() -> void:
	for s in soldiers: s.queue_free()
	soldiers.clear()

func _run() -> void:
	await _frames(5)
	# Row 1: standing set (idle, aim, fire, reload) seen from the front-right
	var poses := [
		["idle", func(s): pass],
		["aim", func(s): s.aiming = true],
		["fire", func(s): s.aiming = true; s.firing = true],
		["reload", func(s): s.reloading = true],
		["crouch", func(s): s.stance = "crouch"; s.aiming = true],
		["prone", func(s): s.stance = "prone"],
	]
	for i in poses.size():
		_spawn(-5.0 + i * 2.0, poses[i][1])
	cam.position = Vector3(0.0, 1.5, 6.5)
	cam.look_at(Vector3(0, 0.9, 0))
	await _frames(40)
	await _shot("stances_front")
	cam.position = Vector3(6.5, 1.5, 0.5)
	cam.look_at(Vector3(0, 0.9, 0))
	await _shot("stances_side")
	# Close-up of the rifle grip
	cam.position = Vector3(-2.6, 1.5, 1.6)
	cam.look_at(Vector3(-3.0, 1.2, 0))
	await _shot("grip_aim_closeup")
	_clear()
	# Movement: run forward / strafe / walk back by actually moving the soldiers
	var movers := []
	for i in 4:
		movers.append(_spawn(-3.0 + i * 2.0, func(s): pass))
	var dirs := [Vector3(0, 0, 1) * 4.4, Vector3(-1, 0, 0) * 2.0, Vector3(0, 0, -1) * 1.5, Vector3(0, 0, 1) * 6.4]
	cam.position = Vector3(0.0, 1.6, 7.0)
	for f in 50:
		for i in 4:
			movers[i].position += dirs[i] * (1.0 / 60.0)
		cam.look_at(Vector3(0, 0.9, movers[0].position.z))
		await process_frame
	await _shot("moving_run_strafe_back_sprint")
	_clear()
	# Air and death
	_spawn(-3.0, func(s): s.state = "freefall")
	_spawn(0.0, func(s): s.state = "parachute")
	var d := _spawn(3.0, func(s): pass)
	d.die()
	cam.position = Vector3(0.0, 2.0, 7.0)
	cam.look_at(Vector3(0, 0.8, 0))
	await _frames(120)
	await _shot("fall_chute_death")
	_clear()
	_spawn(0.0, func(s): s.has_gun = false)
	soldiers[0].set_gun("")
	_spawn(-2.0, func(s): s.healing = true)
	_spawn(2.0, func(s): s.throwing = true)
	cam.position = Vector3(0.0, 1.6, 5.0)
	cam.look_at(Vector3(0, 0.9, 0))
	await _frames(40)
	await _shot("unarmed_heal_throw")
	quit()
