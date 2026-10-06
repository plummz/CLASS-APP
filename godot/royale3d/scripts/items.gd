class_name Items
extends RefCounted
## Weapon, ammo, armour and healing data for Battle Royale 3D.
## Damage is per bullet; spread is in degrees; range is the distance (m) after which damage
## starts to fall off; rpm is rounds per minute. Inspired by PUBG / Rules of Survival classes.

const GUN_DIR := "res://assets/guns/"

const AMMO := {
	"9mm": {"name": "9mm", "color": Color("f2c94c"), "box": 30},
	"556": {"name": "5.56mm", "color": Color("6fcf97"), "box": 30},
	"762": {"name": "7.62mm", "color": Color("eb5757"), "box": 20},
	"12g": {"name": "12 Gauge", "color": Color("bb6bd9"), "box": 10},
}

const GUNS := {
	"p92":     {"name": "P92",      "kind": "pistol",  "model": "blaster-b", "ammo": "9mm", "dmg": 24, "rpm": 330,  "auto": false, "mag": 15,  "reload": 1.5, "spread": 1.8, "aim_spread": 0.7,  "range": 60.0,  "recoil": 1.0, "pellets": 1, "zoom": 1.2, "tier": 0},
	"r1895":   {"name": "R1895",    "kind": "pistol",  "model": "blaster-k", "ammo": "9mm", "dmg": 52, "rpm": 110,  "auto": false, "mag": 7,   "reload": 2.6, "spread": 1.2, "aim_spread": 0.4,  "range": 70.0,  "recoil": 2.6, "pellets": 1, "zoom": 1.3, "tier": 0},
	"ump":     {"name": "UMP45",    "kind": "smg",     "model": "blaster-i", "ammo": "9mm", "dmg": 20, "rpm": 650,  "auto": true,  "mag": 30,  "reload": 2.1, "spread": 2.0, "aim_spread": 0.9,  "range": 90.0,  "recoil": 0.55, "pellets": 1, "zoom": 1.35, "tier": 1},
	"vector":  {"name": "Vector",   "kind": "smg",     "model": "blaster-o", "ammo": "9mm", "dmg": 17, "rpm": 1000, "auto": true,  "mag": 25,  "reload": 1.9, "spread": 2.2, "aim_spread": 1.0,  "range": 70.0,  "recoil": 0.5, "pellets": 1, "zoom": 1.35, "tier": 1},
	"s686":    {"name": "S686",     "kind": "shotgun", "model": "blaster-l", "ammo": "12g", "dmg": 13, "rpm": 180,  "auto": false, "mag": 2,   "reload": 2.4, "spread": 5.0, "aim_spread": 4.0,  "range": 22.0,  "recoil": 3.0, "pellets": 9, "zoom": 1.2, "tier": 1},
	"m416":    {"name": "M416",     "kind": "ar",      "model": "blaster-n", "ammo": "556", "dmg": 31, "rpm": 680,  "auto": true,  "mag": 30,  "reload": 2.1, "spread": 1.4, "aim_spread": 0.45, "range": 220.0, "recoil": 0.75, "pellets": 1, "zoom": 1.6, "tier": 2},
	"akm":     {"name": "AKM",      "kind": "ar",      "model": "blaster-q", "ammo": "762", "dmg": 36, "rpm": 600,  "auto": true,  "mag": 30,  "reload": 2.4, "spread": 1.7, "aim_spread": 0.6,  "range": 200.0, "recoil": 1.25, "pellets": 1, "zoom": 1.6, "tier": 2},
	"sks":     {"name": "SKS",      "kind": "dmr",     "model": "blaster-d", "ammo": "762", "dmg": 53, "rpm": 240,  "auto": false, "mag": 10,  "reload": 2.8, "spread": 1.2, "aim_spread": 0.15, "range": 400.0, "recoil": 1.6, "pellets": 1, "zoom": 4.0, "tier": 3},
	"kar98k":  {"name": "Kar98k",   "kind": "sniper",  "model": "blaster-e", "ammo": "762", "dmg": 86, "rpm": 45,   "auto": false, "mag": 5,   "reload": 3.6, "spread": 2.5, "aim_spread": 0.05, "range": 600.0, "recoil": 3.0, "pellets": 1, "zoom": 6.0, "tier": 3},
	# Airdrop only
	"awm":     {"name": "AWM",      "kind": "sniper",  "model": "blaster-f", "ammo": "762", "dmg": 120, "rpm": 40,  "auto": false, "mag": 5,   "reload": 4.0, "spread": 2.5, "aim_spread": 0.03, "range": 800.0, "recoil": 3.2, "pellets": 1, "zoom": 8.0, "tier": 4, "airdrop": true},
	"m249":    {"name": "M249",     "kind": "lmg",     "model": "blaster-a", "ammo": "556", "dmg": 30, "rpm": 780,  "auto": true,  "mag": 100, "reload": 5.0, "spread": 1.8, "aim_spread": 0.7,  "range": 200.0, "recoil": 0.65, "pellets": 1, "zoom": 1.6, "tier": 4, "airdrop": true},
}

## Ground loot weights by building tier (0 = houses, 1 = town centre, 2 = military base).
const GUN_WEIGHTS := [
	{"p92": 30, "r1895": 12, "ump": 18, "vector": 10, "s686": 16, "m416": 6, "akm": 6, "sks": 1, "kar98k": 1},
	{"p92": 14, "r1895": 8, "ump": 18, "vector": 12, "s686": 14, "m416": 14, "akm": 12, "sks": 4, "kar98k": 4},
	{"p92": 4, "r1895": 4, "ump": 10, "vector": 10, "s686": 8, "m416": 22, "akm": 20, "sks": 11, "kar98k": 11},
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
