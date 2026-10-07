extends SceneTree
## Turns the downloaded source art in assets_src/ (ignored by the editor, see .gdignore) into
## small game-ready scenes in assets/:
##   soldier  — Mixamo "Swat Guy" decimated to ~25k triangles, 1K textures, all rifle clips
##   guns     — Quaternius Ultimate Guns Pack + rocket launcher (CC0)
##   interior — Quaternius Ultimate House Interior Pack (CC0)
##   nature   — Quaternius Stylized Nature MegaKit (CC0)
##   vehicles — Quaternius Cars Bundle + a CC0 motorcycle
##   props    — backpacks, grenade
##   textures — Poly Haven CC0 photo textures (ground, walls, roofs, floors)
## Textures are re-encoded as embedded lossy WebP so nothing in the export points back at
## assets_src/. Run:  godot --headless --path . --script res://tools/build_assets.gd [-- only=soldier,guns,...]

const SRC := "res://assets_src/"

var only: Array = []

func _init() -> void:
	PortableCompressedTexture2D.set_keep_all_compressed_buffers(true)   # otherwise nothing gets saved outside the editor
	for a in OS.get_cmdline_user_args():
		if a.begins_with("only="):
			only = a.get_slice("=", 1).split(",")
	if _want("soldier"): _build_soldier()
	if _want("guns"): _build_folder("guns_quaternius", "res://assets/guns_q/", 0, true)
	if _want("guns"): _build_folder("extras", "res://assets/props/", 256, false)
	if _want("interior"): _build_folder("interior", "res://assets/interior/", 256, false)
	if _want("nature"): _build_folder("nature", "res://assets/megakit/", 512, false)
	if _want("vehicles"): _build_folder("cars", "res://assets/vehicles/", 256, false)
	if _want("textures"): _build_textures()
	quit()

func _want(what: String) -> bool:
	return only.is_empty() or only.has(what)

func _abs(p: String) -> String:
	return ProjectSettings.globalize_path(p)

# ── Shared helpers ────────────────────────────────────────────

func _set_owner(node: Node, owner: Node) -> void:
	for c in node.get_children():
		c.owner = owner
		_set_owner(c, owner)

func _shrink(tex: Texture2D, max_size: int, normal := false) -> Texture2D:
	if tex == null:
		return null
	var img := tex.get_image()
	if img == null:
		return null
	img = img.duplicate()
	if img.is_compressed():
		img.decompress()
	if max_size > 0 and maxi(img.get_width(), img.get_height()) > max_size:
		var s := float(max_size) / maxi(img.get_width(), img.get_height())
		img.resize(maxi(4, int(img.get_width() * s)), maxi(4, int(img.get_height() * s)), Image.INTERPOLATE_LANCZOS)
	img.generate_mipmaps()
	var out := PortableCompressedTexture2D.new()
	out.create_from_image(img, PortableCompressedTexture2D.COMPRESSION_MODE_LOSSY, normal, 0.82)
	return out

## Duplicate meshes/materials/skins so they are saved inside the scene, shrinking textures.
func _make_local(root: Node, tex_size: int) -> int:
	var tris := 0
	var mat_cache := {}
	for mi: MeshInstance3D in root.find_children("*", "MeshInstance3D", true, false):
		if mi.mesh == null:
			continue
		var mesh: Mesh = mi.mesh.duplicate(false)
		for s in mesh.get_surface_count():
			tris += _surface_tris(mesh, s)
			var mat := mesh.surface_get_material(s)
			if mat is BaseMaterial3D:
				if not mat_cache.has(mat):
					var m2: BaseMaterial3D = mat.duplicate(false)
					m2.albedo_texture = _shrink(m2.albedo_texture, tex_size)
					m2.normal_texture = _shrink(m2.normal_texture, tex_size / 2 if tex_size > 0 else 0, true)
					m2.emission_texture = _shrink(m2.emission_texture, 256)
					m2.roughness_texture = null
					m2.metallic_texture = null
					m2.ao_texture = null
					m2.ao_enabled = false
					mat_cache[mat] = m2
				mesh.surface_set_material(s, mat_cache[mat])
		mi.mesh = mesh
		if mi.skin:
			mi.skin = mi.skin.duplicate(false)
	return tris

