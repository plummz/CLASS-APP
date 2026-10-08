extends SceneTree
func _init() -> void:
	for dir in ["res://assets/megakit/", "res://assets/interior/", "res://assets/vehicles/", "res://assets/soldier/"]:
		var line := []
		for f in DirAccess.get_files_at(dir):
			if not f.ends_with(".scn"): continue
			var n: Node3D = load(dir + f).instantiate()
			var t := 0
			for mi: MeshInstance3D in n.find_children("*", "MeshInstance3D", true, false):
				for s in mi.mesh.get_surface_count():
					var a := mi.mesh.surface_get_arrays(s)
					var idx: PackedInt32Array = a[Mesh.ARRAY_INDEX]
					t += idx.size() / 3 if idx.size() > 0 else (a[Mesh.ARRAY_VERTEX] as PackedVector3Array).size() / 3
			line.append("%s=%d" % [f.get_basename(), t])
			n.free()
		print(dir, " ", " ".join(line))
	quit()
