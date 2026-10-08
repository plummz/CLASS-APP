class_name RoyaleWorld
extends Node3D
## Generates the island: height-mapped terrain with beaches and hills, a surrounding sea, six
## named towns with walk-in houses, a military base, decorative city buildings, trees, bushes
## and rocks. Exposes loot spawn points (with door waypoints for bots) and a minimap texture.

const MAP_SIZE := 1024.0          ## metres, centred on the origin (main island height grid)
const MAP_VIEW := 1700.0          ## metres shown on the map / where you can swim (includes Isla Verde)
const ISLAND2_R := 95.0           ## Isla Verde: a small island across the strait
const I2_VERTS := 65              ## its own 4 m height grid (256 m square)
const GRID := 4.0                 ## terrain vertex spacing (m)
const VERTS := 257                ## MAP_SIZE / GRID + 1
const CHUNK := 32                 ## terrain cells per render chunk
const WATER_Y := 0.0
const WALL_T := 0.25
const STOREY := 3.0
const FLOOR_TOP := 0.05   ## floor surface above the ground: low enough to walk straight in

const TOWN_NAMES := ["Rizal Heights", "Mabini Port", "Campus Row", "Bonifacio Farm", "Luna Ridge", "Aguinaldo Square"]

const NATURE := "res://assets/nature/"
const MEGAKIT := "res://assets/megakit/"
## Quaternius Stylized Nature MegaKit (CC0). Names starting with "mk:" are MegaKit models; the
## scale passed by the scatter code is multiplied by MK_SCALE so the old size ranges still work.
const TREES_LOW := ["mk:tree", "mk:tree_2", "mk:tree_3", "mk:tree_4", "mk:tree_5", "mk:tree", "mk:tree_3", "mk:twisted_tree_4"]
const TREES_HIGH := ["mk:pine", "mk:pine_2", "mk:pine_3", "mk:pine_4", "mk:pine_5"]
const TREES_BEACH := ["tree_palmTall", "tree_palm"]
const BUSHES := ["mk:bush", "mk:bush_with_flowers", "mk:plant_big_2", "mk:fern"]
const ROCKS := ["mk:rock_medium", "mk:rock_medium_2", "mk:rock_medium_3"]
const GRASS := ["mk:grass", "mk:grass_wispy", "mk:grass_wispy_2", "mk:tall_grass", "mk:grass", "mk:clover", "mk:flower_group", "mk:flower_single"]
const MK_SCALE := {"tree": 0.155, "pine": 0.15, "twisted": 0.09, "bush": 0.33, "plant": 0.33, "fern": 0.3, "rock": 0.32,
	"grass": 0.18, "tall": 0.17, "clover": 0.22, "flower": 0.15, "dead": 0.12}
## How much each kind sways in the wind (per metre squared of height, see RoyaleMaterials.WIND_SHADER)
const MK_WIND := {"grass": 0.14, "tall": 0.12, "clover": 0.12, "flower": 0.1, "bush": 0.03, "plant": 0.04, "fern": 0.03,
	"tree": 0.0011, "pine": 0.0008, "twisted": 0.0005, "dead": 0.0004}

const WALL_COLORS := [Color("e8dcc4"), Color("cfe3ea"), Color("f1e3a6"), Color("f4f1ea"), Color("c98b74"), Color("b9d4b4")]
const ROOF_COLORS := [Color("6b4a3a"), Color("4a5568"), Color("7a3b2e"), Color("3f5f4a")]

## Per-map lists (set from the theme in generate)
var theme := "sentinel"
var trees_low: Array = TREES_LOW
var trees_high: Array = TREES_HIGH
var trees_beach: Array = TREES_BEACH
var bushes: Array = BUSHES
var rocks: Array = ROCKS
var grass: Array = GRASS
var wall_colors: Array = WALL_COLORS
var roof_colors: Array = ROOF_COLORS
var town_names: Array = TOWN_NAMES
var base_name := "Fort Santiago Base"
var hill_scale := 34.0
var mountain_h := 55.0
var grass_every := 1      ## draw every Nth grass tuft (phones / desert draw fewer)

const THEMES := {
	"dunes": {
		"trees_low": ["tree_palmTall", "tree_palm", "mk:dead_tree", "mk:dead_tree_2", "tree_palmTall", "mk:dead_tree_3"],
		"trees_high": ["mk:dead_tree", "mk:dead_tree_2", "mk:dead_tree_3"],
		"trees_beach": ["tree_palmTall", "tree_palm"],
		"bushes": ["mk:bush", "mk:plant_big_2", "mk:fern"],
		"grass": ["mk:tall_grass", "mk:grass_wispy", "mk:grass_wispy_2"],
		"wall_colors": [Color("e8c99a"), Color("d9a66b"), Color("f0dcb8"), Color("c97b4a"), Color("efe1c6"), Color("dcb98a")],
		"roof_colors": [Color("8a4b2e"), Color("6e3a24"), Color("a0603a"), Color("7a5a3a")],
		"town_names": ["Oasis Central", "Sandy Port", "Mirage Row", "Cactus Farm", "Dune Ridge", "Sunstone Square"],
		"base": "Camp Sahara", "hills": 22.0, "mountain": 48.0, "grass_every": 3},
	"frost": {
		"trees_low": ["mk:pine", "mk:pine_2", "mk:pine_3", "mk:pine_4", "mk:pine_5", "mk:dead_tree_2"],
		"trees_high": ["mk:pine", "mk:pine_2", "mk:pine_3", "mk:pine_4", "mk:pine_5"],
		"trees_beach": ["mk:pine_4", "mk:pine_5"],
		"bushes": ["mk:bush", "mk:fern"],
		"grass": ["mk:tall_grass"],
		"wall_colors": [Color("8a5a3a"), Color("6d4c35"), Color("a7a39b"), Color("5a6e7a"), Color("9a3b2e"), Color("d8d2c4")],
		"roof_colors": [Color("3a3f45"), Color("4a2f25"), Color("2f3a33"), Color("55595e")],
		"town_names": ["Frostfall", "Icehaven Port", "Pinecrest Row", "Snowmelt Farm", "Glacier Ridge", "Aurora Square"],
		"base": "Fort Polar", "hills": 46.0, "mountain": 85.0, "grass_every": 0},
}

func _apply_theme(name: String) -> void:
	theme = name
	if not THEMES.has(name):
		return
	var t: Dictionary = THEMES[name]
	trees_low = t.trees_low
	trees_high = t.trees_high
	trees_beach = t.trees_beach
	bushes = t.bushes
	grass = t.grass
	wall_colors = t.wall_colors
	roof_colors = t.roof_colors
	town_names = t.town_names
	base_name = t.base
	hill_scale = t.hills
	mountain_h = t.mountain
	grass_every = t.grass_every

