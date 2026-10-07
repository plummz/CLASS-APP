class_name RoyaleBuildings
extends RefCounted
## Walk-in buildings for the island: houses (1-2 floors), shops, warehouses, barns and
## apartments. Each has gabled or flat roofs, framed windows with glass, a plinth band, door
## frames, a porch, interior walls dividing rooms, stairs with visible steps, and furniture
## placed by room type (Kenney Furniture Kit, CC0). Furniture is batched into MultiMeshes by
## the world and only drawn within ~70 m, so phones stay smooth.

const FURN := "res://assets/furniture/"
const FURN_SCALE := 1.9          ## Kenney furniture is ~half real size
const TRIM := Color("f2efe8")
const PLINTH := Color("6b6560")
const FRAME := Color("e9e4da")
const STAIR := Color("8a6a4a")
const TILE := Color(0.85, 0.87, 0.88, RoyaleMaterials.TILES)
const WOOD_FLOOR := Color(0.6, 0.46, 0.31, RoyaleMaterials.WOOD)
const CONCRETE_FLOOR := Color(0.43, 0.44, 0.42, RoyaleMaterials.CONCRETE)
const INTERIOR := "res://assets/interior/"
## Kenney furniture -> Quaternius Ultimate House Interior Pack (CC0); fitted to the Kenney
## piece's footprint so room layouts stay the same. Anything unmapped keeps the Kenney model.
const QUATERNIUS := {
	"rugRectangle": "rug", "rugRound": "round_rug", "rugDoormat": "rug",
	"cabinetTelevision": "drawer_2", "tableCoffee": "table_round_small", "tableCoffeeGlass": "table_round_small_2",
	"loungeSofa": "couch_medium", "loungeDesignSofa": "couch_large", "loungeChair": "couch_small_2",
	"bookcaseOpen": "shelf_large", "bookcaseClosedWide": "drawer_4", "pottedPlant": "houseplant_3",
	"plantSmall1": "houseplant_5", "lampRoundFloor": "light_floor_2", "lampRoundTable": "table_lamp",
	"ceilingFan": "light_chandelier", "kitchenFridgeLarge": "kitchen_fridge", "kitchenStove": "oven",
	"kitchenSink": "kitchen_sink", "kitchenCabinet": "drawer_3", "table": "table_round_large",
	"tableCloth": "table_round_large", "chairCushion": "chair", "chairDesk": "chair_2", "trashcan": "trashcan_2",
	"bedDouble": "bed_king", "bedSingle": "bed_single", "bedBunk": "bunk_bed", "cabinetBedDrawerTable": "night_stand",
	"toilet": "toilet", "bathroomSink": "bathroom_sink", "bathtub": "bathtub", "washer": "washing_machine",
}

var world: Node   ## RoyaleWorld
var rng: RandomNumberGenerator
var _aabb_cache := {}
var _glass_mat: StandardMaterial3D

func _init(world_ref: Node, rng_ref: RandomNumberGenerator) -> void:
	world = world_ref
	rng = rng_ref

# ── Public builders ──────────────────────────────────────────

## kind: "house", "shop", "warehouse", "barn", "apartment"
func build(kind: String, origin: Vector3, yaw: float, tier: int, wall_color: Color, roof_color: Color) -> void:
	match kind:
		"shop": _build(origin, yaw, 12.0, 10.0, 1, wall_color, roof_color, tier, "shop")
		"warehouse": _build(origin, yaw, 14.0, 20.0, 1, Color("8d9188"), Color("4b524a"), 2, "warehouse")
		"barn": _build(origin, yaw, 12.0, 16.0, 1, Color("a33b2e"), Color("5a3a2a"), tier, "barn")
		"apartment": _build(origin, yaw, 12.0, 12.0, 3, wall_color, roof_color, tier, "apartment")
		_:
			var w: float = [8.0, 10.0, 12.0][rng.randi_range(0, 2)]
			var d: float = [10.0, 12.0][rng.randi_range(0, 1)]
			var floors := 2 if rng.randf() < 0.35 else 1
			_build(origin, yaw, w, d, floors, wall_color, roof_color, tier, "house")

# ── Core ─────────────────────────────────────────────────────

