extends SceneTree
## Renders HUD / shop icons (transparent PNGs) for every gun and item into assets/icons/ and
## copies the gun icons to features/royale3d/icons/ for the web shop. Needs a window:
##   godot --path . --script res://tools/render_icons.gd

const OUT := "res://assets/icons/"
const WEB := "res://../../features/royale3d/icons/"
var vp: SubViewport
var cam: Camera3D
var holder: Node3D

func _init() -> void:
	_run.call_deferred()

func _setup() -> void:
	vp = SubViewport.new()
	vp.size = Vector2i(256, 128)
	vp.transparent_bg = true
	vp.own_world_3d = true
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(vp)
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_CLEAR_COLOR
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.85, 0.87, 0.9)
	e.ambient_light_energy = 0.9
	e.glow_enabled = true
	env.environment = e
	vp.add_child(env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-35, -60, 0)
	sun.light_energy = 1.3
	vp.add_child(sun)
	cam = Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	vp.add_child(cam)
	holder = Node3D.new()
	vp.add_child(holder)

func _frame_node(n: Node3D, side := true) -> void:
	for c in holder.get_children(): c.free()
	holder.add_child(n)
	var box := Items._bounds(n)
	var center := box.get_center()
	n.position = -center
	if side:
		# Look at the side of the gun (barrel pointing right)
		cam.position = Vector3(5, 0, 0)
		cam.rotation_degrees = Vector3(0, 90, 0)
		cam.size = maxf(box.size.z * 0.62, box.size.y * 1.25) * 1.05
	else:
		cam.position = Vector3(0.6, 0.6, 2.0).normalized() * 5.0
		cam.look_at(Vector3.ZERO)
		cam.size = box.get_longest_axis_size() * 1.15

func _save(name: String) -> void:
	await process_frame
	await process_frame
	await RenderingServer.frame_post_draw
	var img := vp.get_texture().get_image()
	img.save_png(ProjectSettings.globalize_path(OUT + name + ".png"))
	print("ICON ", name)

func _mat(c: Color, metal := 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.metallic = metal
	m.roughness = 0.5
	return m

func _box(parent: Node3D, size: Vector3, pos: Vector3, c: Color) -> void:
	var mi := MeshInstance3D.new()
	var b := BoxMesh.new()
	b.size = size
	b.material = _mat(c)
	mi.mesh = b
	mi.position = pos
	parent.add_child(mi)

func _cyl(parent: Node3D, r: float, h: float, pos: Vector3, c: Color, rot := Vector3.ZERO) -> void:
	var mi := MeshInstance3D.new()
	var m := CylinderMesh.new()
	m.top_radius = r
	m.bottom_radius = r
	m.height = h
	m.material = _mat(c, 0.3)
	mi.mesh = m
	mi.position = pos
	mi.rotation_degrees = rot
	parent.add_child(mi)

func _run() -> void:
	_setup()
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(OUT))
	for id in Items.GUNS:
		_frame_node(Items.gun_node(id))
		await _save(id)
	# Items
	var n := Node3D.new()
	_cyl(n, 0.3, 0.32, Vector3.ZERO, Color("f4f1ea"), Vector3(90, 0, 0)); _cyl(n, 0.12, 0.34, Vector3.ZERO, Color("d9d4c8"), Vector3(90, 0, 0))
	_frame_node(n, false); await _save("bandage")
	n = Node3D.new()
	_box(n, Vector3(0.8, 0.5, 0.25), Vector3.ZERO, Color("f2f2f2")); _box(n, Vector3(0.3, 0.08, 0.27), Vector3.ZERO, Color("d63031")); _box(n, Vector3(0.08, 0.3, 0.27), Vector3.ZERO, Color("d63031"))
	_frame_node(n, false); await _save("firstaid")
	n = Node3D.new()
	_box(n, Vector3(0.9, 0.6, 0.35), Vector3.ZERO, Color("2d9cdb")); _box(n, Vector3(0.36, 0.1, 0.37), Vector3.ZERO, Color("ffffff")); _box(n, Vector3(0.1, 0.36, 0.37), Vector3.ZERO, Color("ffffff")); _box(n, Vector3(0.3, 0.08, 0.1), Vector3(0, 0.34, 0), Color("1b6fa8"))
	_frame_node(n, false); await _save("medkit")
	n = Node3D.new()
	_cyl(n, 0.16, 0.5, Vector3.ZERO, Color("f2994a")); _cyl(n, 0.161, 0.12, Vector3(0, 0.05, 0), Color("ffffff")); _cyl(n, 0.12, 0.03, Vector3(0, 0.26, 0), Color("bdbdbd"))
	_frame_node(n, false); await _save("drink")
	_frame_node(load("res://assets/props/hand_grenade.scn").instantiate(), false); await _save("grenade")
	n = Node3D.new()
	_box(n, Vector3(0.7, 0.8, 0.25), Vector3.ZERO, Color("4b5b3a")); _box(n, Vector3(0.5, 0.5, 0.06), Vector3(0, 0.05, 0.14), Color("2f3a25")); _box(n, Vector3(0.18, 0.12, 0.08), Vector3(-0.2, -0.22, 0.17), Color("3a4630")); _box(n, Vector3(0.18, 0.12, 0.08), Vector3(0.2, -0.22, 0.17), Color("3a4630"))
	_frame_node(n, false); await _save("vest")
	n = Node3D.new()
	var mi := MeshInstance3D.new(); var sp := SphereMesh.new(); sp.radius = 0.4; sp.height = 0.5; sp.is_hemisphere = true; sp.material = _mat(Color("4b5b3a")); mi.mesh = sp; n.add_child(mi)
	_box(n, Vector3(0.84, 0.05, 0.84), Vector3(0, 0.01, 0), Color("3a4630"))
	_frame_node(n, false); await _save("helmet")
	for a in Items.AMMO:
		n = Node3D.new()
		_box(n, Vector3(0.6, 0.35, 0.35), Vector3.ZERO, Color("4a4a3a"))
		_box(n, Vector3(0.61, 0.1, 0.36), Vector3(0, 0.08, 0), Items.AMMO[a].color)
		_frame_node(n, false); await _save("ammo_" + a)
	# VIP skins (animated in the game; a still for the shop)
	for vid in Skins.VIP:
		var g := Items.gun_node(String(Skins.VIP[vid].gun), vid)
		_frame_node(g)
		for k in 20: await process_frame
		await _save(vid)
	# Web shop copies of the guns
	var web := ProjectSettings.globalize_path("res://").path_join("../../features/royale3d/icons").simplify_path()
	DirAccess.make_dir_recursive_absolute(web)
	for id in Items.GUNS.keys() + Skins.VIP.keys():
		DirAccess.copy_absolute(ProjectSettings.globalize_path(OUT + id + ".png"), web.path_join(id + ".png"))
	print("ICONS_DONE")
	quit()
