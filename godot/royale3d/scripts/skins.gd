class_name Skins
extends RefCounted
## Weapon finishes and soldier outfits sold in the Battle Royale shop (features/royale3d/shop.js
## keeps the same ids, names and prices). Everything is drawn by two shaders, so a skin is just
## a set of colours and a style:
##   weapon styles — solid, gradient, camo, flow (animated stripes), pulse, prism (holographic),
##                   gold. Upgrades (level 2–3) add shine and a moving highlight sweep.
##   outfits       — recolour the uniform/gear (low-saturation pixels) with a camo pattern; skin
##                   tones and lenses keep their colours. Legendary outfits glow.
## Equipped skins come from the page (localStorage 'rl3d_equip_v1', 'rl3d_owned_v1').

const WEAPON := {
	# Common
	"olive":    {"name": "Olive Drab",     "tier": "common",    "style": "solid",    "a": Color("5b6b3c"), "b": Color("3e4a29")},
	"desert":   {"name": "Desert Tan",     "tier": "common",    "style": "solid",    "a": Color("c2a878"), "b": Color("9c8459")},
	"arctic":   {"name": "Arctic White",   "tier": "common",    "style": "solid",    "a": Color("e9eef2"), "b": Color("b9c3cc")},
	"midnight": {"name": "Midnight",       "tier": "common",    "style": "solid",    "a": Color("1c1f26"), "b": Color("0d0f13")},
	# Rare
	"sunset":   {"name": "Sunset Fade",    "tier": "rare",      "style": "gradient", "a": Color("ff7a18"), "b": Color("c2185b")},
	"ocean":    {"name": "Deep Ocean",     "tier": "rare",      "style": "gradient", "a": Color("1ec8c8"), "b": Color("102a6b")},
	"toxic":    {"name": "Toxic Waste",    "tier": "rare",      "style": "gradient", "a": Color("b6ff2e"), "b": Color("102010")},
	"jungle":   {"name": "Jungle Camo",    "tier": "rare",      "style": "camo",     "a": Color("4c6b2f"), "b": Color("2b2416"), "c": Color("8a7a4a")},
	# Epic
	"lava":     {"name": "Molten Core",    "tier": "epic",      "style": "flow",     "a": Color("2a0a05"), "b": Color("ff5a1a"), "glow": 2.2},
	"aurora":   {"name": "Aurora",         "tier": "epic",      "style": "flow",     "a": Color("1b1240"), "b": Color("3cf2c8"), "glow": 1.8},
	"circuit":  {"name": "Circuit Pulse",  "tier": "epic",      "style": "pulse",    "a": Color("06140c"), "b": Color("29ff7a"), "glow": 2.0},
	"royal":    {"name": "Royal Velvet",   "tier": "epic",      "style": "gradient", "a": Color("6a1bb3"), "b": Color("f2c94c"), "glow": 0.4},
	# Legendary
	"prism":    {"name": "Prism",          "tier": "legendary", "style": "prism",    "a": Color.WHITE,     "b": Color.WHITE,     "glow": 0.8},
	"inferno":  {"name": "Inferno Dragon", "tier": "legendary", "style": "flow",     "a": Color("140202"), "b": Color("ffb000"), "glow": 3.5},
	"phantom":  {"name": "Neon Phantom",   "tier": "legendary", "style": "pulse",    "a": Color("05070d"), "b": Color("37d6ff"), "glow": 3.2},
	"gold":     {"name": "24K Gold",       "tier": "legendary", "style": "gold",     "a": Color("ffd45a"), "b": Color("b8860b"), "glow": 0.3},
}