var rng := RandomNumberGenerator.new()
var noise := FastNoiseLite.new()
var warp := FastNoiseLite.new()
var heights := PackedFloat32Array()
var town_mask := PackedByteArray()   ## per terrain vertex: 0 = open land, n = inside town n-1
var _heights_ready := false
var towns: Array[Dictionary] = []         ## {name, pos: Vector2, radius, y, tier}
var loot_points: Array[Dictionary] = []   ## {pos: Vector3, tier, path: Array[Vector3]}
var doors: Array[Dictionary] = []         ## {hinge: Node3D, center: Vector3, open: bool, swing: float}
var houses: Array[Dictionary] = []        ## {node, w, d, door_out: Vector3, door_in: Vector3}
var map_texture: ImageTexture
var quality_low := false

var _multimesh_buckets := {}   ## "model|chunk" -> {mesh_list, transforms}
var _scene_cache := {}
var _static_body: StaticBody3D
var buildings: RoyaleBuildings
var roads: Array = []   ## [Vector2 a, Vector2 b] road segments between towns
var features: Array[Dictionary] = []  ## mountain / lake shaping {pos, radius, height}
var island2 := {}                      ## {center: Vector2, heights: PackedFloat32Array, town: Dictionary}
var vehicle_spawns: Array[Dictionary] = []  ## {kind, model, pos, yaw}

func generate(seed_value: int, low_quality := false, theme_name := "sentinel") -> void:
	_apply_theme(theme_name)
	quality_low = low_quality
	touch_device = RoyalePlayer.is_touch_platform()
	rng.seed = seed_value
	noise.seed = seed_value
	noise.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	noise.frequency = 0.0042
	noise.fractal_type = FastNoiseLite.FRACTAL_FBM
	noise.fractal_octaves = 4
	warp.seed = seed_value + 17
	warp.frequency = 0.006
	_static_body = StaticBody3D.new()
	_static_body.name = "Props"
	_static_body.collision_layer = 1
	add_child(_static_body)
	var t := Time.get_ticks_msec()
	var marks := []
	buildings = RoyaleBuildings.new(self, rng)
	_place_features()
	_place_towns()
	_place_roads()
	_build_heights(); marks.append("heights %d" % (Time.get_ticks_msec() - t)); t = Time.get_ticks_msec()
	_build_terrain(); marks.append("terrain %d" % (Time.get_ticks_msec() - t)); t = Time.get_ticks_msec()
	_build_water()
	for town in towns:
		_build_town(town)
	marks.append("towns %d" % (Time.get_ticks_msec() - t)); t = Time.get_ticks_msec()
	_scatter_nature(); marks.append("nature %d" % (Time.get_ticks_msec() - t)); t = Time.get_ticks_msec()
	_build_island2(); marks.append("island2 %d" % (Time.get_ticks_msec() - t)); t = Time.get_ticks_msec()
	_plan_vehicles()
	_build_sea_floor()
	_flush_multimeshes(); marks.append("multimesh %d" % (Time.get_ticks_msec() - t)); t = Time.get_ticks_msec()
	_build_map_texture(); marks.append("map %d" % (Time.get_ticks_msec() - t))
	print("ROYALE_TIMING ", ", ".join(marks))

# ── Height field ─────────────────────────────────────────────

func _raw_height(x: float, z: float) -> float:
	var d := Vector2(x, z).length() / (MAP_SIZE * 0.46)
	d += warp.get_noise_2d(x, z) * 0.14
	var mask := 1.0 - smoothstep(0.72, 1.0, d)
	var hills := (noise.get_noise_2d(x, z) * 0.5 + 0.5)
	var h := hills * hills * hill_scale * mask + mask * 3.5 - (1.0 - mask) * 9.0
	# A mountain and a lake give the island landmarks and high ground to fight over
	for f in features:
		var dist := Vector2(x, z).distance_to(f.pos)
		var r: float = f.radius
		if dist < r:
			var t := 1.0 - dist / r
			h += float(f.height) * t * t * (3.0 - 2.0 * t) * mask
	return h

func _place_features() -> void:
	features.clear()
	var a := rng.randf() * TAU
	features.append({"pos": Vector2(cos(a), sin(a)) * 210.0, "radius": 140.0, "height": mountain_h, "kind": "mountain"})
	var b := a + PI * rng.randf_range(0.7, 1.3)
	features.append({"pos": Vector2(cos(b), sin(b)) * 160.0, "radius": 70.0, "height": -26.0, "kind": "lake"})

func _place_towns() -> void:
	towns.clear()
	var base_angle := rng.randf() * TAU
	for i in town_names.size():
		var pos: Vector2
		if i == 0:
			pos = Vector2(rng.randf_range(-40, 40), rng.randf_range(-40, 40))
		else:
			var a := base_angle + TAU * float(i - 1) / float(town_names.size() - 1) + rng.randf_range(-0.25, 0.25)
			pos = Vector2(cos(a), sin(a)) * rng.randf_range(230.0, 300.0)
		towns.append({"name": town_names[i], "pos": pos, "radius": rng.randf_range(48.0, 62.0), "tier": 1 if i == 0 else 0, "military": false})
	# Military base on the coast between two towns
	var a2 := base_angle + TAU * 1.5 / float(town_names.size() - 1)
	towns.append({"name": base_name, "pos": Vector2(cos(a2), sin(a2)) * 345.0, "radius": 58.0, "tier": 2, "military": true})
	for town in towns:
		for f in features:
			var away: Vector2 = town.pos - Vector2(f.pos)
			var min_d: float = float(f.radius) + float(town.radius) + 10.0
			if away.length() < min_d:
				town.pos = Vector2(f.pos) + away.normalized() * min_d
		var p: Vector2 = town.pos
		town.y = maxf(2.5, _raw_height(p.x, p.y))

## Ground height. After generation this samples the prebuilt grid (fast enough for bots to
## call every frame); during generation it computes the noise and town flattening directly.
func _place_roads() -> void:
	roads.clear()
	# Each town connects to its two nearest neighbours
	for i in towns.size():
		var dists: Array = []
		for j in towns.size():
			if j != i: dists.append([Vector2(towns[i].pos).distance_to(towns[j].pos), j])
		dists.sort_custom(func(p, q): return float(p[0]) < float(q[0]))
		for k in mini(2, dists.size()):
			var j: int = dists[k][1]
			var seg := [Vector2(towns[mini(i, j)].pos), Vector2(towns[maxi(i, j)].pos)]
			if not roads.has(seg): roads.append(seg)

func _road_distance(p: Vector2) -> float:
	var best := INF
	for seg in roads:
		var a: Vector2 = seg[0]
		var b: Vector2 = seg[1]
		# Quick reject: outside the segment's bounding box (plus margin)
		if p.x < minf(a.x, b.x) - 6.0 or p.x > maxf(a.x, b.x) + 6.0 or p.y < minf(a.y, b.y) - 6.0 or p.y > maxf(a.y, b.y) + 6.0:
			continue
		var ab: Vector2 = Vector2(seg[1]) - a
		var t := clampf((p - a).dot(ab) / ab.length_squared(), 0.0, 1.0)
		best = minf(best, p.distance_to(a + ab * t))
	return best

