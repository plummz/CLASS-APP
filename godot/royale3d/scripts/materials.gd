class_name RoyaleMaterials
extends RefCounted
## Photo-textured materials for the island (Poly Haven CC0 textures in assets/textures/):
##   terrain   — grass / forest floor / sand / rock / dirt road / asphalt / concrete, blended per
##               vertex (weights in COLOR + UV2), with large-scale variation and snow on peaks
##   building  — the vertex-coloured box meshes get plaster or brick walls, clay-tile roofs,
##               wood / concrete / tile floors (picked by the vertex colour's alpha, see below)
##   water     — moving waves and a fresnel sheen
##   wind      — grass, flowers, bushes and leaves sway along the match's wind direction
## Building surface ids (vertex colour alpha): 1.0 auto wall, 0.2 roof, 0.3 wood floor,
## 0.4 concrete, 0.5 tiles.

const TEX := "res://assets/textures/"
const ROOF := 0.2
const WOOD := 0.3
const CONCRETE := 0.4
const TILES := 0.5

static var wind_dir := Vector2(1, 0.3).normalized()
## Map theme: "sentinel" (green island), "dunes" (desert), "frost" (snow)
static var theme := "sentinel"
const THEMES := {
	"sentinel": {"grass": "leafy_grass", "forest": "forest_ground_04", "sand": "coast_sand_01", "rock": "aerial_rocks_02", "asphalt": "asphalt_02",
		"green_amt": 0.78, "green_a": Color(0.075, 0.13, 0.03), "green_b": Color(0.11, 0.15, 0.04), "snow_line": 60.0, "roof_snow": 0.0,
		"plaster": "painted_plaster_wall", "brick": "brick_wall_001", "deep": Color(0.05, 0.22, 0.38, 0.93), "shallow": Color(0.12, 0.45, 0.55, 0.85)},
	"dunes": {"grass": "coast_sand_01", "forest": "leafy_grass", "sand": "red_sand", "rock": "sandstone_cracks", "asphalt": "asphalt_02",
		"green_amt": 0.0, "green_a": Color(0.4, 0.3, 0.18), "green_b": Color(0.45, 0.34, 0.2), "snow_line": 999.0, "roof_snow": 0.0,
		"plaster": "painted_plaster_wall", "brick": "sandstone_brick_wall_01", "deep": Color(0.04, 0.3, 0.38, 0.93), "shallow": Color(0.15, 0.6, 0.6, 0.85)},
	"frost": {"grass": "snow_02", "forest": "forest_ground_04", "sand": "coast_sand_01", "rock": "aerial_rocks_02", "asphalt": "asphalt_snow",
		"green_amt": 0.0, "green_a": Color(0.8, 0.82, 0.86), "green_b": Color(0.85, 0.87, 0.9), "snow_line": 18.0, "roof_snow": 1.0,
		"plaster": "painted_plaster_wall", "brick": "brick_wall_001", "deep": Color(0.06, 0.14, 0.22, 0.95), "shallow": Color(0.25, 0.38, 0.48, 0.9)},
}

static func tdata() -> Dictionary:
	return THEMES.get(theme, THEMES["sentinel"])
static var _terrain: ShaderMaterial
static var _building: ShaderMaterial
static var _water: ShaderMaterial
static var _wind_shader: Shader
static var _wind_cache := {}

static func _tex(name: String) -> Texture2D:
	var p := TEX + name + ".res"
	return load(p) if ResourceLoader.exists(p) else null