func _build(origin: Vector3, yaw: float, w: float, d: float, floors: int, wall_color: Color, roof_color: Color, tier: int, kind: String) -> void:
	var node := Node3D.new()
	node.position = origin
	node.rotation.y = yaw
	world.add_child(node)
	var body := StaticBody3D.new()
	body.collision_layer = 1
	node.add_child(body)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var glass := SurfaceTool.new()
	glass.begin(Mesh.PRIMITIVE_TRIANGLES)
	var hw := w * 0.5
	var hd := d * 0.5
	var ft: float = world.FLOOR_TOP
	var storey: float = world.STOREY
	var big := kind in ["warehouse", "barn"]
	var height := storey if not big else 5.5
	var door_w := 1.5 if not big else 4.0
	var door_h := 2.3 if not big else 3.8
	var stairs := floors >= 2
	var stair_w := 1.4
	var floor_col := WOOD_FLOOR if not big else CONCRETE_FLOOR

	# Floor slab level with the ground, and a plinth band around the outside
	world._box(st, body, Vector3(0, ft - 0.2, 0), Vector3(w, 0.4, d), floor_col)
	_box_vis(st, Vector3(0, ft + 0.2, -hd - 0.03), Vector3(w + 0.06, 0.4, 0.06), PLINTH)
	_box_vis(st, Vector3(0, ft + 0.2, hd + 0.03), Vector3(w + 0.06, 0.4, 0.06), PLINTH)
	_box_vis(st, Vector3(-hw - 0.03, ft + 0.2, 0), Vector3(0.06, 0.4, d), PLINTH)
	_box_vis(st, Vector3(hw + 0.03, ft + 0.2, 0), Vector3(0.06, 0.4, d), PLINTH)

	for f in floors:
		var by := ft + f * storey
		var win := 1.2
		# Window positions along each wall (avoid the door and the stair strip)
		var front: Array = []
		var back: Array = []
		if f == 0:
			front.append([hw, door_w, 0.0, door_h])
			if w >= 10.0: front.append([w * 0.18, win, 1.0, 2.1]); front.append([w * 0.82, win, 1.0, 2.1])
			if d >= 10.0 or big: back.append([w * 0.7, door_w if big else 1.4, 0.0, door_h if big else 2.3])
			back.append([w * 0.25, win, 1.0, 2.1])
		else:
			front = [[w * 0.3, win, 1.0, 2.1], [w * 0.7, win, 1.0, 2.1]]
			back = [[w * 0.3, win, 1.0, 2.1], [w * 0.7, win, 1.0, 2.1]]
		var sides: Array = [[d * 0.3, win, 1.0, 2.1], [d * 0.72, win, 1.0, 2.1]] if not big else [[d * 0.25, 2.2, 2.4, 3.8], [d * 0.75, 2.2, 2.4, 3.8]]
		var right_sides: Array = sides if not stairs else [[d * 0.3, win, 1.0, 2.1]]
		var hgt := height if f == 0 or not big else height
		world._wall(st, body, Vector3(-hw, 0, -hd), Vector3(hw, 0, -hd), by, hgt, front, wall_color)
		world._wall(st, body, Vector3(-hw, 0, hd), Vector3(hw, 0, hd), by, hgt, back, wall_color)
		world._wall(st, body, Vector3(-hw, 0, -hd), Vector3(-hw, 0, hd), by, hgt, sides, wall_color)
		world._wall(st, body, Vector3(hw, 0, -hd), Vector3(hw, 0, hd), by, hgt, right_sides, wall_color)
		# Frames and glass on the windows, frames on the doors
		_dress_openings(st, glass, Vector3(-hw, 0, -hd), Vector3(hw, 0, -hd), by, front, -1.0)
		_dress_openings(st, glass, Vector3(-hw, 0, hd), Vector3(hw, 0, hd), by, back, 1.0)
		_dress_openings(st, glass, Vector3(-hw, 0, -hd), Vector3(-hw, 0, hd), by, sides, -1.0)
		_dress_openings(st, glass, Vector3(hw, 0, -hd), Vector3(hw, 0, hd), by, right_sides, 1.0)
		# Floor between storeys (with a hole for the stairs)
		if f > 0:
			var slab := by - 0.1
			world._box(st, body, Vector3(-stair_w * 0.5, slab, 0), Vector3(w - stair_w, 0.2, d), floor_col)
			world._box(st, body, Vector3(hw - stair_w * 0.5, slab, -hd + 1.0), Vector3(stair_w, 0.2, 2.0), floor_col)
		# Rooms and furniture
		_furnish_floor(node, body, st, kind, f, floors, w, d, by, stairs, stair_w, tier)

	# Stairs: an invisible ramp you walk on, drawn as steps
	if stairs:
		for f in range(1, floors):
			_stairs(st, body, hw - stair_w * 0.5, ft + (f - 1) * storey, d, stair_w, storey)

	# Roof
	var top := ft + floors * storey if not big else ft + height
	if kind in ["house", "barn"]:
		_gable_roof(st, body, w, d, top, roof_color, wall_color, kind == "barn")
		if kind == "house":
			_box_vis(st, Vector3(-hw * 0.5, top + 1.6, hd * 0.3), Vector3(0.7, 2.0, 0.7), Color("8a5a48"))  # chimney
	else:
		world._box(st, body, Vector3(0, top + 0.12, 0), Vector3(w + 0.5, 0.25, d + 0.5), Color(roof_color, RoyaleMaterials.CONCRETE))
		_box_vis(st, Vector3(0, top + 0.45, -hd - 0.2), Vector3(w + 0.5, 0.45, 0.1), roof_color.lightened(0.15))
		_box_vis(st, Vector3(0, top + 0.45, hd + 0.2), Vector3(w + 0.5, 0.45, 0.1), roof_color.lightened(0.15))
		if kind == "shop":
			# Awning and sign over the shop front
			_box_vis(st, Vector3(0, ft + 2.75, -hd - 0.9), Vector3(w * 0.8, 0.12, 1.8), Color("d9534f"))
			_box_vis(st, Vector3(0, ft + 3.45, -hd - 0.15), Vector3(w * 0.6, 0.7, 0.12), Color("2f6f9f"))

	# Porch: a low deck, two posts and a small roof (houses only)
	if kind == "house":
		_box_vis(st, Vector3(0, ft - 0.02, -hd - 1.1), Vector3(3.2, 0.1, 2.2), Color("8a6a4a"))
		for px in [-1.45, 1.45]:
			world._box(st, body, Vector3(px, ft + 1.35, -hd - 2.05), Vector3(0.14, 2.7, 0.14), TRIM)
		_box_vis(st, Vector3(0, ft + 2.75, -hd - 1.1), Vector3(3.4, 0.12, 2.4), roof_color)

	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	mi.material_override = RoyaleMaterials.building_material()
	node.add_child(mi)
	var gmi := MeshInstance3D.new()
	gmi.mesh = glass.commit()
	gmi.material_override = _glass_material()
	gmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	node.add_child(gmi)

	# Doors (warehouses and barns keep big open bays)
	if not big:
		world._add_door(node, Vector3(0, ft, -hd), door_w, door_h, 1.0)
		if d >= 10.0:
			world._add_door(node, Vector3(w * 0.7 - hw, ft, hd), 1.4, 2.3, -1.0)
	world.houses.append({"node": node, "w": w, "d": d, "door_out": node.to_global(Vector3(0, ft, -hd - 2.5)), "door_in": node.to_global(Vector3(0, ft, -hd + 1.5))})