func height_at(x: float, z: float) -> float:
	if not island2.is_empty() and island2.has("heights"):
		var c: Vector2 = island2.center
		var half := (I2_VERTS - 1) * GRID * 0.5
		if absf(x - c.x) < half and absf(z - c.y) < half:
			return _i2_height(x, z)
	if _heights_ready and (absf(x) > MAP_SIZE * 0.5 or absf(z) > MAP_SIZE * 0.5):
		return -12.0   # open sea beyond the main island's grid
	if _heights_ready:
		var fx := clampf((x + MAP_SIZE * 0.5) / GRID, 0.0, VERTS - 1.001)
		var fz := clampf((z + MAP_SIZE * 0.5) / GRID, 0.0, VERTS - 1.001)
		var ix := int(fx)
		var iz := int(fz)
		var tx := fx - ix
		var tz := fz - iz
		var i := iz * VERTS + ix
		var a := lerpf(heights[i], heights[i + 1], tx)
		var b := lerpf(heights[i + VERTS], heights[i + VERTS + 1], tx)
		return lerpf(a, b, tz)
	return _compute_height(x, z)

func _compute_height(x: float, z: float) -> float:
	var h := _raw_height(x, z)
	for town in towns:
		var r: float = town.radius
		var dx: float = x - town.pos.x
		var dz: float = z - town.pos.y
		if dx * dx + dz * dz > (r + 30.0) * (r + 30.0):
			continue
		var dist := sqrt(dx * dx + dz * dz)
		if dist < r + 30.0:
			var t := 1.0 - smoothstep(r, r + 30.0, dist)
			h = lerpf(h, float(town.y), t)
	return h

func _build_heights() -> void:
	heights.resize(VERTS * VERTS)
	town_mask.resize(VERTS * VERTS)
	for iz in VERTS:
		for ix in VERTS:
			var x := -MAP_SIZE * 0.5 + ix * GRID
			var z := -MAP_SIZE * 0.5 + iz * GRID
			heights[iz * VERTS + ix] = _compute_height(x, z)
	# Town mask: only visit the square around each town
	town_mask.fill(0)
	for t in towns.size():
		var c: Vector2 = towns[t].pos
		var r := float(towns[t].radius) + 4.0
		for iz in range(maxi(0, int((c.y - r + MAP_SIZE * 0.5) / GRID)), mini(VERTS, int((c.y + r + MAP_SIZE * 0.5) / GRID) + 2)):
			for ix in range(maxi(0, int((c.x - r + MAP_SIZE * 0.5) / GRID)), mini(VERTS, int((c.x + r + MAP_SIZE * 0.5) / GRID) + 2)):
				var p := Vector2(-MAP_SIZE * 0.5 + ix * GRID, -MAP_SIZE * 0.5 + iz * GRID)
				if p.distance_to(c) < r and town_mask[iz * VERTS + ix] == 0:
					town_mask[iz * VERTS + ix] = t + 1
	_heights_ready = true

func _h(ix: int, iz: int) -> float:
	return heights[clampi(iz, 0, VERTS - 1) * VERTS + clampi(ix, 0, VERTS - 1)]

func town_at(x: float, z: float, margin := 0.0) -> Dictionary:
	for town in towns:
		if Vector2(x, z).distance_to(town.pos) < float(town.radius) + margin:
			return town
	return {}

func is_land(x: float, z: float) -> bool:
	return height_at(x, z) > 0.6

func _ground_color(x: float, z: float, h: float, slope: float, mask: int) -> Color:
	var n := noise.get_noise_2d(x * 3.1, z * 3.1) * 0.5 + 0.5
	var c: Color
	# Palette matched to the Kenney Nature Kit (mint-teal grass, warm sand, grey rock)
	if h < 1.6:
		c = Color("e8cfa2").lerp(Color("dcc08f"), n)
	elif h > 52.0:
		c = Color("eef2f4").lerp(Color("d5dde2"), n)      # snow cap
	elif slope > 0.5 or h > 40.0:
		c = Color("8d959b").lerp(Color("737b82"), n)
	elif h > 22.0:
		c = Color("2f8f72").lerp(Color("27795f"), n)
	else:
		c = Color("3cae86").lerp(Color("2f9a76"), n)
	if mask > 0:
		var town: Dictionary = towns[mask - 1]
		var sp: float = town.get("spacing", 17.0)
		var lx := fposmod(x - float(town.pos.x) + sp * 0.5, sp)
		var lz := fposmod(z - float(town.pos.y) + sp * 0.5, sp)
		var street := minf(lx, sp - lx) < 2.4 or minf(lz, sp - lz) < 2.4
		if bool(town.military):
			c = Color("8e8b80").lerp(Color("7f7c72"), n)
		elif street:
			c = Color("6e6a66").lerp(Color("625e5a"), n * 0.6)   # paved street
		else:
			c = c.lerp(Color("5fbf8f"), 0.4)                     # tidy yards
	elif h > 1.6 and _road_distance(Vector2(x, z)) < 3.2:
		c = Color("b59a72").lerp(Color("a78c64"), n)           # dirt road
	return c

## Texture weights for the terrain shader: COLOR = grass, sand, rock, dirt; UV2 = asphalt, concrete.
func _ground_weights(x: float, z: float, h: float, slope: float, mask: int) -> Array:
	var w := Color(0, 0, 0, 0)
	var w2 := Vector2.ZERO
	var beach := 1.0 - smoothstep(1.2, 2.2, h)
	var rock := maxf(smoothstep(0.38, 0.62, slope), smoothstep(36.0, 44.0, h))
	w.g = beach
	w.b = rock * (1.0 - beach)
	w.r = maxf(0.0, 1.0 - w.g - w.b)
	if mask > 0:
		var town: Dictionary = towns[mask - 1]
		var sp: float = town.get("spacing", 17.0)
		var lx := fposmod(x - float(town.pos.x) + sp * 0.5, sp)
		var lz := fposmod(z - float(town.pos.y) + sp * 0.5, sp)
		var street := minf(lx, sp - lx) < 2.4 or minf(lz, sp - lz) < 2.4
		if bool(town.military):
			return [Color(0, 0, 0, 0.15), Vector2(0, 1)]
		elif street:
			return [Color(0, 0, 0, 0.05), Vector2(1, 0)]
	elif h > 1.6:
		var rd := _road_distance(Vector2(x, z))
		if rd < 3.6:
			var k := 1.0 - smoothstep(2.6, 3.6, rd)
			w = w * (1.0 - k)
			w.a = k
	return [w, w2]

