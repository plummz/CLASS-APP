class_name Items
extends RefCounted
## Weapon, ammo, armour and healing data for Battle Royale 3D.
## Damage is per bullet; spread is in degrees; range is the distance (m) after which damage
## starts to fall off; rpm is rounds per minute. Inspired by PUBG / Rules of Survival classes.

const GUN_DIR := "res://assets/guns_q/"
## Real length of each gun model in metres (the Quaternius models are ~6x scale, barrel along +X)

const AMMO := {
	"9mm": {"name": "9mm", "color": Color("f2c94c"), "box": 30},
	"556": {"name": "5.56mm", "color": Color("6fcf97"), "box": 30},
	"762": {"name": "7.62mm", "color": Color("eb5757"), "box": 20},
	"12g": {"name": "12 Gauge", "color": Color("bb6bd9"), "box": 10},
	"rocket": {"name": "Rocket", "color": Color("8a6a3a"), "box": 2},
}

const GUNS := {
	"p92":     {"name": "P92",      "kind": "pistol",  "model": "pistol", "length": 0.21, "ammo": "9mm", "dmg": 24, "rpm": 330,  "auto": false, "mag": 15,  "reload": 1.5, "spread": 1.8, "aim_spread": 0.7,  "range": 60.0,  "recoil": 1.0, "pellets": 1, "zoom": 1.2, "tier": 0},
	"r1895":   {"name": "R1895",    "kind": "pistol",  "model": "revolver", "length": 0.27, "ammo": "9mm", "dmg": 52, "rpm": 110,  "auto": false, "mag": 7,   "reload": 2.6, "spread": 1.2, "aim_spread": 0.4,  "range": 70.0,  "recoil": 2.6, "pellets": 1, "zoom": 1.3, "tier": 0},
	"ump":     {"name": "UMP45",    "kind": "smg",     "model": "submachine_gun", "length": 0.66, "ammo": "9mm", "dmg": 20, "rpm": 650,  "auto": true,  "mag": 30,  "reload": 2.1, "spread": 2.0, "aim_spread": 0.9,  "range": 90.0,  "recoil": 0.55, "pellets": 1, "zoom": 1.35, "tier": 1},
	"vector":  {"name": "Vector",   "kind": "smg",     "model": "submachine_gun_nsp3juku73", "length": 0.62, "ammo": "9mm", "dmg": 17, "rpm": 1000, "auto": true,  "mag": 25,  "reload": 1.9, "spread": 2.2, "aim_spread": 1.0,  "range": 70.0,  "recoil": 0.5, "pellets": 1, "zoom": 1.35, "tier": 1},
	"s686":    {"name": "S686",     "kind": "shotgun", "model": "shotgun", "length": 1.02, "ammo": "12g", "dmg": 13, "rpm": 180,  "auto": false, "mag": 2,   "reload": 2.4, "spread": 5.0, "aim_spread": 4.0,  "range": 22.0,  "recoil": 3.0, "pellets": 9, "zoom": 1.2, "tier": 1},
	"m416":    {"name": "M416",     "kind": "ar",      "model": "assault_rifle", "length": 0.86, "ammo": "556", "dmg": 31, "rpm": 680,  "auto": true,  "mag": 30,  "reload": 2.1, "spread": 1.4, "aim_spread": 0.45, "range": 220.0, "recoil": 0.75, "pellets": 1, "zoom": 1.6, "tier": 2},
	"akm":     {"name": "AKM",      "kind": "ar",      "model": "assault_rifle_fplucho45c", "length": 0.88, "ammo": "762", "dmg": 36, "rpm": 600,  "auto": true,  "mag": 30,  "reload": 2.4, "spread": 1.7, "aim_spread": 0.6,  "range": 200.0, "recoil": 1.25, "pellets": 1, "zoom": 1.6, "tier": 2},
	"sks":     {"name": "SKS",      "kind": "dmr",     "model": "sniper_rifle", "length": 1.02, "ammo": "762", "dmg": 53, "rpm": 240,  "auto": false, "mag": 10,  "reload": 2.8, "spread": 1.2, "aim_spread": 0.15, "range": 400.0, "recoil": 1.6, "pellets": 1, "zoom": 4.0, "tier": 3},
	"kar98k":  {"name": "Kar98k",   "kind": "sniper",  "model": "sniper_rifle_asomzierq3", "length": 1.12, "ammo": "762", "dmg": 86, "rpm": 45,   "auto": false, "mag": 5,   "reload": 3.6, "spread": 2.5, "aim_spread": 0.05, "range": 600.0, "recoil": 3.0, "pellets": 1, "zoom": 6.0, "tier": 3},
	# Airdrop only
	"awm":     {"name": "AWM",      "kind": "sniper",  "model": "sniper_rifle_tkabjaeofl", "length": 1.2, "ammo": "762", "dmg": 120, "rpm": 40,  "auto": false, "mag": 5,   "reload": 4.0, "spread": 2.5, "aim_spread": 0.03, "range": 800.0, "recoil": 3.2, "pellets": 1, "zoom": 8.0, "tier": 4, "airdrop": true},
	"rpg":     {"name": "RPG-7",    "kind": "launcher", "model": "props:rocket_launcher", "length": 1.0, "ammo": "rocket", "dmg": 150, "rpm": 40, "auto": false, "mag": 1, "reload": 3.0, "spread": 1.0, "aim_spread": 0.25, "range": 300.0, "recoil": 3.5, "pellets": 1, "zoom": 1.8, "tier": 4, "airdrop": true, "splash": 115.0, "radius": 6.5, "speed": 62.0},
	"gatling": {"name": "Gatling",  "kind": "minigun", "model": "", "length": 1.15, "ammo": "556", "dmg": 21, "rpm": 1500, "auto": true, "mag": 200, "reload": 6.5, "spread": 3.0, "aim_spread": 1.7, "range": 160.0, "recoil": 0.32, "pellets": 1, "zoom": 1.3, "tier": 4, "airdrop": true, "spin": 0.85, "heavy": 0.72},
	"m249":    {"name": "M249",     "kind": "lmg",     "model": "assault_rifle_bgvuu4cumv", "length": 1.02, "ammo": "556", "dmg": 30, "rpm": 780,  "auto": true,  "mag": 100, "reload": 5.0, "spread": 1.8, "aim_spread": 0.7,  "range": 200.0, "recoil": 0.65, "pellets": 1, "zoom": 1.6, "tier": 4, "airdrop": true},
}