const OUTFIT := {
	"standard": {"name": "Standard Issue", "tier": "common",    "a": Color.WHITE,     "b": Color.WHITE,     "c": Color.WHITE,     "pack": Color("3b3f2c"), "mix": 0.0},
	"woodland": {"name": "Woodland",       "tier": "common",    "a": Color("4a5a2e"), "b": Color("2e2a1d"), "c": Color("6f6a45"), "pack": Color("4a5a2e"), "mix": 0.85},
	"sand":     {"name": "Sandstorm",      "tier": "common",    "a": Color("c9b083"), "b": Color("8f7550"), "c": Color("e2d3ae"), "pack": Color("a68c62"), "mix": 0.85},
	"urban":    {"name": "Urban Grey",     "tier": "common",    "a": Color("6d7378"), "b": Color("33373b"), "c": Color("a3a8ac"), "pack": Color("2b2e31"), "mix": 0.85},
	"snow":     {"name": "Snow Ops",       "tier": "rare",      "a": Color("eef2f5"), "b": Color("a9b4bd"), "c": Color("d4dbe1"), "pack": Color("dfe5ea"), "mix": 0.9},
	"navy":     {"name": "Navy Digital",   "tier": "rare",      "a": Color("23365c"), "b": Color("101a2e"), "c": Color("4c6a9c"), "pack": Color("1b2a48"), "mix": 0.9, "scale": 22.0},
	"nightops": {"name": "Night Ops",      "tier": "rare",      "a": Color("17181b"), "b": Color("0a0a0c"), "c": Color("5a1414"), "pack": Color("111214"), "mix": 0.9},
	"tiger":    {"name": "Tiger Stripe",   "tier": "epic",      "a": Color("3c5a22"), "b": Color("0c0c08"), "c": Color("8a6a2a"), "pack": Color("2f4a1a"), "mix": 0.95, "scale": 3.5},
	"crimson":  {"name": "Crimson Guard",  "tier": "epic",      "a": Color("7a0f16"), "b": Color("2a0508"), "c": Color("c23a3a"), "pack": Color("5a0a10"), "mix": 0.95, "glow": 0.6, "glow_color": Color("ff3b3b")},
	"ghost":    {"name": "Neon Ghost",     "tier": "legendary", "a": Color("0c0f14"), "b": Color("05070a"), "c": Color("1a2a33"), "pack": Color("0c0f14"), "mix": 1.0, "glow": 2.2, "glow_color": Color("37d6ff")},
	"general":  {"name": "Golden General", "tier": "legendary", "a": Color("d4a62a"), "b": Color("6b4e12"), "c": Color("f3d27a"), "pack": Color("8a6a1a"), "mix": 1.0, "glow": 0.5, "glow_color": Color("ffd45a"), "metal": 0.7},
}

const BOT_OUTFITS := ["standard", "woodland", "sand", "urban", "snow", "navy", "nightops"]

# ── Weapon finish shader ─────────────────────────────────────

const WEAPON_SHADER := """
shader_type spatial;
uniform vec3 base_color : source_color = vec3(0.5);
uniform vec3 col_a : source_color = vec3(1.0);
uniform vec3 col_b : source_color = vec3(1.0);
uniform vec3 col_c : source_color = vec3(1.0);
uniform int style = 0;          // 0 none, 1 solid, 2 gradient, 3 camo, 4 flow, 5 pulse, 6 prism, 7 gold
uniform float glow = 0.0;
uniform float level = 1.0;      // 1..3 upgrades
uniform float len_inv = 0.2;    // 1 / model length along its barrel axis (model X)
varying vec3 lp;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void vertex() { lp = VERTEX; }
void fragment() {
	float l = dot(base_color, vec3(0.299, 0.587, 0.114));
	float shade = 0.42 + l * 1.15;
	float t = lp.x * len_inv;                 // 0 at the grip .. 1 at the muzzle
	vec3 c = base_color;
	vec3 e = vec3(0.0);
	float metal = 0.25;
	float rough = 0.55;
	if (style == 1) { c = col_a * shade; }
	else if (style == 2) { c = mix(col_a, col_b, clamp(t + lp.y * len_inv * 0.8, 0.0, 1.0)) * shade; e = mix(col_a, col_b, t) * glow * 0.25; }
	else if (style == 3) { float k = n(lp.xy * len_inv * 9.0) + 0.5 * n(lp.zy * len_inv * 17.0);
		c = (k < 0.6 ? col_a : (k < 0.95 ? col_b : col_c)) * shade; }
	else if (style == 4) { float f = fract(t * 3.0 + lp.y * len_inv * 2.0 - TIME * 0.35);
		float band = smoothstep(0.35, 0.5, f) * (1.0 - smoothstep(0.5, 0.65, f));
		c = mix(col_a * shade, col_b, band * 0.9); e = col_b * band * glow; metal = 0.5; rough = 0.35; }
	else if (style == 5) { float p = 0.5 + 0.5 * sin(TIME * 3.0 - t * 14.0);
		float lines = step(0.92, fract(t * 24.0)) + step(0.94, fract(lp.y * len_inv * 30.0));
		c = col_a * shade + col_b * lines * 0.6; e = col_b * (lines * p) * glow; metal = 0.6; rough = 0.3; }
	else if (style == 6) { vec3 hue = 0.5 + 0.5 * cos(6.2831 * (t * 1.3 + dot(NORMAL, vec3(0.4, 0.6, 0.2)) + TIME * 0.12 + vec3(0.0, 0.33, 0.67)));
		c = hue * (0.55 + l * 0.6); e = hue * glow * 0.35; metal = 0.85; rough = 0.18; }
	else if (style == 7) { c = mix(col_b, col_a, 0.35 + l) ; metal = 0.95; rough = 0.22; e = col_a * glow * 0.2; }
	// Upgrades: level 2 adds shine, level 3 adds a moving highlight sweep along the gun
	if (style > 0 && level >= 2.0) { metal = mix(metal, 0.9, 0.35); rough *= 0.7; }
	if (style > 0 && level >= 3.0) { float s = fract(t - TIME * 0.45); float sweep = smoothstep(0.0, 0.04, s) * (1.0 - smoothstep(0.04, 0.12, s));
		e += vec3(1.0) * sweep * 0.9; }
	ALBEDO = c;
	METALLIC = metal;
	ROUGHNESS = rough;
	EMISSION = e;
}
"""