func _build_terrain() -> void:
	var material := RoyaleMaterials.terrain_material()
	# Positions, normals and colours are computed once per vertex, then indexed per chunk.
	var positions := PackedVector3Array()
	var normals := PackedVector3Array()
	var colors := PackedColorArray()
	var weights2 := PackedVector2Array()
	positions.resize(VERTS * VERTS)
	normals.resize(VERTS * VERTS)
	colors.resize(VERTS * VERTS)
	weights2.resize(VERTS * VERTS)
	for iz in VERTS:
		for ix in VERTS:
			var i := iz * VERTS + ix
			var x := -MAP_SIZE * 0.5 + ix * GRID
			var z := -MAP_SIZE * 0.5 + iz * GRID
			var h := heights[i]
			var n := Vector3(_h(ix - 1, iz) - _h(ix + 1, iz), 2.0 * GRID, _h(ix, iz - 1) - _h(ix, iz + 1)).normalized()
			positions[i] = Vector3(x, h, z)
			normals[i] = n
			var gw := _ground_weights(x, z, h, 1.0 - n.y, town_mask[i])
			colors[i] = gw[0]
			weights2[i] = gw[1]
	var cells := VERTS - 1
	for cz in range(0, cells, CHUNK):
		for cx in range(0, cells, CHUNK):
			var ex := mini(cx + CHUNK, cells)
			var ez := mini(cz + CHUNK, cells)
			var cw := ex - cx + 1
			var verts := PackedVector3Array()
			var norms := PackedVector3Array()
			var cols := PackedColorArray()
			var uv2s := PackedVector2Array()
			var indices := PackedInt32Array()
			for iz in range(cz, ez + 1):
				for ix in range(cx, ex + 1):
					var i := iz * VERTS + ix
					verts.append(positions[i])
					norms.append(normals[i])
					cols.append(colors[i])
					uv2s.append(weights2[i])
			for lz in range(ez - cz):
				for lx in range(ex - cx):
					var a := lz * cw + lx
					indices.append_array([a, a + 1, a + cw + 1, a, a + cw + 1, a + cw])
			var arrays := []
			arrays.resize(Mesh.ARRAY_MAX)
			arrays[Mesh.ARRAY_VERTEX] = verts
			arrays[Mesh.ARRAY_NORMAL] = norms
			arrays[Mesh.ARRAY_COLOR] = cols
			arrays[Mesh.ARRAY_TEX_UV2] = uv2s
			arrays[Mesh.ARRAY_INDEX] = indices
			var mesh := ArrayMesh.new()
			mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
			var mi := MeshInstance3D.new()
			mi.mesh = mesh
			mi.material_override = material
			mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			add_child(mi)
	# Collision: heightmap at the same 4 m spacing (uniform scale keeps the shape valid)
	var body := StaticBody3D.new()
	body.name = "Terrain"
	body.collision_layer = 1
	var shape := HeightMapShape3D.new()
	shape.map_width = VERTS
	shape.map_depth = VERTS
	var scaled := PackedFloat32Array()
	scaled.resize(heights.size())
	for i in heights.size():
		scaled[i] = heights[i] / GRID
	shape.map_data = scaled
	var cs := CollisionShape3D.new()
	cs.shape = shape
	cs.scale = Vector3.ONE * GRID
	body.add_child(cs)
	add_child(body)

func _build_water() -> void:
	var water := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(MAP_SIZE * 3.0, MAP_SIZE * 3.0)
	water.mesh = plane
	plane.subdivide_width = 64
	plane.subdivide_depth = 64
	water.material_override = RoyaleMaterials.water_material()
	water.position.y = WATER_Y
	water.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(water)

# ── Towns and houses ─────────────────────────────────────────

func _build_town(town: Dictionary) -> void:
	var center: Vector2 = town.pos
	var r: float = town.radius
	var y: float = town.y
	var military := bool(town.military)
	var farm := String(town.name).contains("Farm")
	var spacing := 17.0 if not military else 24.0
	town.spacing = spacing
	var count := int(r / spacing)
	var plots: Array[Vector2] = []
	for gz in range(-count, count + 1):
		for gx in range(-count, count + 1):
			var p := center + Vector2(gx, gz) * spacing
			if p.distance_to(center) > r - 6.0:
				continue
			plots.append(p)
	plots.shuffle()
	# About a third of the plots stay open: yards and small parks with trees and benches
	var keep := int(ceil(plots.size() * 0.66))
	for k in range(keep, plots.size()):
		var park := plots[k]
		for t in 3:
			var tp := park + Vector2(rng.randf_range(-6, 6), rng.randf_range(-6, 6))
			_add_instance(trees_low[rng.randi_range(0, trees_low.size() - 1)], Vector3(tp.x, y, tp.y), rng.randf_range(4.5, 6.5), true, 0.35)
		_add_instance(bushes[rng.randi_range(0, bushes.size() - 1)], Vector3(park.x, y, park.y), 3.0, false, 0.0)
	plots = plots.slice(0, keep)
	for p in plots:
		var yaw := float(rng.randi_range(0, 3)) * PI * 0.5
		var pos := Vector3(p.x, y, p.y)
		if military:
			if rng.randf() < 0.6:
				buildings.build("warehouse", pos, yaw, 2, Color.WHITE, Color.WHITE)
			else:
				_place_decor("res://assets/survival/structure-metal.glb", pos, yaw, 4.2)
				_add_loot_point(pos + Vector3(0, 0.3, 0), 2, [])
			continue
		var wall: Color = wall_colors[rng.randi_range(0, wall_colors.size() - 1)]
		var roof: Color = roof_colors[rng.randi_range(0, roof_colors.size() - 1)]
		var roll := rng.randf()
		if farm and roll < 0.3:
			buildings.build("barn", pos, yaw, int(town.tier), wall, roof)
		elif int(town.tier) == 1 and roll < 0.3:
			buildings.build("shop", pos, yaw, int(town.tier), wall, roof)
		elif int(town.tier) == 1 and roll < 0.45:
			buildings.build("apartment", pos, yaw, int(town.tier), wall, roof)
		elif roll < 0.12:
			buildings.build("shop", pos, yaw, int(town.tier), wall, roof)
		else:
			buildings.build("house", pos, yaw, int(town.tier), wall, roof)
		# Yard details: fence, planter or a tree
		if rng.randf() < 0.5:
			_place_decor("res://assets/suburban/fence-1x4.glb", pos + Basis(Vector3.UP, yaw) * Vector3(rng.randf_range(-3, 3), 0, 7.6), yaw, 3.0)
		if rng.randf() < 0.4:
			_place_decor("res://assets/suburban/tree-large.glb", pos + Basis(Vector3.UP, yaw) * Vector3(6.5, 0, 6.5), 0.0, 6.0)
	# Barrels and crates in the streets for cover
	for i in int(r / 6.0):
		var a := rng.randf() * TAU
		var p2 := center + Vector2(cos(a), sin(a)) * rng.randf_range(4.0, r)
		var model: String = ["res://assets/survival/barrel.glb", "res://assets/survival/box-large.glb", "res://assets/guns/crate-wide.glb"][rng.randi_range(0, 2)]
		_place_decor(model, Vector3(p2.x, y, p2.y), rng.randf() * TAU, 1.6 if model.ends_with("crate-wide.glb") else 1.4)
	if farm:
		_build_fields(town)

## Crop fields with fences around a farm town.
func _build_fields(town: Dictionary) -> void:
	var crops := ["crops_cornStageD", "crops_wheatStageB", "crops_leafsStageB", "crop_pumpkin", "crop_melon"]
	for f in 4:
		var a := rng.randf() * TAU
		var c: Vector2 = Vector2(town.pos) + Vector2(cos(a), sin(a)) * (float(town.radius) + 30.0)
		if not is_land(c.x, c.y):
			continue
		var model: String = crops[rng.randi_range(0, crops.size() - 1)]
		for gz in range(-4, 5):
			for gx in range(-6, 7):
				var p := c + Vector2(gx * 2.0, gz * 2.6)
				_add_instance(model, Vector3(p.x, height_at(p.x, p.y), p.y), 2.6, false, 0.0)

