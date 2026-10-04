"""Shared Blender style kit for the Pokémon world art.

Run every art script inside Blender, e.g.
    blender -b --factory-startup --python tools/pokemon-art/terrain.py

Conventions (keep every asset consistent):
  * 1 Blender unit = 1 map tile = PPU pixels (64 px, i.e. 2x the game's 32 px tiles).
  * Blender +X = east (screen right), +Y = north (screen up / away from camera), +Z = up.
  * An object's tile footprint starts at its south-west corner (0, 0, 0) and extends
    +X by its width in tiles and +Y by its depth in tiles.
  * Ground tiles are rendered straight down (camera_top). Everything that stands up
    (trees, buildings, people, Pokémon) is rendered with the same tilted orthographic
    camera (camera_oblique) so they all share one perspective.
  * Light always comes from the upper left (north-west), like classic Pokémon games.

Scripts render PNG frames into tools/pokemon-art/_work/<group>/ and describe what they
made with write_spec(); tools/pokemon-art/pack.py then builds the WebP sheets and the
manifest the game reads.
"""
import json
import math
import os

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

PPU = 64                 # pixels per tile in the rendered art
ELEV_DEG = 55.0          # camera elevation above the horizon for standing objects
HERE = os.path.dirname(os.path.abspath(__file__))
WORK_ROOT = os.path.join(HERE, '_work')

# Shared palette, so separately made assets still look like one world.
PALETTE = {
    'grass':       (0.30, 0.62, 0.22),
    'grass_dark':  (0.17, 0.45, 0.14),
    'grass_light': (0.52, 0.78, 0.32),
    'leaf':        (0.20, 0.55, 0.18),
    'leaf_dark':   (0.10, 0.36, 0.12),
    'bark':        (0.40, 0.25, 0.13),
    'path':        (0.80, 0.66, 0.42),
    'path_dark':   (0.64, 0.50, 0.30),
    'sand':        (0.92, 0.82, 0.56),
    'rock':        (0.56, 0.52, 0.48),
    'rock_dark':   (0.38, 0.35, 0.33),
    'water':       (0.16, 0.50, 0.82),
    'water_deep':  (0.08, 0.30, 0.62),
    'foam':        (0.88, 0.96, 1.00),
    'wall':        (0.95, 0.90, 0.78),
    'wall_shade':  (0.82, 0.76, 0.64),
    'roof_red':    (0.80, 0.20, 0.12),
    'roof_blue':   (0.20, 0.42, 0.80),
    'roof_green':  (0.22, 0.56, 0.30),
    'roof_orange': (0.90, 0.48, 0.16),
    'roof_purple': (0.48, 0.30, 0.70),
    'wood':        (0.55, 0.34, 0.18),
    'glass':       (0.60, 0.86, 1.00),
    'skin':        (0.98, 0.78, 0.60),
    'outline':     (0.08, 0.06, 0.10),
}


# ── Scene setup ──────────────────────────────────────────────────────────────