const TERRAIN_SHADER := """
shader_type spatial;
render_mode cull_back;
uniform sampler2D t_grass : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D t_forest : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D t_sand : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D t_rock : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D t_dirt : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D t_asphalt : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D t_concrete : source_color, filter_linear_mipmap, repeat_enable;
uniform float green_amt = 0.78;
uniform vec3 green_a = vec3(0.075, 0.13, 0.03);
uniform vec3 green_b = vec3(0.11, 0.15, 0.04);
uniform float snow_line = 60.0;
varying vec3 wpos;
varying vec4 w1;
varying vec2 w2;
varying vec3 wn;
void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wn = NORMAL;
	w1 = COLOR;
	w2 = UV2;
}
vec3 rock_tri(vec2 sc) {
	vec3 n = abs(wn); n /= (n.x + n.y + n.z + 0.0001);
	return texture(t_rock, wpos.zy * sc.x).rgb * n.x + texture(t_rock, wpos.xz * sc.x).rgb * n.y + texture(t_rock, wpos.xy * sc.x).rgb * n.z;
}
void fragment() {
	vec2 uv = wpos.xz;
	// Two scales of grass so tiling doesn't show, blended with forest floor in patches
	float patch = texture(t_dirt, uv * 0.006).r;
	vec3 grass = mix(texture(t_grass, uv * 0.22).rgb, texture(t_grass, uv * 0.061).rgb, 0.45);
	// Photo grass is dry and brown; keep its detail but colour it a lush green (varies by patch)
	float gl = dot(grass, vec3(0.299, 0.587, 0.114));
	vec3 green = mix(green_a, green_b, patch);
	grass = mix(grass, green * clamp(gl / 0.2, 0.5, 1.6), green_amt);
	grass = mix(grass, texture(t_forest, uv * 0.2).rgb, smoothstep(0.55, 0.75, patch) * 0.45);
	vec3 sand = texture(t_sand, uv * 0.2).rgb;
	vec3 rock = rock_tri(vec2(0.12));
	vec3 dirt = texture(t_dirt, uv * 0.25).rgb;
	vec3 asphalt = texture(t_asphalt, uv * 0.18).rgb;
	vec3 concrete = texture(t_concrete, uv * 0.15).rgb;
	float total = w1.r + w1.g + w1.b + w1.a + w2.x + w2.y + 0.0001;
	vec3 c = (grass * w1.r + sand * w1.g + rock * w1.b + dirt * w1.a + asphalt * w2.x + concrete * w2.y) / total;
	// Large soft light/dark variation across the island
	c *= 0.86 + 0.28 * texture(t_grass, uv * 0.0023).g;
	// Snow on the peak
	float snow = smoothstep(snow_line, snow_line + 7.0, wpos.y) * smoothstep(0.55, 0.85, wn.y);
	c = mix(c, vec3(0.92, 0.94, 0.97), snow);
	ALBEDO = c;
	ROUGHNESS = mix(0.95, 0.75, w2.x / total);
	SPECULAR = 0.2;
}
"""

static func terrain_material() -> ShaderMaterial:
	if _terrain == null:
		var sh := Shader.new()
		sh.code = TERRAIN_SHADER
		_terrain = ShaderMaterial.new()
		_terrain.shader = sh
		var td := tdata()
		for pair in [["t_grass", td.grass], ["t_forest", td.forest], ["t_sand", td.sand],
				["t_rock", td.rock], ["t_dirt", "dirt"], ["t_asphalt", td.asphalt], ["t_concrete", "concrete_floor_02"]]:
			_terrain.set_shader_parameter(pair[0], _tex(pair[1]))
		for k in ["green_amt", "green_a", "green_b", "snow_line"]:
			_terrain.set_shader_parameter(k, td[k])
	return _terrain

const BUILDING_SHADER := """
shader_type spatial;
render_mode cull_back;
uniform sampler2D t_plaster : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D t_brick : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D t_roof : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D t_wood : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D t_concrete : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D t_tiles : source_color, filter_linear_mipmap, repeat_enable;
uniform float roof_snow = 0.0;
varying vec3 wpos;
varying vec3 wn;
vec3 tri(sampler2D t, float s) {
	vec3 n = abs(wn); n /= (n.x + n.y + n.z + 0.0001);
	return texture(t, wpos.zy * s).rgb * n.x + texture(t, wpos.xz * s).rgb * n.y + texture(t, wpos.xy * s).rgb * n.z;
}
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wn = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}
void fragment() {
	vec3 base = pow(COLOR.rgb, vec3(2.2));     // vertex colours are sRGB
	float id = COLOR.a;
	vec3 c;
	float rough = 0.9;
	if (id < 0.25) {            // roof tiles, tinted toward the roof colour (snow on top in winter)
		vec3 t = tri(t_roof, 0.45);
		c = mix(t, base * (lum(t) / 0.32), 0.45);
		c = mix(c, vec3(0.9, 0.92, 0.95), roof_snow * smoothstep(0.3, 0.6, wn.y));
	} else if (id < 0.35) {     // wood floor
		c = tri(t_wood, 0.45) * 1.05;
		rough = 0.6;
	} else if (id < 0.45) {     // concrete
		c = tri(t_concrete, 0.25) * (0.55 + lum(base) * 0.9);
	} else if (id < 0.55) {     // tiles
		c = tri(t_tiles, 0.5);
		rough = 0.35;
	} else {                    // walls and trim: paint colour over plaster, or brick for red/brown walls
		float sat = max(base.r, max(base.g, base.b)) - min(base.r, min(base.g, base.b));
		bool brickish = base.r > base.g * 1.25 && base.r > base.b * 1.4 && lum(base) < 0.45 && sat > 0.12;
		if (brickish && abs(wn.y) < 0.5) {
			c = tri(t_brick, 0.55) * 1.1;
		} else {
			vec3 t = tri(t_plaster, 0.5);
			c = base * clamp(lum(t) / 0.55, 0.6, 1.35);
		}
	}
	ALBEDO = c;
	ROUGHNESS = rough;
	SPECULAR = 0.25;
}
"""