## Adds a box (centre, size) in house-local space to the surface tool and a collision box.
func _box(st: SurfaceTool, body: StaticBody3D, center: Vector3, size: Vector3, color: Color, collide := true, basis := Basis.IDENTITY) -> void:
	var h := size * 0.5
	var faces := [
		[Vector3(1, 0, 0), [Vector3(h.x, -h.y, -h.z), Vector3(h.x, h.y, -h.z), Vector3(h.x, h.y, h.z), Vector3(h.x, -h.y, h.z)]],
		[Vector3(-1, 0, 0), [Vector3(-h.x, -h.y, h.z), Vector3(-h.x, h.y, h.z), Vector3(-h.x, h.y, -h.z), Vector3(-h.x, -h.y, -h.z)]],
		[Vector3(0, 1, 0), [Vector3(-h.x, h.y, -h.z), Vector3(-h.x, h.y, h.z), Vector3(h.x, h.y, h.z), Vector3(h.x, h.y, -h.z)]],
		[Vector3(0, -1, 0), [Vector3(-h.x, -h.y, h.z), Vector3(-h.x, -h.y, -h.z), Vector3(h.x, -h.y, -h.z), Vector3(h.x, -h.y, h.z)]],
		[Vector3(0, 0, 1), [Vector3(h.x, -h.y, h.z), Vector3(h.x, h.y, h.z), Vector3(-h.x, h.y, h.z), Vector3(-h.x, -h.y, h.z)]],
		[Vector3(0, 0, -1), [Vector3(-h.x, -h.y, -h.z), Vector3(-h.x, h.y, -h.z), Vector3(h.x, h.y, -h.z), Vector3(h.x, -h.y, -h.z)]],
	]
	for face in faces:
		var n: Vector3 = basis * Vector3(face[0])
		var shade := 0.82 + 0.18 * maxf(0.0, n.y) + 0.06 * n.x
		var c := Color(color.r * shade, color.g * shade, color.b * shade, color.a)
		var q: Array = face[1]
		# Godot draws clockwise faces (seen from outside) and culls the rest; pick the
		# triangle order that faces outward so top faces (floors, roofs) aren't culled.
		var v0: Vector3 = basis * Vector3(q[0])
		var v1: Vector3 = basis * Vector3(q[1])
		var v2: Vector3 = basis * Vector3(q[2])
		var order := [0, 1, 2, 0, 2, 3] if (v1 - v0).cross(v2 - v0).dot(n) < 0.0 else [0, 2, 1, 0, 3, 2]
		for idx in order:
			st.set_color(c)
			st.set_normal(n)
			st.add_vertex(center + basis * Vector3(q[idx]))
	if collide and body != null:
		var cs := CollisionShape3D.new()
		var shape := BoxShape3D.new()
		shape.size = size
		cs.shape = shape
		cs.transform = Transform3D(basis, center)
		body.add_child(cs)

## A wall from a to b (house-local, on the floor at base_y) with rectangular openings.
## openings: Array of [offset_along_wall_from_a, width, bottom, top]
func _wall(st: SurfaceTool, body: StaticBody3D, a: Vector3, b: Vector3, base_y: float, height: float, openings: Array, color: Color) -> void:
	var dir := (b - a)
	var length := dir.length()
	dir = dir.normalized()
	var axis_x := absf(dir.x) > 0.5
	var cursor := 0.0
	var sorted := openings.duplicate()
	sorted.sort_custom(func(p, q): return float(p[0]) < float(q[0]))
	var spans: Array = []  # [start, end, bottom, top] solid pieces
	for op in sorted:
		var s := float(op[0]) - float(op[1]) * 0.5
		var e := float(op[0]) + float(op[1]) * 0.5
		if s > cursor:
			spans.append([cursor, s, 0.0, height])
		if float(op[2]) > 0.0:
			spans.append([s, e, 0.0, float(op[2])])
		if float(op[3]) < height:
			spans.append([s, e, float(op[3]), height])
		cursor = e
	if cursor < length:
		spans.append([cursor, length, 0.0, height])
	for sp in spans:
		var mid := (float(sp[0]) + float(sp[1])) * 0.5
		var len_s := float(sp[1]) - float(sp[0])
		var h := float(sp[3]) - float(sp[2])
		if len_s <= 0.01 or h <= 0.01:
			continue
		var c := a + dir * mid
		c.y = base_y + (float(sp[2]) + float(sp[3])) * 0.5
		var size := Vector3(len_s, h, WALL_T) if axis_x else Vector3(WALL_T, h, len_s)
		_box(st, body, c, size, color)

## A door panel that swings on a hinge at the doorway's left edge. side = 1 for the front wall
## (opens inward toward +Z), -1 for the back wall.
func _add_door(house: Node3D, doorway_center: Vector3, width: float, height: float, side: float) -> void:
	var hinge := Node3D.new()
	hinge.position = doorway_center + Vector3(-width * 0.5 * side, 0, 0)
	house.add_child(hinge)
	var body := StaticBody3D.new()
	body.collision_layer = 1
	hinge.add_child(body)
	var panel_size := Vector3(width - 0.06, height - 0.04, 0.07)
	var offset := Vector3(width * 0.5 * side, height * 0.5, 0)
	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = panel_size
	cs.shape = shape
	cs.position = offset
	body.add_child(cs)
	var mesh := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = panel_size
	box.material = _door_material()
	mesh.mesh = box
	mesh.position = offset
	body.add_child(mesh)
	# Handle
	var knob := MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radius = 0.04
	sphere.height = 0.08
	knob.mesh = sphere
	knob.position = offset + Vector3(width * 0.38 * side, -0.1, -0.06)
	body.add_child(knob)
	doors.append({"hinge": hinge, "center": house.to_global(doorway_center + Vector3(0, 1.0, 0)), "open": false, "swing": -side})

var _door_mat: StandardMaterial3D
func _door_material() -> StandardMaterial3D:
	if _door_mat == null:
		_door_mat = StandardMaterial3D.new()
		_door_mat.albedo_color = Color("7a5232")
		_door_mat.roughness = 0.8
	return _door_mat

func nearest_door(pos: Vector3, max_dist := 2.2) -> Dictionary:
	var best := {}
	var best_d := max_dist
	for door in doors:
		var d := pos.distance_to(door.center)
		if d < best_d:
			best_d = d
			best = door
	return best

func set_door_open(door: Dictionary, open: bool) -> void:
	if door.is_empty() or bool(door.open) == open:
		return
	door.open = open
	var hinge: Node3D = door.hinge
	var tween := hinge.create_tween()
	tween.tween_property(hinge, "rotation:y", deg_to_rad(100.0) * float(door.swing) if open else 0.0, 0.35).set_trans(Tween.TRANS_SINE)

func _add_loot_point(pos: Vector3, tier: int, path: Array) -> void:
	var typed: Array[Vector3] = []
	for p in path: typed.append(p)
	loot_points.append({"pos": pos, "tier": tier, "path": typed})