# ── Rooms and furniture ──────────────────────────────────────

## Splits a floor into rooms (interior walls with doorways) and furnishes each one.
func _furnish_floor(node: Node3D, body: StaticBody3D, st: SurfaceTool, kind: String, f: int, floors: int, w: float, d: float, by: float, stairs: bool, stair_w: float, tier: int) -> void:
	var hw := w * 0.5
	var hd := d * 0.5
	var inner_r := hw - (stair_w + 0.1 if stairs else 0.0)   # rooms stop at the stair strip
	var wall_col := Color("efe9df")
	var door_out := node.to_global(Vector3(0, by, -hd - 1.6))
	var door_in := node.to_global(Vector3(0, by, -hd + 1.4))
	var up_path: Array = []
	if f > 0:
		up_path = [node.to_global(Vector3(hw - stair_w * 0.5, world.FLOOR_TOP, hd - 1.0)), node.to_global(Vector3(hw - stair_w * 0.5, by, -hd + 1.4))]
	match kind:
		"shop":
			_room(node, body, "shop", Rect2(-hw, -hd, w, d), by, tier, [door_out, door_in])
		"warehouse", "barn":
			_room(node, body, kind, Rect2(-hw, -hd, w, d), by, tier, [door_out, door_in])
		_:
			# Front room / back rooms split by a wall at z = split, with a doorway in the middle
			var split := 0.4
			var height: float = world.STOREY
			world._wall(st, body, Vector3(-hw + 0.13, 0, split), Vector3(inner_r, 0, split), by, height, [[(inner_r + hw - 0.13) * 0.5, 1.1, 0.0, 2.25]], wall_col)
			var mid_x := (-hw + inner_r) * 0.5
			var through := node.to_global(Vector3(mid_x, by, split))
			var base_path: Array = [door_out, door_in] if f == 0 else [door_out, door_in] + up_path
			# Back area split left / right
			var back_split := -hw + (inner_r + hw) * 0.55
			world._wall(st, body, Vector3(back_split, 0, split), Vector3(back_split, 0, hd - 0.13), by, height, [[(hd - split) * 0.5, 1.0, 0.0, 2.25]], wall_col)
			var front_room := Rect2(-hw, -hd, inner_r + hw, hd + split)
			var back_left := Rect2(-hw, split, back_split + hw, hd - split)
			var back_right := Rect2(back_split, split, inner_r - back_split, hd - split)
			var types: Array
			if f == 0:
				types = ["living", "kitchen", "bath" if d < 12.0 and floors == 1 else "bedroom"]
				if floors > 1: types = ["living", "kitchen", "bath"]
			else:
				types = ["bedroom", "bedroom", "bath"]
			if kind == "apartment" and f > 0:
				types = ["living", "bedroom", "kitchen"] if f % 2 == 1 else ["bedroom", "bath", "living"]
			_room(node, body, types[0], front_room, by, tier, base_path)
			_room(node, body, types[1], back_left, by, tier, base_path + [through])
			var side_door := node.to_global(Vector3(back_split, by, (split + hd) * 0.5))
			_room(node, body, types[2], back_right, by, tier, base_path + [through, side_door])