def reset_scene():
    """Start from an empty scene (keeps scripts independent of each other)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    return scene


def setup_render(res_x, res_y, samples=32, outline=True, transparent=True):
    """Cycles CPU render with a transparent background and optional ink outlines."""
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    try:
        scene.cycles.denoiser = 'OPENIMAGEDENOISE'
    except TypeError:
        pass
    scene.cycles.use_adaptive_sampling = True
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 2           # several art scripts may run at once on 4 cores
    scene.render.resolution_x = int(res_x)
    scene.render.resolution_y = int(res_y)
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = transparent
    scene.render.filter_size = 1.2
    scene.view_settings.view_transform = 'Standard'
    try:
        scene.view_settings.look = 'None'
    except TypeError:
        pass
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '8'
    set_outline(outline)
    return scene


def set_outline(enabled=True, thickness=1.4):
    """Thin dark ink lines around silhouettes and creases (cartoon look)."""
    scene = bpy.context.scene
    if not hasattr(scene.render, 'use_freestyle'):
        return
    scene.render.use_freestyle = enabled
    if not enabled:
        return
    scene.render.line_thickness_mode = 'ABSOLUTE'
    scene.render.line_thickness = thickness
    vl = bpy.context.view_layer
    vl.use_freestyle = True
    fs = vl.freestyle_settings
    if not fs.linesets:
        fs.linesets.new('ink')
    ls = fs.linesets[0]
    ls.select_by_visibility = True
    ls.select_by_edge_types = True
    ls.select_silhouette = True
    ls.select_border = True
    ls.select_crease = True
    fs.crease_angle = math.radians(120)
    if ls.linestyle is None:
        ls.linestyle = bpy.data.linestyles.new('ink')
    style = ls.linestyle
    style.color = PALETTE['outline']
    style.thickness = thickness
    style.alpha = 0.85


# Direction the light TRAVELS (from the light toward the ground).
KEY_LIGHT_DIR = (0.45, 0.55, -0.70)    # from south-west / above
FILL_LIGHT_DIR = (-0.6, 0.2, -0.75)    # soft bounce from the east


def _sun_rotation(direction):
    return Vector(direction).normalized().to_track_quat('-Z', 'Y').to_euler()


def add_lights(key_strength=3.2, fill_strength=0.9, sky_strength=0.55, warm=True):
    """North-west key sun, soft south-east fill, light-blue sky ambient."""
    key = bpy.data.lights.new('KeySun', 'SUN')
    key.energy = key_strength
    key.angle = math.radians(8)
    key.color = (1.0, 0.95, 0.86) if warm else (1, 1, 1)
    key_obj = bpy.data.objects.new('KeySun', key)
    # Light comes from the front-left and above (south-west, high), so the faces the
    # camera sees are lit and shadows fall up-right, mostly hidden behind objects.
    key_obj.rotation_euler = _sun_rotation(KEY_LIGHT_DIR)
    bpy.context.scene.collection.objects.link(key_obj)

    fill = bpy.data.lights.new('FillSun', 'SUN')
    fill.energy = fill_strength
    fill.angle = math.radians(30)
    fill.color = (0.80, 0.88, 1.0)
    fill.use_shadow = False
    fill_obj = bpy.data.objects.new('FillSun', fill)
    fill_obj.rotation_euler = _sun_rotation(FILL_LIGHT_DIR)
    bpy.context.scene.collection.objects.link(fill_obj)

    world = bpy.data.worlds.new('Sky')
    world.use_nodes = True
    bg = world.node_tree.nodes.get('Background')
    bg.inputs['Color'].default_value = (0.62, 0.74, 0.92, 1.0)
    bg.inputs['Strength'].default_value = sky_strength
    bpy.context.scene.world = world
    return key_obj, fill_obj


# ── Materials ────────────────────────────────────────────────────────────────

_mat_cache = {}


def mat(name, color, rough=0.65, metal=0.0, emission=None, emission_strength=1.0, alpha=1.0, spec=0.25):
    """Principled material; colours are linear-ish sRGB tuples (0-1). Cached by name."""
    if name in _mat_cache and _mat_cache[name].name in bpy.data.materials:
        return _mat_cache[name]
    if isinstance(color, str):
        color = PALETTE[color]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*srgb_to_linear(color), 1.0)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    for key in ('Specular IOR Level', 'Specular'):
        if key in p.inputs:
            p.inputs[key].default_value = spec
            break
    if emission is not None:
        if isinstance(emission, str):
            emission = PALETTE[emission]
        ek = 'Emission Color' if 'Emission Color' in p.inputs else 'Emission'
        p.inputs[ek].default_value = (*srgb_to_linear(emission), 1.0)
        p.inputs['Emission Strength'].default_value = emission_strength
    if alpha < 1.0:
        p.inputs['Alpha'].default_value = alpha
    _mat_cache[name] = m
    return m


def srgb_to_linear(c):
    def f(x):
        return x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4
    return tuple(f(v) for v in c[:3])


def assign(obj, material):
    if obj.data.materials:
        obj.data.materials[0] = material
    else:
        obj.data.materials.append(material)
    return obj


# ── Primitive helpers (all return the new object) ───────────────────────────

def _active():
    return bpy.context.view_layer.objects.active


def box(name, size, loc, material=None, bevel=0.0, rot=(0, 0, 0)):
    """Axis-aligned box: size=(sx, sy, sz) in tiles, loc = centre."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = _active()
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        mod = o.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
    if material:
        assign(o, material)
    return o