func _load_scene(path: String) -> PackedScene:
	if not _scene_cache.has(path):
		_scene_cache[path] = load(path) if ResourceLoader.exists(path) else null
	return _scene_cache[path]

## Decorative model. Collision follows the actual mesh shape (a box from the bounds made
## invisible walls around tents, shelters and fences).
func _place_decor(path: String, pos: Vector3, yaw: float, scale_value: float) -> void:
	var scene := _load_scene(path)
	if scene == null:
		return
	var inst: Node3D = scene.instantiate()
	inst.position = pos
	inst.rotation.y = yaw
	inst.scale = Vector3.ONE * scale_value
	add_child(inst)
	for m: MeshInstance3D in inst.find_children("*", "MeshInstance3D", true, false):
		m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF if quality_low else GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		if m.mesh == null:
			continue
		var shape: Shape3D = _trimesh_cache.get(m.mesh)
		if shape == null:
			shape = m.mesh.create_trimesh_shape()
			_trimesh_cache[m.mesh] = shape
		var cs := CollisionShape3D.new()
		cs.shape = shape
		cs.transform = Transform3D(Basis(Vector3.UP, yaw).scaled(Vector3.ONE * scale_value), pos) * _relative_transform(inst, m)
		_static_body.add_child(cs)

var _trimesh_cache := {}

func _relative_transform(root: Node3D, node: Node3D) -> Transform3D:
	var tf := Transform3D.IDENTITY
	var n: Node = node
	while n != null and n != root:
		if n is Node3D:
			tf = (n as Node3D).transform * tf
		n = n.get_parent()
	return tf

# ── Nature (batched with MultiMesh per model and 256 m chunk) ──

func _scatter_nature() -> void:
	# Same cells and random draws on every device (room matches must build the same island);
	# low quality / phones only skip drawing some grass
	var cell := 9.0
	var half := MAP_SIZE * 0.5
	var z := -half
	while z < half:
		var x := -half
		while x < half:
			var px := x + rng.randf_range(0.0, cell)
			var pz := z + rng.randf_range(0.0, cell)
			x += cell
			var h := height_at(px, pz)
			if h < 0.8:
				continue
			if not town_at(px, pz, 8.0).is_empty():
				continue
			var density := noise.get_noise_2d(px * 0.7 + 300.0, pz * 0.7) * 0.5 + 0.5
			var roll := rng.randf()
			var slope := absf(height_at(px + 2.0, pz) - h) + absf(height_at(px, pz + 2.0) - h)
			if h < 2.2 and roll < 0.12:
				_add_instance(trees_beach[rng.randi_range(0, 1)], Vector3(px, h, pz), rng.randf_range(4.5, 6.5), true, 0.3)
			elif roll < density * 0.42 and slope < 3.0:
				var list := trees_high if h > 18.0 else trees_low
				_add_instance(list[rng.randi_range(0, list.size() - 1)], Vector3(px, h, pz), rng.randf_range(5.0, 8.0), true, 0.35)
			elif roll < density * 0.42 + 0.06:
				_add_instance(rocks[rng.randi_range(0, rocks.size() - 1)], Vector3(px, h - 0.3, pz), rng.randf_range(2.0, 4.5), true, 1.1)
			elif roll < density * 0.42 + 0.16:
				_add_instance(bushes[rng.randi_range(0, bushes.size() - 1)], Vector3(px, h, pz), rng.randf_range(2.5, 4.0), false, 0.0)
			elif roll < density * 0.42 + 0.45:
				# A tuft cluster: several blades and the odd flower around one spot
				for k in rng.randi_range(4, 8):
					var gx := px + rng.randf_range(-2.5, 2.5)
					var gz := pz + rng.randf_range(-2.5, 2.5)
					var model: String = grass[rng.randi_range(0, grass.size() - 1)]
					var sc := rng.randf_range(2.5, 4.0)
					if _draw_grass(k):
						_add_grass(model, Vector3(gx, height_at(gx, gz), gz), sc)
		z += cell
	# A handful of outdoor loot caches (campsites)
	for i in 14:
		var a := rng.randf() * TAU
		var p := Vector2(cos(a), sin(a)) * rng.randf_range(80.0, 380.0)
		if not is_land(p.x, p.y) or not town_at(p.x, p.y, 20.0).is_empty():
			continue
		var y := height_at(p.x, p.y)
		_place_decor("res://assets/survival/tent.glb", Vector3(p.x, y, p.y), rng.randf() * TAU, 2.6)
		_add_loot_point(Vector3(p.x + 2.5, y + 0.2, p.y + 1.0), 0, [])

## Batches any model by 'path' into MultiMeshes per chunk; vis = draw distance (0 = default).
func add_model_instance(path: String, tf: Transform3D, chunk_size: float, vis: float) -> void:
	var chunk := Vector2i(floori((tf.origin.x + MAP_SIZE * 0.5) / chunk_size), floori((tf.origin.z + MAP_SIZE * 0.5) / chunk_size))
	var key := "%s|%d_%d|%d" % [path, chunk.x, chunk.y, int(chunk_size)]
	if not _multimesh_buckets.has(key):
		_multimesh_buckets[key] = {"path": path, "transforms": [], "vis": vis}
	_multimesh_buckets[key].transforms.append(tf)

## Grass is decoration only: phones draw half the blades, low quality none (no random draws here).
var touch_device := false
func _draw_grass(k: int) -> bool:
	if quality_low or grass_every <= 0:
		return false
	var every := grass_every * (2 if touch_device else 1)
	return k % every == 0

## Adds a grass tuft without using the world's random generator (yaw from the position).
func _add_grass(model: String, pos: Vector3, scale_value: float) -> void:
	var name := model.substr(3)
	scale_value *= float(MK_SCALE.get(mk_kind(name), 0.2))
	var yaw := fposmod(pos.x * 12.9898 + pos.z * 78.233, TAU)
	add_model_instance(MEGAKIT + name + ".scn", Transform3D(Basis(Vector3.UP, yaw).scaled(Vector3.ONE * scale_value), pos), 96.0, 55.0)

static func mk_kind(name: String) -> String:
	for k in ["twisted", "tree", "pine", "bush", "plant", "fern", "rock", "grass", "tall", "clover", "flower", "dead"]:
		if name.begins_with(k):
			return k
	return ""

