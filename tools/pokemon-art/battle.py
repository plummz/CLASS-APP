"""Battle backdrops (ART_SPEC section 6): 1600x560 opaque perspective dioramas.

Two oval platforms are solved so they project onto the spec ellipses:
  enemy  centre (1180, 330) radii 240 x 60
  player centre (440, 545)  radii 300 x 72
"""
import math
import os
import random
import sys

sys.path.insert(0, '/home/user/CLASS-APP/tools/pokemon-art')
import common as C  # noqa: E402

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

W, H = 1600, 560
GROUP = 'battle'
SAMPLES = int(os.environ.get('BATTLE_SAMPLES', '32'))
ONLY = [k for k in os.environ.get('BATTLE_ONLY', '').split(',') if k]
ENEMY = dict(c=(1180, 330), r=(240, 60))
PLAYER = dict(c=(440, 545), r=(300, 72))
CAM_H = 2.0
LENS = 70.0


# ── camera + pixel solver ────────────────────────────────────────────────────

def make_camera():
    data = bpy.data.cameras.new('BattleCam')
    data.type = 'PERSP'
    data.lens = LENS
    data.sensor_fit = 'HORIZONTAL'
    data.sensor_width = 36
    data.clip_start = 0.05
    data.clip_end = 600
    cam = bpy.data.objects.new('BattleCam', data)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    cam.location = (0, 0, CAM_H)
    cam.rotation_euler = (math.radians(87.4), 0, 0)
    bpy.context.view_layer.update()
    return cam


def pixel_ray_ground(cam, px, py, z=0.0):
    f = W * LENS / 36.0
    d = Vector(((px - W / 2) / f, -(py - H / 2) / f, -1.0))
    d = cam.matrix_world.to_3x3() @ d
    o = cam.matrix_world.translation
    t = (z - o.z) / d.z
    return o + d * t


def _inv_pixel(target, z, guess):
    """World point on plane z that projects to the target pixel (Newton on C.to_pixel)."""
    x, y = guess
    for _ in range(30):
        px, py = C.to_pixel((x, y, z))
        ex, ey = target[0] - px, target[1] - py
        if abs(ex) < 0.01 and abs(ey) < 0.01:
            break
        h = 1e-3
        dx = C.to_pixel((x + h, y, z)); dy = C.to_pixel((x, y + h, z))
        a, c = (dx[0] - px) / h, (dx[1] - py) / h
        b, d = (dy[0] - px) / h, (dy[1] - py) / h
        det = a * d - b * c
        x += (d * ex - b * ey) / det
        y += (-c * ex + a * ey) / det
    return x, y


def rim_bbox(c, wx, wy, n=96):
    pts = [C.to_pixel((c.x + wx * math.cos(t), c.y + wy * math.sin(t), c.z))
           for t in (2 * math.pi * i / n for i in range(n))]
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return min(xs), max(xs), min(ys), max(ys)


def solve_platform(cam, spec, z):
    """Fit world centre + radii so the platform rim's projected bbox equals the spec ellipse bbox."""
    cx, cy = spec['c']
    rx, ry = spec['r']
    x, y = _inv_pixel((cx, cy), z, (0, 10))
    xa, ya = _inv_pixel((cx + rx, cy), z, (x + 1, y))
    xn, yn = _inv_pixel((cx, cy + ry), z, (x, y - 1))
    xf, yf = _inv_pixel((cx, cy - ry), z, (x, y + 1))
    c = Vector((x, (yn + yf) / 2, z)); wx = abs(xa - x); wy = (yf - yn) / 2
    for _ in range(12):
        x0, x1, y0, y1 = rim_bbox(c, wx, wy)
        # centre: move so bbox centre hits the target centre
        tx, ty = _inv_pixel((cx, cy), z, (c.x, c.y))
        mx, my = _inv_pixel(((x0 + x1) / 2, (y0 + y1) / 2), z, (c.x, c.y))
        c = Vector((c.x + (tx - mx), c.y + (ty - my), z))
        wx *= (2 * rx) / (x1 - x0)
        wy *= (2 * ry) / (y1 - y0)
    return c, wx, wy