static func building_material() -> ShaderMaterial:
	if _building == null:
		var sh := Shader.new()
		sh.code = BUILDING_SHADER
		_building = ShaderMaterial.new()
		_building.shader = sh
		var td := tdata()
		for pair in [["t_plaster", td.plaster], ["t_brick", td.brick], ["t_roof", "clay_roof_tiles"],
				["t_wood", "wood_floor"], ["t_concrete", "concrete_floor_02"], ["t_tiles", "floor_tiles_06"]]:
			_building.set_shader_parameter(pair[0], _tex(pair[1]))
		_building.set_shader_parameter("roof_snow", td.roof_snow)
	return _building

const WATER_SHADER := """
shader_type spatial;
render_mode cull_disabled, specular_schlick_ggx;
uniform vec4 deep : source_color = vec4(0.05, 0.22, 0.38, 0.93);
uniform vec4 shallow : source_color = vec4(0.12, 0.45, 0.55, 0.85);
uniform vec2 wind = vec2(1.0, 0.3);
varying vec3 wpos;
void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float t = TIME;
	VERTEX.y += sin(dot(wpos.xz, wind) * 0.08 + t * 1.1) * 0.12 + sin(wpos.x * 0.21 - t * 1.7) * 0.05;
}
void fragment() {
	float t = TIME;
	vec2 p = wpos.xz;
	float a = sin(dot(p, wind) * 0.35 + t * 1.3) + sin(p.x * 0.7 + p.y * 0.4 - t * 2.1) * 0.6 + sin(p.y * 1.3 - t * 1.7) * 0.35;
	float b = cos(dot(p, vec2(-wind.y, wind.x)) * 0.42 - t * 1.1) + cos(p.x * 1.1 - p.y * 0.9 + t * 2.4) * 0.5;
	NORMAL = normalize(mix(NORMAL, normalize(VIEW_MATRIX * vec4(a * 0.12, 1.0, b * 0.12, 0.0)).xyz, 0.65));
	float fres = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 3.0);
	vec4 col = mix(shallow, deep, clamp(length(p) / 900.0, 0.0, 1.0));
	ALBEDO = col.rgb + vec3(0.25, 0.32, 0.36) * fres;
	ALPHA = mix(col.a, 1.0, fres);
	ROUGHNESS = 0.08;
	METALLIC = 0.1;
	SPECULAR = 0.7;
}
"""

static func water_material() -> ShaderMaterial:
	if _water == null:
		var sh := Shader.new()
		sh.code = WATER_SHADER
		_water = ShaderMaterial.new()
		_water.shader = sh
		_water.set_shader_parameter("wind", wind_dir)
		_water.set_shader_parameter("deep", tdata().deep)
		_water.set_shader_parameter("shallow", tdata().shallow)
	return _water

const WIND_SHADER := """
shader_type spatial;
render_mode cull_disabled;
uniform sampler2D albedo_tex : source_color, filter_linear_mipmap;
uniform bool use_tex = false;
uniform vec4 albedo : source_color = vec4(1.0);
uniform float scissor = 0.5;
uniform vec2 wind = vec2(1.0, 0.3);
uniform float strength = 0.1;   // sway per metre of height
uniform float speed = 1.6;
void vertex() {
	vec3 origin = (MODEL_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
	float h = max(VERTEX.y, 0.0);
	// Gusts travel across the island along the wind
	float wave = sin(dot(origin.xz, wind) * 0.12 - TIME * speed) * 0.6 + sin(dot(origin.xz, wind) * 0.31 - TIME * speed * 1.9 + origin.x * 0.05) * 0.4;
	float bend = (0.55 + 0.45 * wave) * strength * h * h;
	vec3 dir = (inverse(MODEL_MATRIX) * vec4(wind.x, 0.0, wind.y, 0.0)).xyz;
	VERTEX += normalize(dir + vec3(0.0001)) * bend;
	VERTEX.y -= bend * 0.25;
}
void fragment() {
	vec4 c = albedo;
	if (use_tex) { c *= texture(albedo_tex, UV); }
	ALBEDO = c.rgb;
	ALPHA = c.a;
	ALPHA_SCISSOR_THRESHOLD = scissor;
	ROUGHNESS = 0.85;
}
"""

## A swaying copy of a plant material (cached). strength: grass ~0.12, bushes ~0.04, trees ~0.004.
static func wind_material(src: Material, strength: float) -> Material:
	var key := [src, strength]
	if _wind_cache.has(key):
		return _wind_cache[key]
	if _wind_shader == null:
		_wind_shader = Shader.new()
		_wind_shader.code = WIND_SHADER
	var m := ShaderMaterial.new()
	m.shader = _wind_shader
	if src is BaseMaterial3D:
		var b := src as BaseMaterial3D
		m.set_shader_parameter("albedo", b.albedo_color)
		m.set_shader_parameter("use_tex", b.albedo_texture != null)
		m.set_shader_parameter("albedo_tex", b.albedo_texture)
		m.set_shader_parameter("scissor", b.alpha_scissor_threshold if b.transparency == BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR else (0.5 if b.albedo_texture else 0.0))
	m.set_shader_parameter("wind", wind_dir)
	m.set_shader_parameter("strength", strength)
	_wind_cache[key] = m
	return m