static var _weapon_shader: Shader
static var _outfit_shader: Shader

## Replace a gun model's materials with the finish (keeps each part's own base colour).
static func apply_weapon(gun_root: Node3D, skin_id: String, level := 1, model_length := 5.0) -> void:
	if skin_id.is_empty() or not WEAPON.has(skin_id):
		return
	if _weapon_shader == null:
		_weapon_shader = Shader.new()
		_weapon_shader.code = WEAPON_SHADER
	var s: Dictionary = WEAPON[skin_id]
	var style := ["none", "solid", "gradient", "camo", "flow", "pulse", "prism", "gold"].find(String(s.style))
	for mi: MeshInstance3D in gun_root.find_children("*", "MeshInstance3D", true, false):
		if mi.mesh == null:
			continue
		for i in mi.mesh.get_surface_count():
			var base := Color(0.5, 0.5, 0.5)
			var m := mi.mesh.surface_get_material(i)
			if m is BaseMaterial3D:
				base = (m as BaseMaterial3D).albedo_color
			var sm := ShaderMaterial.new()
			sm.shader = _weapon_shader
			sm.set_shader_parameter("base_color", base)
			sm.set_shader_parameter("col_a", s.a)
			sm.set_shader_parameter("col_b", s.b)
			sm.set_shader_parameter("col_c", s.get("c", s.b))
			sm.set_shader_parameter("style", style)
			sm.set_shader_parameter("glow", float(s.get("glow", 0.0)) * (1.0 + 0.35 * (level - 1)))
			sm.set_shader_parameter("level", float(level))
			sm.set_shader_parameter("len_inv", 1.0 / maxf(0.1, model_length))
			mi.set_surface_override_material(i, sm)

# ── Outfit shader ────────────────────────────────────────────

const OUTFIT_SHADER := """
shader_type spatial;
uniform sampler2D albedo_tex : source_color, filter_linear_mipmap;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap;
uniform bool has_normal = false;
uniform vec3 c1 : source_color = vec3(1.0);
uniform vec3 c2 : source_color = vec3(1.0);
uniform vec3 c3 : source_color = vec3(1.0);
uniform float mix_amount = 0.0;
uniform float pattern = 9.0;
uniform vec3 glow_color : source_color = vec3(0.0);
uniform float glow = 0.0;
uniform float metal = 0.0;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void fragment() {
	vec4 a = texture(albedo_tex, UV);
	float l = dot(a.rgb, vec3(0.299, 0.587, 0.114));
	float sat = max(a.r, max(a.g, a.b)) - min(a.r, min(a.g, a.b));
	float gear = 1.0 - smoothstep(0.10, 0.24, sat);        // uniform, vest, helmet, boots (greys)
	float k = n(UV * pattern) * 0.65 + n(UV * pattern * 2.7) * 0.35;
	vec3 camo = k < 0.45 ? c1 : (k < 0.62 ? c2 : c3);
	vec3 col = mix(a.rgb, camo * (0.45 + l * 1.25), mix_amount * gear);
	ALBEDO = col;
	if (has_normal) { NORMAL_MAP = texture(normal_tex, UV).rgb; }
	ROUGHNESS = mix(0.85, 0.35, metal * gear);
	METALLIC = metal * gear;
	float edge = step(0.66, k) * (1.0 - step(0.7, k));
	EMISSION = glow_color * glow * gear * (edge + 0.08);
}
"""