## Furnishes one room and adds a loot spot near its middle (reachable, off the furniture).
func _room(node: Node3D, body: StaticBody3D, type: String, r: Rect2, by: float, tier: int, path: Array) -> void:
	var x0 := r.position.x + 0.2
	var z0 := r.position.y + 0.2
	var x1 := r.end.x - 0.2
	var z1 := r.end.y - 0.2
	var cx := (x0 + x1) * 0.5
	var cz := (z0 + z1) * 0.5
	match type:
		"living":
			# TV on the left wall, sofa facing it from the right: the front door and the
			# doorway to the back rooms (both in the middle of their walls) stay clear.
			var lx := x0 + (x1 - x0) * 0.3
			_furn(node, body, "rugRectangle", Vector3(lx + 0.6, by, cz), PI * 0.5, false)
			_furn(node, body, "cabinetTelevision", Vector3(x0 + 0.3, by, cz), PI * 0.5)
			_furn(node, body, ["televisionModern", "televisionVintage"][rng.randi_range(0, 1)], Vector3(x0 + 0.3, by + 0.6, cz), PI * 0.5, false)
			_furn(node, body, ["tableCoffee", "tableCoffeeGlass"][rng.randi_range(0, 1)], Vector3(lx + 0.5, by, cz), PI * 0.5)
			_furn(node, body, ["loungeSofa", "loungeDesignSofa"][rng.randi_range(0, 1)], Vector3(lx + 1.7, by, cz), -PI * 0.5)
			_furn(node, body, "bookcaseOpen", Vector3(x0 + 0.3, by, z1 - 0.6), PI * 0.5)
			_furn(node, body, "books", Vector3(x0 + 0.3, by + 0.95, z1 - 0.6), PI * 0.5, false)
			_furn(node, body, "pottedPlant", Vector3(x1 - 0.35, by, z0 + 0.35), 0.0)
			_furn(node, body, "lampRoundFloor", Vector3(x0 + 0.35, by, z0 + 0.35), 0.0, false)
			if r.size.x > 5.0: _furn(node, body, "loungeChair", Vector3(x1 - 0.7, by, z1 - 0.7), PI * 0.75)
			_furn(node, body, "ceilingFan", Vector3(cx, by + world.STOREY - 0.05, cz), 0.0, false)
		"kitchen":
			var n := int((x1 - x0) / 0.85)
			for i in mini(n, 5):
				var px := x0 + 0.42 + i * 0.82
				var model: String = ["kitchenCabinet", "kitchenSink", "kitchenStove", "kitchenCabinetDrawer", "kitchenCabinet"][i]
				_furn(node, body, model, Vector3(px, by, z1 - 0.42), PI)
				_furn(node, body, "kitchenCabinetUpper", Vector3(px, by + 1.5, z1 - 0.21), PI, false)
			_furn(node, body, "kitchenFridgeLarge", Vector3(x1 - 0.5, by, z0 + 0.5), -PI * 0.5)
			_furn(node, body, "kitchenMicrowave", Vector3(x0 + 0.42, by + 0.86, z1 - 0.42), PI, false)
			_furn(node, body, ["table", "tableCloth"][rng.randi_range(0, 1)], Vector3(cx, by, cz - 0.2), 0.0)
			for side in [-1.0, 1.0]:
				_furn(node, body, "chairCushion", Vector3(cx + side * 0.55, by, cz - 0.2 - 0.6), 0.0, false)
				_furn(node, body, "chairCushion", Vector3(cx + side * 0.55, by, cz - 0.2 + 0.6), PI, false)
			_furn(node, body, "trashcan", Vector3(x0 + 0.3, by, z0 + 0.3), 0.0, false)
		"bedroom":
			_furn(node, body, "rugRound", Vector3(cx, by, cz), 0.0, false)
			_furn(node, body, ["bedDouble", "bedSingle", "bedBunk"][rng.randi_range(0, 2)], Vector3(cx, by, z1 - 1.1), PI)
			_furn(node, body, "cabinetBedDrawerTable", Vector3(cx - 1.25, by, z1 - 0.3), PI)
			_furn(node, body, "lampRoundTable", Vector3(cx - 1.25, by + 0.5, z1 - 0.3), PI, false)
			_furn(node, body, "bookcaseClosedWide", Vector3(x0 + 0.3, by, cz - 0.3), PI * 0.5)
			if r.size.x > 3.5:
				_furn(node, body, "desk", Vector3(x1 - 0.45, by, z0 + 0.8), -PI * 0.5)
				_furn(node, body, ["laptop", "computerScreen"][rng.randi_range(0, 1)], Vector3(x1 - 0.45, by + 0.72, z0 + 0.8), -PI * 0.5, false)
				_furn(node, body, "chairDesk", Vector3(x1 - 1.05, by, z0 + 0.8), PI * 0.5, false)
			_furn(node, body, "plantSmall1", Vector3(x0 + 0.3, by + 1.5, cz - 0.3), 0.0, false)
		"bath":
			_furn(node, body, "toilet", Vector3(x0 + 0.35, by, z1 - 0.45), PI)
			_furn(node, body, "bathroomSink", Vector3(cx, by + 0.76, z1 - 0.3), PI, false)
			_furn(node, body, "bathroomMirror", Vector3(cx, by + 1.35, z1 - 0.12), PI, false)
			if r.size.x > 2.6:
				_furn(node, body, "bathtub", Vector3(x1 - 1.15, by, z0 + 0.6), 0.0)
			else:
				_furn(node, body, "shower", Vector3(x1 - 0.6, by, z0 + 0.6), 0.0)
			_furn(node, body, "washer", Vector3(x1 - 0.4, by, z1 - 0.4), PI)
		"shop":
			_furn(node, body, "rugDoormat", Vector3(0, by, r.position.y + 1.0), 0.0, false)
			for row in 3:
				var zz := z0 + 2.5 + row * 2.2
				for col in 3:
					_furn(node, body, "bookcaseOpen", Vector3(x0 + 1.5 + col * 2.3, by, zz), 0.0)
					_furn(node, body, "cardboardBoxClosed", Vector3(x0 + 1.5 + col * 2.3, by + 0.95, zz), 0.0, false)
			_furn(node, body, "kitchenBar", Vector3(x1 - 1.4, by, z0 + 1.6), PI * 0.5)
			_furn(node, body, "kitchenBar", Vector3(x1 - 1.4, by, z0 + 2.5), PI * 0.5)
			_furn(node, body, "computerScreen", Vector3(x1 - 1.4, by + 0.8, z0 + 2.0), -PI * 0.5, false)
			_furn(node, body, "kitchenFridgeLarge", Vector3(x1 - 0.5, by, z1 - 0.5), PI)
			_furn(node, body, "kitchenFridgeLarge", Vector3(x1 - 1.6, by, z1 - 0.5), PI)
		"warehouse", "barn":
			for i in 7:
				var px := rng.randf_range(x0 + 1.0, x1 - 1.0)
				var pz := rng.randf_range(z0 + 3.0, z1 - 1.0)
				var stack := rng.randi_range(1, 3)
				for s in stack:
					_furn(node, body, "cardboardBoxClosed", Vector3(px, by + s * 0.53, pz), rng.randf() * 0.4, s == 0)
			for i in 3:
				_furn(node, body, "bookcaseClosedWide", Vector3(x0 + 0.3, by, z0 + 3.0 + i * 3.5), PI * 0.5)
	# Loot near the middle of the room (on the rug area, reachable)
	var spot := Vector3(cx + rng.randf_range(-0.4, 0.4), by + 0.05, cz + rng.randf_range(-0.6, -0.1))
	var spots := 0 if type == "bath" else 1
	for i in spots:
		var p := node.to_global(spot + Vector3(i * 0.7, 0, 0))
		var typed: Array[Vector3] = []
		for q in path: typed.append(q)
		world._add_loot_point(p, tier, typed)