## Ground loot weights by building tier (0 = houses, 1 = town centre, 2 = military base).
const GUN_WEIGHTS := [
	{"p92": 30, "r1895": 12, "ump": 18, "vector": 10, "s686": 16, "m416": 6, "akm": 6, "sks": 1, "kar98k": 1},
	{"p92": 14, "r1895": 8, "ump": 18, "vector": 12, "s686": 14, "m416": 14, "akm": 12, "sks": 4, "kar98k": 4},
	{"p92": 4, "r1895": 4, "ump": 10, "vector": 10, "s686": 8, "m416": 22, "akm": 20, "sks": 11, "kar98k": 11, "rpg": 2, "gatling": 2},
]

const MEDS := {
	"bandage":  {"name": "Bandage",       "heal": 10, "cap": 75,  "time": 3.5, "max": 10, "color": Color("f2f2f2")},
	"firstaid": {"name": "First Aid Kit", "heal": 75, "cap": 75,  "time": 6.0, "max": 5,  "color": Color("eb5757")},
	"medkit":   {"name": "Med Kit",       "heal": 100, "cap": 100, "time": 8.0, "max": 2,  "color": Color("56ccf2")},
	"drink":    {"name": "Energy Drink",  "boost": 40, "time": 4.0, "max": 5,  "color": Color("f2994a")},
}

## Damage reduction by level (index 1-3). Durability is how much damage it absorbs before breaking.
const VEST_REDUCTION := [0.0, 0.30, 0.40, 0.55]
const HELMET_REDUCTION := [0.0, 0.30, 0.40, 0.55]
const ARMOR_DURABILITY := [0.0, 200.0, 220.0, 250.0]

const MAX_AMMO := 240
const MAX_GRENADES := 4

static func gun(id: String) -> Dictionary:
	return GUNS.get(id, GUNS["p92"])

static func seconds_per_shot(id: String) -> float:
	return 60.0 / float(gun(id).rpm)

## Damage after distance fall-off (full damage up to the gun's range, half at 2.5x range).
static func damage_at(id: String, distance: float) -> float:
	var g := gun(id)
	var r: float = g.range
	if distance <= r:
		return float(g.dmg)
	return float(g.dmg) * clampf(1.0 - (distance - r) / (r * 3.0), 0.5, 1.0)

static func pick_weighted(weights: Dictionary, rng: RandomNumberGenerator) -> String:
	var total := 0
	for k in weights: total += int(weights[k])
	var roll := rng.randi_range(1, maxi(1, total))
	for k in weights:
		roll -= int(weights[k])
		if roll <= 0:
			return String(k)
	return String(weights.keys()[0])

static func describe(item: Dictionary) -> String:
	match String(item.type):
		"gun": return String(gun(String(item.id)).name)
		"ammo": return "%s ×%d" % [AMMO[String(item.id)].name, int(item.count)]
		"med": return "%s ×%d" % [MEDS[String(item.id)].name, int(item.count)]
		"vest": return "Level %d Vest" % int(item.level)
		"helmet": return "Level %d Helmet" % int(item.level)
		"grenade": return "Frag Grenade ×%d" % int(item.count)
	return "Item"

# ── Gun models ───────────────────────────────────────────────