static var _outfit_cache := {}

static func apply_outfit(soldier: Node3D, outfit_id: String) -> void:
	if not OUTFIT.has(outfit_id):
		outfit_id = "standard"
	var o: Dictionary = OUTFIT[outfit_id]
	var mi: MeshInstance3D = soldier.get("body_mesh")
	if mi != null and mi.mesh != null:
		var base := mi.mesh.surface_get_material(0) as BaseMaterial3D
		if outfit_id == "standard" or base == null:
			mi.set_surface_override_material(0, null)
		else:
			if not _outfit_cache.has(outfit_id):
				if _outfit_shader == null:
					_outfit_shader = Shader.new()
					_outfit_shader.code = OUTFIT_SHADER
				var sm := ShaderMaterial.new()
				sm.shader = _outfit_shader
				sm.set_shader_parameter("albedo_tex", base.albedo_texture)
				sm.set_shader_parameter("normal_tex", base.normal_texture)
				sm.set_shader_parameter("has_normal", base.normal_texture != null)
				sm.set_shader_parameter("c1", o.a)
				sm.set_shader_parameter("c2", o.b)
				sm.set_shader_parameter("c3", o.c)
				sm.set_shader_parameter("mix_amount", float(o.mix))
				sm.set_shader_parameter("pattern", float(o.get("scale", 9.0)))
				sm.set_shader_parameter("glow_color", o.get("glow_color", Color.BLACK))
				sm.set_shader_parameter("glow", float(o.get("glow", 0.0)))
				sm.set_shader_parameter("metal", float(o.get("metal", 0.0)))
				_outfit_cache[outfit_id] = sm
			mi.set_surface_override_material(0, _outfit_cache[outfit_id])
	# Backpack in the outfit's colour
	var back: Node3D = soldier.get("back")
	if back == null:
		return
	for c in back.get_children():
		if c.name == "Backpack":
			c.queue_free()
	var pack := load("res://assets/props/backpack_b.scn").instantiate() as Node3D
	pack.name = "Backpack"
	pack.scale = Vector3.ONE * 0.36
	pack.position = Vector3(0.0, 0.05, -0.2)
	pack.rotation_degrees = Vector3(0, 180, 0)
	var tint := StandardMaterial3D.new()
	tint.albedo_color = o.pack
	tint.roughness = 0.9
	for m: MeshInstance3D in pack.find_children("*", "MeshInstance3D", true, false):
		m.material_override = tint
		m.visibility_range_end = 120.0
	back.add_child(pack)

static func weapon_price(skin_id: String) -> int:
	return {"common": 80, "rare": 200, "epic": 450, "legendary": 900}.get(String(WEAPON.get(skin_id, {}).get("tier", "")), 0)

## Equipped skins / outfit and upgrade levels from the page.
static func read_loadout() -> Dictionary:
	var out := {"weapon": "", "outfit": "standard", "level": 1}
	if not OS.has_feature("web"):
		return out
	var raw = JavaScriptBridge.eval("""(function(){try{var s=window.parent.localStorage;return JSON.stringify({e:JSON.parse(s.getItem('rl3d_equip_v1')||'{}'),o:JSON.parse(s.getItem('rl3d_owned_v1')||'{}')});}catch(e){return '{}';}})()""", true)
	var d = JSON.parse_string(String(raw)) if raw != null else null
	if typeof(d) != TYPE_DICTIONARY:
		return out
	var e: Dictionary = d.get("e", {})
	var owned: Dictionary = d.get("o", {})
	var w := String(e.get("weapon", ""))
	var o := String(e.get("outfit", "standard"))
	var weapons: Dictionary = owned.get("weapon", {})
	var outfits: Array = owned.get("outfit", [])
	if WEAPON.has(w) and weapons.has(w):
		out.weapon = w
		out.level = clampi(int(weapons[w]), 1, 3)
	if OUTFIT.has(o) and (o == "standard" or outfits.has(o)):
		out.outfit = o
	return out
