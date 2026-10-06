extends SceneTree
## Saves each KayKit character with only the animations the bots use, so the web build
## doesn't ship ~70 unused clips per character. Meshes, skins and animations are made local
## to the saved scene; the texture stays an external .png (imported textures can't be
## embedded), so assets/characters/*_texture.png must remain in the export.
## Run after changing characters:  godot --headless --path . --script res://tools/trim_characters.gd
const KEEP := ["Idle", "Running_A", "Walking_A", "2H_Ranged_Aiming", "2H_Ranged_Shoot", "2H_Ranged_Reload",
	"Death_A", "Jump_Idle", "Use_Item", "Unarmed_Melee_Attack_Punch_A", "Hit_A"]
const SRC := "res://assets/characters/"

func _set_owner(node: Node, owner: Node) -> void:
	for c in node.get_children():
		c.owner = owner
		_set_owner(c, owner)

func _texture_for(name: String) -> Texture2D:
	for f in DirAccess.get_files_at(SRC):
		if f.begins_with(name + "_") and f.ends_with("_texture.png"):
			return load(SRC + f)
	return null

func _init() -> void:
	for f in ["Barbarian", "Knight", "Rogue", "Rogue_Hooded", "Mage"]:
		var root: Node3D = load(SRC + "%s.glb" % f).instantiate()
		var tex := _texture_for(f)
		for mi: MeshInstance3D in root.find_children("*", "MeshInstance3D", true, false):
			if mi.mesh == null:
				continue
			var mesh: Mesh = mi.mesh.duplicate(false)
			for s in mesh.get_surface_count():
				var mat := mesh.surface_get_material(s)
				if mat is StandardMaterial3D:
					var m2: StandardMaterial3D = mat.duplicate(false)
					if tex: m2.albedo_texture = tex
					mesh.surface_set_material(s, m2)
			mi.mesh = mesh
			if mi.skin: mi.skin = mi.skin.duplicate(false)
		for ap: AnimationPlayer in root.find_children("*", "AnimationPlayer", true, false):
			for lib_name in ap.get_animation_library_list():
				var lib := ap.get_animation_library(lib_name).duplicate(true)
				for anim_name in lib.get_animation_list():
					if not KEEP.has(String(anim_name)):
						lib.remove_animation(anim_name)
				ap.remove_animation_library(lib_name)
				ap.add_animation_library(lib_name, lib)
		_set_owner(root, root)
		var packed := PackedScene.new()
		packed.pack(root)
		var out := "res://assets/characters_trim/%s.scn" % f
		var err := ResourceSaver.save(packed, out, ResourceSaver.FLAG_COMPRESS)
		print("trimmed %s -> %s (%s) deps=%s" % [f, out, error_string(err), ResourceLoader.get_dependencies(out)])
		root.free()
	quit()