## Places a furniture model (batched) with optional collision from its bounds.
func _furn(node: Node3D, body: StaticBody3D, model: String, local_pos: Vector3, yaw: float, collide := true) -> void:
	var path := FURN + model + ".glb"
	var scale_v := FURN_SCALE
	var box := _model_aabb(path)
	if QUATERNIUS.has(model):
		var q_path := INTERIOR + String(QUATERNIUS[model]) + ".scn"
		var q_box := _model_aabb(q_path)
		if q_box.size != Vector3.ZERO and box.size != Vector3.ZERO:
			# Same footprint as the Kenney piece (largest horizontal side), but never taller
			# than ~1.25x its height so ceiling lights and shelves still fit
			var want := maxf(box.size.x, box.size.z) * FURN_SCALE
			var s := want / maxf(0.01, maxf(q_box.size.x, q_box.size.z))
			if box.size.y > 0.05:
				s = minf(s, box.size.y * FURN_SCALE * 1.25 / maxf(0.01, q_box.size.y))
			path = q_path
			scale_v = s
			box = q_box
	var tf := node.global_transform * Transform3D(Basis(Vector3.UP, yaw).scaled(Vector3.ONE * scale_v), local_pos)
	world.add_model_instance(path, tf, 64.0, 70.0)
	if not collide:
		return
	if box.size == Vector3.ZERO:
		return
	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = box.size * scale_v
	cs.shape = shape
	var basis := Basis(Vector3.UP, yaw)
	cs.transform = Transform3D(basis, local_pos + basis * (box.get_center() * scale_v))
	body.add_child(cs)