static var _scene_cache := {}
static var _bounds_cache := {}

## A gun ready to hold: barrel pointing -Z, grip at the origin, real size, with a "Muzzle"
## marker at the barrel tip. skin = weapon finish id ("" = factory colours).
static func gun_node(id: String, skin := "", level := 1) -> Node3D:
	var data := gun(id)
	var holder := Node3D.new()
	holder.name = "Gun"
	var model_path := String(data.model)
	var length := float(data.get("length", 0.8))
	var muzzle := Marker3D.new()
	muzzle.name = "Muzzle"
	if model_path.is_empty():
		_build_gatling(holder)
		muzzle.position = Vector3(0, 0.02, -length)
	else:
		var path := ("res://assets/props/" + model_path.trim_prefix("props:") + ".scn") if model_path.begins_with("props:") else (GUN_DIR + model_path + ".scn")
		if not _scene_cache.has(path):
			_scene_cache[path] = load(path) if ResourceLoader.exists(path) else null
		if _scene_cache[path] == null:
			holder.add_child(muzzle)
			return holder
		var model: Node3D = _scene_cache[path].instantiate()
		if not _bounds_cache.has(path):
			_bounds_cache[path] = _bounds(model)
		var box: AABB = _bounds_cache[path]
		var sc := length / maxf(0.01, box.size.x)
		model.scale = Vector3.ONE * sc
		model.rotation.y = PI * 0.5          # barrel +X -> -Z
		holder.add_child(model)
		var tip := box.position.x + box.size.x
		muzzle.position = Vector3(0, (box.position.y + box.size.y * 0.72) * sc, -tip * sc)
		for m: MeshInstance3D in model.find_children("*", "MeshInstance3D", true, false):
			m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			m.visibility_range_end = 140.0
		if not skin.is_empty():
			Skins.apply_weapon(model, skin, level, box.size.x)
	holder.add_child(muzzle)
	return holder

static func _bounds(root: Node3D) -> AABB:
	var box := AABB()
	var first := true
	for mi: MeshInstance3D in root.find_children("*", "MeshInstance3D", true, false):
		var t := Transform3D.IDENTITY
		var n: Node = mi
		while n != null and n != root:
			if n is Node3D: t = (n as Node3D).transform * t
			n = n.get_parent()
		var b := t * mi.get_aabb()
		box = b if first else box.merge(b)
		first = false
	return box

## The Gatling: six barrels on a spinning drum ("Barrels" spins while firing).
static func _build_gatling(holder: Node3D) -> void:
	var dark := StandardMaterial3D.new()
	dark.albedo_color = Color("2a2d31")
	dark.metallic = 0.8
	dark.roughness = 0.35
	var steel := StandardMaterial3D.new()
	steel.albedo_color = Color("6b7178")
	steel.metallic = 0.9
	steel.roughness = 0.25
	var olive := StandardMaterial3D.new()
	olive.albedo_color = Color("4a5232")
	olive.roughness = 0.7
	var body := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(0.16, 0.18, 0.42)
	bm.material = olive
	body.mesh = bm
	body.position = Vector3(0, 0.02, 0.02)
	holder.add_child(body)
	var handle := MeshInstance3D.new()
	var hm := BoxMesh.new()
	hm.size = Vector3(0.05, 0.16, 0.06)
	hm.material = dark
	handle.mesh = hm
	handle.position = Vector3(0, -0.1, 0.12)
	holder.add_child(handle)
	var box_mag := MeshInstance3D.new()
	var mm := BoxMesh.new()
	mm.size = Vector3(0.2, 0.16, 0.2)
	mm.material = olive
	box_mag.mesh = mm
	box_mag.position = Vector3(-0.17, -0.02, 0.0)
	holder.add_child(box_mag)
	var drum := Node3D.new()
	drum.name = "Barrels"
	drum.position = Vector3(0, 0.02, -0.2)
	holder.add_child(drum)
	for i in 6:
		var a := TAU * i / 6.0
		var b := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = 0.014
		cm.bottom_radius = 0.016
		cm.height = 0.78
		cm.radial_segments = 8
		cm.material = steel
		b.mesh = cm
		b.rotation.x = PI * 0.5
		b.position = Vector3(cos(a) * 0.045, sin(a) * 0.045, -0.36)
		drum.add_child(b)
	for z in [-0.05, -0.55, -0.72]:
		var ring := MeshInstance3D.new()
		var rm := CylinderMesh.new()
		rm.top_radius = 0.07
		rm.bottom_radius = 0.07
		rm.height = 0.03
		rm.material = dark
		ring.mesh = rm
		ring.rotation.x = PI * 0.5
		ring.position = Vector3(0, 0, z)
		drum.add_child(ring)
	for m: MeshInstance3D in holder.find_children("*", "MeshInstance3D", true, false):
		m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