func _surface_tris(mesh: Mesh, s: int) -> int:
	var a := mesh.surface_get_arrays(s)
	var idx: PackedInt32Array = a[Mesh.ARRAY_INDEX]
	return idx.size() / 3 if idx.size() > 0 else (a[Mesh.ARRAY_VERTEX] as PackedVector3Array).size() / 3

func _save(root: Node, path: String) -> int:
	DirAccess.make_dir_recursive_absolute(_abs(path.get_base_dir()))
	_set_owner(root, root)
	var packed := PackedScene.new()
	packed.pack(root)
	var err := ResourceSaver.save(packed, path, ResourceSaver.FLAG_COMPRESS)
	if err != OK:
		push_error("save failed %s %s" % [path, error_string(err)])
	return FileAccess.get_file_as_bytes(path).size()

func _load_gltf(path: String) -> Node3D:
	var doc := GLTFDocument.new()
	var st := GLTFState.new()
	if doc.append_from_file(_abs(path), st) != OK:
		push_error("cannot read " + path)
		return null
	return doc.generate_scene(st) as Node3D

func _load_fbx(path: String) -> Node3D:
	var doc := FBXDocument.new()
	var st := FBXState.new()
	if doc.append_from_file(_abs(path), st) != OK:
		push_error("cannot read " + path)
		return null
	return doc.generate_scene(st) as Node3D

func _aabb(root: Node3D) -> AABB:
	var box := AABB()
	var first := true
	for mi: MeshInstance3D in root.find_children("*", "MeshInstance3D", true, false):
		var t := _rel_transform(root, mi)
		var b := t * mi.get_aabb()
		box = b if first else box.merge(b)
		first = false
	return box

func _rel_transform(root: Node3D, n: Node3D) -> Transform3D:
	var t := Transform3D.IDENTITY
	var cur: Node = n
	while cur != null and cur != root:
		if cur is Node3D:
			t = (cur as Node3D).transform * t
		cur = cur.get_parent()
	return t

# ── Static models (guns, interior, nature, vehicles, props) ──

func _build_folder(sub: String, out_dir: String, tex_size: int, report: bool) -> void:
	var dir := SRC + sub + "/"
	var lines := []
	for f in DirAccess.get_files_at(dir):
		if not f.ends_with(".glb"):
			continue
		var root := _load_gltf(dir + f)
		if root == null:
			continue
		var tris := _make_local(root, tex_size)
		var name := f.get_basename().to_lower().replace(" ", "_").replace("-", "_")
		var box := _aabb(root)
		var bytes := _save(root, out_dir + name + ".scn")
		lines.append("%s tris=%d size=%s pos=%s bytes=%d" % [name, tris, box.size.snapped(Vector3.ONE * 0.01), box.position.snapped(Vector3.ONE * 0.01), bytes])
		root.free()
	print("BUILD %s -> %s (%d models)" % [sub, out_dir, lines.size()])
	if report or lines.size() < 20:
		for l in lines: print("  ", l)

# ── Soldier ──────────────────────────────────────────────────

const LOOPS := ["idle", "aim_idle", "walk", "walk_back", "strafe_l", "strafe_r", "run", "run_back", "sprint", "fire",
	"crouch_idle", "crouch_aim", "crouch_walk", "crouch_back", "crouch_strafe_l", "crouch_strafe_r", "prone_idle",
	"prone_fwd", "fall", "chute", "unarmed_idle", "unarmed_run", "drive"]
const TARGET_TRIS := 25000