func _model_aabb(path: String) -> AABB:
	if _aabb_cache.has(path):
		return _aabb_cache[path]
	var scene: PackedScene = world._load_scene(path)
	var box := AABB()
	if scene:
		var inst: Node3D = scene.instantiate()
		var first := true
		for m: MeshInstance3D in inst.find_children("*", "MeshInstance3D", true, false):
			var b: AABB = world._relative_transform(inst, m) * m.get_aabb()
			box = b if first else box.merge(b)
			first = false
		inst.free()
	_aabb_cache[path] = box
	return box

# ── Geometry helpers ─────────────────────────────────────────

func _box_vis(st: SurfaceTool, center: Vector3, size: Vector3, color: Color, basis := Basis.IDENTITY) -> void:
	world._box(st, null, center, size, color, false, basis)

## White frames around every opening and a glass pane in windows (bottom > 0).
func _dress_openings(st: SurfaceTool, glass: SurfaceTool, a: Vector3, b: Vector3, by: float, openings: Array, outward: float) -> void:
	var dir := (b - a).normalized()
	var along_x := absf(dir.x) > 0.5
	var normal := Vector3(0, 0, outward) if along_x else Vector3(outward, 0, 0)
	var t := 0.1
	for op in openings:
		var c := a + dir * float(op[0])
		var wdt := float(op[1])
		var y0 := by + float(op[2])
		var y1 := by + float(op[3])
		var out: Vector3 = normal * (world.WALL_T * 0.5 + 0.02)
		var side_size := Vector3(t, y1 - y0, 0.06) if along_x else Vector3(0.06, y1 - y0, t)
		var top_size := Vector3(wdt + 2 * t, t, 0.06) if along_x else Vector3(0.06, t, wdt + 2 * t)
		for s in [-1.0, 1.0]:
			_box_vis(st, c + dir * (s * (wdt * 0.5 + t * 0.5)) + Vector3(0, (y0 + y1) * 0.5, 0) + out, side_size, FRAME)
		_box_vis(st, c + Vector3(0, y1 + t * 0.5, 0) + out, top_size, FRAME)
		if float(op[2]) > 0.0:
			_box_vis(st, c + Vector3(0, y0 - t * 0.5, 0) + out * 1.6, Vector3(wdt + 0.3, t, 0.16) if along_x else Vector3(0.16, t, wdt + 0.3), FRAME)
			# Glass pane in the middle of the wall
			var gsize := Vector3(wdt, y1 - y0, 0.02) if along_x else Vector3(0.02, y1 - y0, wdt)
			world._box(glass, null, c + Vector3(0, (y0 + y1) * 0.5, 0), gsize, Color(0.7, 0.85, 0.95), false)
			# Centre mullion
			_box_vis(st, c + Vector3(0, (y0 + y1) * 0.5, 0) + out * 0.5, Vector3(0.05, y1 - y0, 0.05), FRAME)