func _add_instance(model: String, pos: Vector3, scale_value: float, collide: bool, radius: float) -> void:
	var yaw := rng.randf() * TAU
	var path := NATURE + model + ".glb"
	var name := model
	if model.begins_with("mk:"):
		name = model.substr(3)
		path = MEGAKIT + name + ".scn"
		var kind := mk_kind(name)
		scale_value *= float(MK_SCALE.get(kind, 0.2))
		if kind == "twisted": radius = 0.9
	var small := name.begins_with("grass") or name.begins_with("flower") or name.begins_with("crop") or name.begins_with("tall") or name.begins_with("clover")
	var shrub := name.begins_with("plant") or name.begins_with("bush") or name.begins_with("fern") or name.begins_with("rock")
	# Draw distances: grass close, shrubs and rocks medium, trees far (64 m chunks so distant
	# chunks use the low-detail mesh LODs)
	var vis := 55.0 if small else (140.0 if shrub else 420.0)
	add_model_instance(path, Transform3D(Basis(Vector3.UP, yaw).scaled(Vector3.ONE * scale_value), pos), 96.0 if small else 128.0, vis)
	if collide:
		var cs := CollisionShape3D.new()
		if radius > 0.8:
			var sphere := SphereShape3D.new()
			sphere.radius = radius * scale_value * 0.45
			cs.shape = sphere
			cs.position = pos + Vector3(0, sphere.radius * 0.5, 0)
		else:
			var cyl := CylinderShape3D.new()
			cyl.radius = radius
			cyl.height = 5.0
			cs.shape = cyl
			cs.position = pos + Vector3(0, 2.5, 0)
		_static_body.add_child(cs)

func _flush_multimeshes() -> void:
	var mesh_cache := {}
	for key: String in _multimesh_buckets:
		var bucket: Dictionary = _multimesh_buckets[key]
		var path := String(bucket.path)
		if not mesh_cache.has(path):
			var parts: Array = []
			var scene := _load_scene(path)
			if scene != null:
				var inst: Node3D = scene.instantiate()
				var sway := float(MK_WIND.get(mk_kind(path.get_file().get_basename()), 0.0)) if path.begins_with(MEGAKIT) else 0.0
				for m: MeshInstance3D in inst.find_children("*", "MeshInstance3D", true, false):
					var mesh: Mesh = m.mesh
					if sway > 0.0:
						mesh = mesh.duplicate(false)
						for si in mesh.get_surface_count():
							mesh.surface_set_material(si, RoyaleMaterials.wind_material(mesh.surface_get_material(si), sway))
					parts.append([mesh, _relative_transform(inst, m)])
				inst.free()
			mesh_cache[path] = parts
		var vis := float(bucket.vis)
		for part in mesh_cache[path]:
			var mm := MultiMesh.new()
			mm.transform_format = MultiMesh.TRANSFORM_3D
			mm.mesh = part[0]
			var tfs: Array = bucket.transforms
			mm.instance_count = tfs.size()
			for i in tfs.size():
				mm.set_instance_transform(i, Transform3D(tfs[i]) * Transform3D(part[1]))
			var mmi := MultiMeshInstance3D.new()
			mmi.multimesh = mm
			var small := vis > 0.0 and vis < 200.0
			mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF if (quality_low or small) else GeometryInstance3D.SHADOW_CASTING_SETTING_ON
			if vis > 0.0:
				mmi.visibility_range_end = vis
				mmi.visibility_range_end_margin = vis * 0.1
				mmi.visibility_range_fade_mode = GeometryInstance3D.VISIBILITY_RANGE_FADE_SELF
			if small:
				mmi.add_to_group("grass")
			add_child(mmi)
	_multimesh_buckets.clear()

# ── Minimap texture ──────────────────────────────────────────

func _build_map_texture() -> void:
	var size := 360
	var img := Image.create(size, size, false, Image.FORMAT_RGB8)
	var step := MAP_VIEW / size
	for py in size:
		for px in size:
			var x := -MAP_VIEW * 0.5 + (px + 0.5) * step
			var z := -MAP_VIEW * 0.5 + (py + 0.5) * step
			var h := height_at(x, z)
			var c: Color
			if h < 0.6:
				c = Color("1f5f8b").lerp(Color("2b77a8"), clampf((h + 9.0) / 9.0, 0.0, 1.0))
			elif h < 1.6:
				c = Color("e8cfa2")
			elif theme == "dunes":
				c = Color("e0c08a").lerp(Color("b98c55"), clampf(h / 30.0, 0.0, 1.0))
			elif theme == "frost":
				c = Color("eef2f6").lerp(Color("c9d3dc"), clampf(h / 40.0, 0.0, 1.0))
			else:
				c = Color("4f9a5a").lerp(Color("2f6f3e"), clampf(h / 34.0, 0.0, 1.0))
			var t := town_at(x, z)
			if not t.is_empty() or (not island2.is_empty() and Vector2(x, z).distance_to(island2.center) < 36.0):
				c = Color("b8ad95")
			elif h > 40.0:
				c = Color("9aa1a6") if h < 60.0 else Color("eef2f4")
			img.set_pixel(px, py, c)
	map_texture = ImageTexture.create_from_image(img)

func world_to_map(p: Vector3) -> Vector2:
	return Vector2(p.x / MAP_VIEW + 0.5, p.z / MAP_VIEW + 0.5)

# ── Isla Verde (second island) ───────────────────────────────

func _i2_height(x: float, z: float) -> float:
	var c: Vector2 = island2.center
	var half := (I2_VERTS - 1) * GRID * 0.5
	var fx := clampf((x - c.x + half) / GRID, 0.0, I2_VERTS - 1.001)
	var fz := clampf((z - c.y + half) / GRID, 0.0, I2_VERTS - 1.001)
	var ix := int(fx)
	var iz := int(fz)
	var hs: PackedFloat32Array = island2.heights
	var i := iz * I2_VERTS + ix
	var a := lerpf(hs[i], hs[i + 1], fx - ix)
	var b := lerpf(hs[i + I2_VERTS], hs[i + I2_VERTS + 1], fx - ix)
	return lerpf(a, b, fz - iz)