def sphere(name, radius, loc, material=None, scale=(1, 1, 1), segments=32, rings=16, smooth=True, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=loc, segments=segments, ring_count=rings, rotation=rot)
    o = _active()
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if smooth:
        bpy.ops.object.shade_smooth()
    if material:
        assign(o, material)
    return o


def cylinder(name, radius, depth, loc, material=None, rot=(0, 0, 0), vertices=24, smooth=True, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=loc, rotation=rot, vertices=vertices)
    o = _active()
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if smooth:
        bpy.ops.object.shade_smooth()
    if material:
        assign(o, material)
    return o


def cone(name, r1, r2, depth, loc, material=None, rot=(0, 0, 0), vertices=24, smooth=True, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot, vertices=vertices)
    o = _active()
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if smooth:
        bpy.ops.object.shade_smooth()
    if material:
        assign(o, material)
    return o


def plane(name, size_x, size_y, loc, material=None, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    o = _active()
    o.name = name
    o.scale = (size_x, size_y, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if material:
        assign(o, material)
    return o


def subsurf(obj, levels=2):
    mod = obj.modifiers.new('subsurf', 'SUBSURF')
    mod.levels = levels
    mod.render_levels = levels
    return obj


def parent_all(name, objs, loc=(0, 0, 0)):
    """Group objects under an empty so a whole model can be moved / turned at once."""
    empty = bpy.data.objects.new(name, None)
    empty.location = loc
    bpy.context.scene.collection.objects.link(empty)
    for o in objs:
        o.parent = empty
    return empty


def clear_objects(keep_lights=True, keep_camera=True):
    for o in list(bpy.context.scene.objects):
        if keep_lights and o.type == 'LIGHT':
            continue
        if keep_camera and o.type == 'CAMERA':
            continue
        bpy.data.objects.remove(o, do_unlink=True)


# ── Cameras ─────────────────────────────────────────────────────────────────

def _camera(name='Cam'):
    cam = bpy.context.scene.camera
    if cam is None:
        data = bpy.data.cameras.new(name)
        cam = bpy.data.objects.new(name, data)
        bpy.context.scene.collection.objects.link(cam)
        bpy.context.scene.camera = cam
    cam.data.type = 'ORTHO'
    cam.data.sensor_fit = 'HORIZONTAL'
    cam.data.clip_start = 0.01
    cam.data.clip_end = 500
    cam.data.shift_x = 0
    cam.data.shift_y = 0
    return cam


def camera_top(res_x, res_y, center_xy):
    """Straight-down camera for ground tiles. center_xy = world point at the image centre."""
    scene = bpy.context.scene
    scene.render.resolution_x = int(res_x)
    scene.render.resolution_y = int(res_y)
    cam = _camera()
    cam.data.ortho_scale = res_x / PPU
    cam.rotation_euler = (0, 0, 0)
    cam.location = (center_xy[0], center_xy[1], 60)
    bpy.context.view_layer.update()
    return cam


def oblique_forward():
    t = math.radians(90 - ELEV_DEG)
    return Vector((0, math.sin(t), -math.cos(t)))


def camera_oblique(res_x, res_y, look_at):
    """Tilted orthographic camera (looking north, ELEV_DEG above the horizon).

    look_at is the world point that lands in the centre of the image.
    """
    scene = bpy.context.scene
    scene.render.resolution_x = int(res_x)
    scene.render.resolution_y = int(res_y)
    cam = _camera()
    cam.data.ortho_scale = res_x / PPU
    cam.rotation_euler = (math.radians(90 - ELEV_DEG), 0, 0)
    fwd = oblique_forward()
    cam.location = Vector(look_at) - fwd * 60
    bpy.context.view_layer.update()   # matrix_world must be current before anyone projects points
    return cam


def to_pixel(point):
    """Pixel position (x right, y down) of a world point in the current render."""
    scene = bpy.context.scene
    cam = scene.camera
    co = world_to_camera_view(scene, cam, Vector(point))
    return (co.x * scene.render.resolution_x, (1.0 - co.y) * scene.render.resolution_y)


def _mesh_world_points(objs):
    deps = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in objs:
        if o.type != 'MESH':
            continue
        ev = o.evaluated_get(deps)
        mesh = ev.to_mesh()
        mw = ev.matrix_world
        pts.extend(mw @ v.co for v in mesh.vertices)
        ev.to_mesh_clear()
    return pts


def fit_oblique(objs=None, pad_px=6, min_w=0, min_h=0, even=True):
    """Size the image and aim the oblique camera so the given objects just fit.

    Pixel scale stays at PPU. Returns (res_x, res_y). Call to_pixel() afterwards for anchors.
    """
    if objs is None:
        objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    pts = _mesh_world_points(objs)
    if not pts:
        raise ValueError('fit_oblique: nothing to frame')
    cam = camera_oblique(256, 256, (0, 0, 0))
    inv = cam.matrix_world.inverted()
    local = [inv @ p for p in pts]
    min_x = min(p.x for p in local); max_x = max(p.x for p in local)
    min_y = min(p.y for p in local); max_y = max(p.y for p in local)
    pad = pad_px / PPU
    w_units = (max_x - min_x) + 2 * pad
    h_units = (max_y - min_y) + 2 * pad
    res_x = max(min_w, math.ceil(w_units * PPU))
    res_y = max(min_h, math.ceil(h_units * PPU))
    if even:
        res_x += res_x % 2
        res_y += res_y % 2
    cx = (min_x + max_x) / 2
    cy = (min_y + max_y) / 2
    scene = bpy.context.scene
    scene.render.resolution_x = res_x
    scene.render.resolution_y = res_y
    cam.data.ortho_scale = res_x / PPU
    # Move the camera within its own plane so the bbox centre is the image centre.
    cam.location = cam.matrix_world @ Vector((cx, cy, 0))
    bpy.context.view_layer.update()
    return res_x, res_y


def fixed_oblique_frame(res_x, res_y, foot_center=(0.5, 0.5, 0.0), foot_px=None):
    """Fixed-size frame for sprite sheets: places a world point at a chosen pixel.

    foot_px defaults to (res_x/2, res_y - 10): the character's feet stay at the same
    pixel in every frame, so the animation does not jitter.
    """
    if foot_px is None:
        foot_px = (res_x / 2, res_y - 10)
    cam = camera_oblique(res_x, res_y, foot_center)
    bpy.context.view_layer.update()
    px, py = to_pixel(foot_center)
    dx = (foot_px[0] - px) / PPU
    dy = (foot_px[1] - py) / PPU
    # Shift the camera opposite to the wanted image offset (camera local axes).
    cam.location = cam.matrix_world @ Vector((-dx, dy, 0))
    bpy.context.view_layer.update()
    return cam


# ── Rendering + output description ──────────────────────────────────────────

def work_dir(group):
    d = os.path.join(WORK_ROOT, group)
    os.makedirs(d, exist_ok=True)
    return d


def render(path):
    """Render the current scene to a PNG file (absolute path or relative to _work)."""
    if not os.path.isabs(path):
        path = os.path.join(WORK_ROOT, path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    scene = bpy.context.scene
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


def write_spec(group, outputs):
    """Describe the rendered frames so pack.py can build sheets + manifest.

    outputs: list of dicts, each:
      key      unique asset key used by the game, e.g. 'tree_0', 'player', 'bld_pc_5x3'
      kind     'tile' | 'object' | 'sheet' | 'image'
      frames   list of PNG paths (all the same size) in row-major order
      cols     columns in the packed sheet (default len(frames))
      anchor   [ax, ay] pixel in each frame where the footprint's SOUTH-WEST corner is
               (objects/buildings) or the FEET point (characters, Pokémon)
      foot     [w, d] footprint in tiles (objects/buildings)
      meta     optional dict copied into the manifest (e.g. row names, fps)
      lossless optional bool (tiles default to lossless)
    """
    path = os.path.join(work_dir(group), 'spec.json')
    with open(path, 'w') as fh:
        json.dump({'group': group, 'ppu': PPU, 'outputs': outputs}, fh, indent=1)
    print('[art] wrote', path, len(outputs), 'outputs')
    return path