## Walkable ramp (invisible) drawn as steps, rising from the back toward the front.
func _stairs(st: SurfaceTool, body: StaticBody3D, x: float, base_y: float, d: float, width: float, rise: float) -> void:
	var hd := d * 0.5
	var run := d - 3.2
	var z_bottom := hd - 1.2
	var angle := atan2(rise, run)
	var length := sqrt(run * run + rise * rise)
	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(width - 0.2, 0.1, length)
	cs.shape = shape
	cs.transform = Transform3D(Basis(Vector3.RIGHT, angle), Vector3(x, base_y + rise * 0.5, z_bottom - run * 0.5))
	body.add_child(cs)
	var steps := int(rise / 0.2)
	for i in steps:
		var h := (i + 1) * rise / steps
		var z := z_bottom - (i + 0.5) * run / steps
		_box_vis(st, Vector3(x, base_y + h * 0.5, z), Vector3(width - 0.2, h, run / steps), STAIR.darkened(0.05 * (i % 2)))
	# Railing
	_box_vis(st, Vector3(x - width * 0.5 + 0.08, base_y + rise * 0.5 + 0.9, z_bottom - run * 0.5), Vector3(0.06, 0.06, length), TRIM, Basis(Vector3.RIGHT, angle))

## Gable roof with the ridge along X, eaves overhang and triangle end walls.
func _gable_roof(st: SurfaceTool, body: StaticBody3D, w: float, d: float, top: float, roof_color: Color, wall_color: Color, steep: bool) -> void:
	var hw := w * 0.5
	var hd := d * 0.5
	var ov := 0.5
	var a := deg_to_rad(40.0 if steep else 30.0)
	var span := hd + ov
	var rise := span * tan(a)
	var slope_len := span / cos(a)
	for s in [-1.0, 1.0]:
		var center := Vector3(0, top + rise * 0.5 - ov * tan(a) * 0.5, s * span * 0.5)
		world._box(st, body, center, Vector3(w + ov * 2.0, 0.16, slope_len), Color(roof_color, RoyaleMaterials.ROOF), true, Basis(Vector3.RIGHT, a * s))
	# Gable triangles (both windings so they show from inside and outside)
	var peak := top + hd * tan(a)
	for sx in [-1.0, 1.0]:
		var p0 := Vector3(sx * hw, top, -hd)
		var p1 := Vector3(sx * hw, top, hd)
		var p2 := Vector3(sx * hw, peak, 0)
		for tri in [[p0, p1, p2], [p0, p2, p1]]:
			for v in tri:
				st.set_color(wall_color.darkened(0.06))
				st.set_normal(Vector3(sx, 0, 0))
				st.add_vertex(v)
	# Ridge cap
	_box_vis(st, Vector3(0, peak + 0.08, 0), Vector3(w + ov * 2.0, 0.14, 0.3), roof_color.darkened(0.2))

func _glass_material() -> StandardMaterial3D:
	if _glass_mat == null:
		_glass_mat = StandardMaterial3D.new()
		_glass_mat.albedo_color = Color(0.7, 0.85, 0.95, 0.35)
		_glass_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		_glass_mat.vertex_color_use_as_albedo = false
		_glass_mat.roughness = 0.05
		_glass_mat.metallic_specular = 0.9
		_glass_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	return _glass_mat