func _build_soldier() -> void:
	var root := _load_fbx(SRC + "mixamo/swat_guy.fbx")
	root.name = "Soldier"
	var mi: MeshInstance3D = root.find_children("*", "MeshInstance3D", true, false)[0]
	var before := 0
	for s in mi.mesh.get_surface_count(): before += _surface_tris(mi.mesh, s)
	mi.mesh = _decimate(mi.mesh, TARGET_TRIS)
	var tris := _make_local(root, 1024)
	# Animations: one library with every clip, named by what it is used for
	var ap: AnimationPlayer = root.find_children("*", "AnimationPlayer", true, false)[0]
	for lib_name in ap.get_animation_library_list():
		ap.remove_animation_library(lib_name)
	var lib := AnimationLibrary.new()
	var dir := SRC + "mixamo/"
	var skel: Skeleton3D = root.find_children("*", "Skeleton3D", true, false)[0]
	for f in DirAccess.get_files_at(dir):
		if not f.begins_with("anim_") or not f.ends_with(".fbx"):
			continue
		var key := f.trim_prefix("anim_").get_basename()
		var src := _load_fbx(dir + f)
		var sap: AnimationPlayer = src.find_children("*", "AnimationPlayer", true, false)[0]
		var anim: Animation = null
		for n in sap.get_animation_list():
			var a := sap.get_animation(n)
			if anim == null or a.length > anim.length and a.get_track_count() > 3:
				anim = a
		anim = anim.duplicate(true)
		# Keep only tracks for bones the soldier has (paths match: same Mixamo rig)
		for t in range(anim.get_track_count() - 1, -1, -1):
			var p := String(anim.track_get_path(t))
			if not p.begins_with("Skeleton3D:") or skel.find_bone(p.get_slice(":", 1)) < 0:
				anim.remove_track(t)
		anim.loop_mode = Animation.LOOP_LINEAR if LOOPS.has(key) else Animation.LOOP_NONE
		lib.add_animation(key, anim)
		print("  clip %s %.2fs tracks=%d" % [key, anim.length, anim.get_track_count()])
		src.free()
	ap.add_animation_library("", lib)
	var box := _aabb(root)
	var bytes := _save(root, "res://assets/soldier/soldier.scn")
	print("BUILD soldier tris %d -> %d, height %.2f, bones %d, clips %d, bytes %d" % [before, tris, box.size.y, skel.get_bone_count(), lib.get_animation_list().size(), bytes])
	root.free()

## Simplify a skinned mesh with meshoptimizer (through ImporterMesh LODs) and keep the
## coarser levels as automatic distance LODs.
func _decimate(mesh: Mesh, target: int) -> ArrayMesh:
	var im := ImporterMesh.new()
	var total := 0
	for s in mesh.get_surface_count():
		im.add_surface(mesh.surface_get_primitive_type(s), mesh.surface_get_arrays(s), [], {}, mesh.surface_get_material(s), mesh.surface_get_name(s), mesh.surface_get_format(s))
		total += _surface_tris(mesh, s)
	im.generate_lods(25.0, 60.0, [])
	var ratio := float(target) / float(total)
	var out := ArrayMesh.new()
	for s in im.get_surface_count():
		var arrays := im.get_surface_arrays(s)
		var base_tris: int = (arrays[Mesh.ARRAY_INDEX] as PackedInt32Array).size() / 3
		var chosen := -1
		for l in im.get_surface_lod_count(s):
			var n := im.get_surface_lod_indices(s, l).size() / 3
			if n <= base_tris * ratio * 1.05:
				chosen = l
				break
		var lods := {}
		if chosen >= 0:
			arrays[Mesh.ARRAY_INDEX] = im.get_surface_lod_indices(s, chosen)
			for l in range(chosen + 1, im.get_surface_lod_count(s)):
				lods[im.get_surface_lod_size(s, l)] = im.get_surface_lod_indices(s, l)
		out.add_surface_from_arrays(im.get_surface_primitive_type(s), arrays, [], lods, im.get_surface_format(s))
		out.surface_set_material(out.get_surface_count() - 1, im.get_surface_material(s))
		out.surface_set_name(out.get_surface_count() - 1, im.get_surface_name(s))
	return out

# ── Photo textures ───────────────────────────────────────────

func _build_textures() -> void:
	var dir := SRC + "textures/"
	DirAccess.make_dir_recursive_absolute(_abs("res://assets/textures"))
	for f in DirAccess.get_files_at(dir):
		if not f.ends_with(".jpg"):
			continue
		var img := Image.load_from_file(_abs(dir + f))
		img.resize(512, 512, Image.INTERPOLATE_LANCZOS)
		img.generate_mipmaps()
		var tex := PortableCompressedTexture2D.new()
		tex.create_from_image(img, PortableCompressedTexture2D.COMPRESSION_MODE_LOSSY, false, 0.8)
		var out := "res://assets/textures/%s.res" % f.get_basename()
		ResourceSaver.save(tex, out, ResourceSaver.FLAG_COMPRESS)
		print("  texture %s %d bytes" % [out, FileAccess.get_file_as_bytes(out).size()])
