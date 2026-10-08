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

## VIP skins: one per weapon, animated in the shader (fire, lightning, void, ice), 3000 coins.
## Admins own them all. Fire skins also throw a few embers off the player's own gun.
const VIP_PRICE := 3000
const VIP := {
	"vip_akm":     {"name": "Ember Blaze",     "gun": "akm",     "style": "fire",    "a": Color("ff2a00"), "b": Color("ffb340"), "glow": 3.2, "fx": "embers"},
	"vip_m416":    {"name": "Arctic Storm",    "gun": "m416",    "style": "blizzard","a": Color("cfe9ff"), "b": Color("6fb7ff"), "glow": 1.6, "fx": "snow"},
	"vip_s686":    {"name": "Hellfire",        "gun": "s686",    "style": "lava",    "a": Color("ff3d00"), "b": Color("ffd000"), "glow": 3.6, "fx": "sparks"},
	"vip_m249":    {"name": "Thunder God",     "gun": "m249",    "style": "electric","a": Color("0a1430"), "b": Color("7fd4ff"), "glow": 3.2, "fx": "zaps"},
	"vip_r1895":   {"name": "Golden Dragon",   "gun": "r1895",   "style": "scales",  "a": Color("ffd45a"), "b": Color("8a5a00"), "glow": 1.2, "fx": ""},
	"vip_rpg":     {"name": "Solar Flare",     "gun": "rpg",     "style": "solar",   "a": Color("ff6a00"), "b": Color("ffd84a"), "glow": 1.3, "fx": "motes"},
	"vip_sks":     {"name": "Venom",           "gun": "sks",     "style": "acid",    "a": Color("0d2a08"), "b": Color("7dff2a"), "glow": 2.6, "fx": "bubbles"},
	"vip_vector":  {"name": "Cyber Pulse",     "gun": "vector",  "style": "circuit", "a": Color("120318"), "b": Color("ff3cf0"), "glow": 3.0, "fx": ""},
	"vip_ump":     {"name": "Galaxy",          "gun": "ump",     "style": "galaxy",  "a": Color("2a0a5c"), "b": Color("29d3ff"), "glow": 2.2, "fx": ""},
	"vip_gatling": {"name": "Nuclear Core",    "gun": "gatling", "style": "nuclear", "a": Color("0d1a05"), "b": Color("9cff1a"), "glow": 1.6, "fx": "motes"},
	"vip_awm":     {"name": "Void Reaper",     "gun": "awm",     "style": "void",    "a": Color("08020f"), "b": Color("b45cff"), "glow": 3.0, "fx": ""},
	"vip_p92":     {"name": "Frostbite",       "gun": "p92",     "style": "ice",     "a": Color("bff3ff"), "b": Color("4fc3ff"), "glow": 1.8, "fx": "glints"},
	"vip_kar98k":  {"name": "Nature's Wrath",  "gun": "kar98k",  "style": "nature",  "a": Color("1e4d1a"), "b": Color("9dff5a"), "glow": 1.8, "fx": "spores"},
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
uniform int style = 0;          // 0 none … 7 gold; VIP: 8 fire … 20 nature (see Skins.VIP)
uniform float glow = 0.0;
uniform float level = 1.0;      // 1..3 upgrades
uniform float len_inv = 0.2;    // 1 / model length along its barrel axis (model X)
uniform bool use_vertex_color = false;   // merged models keep each part's colour in the vertices
varying vec3 lp;
varying vec3 vcol;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void vertex() { lp = VERTEX; vcol = pow(COLOR.rgb, vec3(2.2)); }
void fragment() {
	vec3 base = use_vertex_color ? vcol : base_color;
	float l = dot(base, vec3(0.299, 0.587, 0.114));
	float shade = 0.42 + l * 1.15;
	float t = lp.x * len_inv;                 // 0 at the grip .. 1 at the muzzle
	vec3 c = base;
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
	if (style == 0) { c = base; }
	// VIP styles (every one is different; all animated in the shader)
	float tt = TIME;
	float yy = lp.y * len_inv;
	if (style == 8) {          // ember: flames racing toward the muzzle, constant red glow
		vec2 q = vec2(t * 7.0 - tt * 1.7, yy * 12.0 + tt * 0.8);
		float f = n(q) * 0.62 + n(q * 2.3 + vec2(-tt * 1.3, 0.0)) * 0.38;
		vec3 hot = mix(col_a, col_b, smoothstep(0.45, 0.85, f));
		float flame = smoothstep(0.32, 0.62, f);
		c = mix(vec3(0.06, 0.02, 0.01) + base * 0.12, hot * 0.7, flame);
		e = hot * glow * flame * (0.75 + 0.25 * sin(tt * 7.0 + t * 12.0)) + col_a * glow * 0.22;
		metal = 0.3; rough = 0.5;
	} else if (style == 9) {   // electric: lightning arcs crawling over a dark body
		float w = n(vec2(t * 9.0, tt * 3.0)) * 6.0;
		float arc = 1.0 - smoothstep(0.0, 0.09, abs(sin(yy * 40.0 + w + t * 20.0 - tt * 9.0)));
		float flick = step(0.35, n(vec2(tt * 14.0, t * 3.0)));
		c = col_a * (0.6 + l) + col_b * arc * 0.3;
		e = col_b * glow * (arc * flick + 0.12);
		metal = 0.7; rough = 0.25;
	} else if (style == 10) {  // void: swirling dark matter with a glowing rim and stars
		vec2 sw = vec2(t * 6.0 + sin(tt * 0.5 + yy * 9.0), yy * 9.0 - tt * 0.3);
		float v = pow(n(sw) * 0.7 + n(sw * 2.7) * 0.3, 2.0);
		float star = step(0.985, h(floor(vec2(t * 60.0, yy * 60.0) + floor(tt * 2.0))));
		c = col_a + col_b * v * 0.4;
		e = col_b * glow * v + vec3(1.0) * star * 2.0;
		metal = 0.5; rough = 0.3;
	} else if (style == 11) {  // frost: ice crystal facets with a cold shimmer
		float k = n(vec2(t * 14.0, yy * 14.0));
		c = mix(col_a, col_b, k) * (0.6 + l * 0.5);
		e = col_b * glow * (0.25 + 0.25 * sin(tt * 2.2 + t * 9.0)) * smoothstep(0.4, 0.8, k);
		metal = 0.6; rough = 0.08;
	} else if (style == 12) {  // blizzard: icy metal with snow streaks blowing across it
		float streak = smoothstep(0.75, 0.95, n(vec2(t * 30.0 + tt * 6.0, yy * 4.0 - tt)));
		float frost = n(vec2(t * 10.0, yy * 10.0));
		c = mix(col_b * 0.45, col_a, frost * 0.6) + vec3(1.0) * streak * 0.6;
		e = col_b * glow * 0.25 + vec3(0.8, 0.9, 1.0) * streak * glow * 0.5;
		metal = 0.75; rough = 0.15;
	} else if (style == 13) {  // lava: black rock with molten cracks that breathe
		vec2 cell = vec2(t * 10.0, yy * 10.0);
		float r1 = n(cell); float r2 = n(cell * 2.1 + 3.0);
		float crack = 1.0 - smoothstep(0.02, 0.09, abs(r1 - r2));
		float breathe = 0.7 + 0.3 * sin(tt * 2.5 + t * 6.0);
		c = vec3(0.05, 0.03, 0.03) + mix(col_a, col_b, r1) * crack * 0.5;
		e = mix(col_a, col_b, r1) * crack * glow * breathe;
		metal = 0.1; rough = 0.9;
	} else if (style == 14) {  // dragon scales: gold scales with a shimmer sweeping over them
		vec2 sc = vec2(t * 26.0, yy * 26.0);
		sc.x += step(1.0, mod(sc.y, 2.0)) * 0.5;
		float d = length(fract(sc) - vec2(0.5, 0.25));
		float scale = smoothstep(0.55, 0.35, d);
		float shim = smoothstep(0.85, 1.0, sin(t * 8.0 - tt * 3.0) * 0.5 + 0.5);
		c = mix(col_b, col_a, scale) * (0.6 + l * 0.6);
		e = col_a * glow * (scale * 0.12 + shim * 0.6);
		metal = 0.95; rough = 0.2;
	} else if (style == 15) {  // solar: boiling plasma with pulsing corona waves
		float pl = n(vec2(t * 8.0 + tt * 0.9, yy * 8.0 - tt * 0.7)) * 0.6 + n(vec2(t * 19.0 - tt * 1.5, yy * 19.0)) * 0.4;
		float wave = 0.5 + 0.5 * sin(t * 14.0 - tt * 5.0);
		vec3 sun = mix(col_a, col_b, pl);
		c = sun * 0.55;
		e = sun * glow * (0.25 + pl * 0.5) * (0.7 + wave * 0.4);
		metal = 0.2; rough = 0.4;
	} else if (style == 16) {  // acid: toxic slime bubbling and dripping down
		float drip = n(vec2(t * 12.0, yy * 6.0 + tt * 0.9));
		float bubble = smoothstep(0.82, 0.9, n(vec2(t * 30.0, yy * 30.0 - tt * 2.0)));
		c = mix(col_a, col_b * 0.7, drip) + col_b * bubble * 0.4;
		e = col_b * glow * (smoothstep(0.55, 0.8, drip) * 0.5 + bubble);
		metal = 0.2; rough = 0.25;
	} else if (style == 17) {  // circuit: neon traces with data pulses running along them
		vec2 g = fract(vec2(t * 18.0, yy * 18.0));
		float line = max(step(0.92, g.x), step(0.92, g.y)) * step(0.4, h(floor(vec2(t * 18.0, yy * 18.0))));
		float pulse = smoothstep(0.9, 1.0, fract(t * 3.0 - tt * 0.8));
		c = col_a + col_b * line * 0.3;
		e = col_b * glow * line * (0.3 + pulse * 1.5);
		metal = 0.8; rough = 0.2;
	} else if (style == 18) {  // galaxy: drifting coloured nebula with twinkling stars
		vec2 neb = vec2(t * 5.0 + tt * 0.1, yy * 5.0);
		float nb = n(neb) * 0.6 + n(neb * 2.5 - tt * 0.15) * 0.4;
		vec3 col = mix(col_a, col_b, nb) + vec3(0.6, 0.1, 0.5) * smoothstep(0.6, 0.9, nb);
		float star = step(0.98, h(floor(vec2(t * 70.0, yy * 70.0)))) * (0.5 + 0.5 * sin(tt * 4.0 + t * 50.0));
		c = col * 0.6;
		e = col * glow * 0.4 + vec3(1.0) * star * 2.5;
		metal = 0.4; rough = 0.25;
	} else if (style == 19) {  // nuclear: radioactive core pulsing out in rings
		float ring = 0.5 + 0.5 * sin(t * 30.0 - tt * 6.0);
		float hum = 0.6 + 0.4 * sin(tt * 9.0);
		c = col_a * (0.7 + l) + col_b * ring * 0.15;
		e = col_b * glow * pow(ring, 6.0) * hum + col_b * glow * 0.05;
		metal = 0.6; rough = 0.35;
	} else if (style == 20) {  // nature: vines and leaves swaying, glowing spores
		float vine = 1.0 - smoothstep(0.0, 0.12, abs(sin(t * 16.0 + sin(yy * 20.0 + tt) * 1.5)));
		float leaf = smoothstep(0.7, 0.85, n(vec2(t * 22.0, yy * 22.0 + sin(tt * 1.2) * 0.3)));
		float spore = step(0.985, h(floor(vec2(t * 50.0, yy * 50.0 - tt * 3.0))));
		c = mix(col_a, col_b * 0.6, max(vine * 0.7, leaf)) * (0.6 + l * 0.6);
		e = col_b * glow * (leaf * 0.35 + vine * 0.2) + vec3(1.0, 1.0, 0.6) * spore * 2.0;
		metal = 0.1; rough = 0.6;
	}
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
	if skin_id.is_empty() or not (WEAPON.has(skin_id) or VIP.has(skin_id)):
		return
	if _weapon_shader == null:
		_weapon_shader = Shader.new()
		_weapon_shader.code = WEAPON_SHADER
	var s: Dictionary = WEAPON[skin_id] if WEAPON.has(skin_id) else VIP[skin_id]
	if VIP.has(skin_id): level = 1
	var style := ["none", "solid", "gradient", "camo", "flow", "pulse", "prism", "gold", "fire", "electric", "void", "ice",
		"blizzard", "lava", "scales", "solar", "acid", "circuit", "galaxy", "nuclear", "nature"].find(String(s.style))
	for mi: MeshInstance3D in gun_root.find_children("*", "MeshInstance3D", true, false):
		if mi.mesh == null:
			continue
		for i in mi.mesh.get_surface_count():
			var base := Color(0.5, 0.5, 0.5)
			var m := mi.mesh.surface_get_material(i)
			var vcol := false
			if m is BaseMaterial3D:
				base = (m as BaseMaterial3D).albedo_color
				vcol = (m as BaseMaterial3D).vertex_color_use_as_albedo
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
			sm.set_shader_parameter("use_vertex_color", vcol)
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
		m.visibility_range_end = 60.0
		m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	back.add_child(pack)

static func weapon_price(skin_id: String) -> int:
	return {"common": 80, "rare": 200, "epic": 450, "legendary": 900}.get(String(WEAPON.get(skin_id, {}).get("tier", "")), 0)

## A few particles around the player's own VIP gun (embers, snow, sparks, bubbles, spores…).
## Ten or so particles, only on the player's guns, so it stays smooth.
static func add_embers(gun_root: Node3D, skin_id: String, length: float) -> void:
	if not VIP.has(skin_id):
		return
	var kind := String(VIP[skin_id].get("fx", ""))
	if kind.is_empty():
		return
	var v: Dictionary = VIP[skin_id]
	var p := CPUParticles3D.new()
	p.amount = 12 if kind != "snow" else 16
	p.lifetime = 0.9
	p.local_coords = false
	p.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	p.emission_box_extents = Vector3(0.04, 0.04, length * 0.4)
	p.position = Vector3(0, 0.03, -length * 0.45)
	var size := 0.018
	var col: Color = v.b
	match kind:
		"embers", "sparks":
			p.direction = Vector3(0, 1, 0); p.spread = 35.0; p.gravity = Vector3(0, 0.6 if kind == "embers" else -3.0, 0)
			p.initial_velocity_min = 0.2; p.initial_velocity_max = 0.6 if kind == "embers" else 1.4
		"snow", "glints":
			p.direction = Vector3(1, -0.3, 0); p.spread = 50.0; p.gravity = Vector3(0, -0.4, 0)
			p.initial_velocity_min = 0.2; p.initial_velocity_max = 0.5; size = 0.022; col = Color(1, 1, 1)
		"zaps":
			p.direction = Vector3(0, 0, 1); p.spread = 180.0; p.gravity = Vector3.ZERO; p.lifetime = 0.15
			p.initial_velocity_min = 1.0; p.initial_velocity_max = 2.0; size = 0.012
		"motes":
			p.direction = Vector3(0, 1, 0); p.spread = 180.0; p.gravity = Vector3(0, 0.2, 0)
			p.initial_velocity_min = 0.05; p.initial_velocity_max = 0.2; size = 0.02
		"bubbles":
			p.direction = Vector3(0, -1, 0); p.spread = 15.0; p.gravity = Vector3(0, -1.5, 0)
			p.initial_velocity_min = 0.1; p.initial_velocity_max = 0.3; size = 0.02
		"spores":
			p.direction = Vector3(0, 1, 0); p.spread = 60.0; p.gravity = Vector3(0, 0.15, 0); p.lifetime = 1.6
			p.initial_velocity_min = 0.05; p.initial_velocity_max = 0.2; size = 0.016; col = Color("f4ff9a")
	p.scale_amount_min = 0.5
	p.scale_amount_max = 1.0
	var q := QuadMesh.new()
	q.size = Vector2(size, size)
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.albedo_color = Color(col, 1.0)
	q.material = m
	p.mesh = q
	p.name = "VipFx"
	gun_root.add_child(p)

## Equipped skins / outfit and upgrade levels from the page.
static func read_loadout() -> Dictionary:
	var out := {"weapon": "", "outfit": "standard", "level": 1, "vip": {}}
	if not OS.has_feature("web"):
		return out
	var raw = JavaScriptBridge.eval("""(function(){try{var s=window.parent.localStorage;return JSON.stringify({e:JSON.parse(s.getItem('rl3d_equip_v1')||'{}'),o:JSON.parse(s.getItem('rl3d_owned_v1')||'{}'),a:s.getItem('rl3d_admin_v1')==='1'});}catch(e){return '{}';}})()""", true)
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
	# VIP skins: equipped per gun; admins own every one
	var admin := bool(d.get("a", false))
	var owned_vip: Array = owned.get("vip", [])
	var eq_vip: Dictionary = e.get("vip", {})
	for vid in VIP:
		var gun := String(VIP[vid].gun)
		if bool(eq_vip.get(gun, false)) and (admin or owned_vip.has(vid)):
			out.vip[gun] = vid
	return out