## A small hilly island ~640 m out with a walled outpost (military loot) and beaches.
func _build_island2() -> void:
	var a := rng.randf() * TAU
	var center := Vector2(cos(a), sin(a)) * 640.0
	var half := (I2_VERTS - 1) * GRID * 0.5
	var hs := PackedFloat32Array()
	hs.resize(I2_VERTS * I2_VERTS)
	for iz in I2_VERTS:
		for ix in I2_VERTS:
			var x := center.x - half + ix * GRID
			var z := center.y - half + iz * GRID
			var d := Vector2(x, z).distance_to(center) / ISLAND2_R + warp.get_noise_2d(x * 2.0, z * 2.0) * 0.12
			var mask := 1.0 - smoothstep(0.7, 1.0, d)
			var hills := noise.get_noise_2d(x * 2.3, z * 2.3) * 0.5 + 0.5
			var h := hills * 12.0 * mask + mask * 3.0 - (1.0 - mask) * 8.0
			var od := Vector2(x, z).distance_to(center)
			h = lerpf(h, 3.2, 1.0 - smoothstep(34.0, 52.0, od))
			hs[iz * I2_VERTS + ix] = h
	island2 = {"center": center, "heights": hs, "angle": a}
	# Mesh with the same photo-texture terrain shader
	var verts := PackedVector3Array()
	var norms := PackedVector3Array()
	var cols := PackedColorArray()
	var uv2s := PackedVector2Array()
	var idx := PackedInt32Array()
	for iz in I2_VERTS:
		for ix in I2_VERTS:
			var h := hs[iz * I2_VERTS + ix]
			var x := center.x - half + ix * GRID
			var z := center.y - half + iz * GRID
			var hl := hs[iz * I2_VERTS + maxi(ix - 1, 0)]
			var hr := hs[iz * I2_VERTS + mini(ix + 1, I2_VERTS - 1)]
			var hd := hs[maxi(iz - 1, 0) * I2_VERTS + ix]
			var hu := hs[mini(iz + 1, I2_VERTS - 1) * I2_VERTS + ix]
			var n := Vector3(hl - hr, 2.0 * GRID, hd - hu).normalized()
			verts.append(Vector3(x, h, z))
			norms.append(n)
			var od := Vector2(x, z).distance_to(center)
			if od < 32.0:
				cols.append(Color(0, 0, 0, 0.1)); uv2s.append(Vector2(0, 1))
			else:
				var beach := 1.0 - smoothstep(1.2, 2.2, h)
				var rock := smoothstep(0.4, 0.65, 1.0 - n.y)
				cols.append(Color(maxf(0.0, 1.0 - beach - rock), beach, rock * (1.0 - beach), 0)); uv2s.append(Vector2.ZERO)
	for iz in I2_VERTS - 1:
		for ix in I2_VERTS - 1:
			var p := iz * I2_VERTS + ix
			idx.append_array([p, p + 1, p + I2_VERTS + 1, p, p + I2_VERTS + 1, p + I2_VERTS])
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = verts
	arrays[Mesh.ARRAY_NORMAL] = norms
	arrays[Mesh.ARRAY_COLOR] = cols
	arrays[Mesh.ARRAY_TEX_UV2] = uv2s
	arrays[Mesh.ARRAY_INDEX] = idx
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = RoyaleMaterials.terrain_material()
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)
	var tb := StaticBody3D.new()
	tb.collision_layer = 1
	var shape := HeightMapShape3D.new()
	shape.map_width = I2_VERTS
	shape.map_depth = I2_VERTS
	var scaled := PackedFloat32Array()
	scaled.resize(hs.size())
	for i in hs.size():
		scaled[i] = hs[i] / GRID
	shape.map_data = scaled
	var cs := CollisionShape3D.new()
	cs.shape = shape
	cs.scale = Vector3.ONE * GRID
	tb.add_child(cs)
	tb.position = Vector3(center.x, 0, center.y)
	add_child(tb)
	# The outpost: warehouses, metal shelters, crates (military-tier loot)
	var town := {"name": "Isla Verde Outpost", "pos": center, "radius": 40.0, "tier": 2, "military": true, "y": 3.2}
	island2.town = town
	_build_town(town)
	# Trees, bushes and grass on the rest of the island
	var cell := 7.0
	var z0 := center.y - ISLAND2_R
	while z0 < center.y + ISLAND2_R:
		var x0 := center.x - ISLAND2_R
		while x0 < center.x + ISLAND2_R:
			var px := x0 + rng.randf_range(0, cell)
			var pz := z0 + rng.randf_range(0, cell)
			x0 += cell
			var h := height_at(px, pz)
			if h < 1.2 or Vector2(px, pz).distance_to(center) < 50.0:
				continue
			var roll := rng.randf()
			if h < 2.2 and roll < 0.15:
				_add_instance(trees_beach[rng.randi_range(0, 1)], Vector3(px, h, pz), rng.randf_range(4.5, 6.5), true, 0.3)
			elif roll < 0.22:
				_add_instance(trees_low[rng.randi_range(0, trees_low.size() - 1)], Vector3(px, h, pz), rng.randf_range(5.0, 8.0), true, 0.35)
			elif roll < 0.32:
				_add_instance(bushes[rng.randi_range(0, bushes.size() - 1)], Vector3(px, h, pz), rng.randf_range(2.5, 4.0), false, 0.0)
			elif roll < 0.6:
				for k in 4:
					var gx := px + rng.randf_range(-2.0, 2.0)
					var gz := pz + rng.randf_range(-2.0, 2.0)
					var model: String = grass[rng.randi_range(0, grass.size() - 1)]
					var sc := rng.randf_range(2.5, 4.0)
					if _draw_grass(k):
						_add_grass(model, Vector3(gx, height_at(gx, gz), gz), sc)
		z0 += cell

## A flat sea floor everywhere (the height grids end at their edges).
func _build_sea_floor() -> void:
	var sb := StaticBody3D.new()
	sb.collision_layer = 1
	var cs := CollisionShape3D.new()
	cs.shape = WorldBoundaryShape3D.new()
	sb.add_child(cs)
	sb.position.y = -12.5
	add_child(sb)

# ── Vehicles ─────────────────────────────────────────────────

## Cars and motorcycles parked at the edge of every town, ro-ro ferries at both shores.
func _plan_vehicles() -> void:
	vehicle_spawns.clear()
	for town in towns:
		var c: Vector2 = town.pos
		var r := float(town.radius) + 7.0
		for k in 3:
			var a := rng.randf() * TAU
			var p := c + Vector2(cos(a), sin(a)) * r
			var h := height_at(p.x, p.y)
			if h < 1.5:
				continue
			var kind := "moto" if k == 2 else "car"
			var model: String = "motorcycle" if kind == "moto" else RoyaleVehicle.CARS[rng.randi_range(0, RoyaleVehicle.CARS.size() - 1)]
			vehicle_spawns.append({"kind": kind, "model": model, "pos": Vector3(p.x, h + 0.4, p.y), "yaw": a + PI * 0.5})
	if island2.is_empty():
		return
	var dir: Vector2 = Vector2(island2.center).normalized()
	# Two ferries on the main island's shore facing the strait, bows to the beach
	for side in [-1.0, 1.0]:
		var perp: Vector2 = Vector2(-dir.y, dir.x) * float(side) * 22.0
		var p := _shore_from(Vector2.ZERO + perp, dir)
		if p != Vector2.INF:
			var w := p + dir * 11.0
			vehicle_spawns.append({"kind": "boat", "model": "", "pos": Vector3(w.x, WATER_Y, w.y), "yaw": atan2(dir.x, dir.y)})
	# One at Isla Verde, bow toward its beach
	var q := _shore_from(Vector2(island2.center), -dir)
	if q != Vector2.INF:
		var w2 := q - dir * 11.0
		vehicle_spawns.append({"kind": "boat", "model": "", "pos": Vector3(w2.x, WATER_Y, w2.y), "yaw": atan2(-dir.x, -dir.y)})

## Walks from 'from' along 'dir' until the water is deep enough for a ferry.
func _shore_from(from: Vector2, dir: Vector2) -> Vector2:
	var p := from
	var was_land := false
	for i in 500:
		p += dir * 2.0
		var h := height_at(p.x, p.y)
		if h > 0.5:
			was_land = true
		elif was_land and h < -2.0:
			return p
	return Vector2.INF

func random_land_point(margin := 120.0) -> Vector3:
	for i in 60:
		var p := Vector2(rng.randf_range(-MAP_SIZE * 0.5 + margin, MAP_SIZE * 0.5 - margin), rng.randf_range(-MAP_SIZE * 0.5 + margin, MAP_SIZE * 0.5 - margin))
		var h := height_at(p.x, p.y)
		if h > 1.0:
			return Vector3(p.x, h, p.y)
	return Vector3(0, height_at(0, 0), 0)