# ── scene helpers ────────────────────────────────────────────────────────────

def emit_mat(name, color, strength=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (*C.srgb_to_linear(color), 1)
    em.inputs['Strength'].default_value = strength
    nt.links.new(em.outputs[0], out.inputs[0])
    return m


def glow_mat(name, color, strength=1.0, alpha=0.3):
    """Additive-looking translucent emission (light shafts, glows)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (*C.srgb_to_linear(color), 1)
    em.inputs['Strength'].default_value = strength
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    mix.inputs[0].default_value = alpha
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    return m


def sky(top, horizon, bottom=None, strength=1.0, light=0.55):
    """Gradient sky as seen by the camera; ambient light stays a flat colour."""
    world = bpy.context.scene.world
    nt = world.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputWorld')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    nt.links.new(sep.outputs['Z'], ramp.inputs['Fac'])
    els = ramp.color_ramp.elements
    els[0].position = 0.0
    els[0].color = (*C.srgb_to_linear(bottom or horizon), 1)
    els[1].position = 0.32
    els[1].color = (*C.srgb_to_linear(top), 1)
    e = els.new(0.0)
    e.position = 0.03
    e.color = (*C.srgb_to_linear(horizon), 1)
    bg_cam = nt.nodes.new('ShaderNodeBackground')
    nt.links.new(ramp.outputs['Color'], bg_cam.inputs['Color'])
    bg_cam.inputs['Strength'].default_value = strength
    bg_amb = nt.nodes.new('ShaderNodeBackground')
    bg_amb.inputs['Color'].default_value = (*C.srgb_to_linear(top), 1)
    bg_amb.inputs['Strength'].default_value = light
    lp = nt.nodes.new('ShaderNodeLightPath')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(lp.outputs['Is Camera Ray'], mix.inputs[0])
    nt.links.new(bg_amb.outputs[0], mix.inputs[1])
    nt.links.new(bg_cam.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])


def pixel_disc(name, spec, k, z, depth, material, n=128):
    """Prism whose top outline projects exactly onto the spec ellipse scaled by k (pixel space)."""
    cx, cy = spec['c']
    rx, ry = spec['r']
    guess = _inv_pixel((cx, cy), z, (0, 10))
    top = []
    for i in range(n):
        t = 2 * math.pi * i / n
        g = _inv_pixel((cx + rx * k * math.cos(t), cy + ry * k * math.sin(t)), z, guess)
        top.append(g)
    verts = [(x, y, z) for x, y in top] + [(x, y, z - depth) for x, y in top]
    faces = [list(range(n))[::-1], list(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        faces.append([i, j, n + j, n + i])
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    me.validate()
    if me.polygons[0].normal.z < 0:
        me.flip_normals()
    for poly in me.polygons:
        poly.use_smooth = len(poly.vertices) == 4
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(material)
    return o


def platform(name, spec, top_col, rim_col, side_col, ring_col=None):
    pixel_disc(name + '_side', spec, 1.0, -0.02, 0.35, C.mat(name + '_sidem', side_col, rough=0.9))
    pixel_disc(name + '_rim', spec, 0.985, 0.0, 0.02, C.mat(name + '_rimm', rim_col, rough=0.8))
    pixel_disc(name + '_top', spec, 0.88, 0.006, 0.02, C.mat(name + '_topm', top_col, rough=0.85))
    if ring_col:
        pixel_disc(name + '_ring', spec, 0.60, 0.010, 0.02, C.mat(name + '_ringm', ring_col, rough=0.8))
        pixel_disc(name + '_in', spec, 0.53, 0.014, 0.02, C.mat(name + '_topm', top_col, rough=0.85))


def ground(col, size=400, z=-0.25, name='ground', rough=0.95):
    return C.plane(name, size, size, (0, size / 2 - 20, z), C.mat(name + 'm', col, rough=rough))


def tree(x, y, s=1.0, leaf='leaf', leaf2='leaf_dark', kind='round'):
    C.cylinder('trunk', 0.18 * s, 1.2 * s, (x, y, 0.4 * s), C.mat('bark', 'bark'), vertices=10)
    if kind == 'pine':
        for i, (r, h) in enumerate(((1.1, 1.4), (0.85, 1.2), (0.55, 1.0))):
            C.cone('pine', r * s, 0.0, h * s, (x, y, (1.3 + i * 0.65) * s),
                   C.mat('pine' + leaf2, leaf2, rough=0.8), vertices=14)
    else:
        C.sphere('crown', 0.95 * s, (x, y, 1.7 * s), C.mat('leaf_' + leaf, leaf, rough=0.8), segments=16, rings=10)
        C.sphere('crown2', 0.6 * s, (x - 0.45 * s, y - 0.3 * s, 1.35 * s), C.mat('leaf_' + leaf, leaf, rough=0.8),
                 segments=14, rings=8)
        C.sphere('crown3', 0.55 * s, (x + 0.5 * s, y + 0.2 * s, 2.15 * s), C.mat('leaf2_' + leaf2, leaf2, rough=0.8),
                 segments=14, rings=8)


def cloud(x, y, z, s=1.0):
    m = emit_mat('cloud', (1, 1, 1), 1.0)
    for dx, dz, r in ((0, 0, 1.0), (1.1, -0.2, 0.75), (-1.1, -0.25, 0.7), (0.5, 0.45, 0.7), (-0.4, 0.35, 0.6)):
        C.sphere('cloud', r * s, (x + dx * s, y, z + dz * s), m, scale=(1, 0.5, 0.75), segments=16, rings=8)


def hill(x, y, rx, h, col, ry=None):
    C.sphere('hill', 1.0, (x, y, -0.2), C.mat('hill' + str(col), col, rough=0.95),
             scale=(rx, ry or rx * 0.6, h), segments=32, rings=16)


def bush(x, y, s, col='leaf'):
    for dx, r in ((-0.35, 0.4), (0.0, 0.55), (0.4, 0.42)):
        C.sphere('bush', r * s, (x + dx * s, y, 0.1 * s), C.mat('bush' + col, col, rough=0.8), segments=14, rings=8)


def rock(x, y, s, col='rock', name='rock'):
    o = C.sphere(name, s, (x, y, 0.1 * s), C.mat(name + col, col, rough=0.9),
                 scale=(1.1, 0.9, 0.7), segments=8, rings=5, smooth=False)
    o.rotation_euler = (0.2, 0.1, random.uniform(0, 6.28))
    return o


def scatter(n, xr, yr, avoid, fn, seed=1):
    rnd = random.Random(seed)
    placed = 0
    tries = 0
    while placed < n and tries < n * 50:
        tries += 1
        x, y = rnd.uniform(*xr), rnd.uniform(*yr)
        ok = True
        for (c, wx, wy, k) in avoid:
            if ((x - c.x) / (wx * k)) ** 2 + ((y - c.y) / (wy * k)) ** 2 < 1:
                ok = False
        if ok:
            fn(x, y, rnd)
            placed += 1


# ── scenes ───────────────────────────────────────────────────────────────────

def scene_grass(cam, E, P, avoid):
    sky((0.36, 0.64, 0.96), (0.86, 0.94, 1.0))
    ground('grass')
    platform('pe', ENEMY, 'grass_light', 'grass', 'path_dark', ring_col='grass')
    platform('pp', PLAYER, 'grass_light', 'grass', 'path_dark', ring_col='grass')
    for x, y, rx, h, c in ((-60, 150, 70, 14, (0.42, 0.70, 0.40)), (30, 170, 80, 18, (0.48, 0.72, 0.46)),
                           (110, 160, 70, 12, (0.40, 0.66, 0.38)), (-20, 110, 50, 6, 'grass_dark'),
                           (60, 100, 45, 5, 'grass')):
        hill(x, y, rx, h, c)
    scatter(26, (-40, 40), (45, 80), [], lambda x, y, r: tree(x, y, r.uniform(1.6, 2.4)), seed=3)
    scatter(14, (-18, 22), (22, 40), avoid, lambda x, y, r: tree(x, y, r.uniform(1.2, 1.7)), seed=4)
    scatter(18, (-14, 18), (5, 30), avoid, lambda x, y, r: bush(x, y, r.uniform(0.6, 1.0), 'grass_dark'), seed=5)
    for x, y, z, s in ((-60, 200, 30, 6), (-10, 220, 38, 7), (50, 200, 28, 5), (100, 230, 42, 8)):
        cloud(x, y, z, s)


def scene_forest(cam, E, P, avoid):
    sky((0.50, 0.78, 0.70), (0.85, 0.95, 0.80), light=0.45)
    ground('grass_dark')
    platform('pe', ENEMY, 'grass', 'grass_dark', 'bark', ring_col='leaf')
    platform('pp', PLAYER, 'grass', 'grass_dark', 'bark', ring_col='leaf')
    # a wall of big trees enclosing the clearing
    scatter(60, (-50, 50), (34, 70), [], lambda x, y, r: tree(x, y, r.uniform(2.6, 3.6), 'leaf', 'leaf_dark',
                                                                r.choice(['pine', 'round'])), seed=11)
    scatter(18, (-22, 26), (18, 34), avoid, lambda x, y, r: tree(x, y, r.uniform(1.6, 2.4), 'leaf_dark', 'leaf_dark',
                                                                 'pine'), seed=12)
    scatter(26, (-16, 20), (5, 26), avoid, lambda x, y, r: bush(x, y, r.uniform(0.5, 0.9), 'leaf'), seed=13)
    # light shafts
    shaft = glow_mat('shaft', (1.0, 0.97, 0.75), 2.0, alpha=0.16)
    for x, y in ((-6, 30), (4, 34), (14, 28), (22, 36)):
        o = C.cylinder('shaft', 1.0, 30, (x, y, 12), shaft, rot=(math.radians(-8), math.radians(18), 0), vertices=12)


def scene_rock(cam, E, P, avoid):
    sky((0.48, 0.66, 0.92), (0.98, 0.88, 0.72))
    ground((0.72, 0.60, 0.46))
    platform('pe', ENEMY, 'rock', 'rock_dark', 'rock_dark', ring_col=(0.62, 0.58, 0.54))
    platform('pp', PLAYER, 'rock', 'rock_dark', 'rock_dark', ring_col=(0.62, 0.58, 0.54))
    rnd = random.Random(21)
    for x, y, sx, h, c in ((-70, 140, 22, 30, (0.78, 0.52, 0.36)), (-30, 160, 18, 40, (0.72, 0.46, 0.32)),
                           (20, 150, 26, 26, (0.80, 0.56, 0.40)), (70, 140, 20, 36, (0.74, 0.48, 0.34)),
                           (120, 170, 30, 30, (0.78, 0.54, 0.38)), (-45, 80, 10, 14, (0.66, 0.44, 0.32)),
                           (52, 85, 12, 16, (0.68, 0.46, 0.33))):
        o = C.box('mesa', (sx, sx * 0.7, h), (x, y, h / 2 - 0.3), C.mat('mesa' + str(c), c, rough=0.9), bevel=1.5)
        C.box('mesa_top', (sx * 0.96, sx * 0.66, 0.6), (x, y, h - 0.2), C.mat('mesat', (0.60, 0.62, 0.34), rough=0.9),
              bevel=0.3)
    for x, y, rx, h, c in ((-10, 210, 120, 50, (0.62, 0.62, 0.78)),):
        hill(x, y, rx, h, c)
    scatter(30, (-26, 30), (5, 50), avoid, lambda x, y, r: rock(x, y, r.uniform(0.3, 1.2) * (1 + y / 30)), seed=22)
    for x, y, z, s in ((-40, 220, 46, 6), (40, 230, 52, 7)):
        cloud(x, y, z, s)


def scene_beach(cam, E, P, avoid):
    sky((0.30, 0.62, 0.98), (0.88, 0.96, 1.0))
    ground('sand')
    sea = C.plane('sea', 600, 400, (0, 238, -0.18), C.mat('sea', 'water', rough=0.15, spec=0.6))
    C.plane('shallow', 600, 8, (0, 37.5, -0.2), C.mat('shallow', (0.36, 0.80, 0.86), rough=0.2, spec=0.5))
    C.plane('foam', 600, 0.6, (0, 33.8, -0.15), C.mat('foamm', 'foam', rough=0.5))
    C.plane('foam2', 600, 0.4, (0, 41.0, -0.16), C.mat('foamm', 'foam', rough=0.5))
    platform('pe', ENEMY, 'sand', 'path', 'path_dark', ring_col=(0.98, 0.90, 0.68))
    platform('pp', PLAYER, 'sand', 'path', 'path_dark', ring_col=(0.98, 0.90, 0.68))

    def palm(x, y, s):
        for i in range(6):
            C.cylinder('palm', 0.16 * s, 0.6 * s, (x + i * 0.08 * s, y, (0.3 + i * 0.55) * s),
                       C.mat('palmb', (0.62, 0.44, 0.26)), vertices=8, rot=(0, 0.15, 0))
        top = (x + 0.5 * s, y, 3.4 * s)
        for a in range(7):
            ang = a * 2 * math.pi / 7
            C.sphere('frond', 1.0 * s, (top[0] + math.cos(ang) * 0.9 * s, top[1] + math.sin(ang) * 0.9 * s,
                                        top[2] - 0.25 * s), C.mat('frondm', 'leaf', rough=0.8),
                     scale=(1.2, 0.35, 0.12), rot=(0, 0.35, ang), segments=12, rings=6)
    C.sphere('island', 1.0, (70, 160, -1), C.mat('isl', (0.36, 0.62, 0.42)), scale=(30, 10, 7))
    C.sphere('island2', 1.0, (-90, 190, -1), C.mat('isl2', (0.46, 0.68, 0.56)), scale=(40, 12, 9))
    scatter(5, (-24, 30), (14, 30), avoid, lambda x, y, r: palm(x, y, r.uniform(1.0, 1.4)), seed=31)
    scatter(10, (-18, 22), (3, 30), avoid, lambda x, y, r: rock(x, y, r.uniform(0.2, 0.5), (0.80, 0.70, 0.60), 'shell'),
            seed=32)
    for x, y, z, s in ((-50, 230, 32, 6), (20, 240, 44, 8), (90, 220, 30, 5)):
        cloud(x, y, z, s)


def scene_city(cam, E, P, avoid):
    sky((0.40, 0.66, 0.96), (0.92, 0.94, 1.0))
    ground('grass')
    C.plane('road', 400, 5, (0, 46, -0.22), C.mat('road', (0.48, 0.48, 0.54), rough=0.9))
    C.plane('walk', 400, 1.2, (0, 43, -0.21), C.mat('walk', 'wall_shade', rough=0.9))
    platform('pe', ENEMY, 'grass_light', 'path', 'path_dark', ring_col='path')
    platform('pp', PLAYER, 'grass_light', 'path', 'path_dark', ring_col='path')
    rnd = random.Random(41)
    cols = ['roof_blue', 'wall', 'roof_orange', (0.70, 0.80, 0.92), 'wall_shade', (0.86, 0.70, 0.78), 'roof_green']
    win = emit_mat('win', (0.75, 0.90, 1.0), 0.9)
    x = -70
    while x < 90:
        w = rnd.uniform(6, 11)
        h = rnd.uniform(8, 30)
        y = rnd.uniform(56, 72)
        col = rnd.choice(cols)
        C.box('bld', (w, 6, h), (x + w / 2, y, h / 2), C.mat('bld' + str(col), col, rough=0.7), bevel=0.2)
        C.box('roof', (w + 0.4, 6.4, 0.8), (x + w / 2, y, h + 0.3), C.mat('roofc', (0.40, 0.42, 0.50)), bevel=0.1)
        rows = int(h / 3)
        for r_ in range(rows):
            C.box('winrow', (w * 0.8, 0.1, 1.0), (x + w / 2, y - 3.02, 2 + r_ * 3), win)
        x += w + rnd.uniform(0.5, 3)
    scatter(18, (-30, 36), (34, 42), [], lambda x, y, r: tree(x, y, r.uniform(1.3, 1.8)), seed=42)
    scatter(10, (-18, 22), (10, 30), avoid, lambda x, y, r: bush(x, y, r.uniform(0.6, 0.9), 'leaf'), seed=43)
    # flower beds
    for col, seed in (((0.98, 0.40, 0.50), 44), ((1.0, 0.86, 0.30), 45)):
        scatter(14, (-16, 20), (4, 28), avoid,
                lambda x, y, r, c=col: C.sphere('fl', 0.12, (x, y, 0.0), C.mat('fl' + str(c), c), segments=8, rings=5),
                seed=seed)
    for x, y, z, s in ((-50, 230, 50, 7), (40, 240, 60, 8)):
        cloud(x, y, z, s)


def scene_gym(cam, E, P, avoid):
    sky((0.10, 0.10, 0.18), (0.16, 0.16, 0.26), light=0.35)
    ground((0.30, 0.34, 0.46), name='floor', rough=0.4)
    # arena court
    C.plane('court', 30, 34, (3, 18, -0.24), C.mat('court', (0.86, 0.74, 0.52), rough=0.35, spec=0.5))
    C.plane('courtline', 30.6, 34.6, (3, 18, -0.245), C.mat('cline', (0.95, 0.95, 0.98), rough=0.4))
    C.plane('courtmid', 30, 0.3, (3, 16, -0.235), C.mat('cline', (0.95, 0.95, 0.98)))
    C.cylinder('courtc', 3, 0.01, (3, 16, -0.235), C.mat('cring', 'roof_red'), vertices=48)
    platform('pe', ENEMY, (0.92, 0.92, 0.96), 'roof_red', (0.30, 0.30, 0.40), ring_col='roof_red')
    platform('pp', PLAYER, (0.92, 0.92, 0.96), 'roof_blue', (0.30, 0.30, 0.40), ring_col='roof_blue')
    # stands
    for i in range(6):
        C.box('stand', (120, 2.0, 1.4 + i * 1.6), (0, 40 + i * 2.0, (1.4 + i * 1.6) / 2 - 0.25),
              C.mat('stand%d' % (i % 2), (0.36, 0.40, 0.62) if i % 2 else (0.30, 0.34, 0.54), rough=0.6))
    C.box('wall', (160, 2, 40), (0, 56, 20), C.mat('gwall', (0.22, 0.24, 0.40), rough=0.7))
    C.box('band', (160, 0.4, 1.4), (0, 54.8, 11), emit_mat('band', (0.40, 0.80, 1.0), 2.5))
    C.box('band2', (160, 0.4, 0.5), (0, 54.8, 13), emit_mat('band2', (1.0, 0.85, 0.40), 2.0))
    # crowd dots
    rnd = random.Random(51)
    for i in range(6):
        for k in range(70):
            x = -60 + k * 1.75 + rnd.uniform(-0.3, 0.3)
            c = rnd.choice([(0.95, 0.40, 0.40), (0.40, 0.60, 0.95), (0.98, 0.86, 0.40), (0.60, 0.85, 0.50), (0.9, 0.9, 0.9)])
            C.sphere('fan', 0.35, (x, 39.6 + i * 2.0, 1.4 + i * 1.6), C.mat('fan' + str(c), c), segments=8, rings=5)
    # stadium lights
    lm = emit_mat('lamp', (1.0, 0.98, 0.90), 12)
    for x in (-36, -12, 18, 42):
        C.box('rig', (8, 0.6, 3), (x, 52, 24), C.mat('rig', (0.15, 0.15, 0.20)))
        for j in range(3):
            for i in range(2):
                C.sphere('lamp', 0.8, (x - 2.6 + j * 2.6, 51.5, 23.2 + i * 1.6), lm, segments=12, rings=6)
        L = bpy.data.lights.new('spot', 'SPOT')
        L.energy = 9000
        L.spot_size = math.radians(70)
        L.spot_blend = 0.6
        L.color = (1.0, 0.97, 0.9)
        o = bpy.data.objects.new('spot', L)
        o.location = (x, 48, 22)
        o.rotation_euler = (Vector((3 - x * 0.3, 16 - 48, -22)).to_track_quat('-Z', 'Y')).to_euler()
        bpy.context.scene.collection.objects.link(o)


def scene_cave(cam, E, P, avoid):
    sky((0.05, 0.05, 0.10), (0.10, 0.08, 0.16), light=0.25)
    ground((0.30, 0.27, 0.30))
    platform('pe', ENEMY, (0.46, 0.42, 0.44), (0.30, 0.27, 0.30), (0.22, 0.20, 0.24), ring_col=(0.38, 0.34, 0.38))
    platform('pp', PLAYER, (0.46, 0.42, 0.44), (0.30, 0.27, 0.30), (0.22, 0.20, 0.24), ring_col=(0.38, 0.34, 0.38))
    wallm = C.mat('cwall', (0.34, 0.30, 0.36), rough=0.95)
    rnd = random.Random(61)
    # back wall of lumpy rock + ceiling
    for i in range(40):
        x = -70 + i * 3.6
        C.sphere('cw', rnd.uniform(5, 8), (x, 46 + rnd.uniform(-3, 3), rnd.uniform(0, 8)), wallm,
                 scale=(1, 0.8, 1.6), segments=10, rings=6, smooth=False)
    C.plane('ceil', 200, 200, (0, 100, 26), wallm, rot=(math.pi, 0, 0))
    darkm = C.mat('cwall2', (0.26, 0.23, 0.28), rough=0.95)
    for i in range(50):
        x = rnd.uniform(-50, 60)
        y = rnd.uniform(25, 44)
        C.cone('stal', rnd.uniform(0.8, 1.8), 0, rnd.uniform(4, 12), (x, y, 26 - 3), darkm, rot=(math.pi, 0, 0),
               vertices=7, smooth=False)
    scatter(20, (-20, 30), (14, 40), avoid, lambda x, y, r: C.cone('stag', r.uniform(0.5, 1.2), 0, r.uniform(1.5, 4),
                                                                   (x, y, 0.5), darkm, vertices=7, smooth=False),
            seed=62)
    scatter(30, (-20, 26), (3, 40), avoid, lambda x, y, r: rock(x, y, r.uniform(0.2, 0.8), (0.40, 0.36, 0.40)), seed=63)
    # glowing crystals
    for col, seed in (((0.55, 0.85, 1.0), 64), ((0.85, 0.55, 1.0), 65)):
        cm = emit_mat('crys' + str(seed), col, 3.0)
        def cr(x, y, r, cm=cm, col=col):
            for k in range(3):
                C.cone('crys', 0.3, 0, r.uniform(0.8, 1.8), (x + k * 0.3, y, 0.4), cm,
                       rot=(r.uniform(-0.4, 0.4), r.uniform(-0.4, 0.4), 0), vertices=6, smooth=False)
            L = bpy.data.lights.new('cl', 'POINT')
            L.energy = 300
            L.color = col
            L.shadow_soft_size = 1
            o = bpy.data.objects.new('cl', L)
            o.location = (x, y - 1, 1.2)
            bpy.context.scene.collection.objects.link(o)
        scatter(5, (-22, 32), (10, 40), avoid, cr, seed=seed)
    # soft top light on the arena
    L = bpy.data.lights.new('hole', 'SPOT')
    L.energy = 6000
    L.spot_size = math.radians(60)
    L.spot_blend = 0.8
    L.color = (0.85, 0.90, 1.0)
    o = bpy.data.objects.new('hole', L)
    o.location = (2, 8, 22)
    o.rotation_euler = (Vector((0, 10, -22)).to_track_quat('-Z', 'Y')).to_euler()
    bpy.context.scene.collection.objects.link(o)


SCENES = [
    ('bg_grass', scene_grass, dict()),
    ('bg_forest', scene_forest, dict(key=2.4)),
    ('bg_rock', scene_rock, dict()),
    ('bg_beach', scene_beach, dict(key=3.4)),
    ('bg_city', scene_city, dict()),
    ('bg_gym', scene_gym, dict(key=0.6, fill=0.3)),
    ('bg_cave', scene_cave, dict(key=0.25, fill=0.2)),
]


def build(key, fn, opts):
    C.reset_scene()
    C.setup_render(W, H, samples=SAMPLES, outline=False, transparent=False)
    bpy.context.scene.render.image_settings.color_mode = 'RGB'
    C.add_lights(key_strength=opts.get('key', 3.0), fill_strength=opts.get('fill', 0.9))
    cam = make_camera()
    E = solve_platform(cam, ENEMY, 0.0)
    P = solve_platform(cam, PLAYER, 0.0)
    avoid = [(E[0], E[1], E[2], 1.35), (P[0], P[1], P[2], 1.3)]
    fn(cam, E, P, avoid)
    bpy.context.view_layer.update()
    checks = {}
    for nm, pre, spec in (('enemy', 'pe', ENEMY), ('player', 'pp', PLAYER)):
        o = bpy.data.objects[pre + '_side']
        pts = [C.to_pixel(o.matrix_world @ v.co) for v in o.data.vertices[:len(o.data.vertices) // 2]]
        xs = [q[0] for q in pts]; ys = [q[1] for q in pts]
        checks[nm] = {'target': [spec['c'], spec['r']],
                      'bbox_centre': [round((min(xs) + max(xs)) / 2, 1), round((min(ys) + max(ys)) / 2, 1)],
                      'radii': [round((max(xs) - min(xs)) / 2, 1), round((max(ys) - min(ys)) / 2, 1)],
                      'right_px': [round(v, 1) for v in pts[0]], 'bottom_px': [round(v, 1) for v in pts[len(pts) // 4]]}
    print('[battle]', key, 'platform pixels', checks)
    path = os.path.join(C.work_dir(GROUP), key + '.png')
    C.render(path)
    return path, checks


def main():
    outputs = []
    allchecks = {}
    for key, fn, opts in SCENES:
        path = os.path.join(C.work_dir(GROUP), key + '.png')
        if not ONLY or key in ONLY:
            path, ch = build(key, fn, opts)
            allchecks[key] = ch
        outputs.append({'key': key, 'kind': 'image', 'frames': [path], 'cols': 1, 'quality': 82,
                        'meta': {'enemy_platform': {'c': list(ENEMY['c']), 'r': list(ENEMY['r'])},
                                 'player_platform': {'c': list(PLAYER['c']), 'r': list(PLAYER['r'])}}})
    import json
    with open(os.path.join(C.work_dir(GROUP), 'checks.json'), 'w') as fh:
        json.dump(allchecks, fh, indent=1)
    C.write_spec(GROUP, outputs)


main()
