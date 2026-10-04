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


def noise_mat(name, c1, c2, scale=0.6, rough=0.95, spec=0.25):
    m = C.mat(name, c1, rough=rough, spec=spec)
    nt = m.node_tree
    p = nt.nodes.get('Principled BSDF')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nz = nt.nodes.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = scale
    nz.inputs['Detail'].default_value = 3
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[0].color = (*C.srgb_to_linear(C.PALETTE.get(c1, c1) if isinstance(c1, str) else c1), 1)
    ramp.color_ramp.elements[1].position = 0.7
    ramp.color_ramp.elements[1].color = (*C.srgb_to_linear(C.PALETTE.get(c2, c2) if isinstance(c2, str) else c2), 1)
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    nt.links.new(nz.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], p.inputs['Base Color'])
    return m


def ground(col, size=400, z=-0.25, name='ground', rough=0.95, col2=None, scale=0.15):
    m = noise_mat(name + 'm', col, col2, scale, rough) if col2 else C.mat(name + 'm', col, rough=rough)
    return C.plane(name, size, size, (0, size / 2 - 20, z), m)


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


def clouds(seed=9, n=6, y=420):
    """Puffy clouds placed by pixel height above the horizon (camera is low and flat)."""
    rnd = random.Random(seed)
    f = W * LENS / 36.0
    for i in range(n):
        x = -110 + (i + rnd.uniform(0.1, 0.9)) * 220 / n
        px = rnd.uniform(45, 120)
        cloud(x, y, CAM_H + y * px / f, rnd.uniform(5, 8))


def hill(x, y, rx, h, col, ry=None):
    C.sphere('hill', 1.0, (x, y, -0.2), C.mat('hill' + str(col), col, rough=0.95),
             scale=(rx, ry or rx * 0.6, h), segments=32, rings=16)


def bush(x, y, s, col='leaf'):
    for dx, r in ((-0.35, 0.4), (0.0, 0.55), (0.4, 0.42)):
        C.sphere('bush', r * s, (x + dx * s, y, 0.1 * s), C.mat('bush' + col, col, rough=0.8), segments=14, rings=8)


def rock(x, y, s, col='rock', name='rock'):
    o = C.sphere(name, s, (x, y, 0.1 * s), C.mat(name + str(col), col, rough=0.9),
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
    ground('grass', col2=(0.36, 0.68, 0.26))
    platform('pe', ENEMY, 'grass_light', 'grass', 'path_dark', ring_col='grass')
    platform('pp', PLAYER, 'grass_light', 'grass', 'path_dark', ring_col='grass')
    for x, y, rx, h, c in ((-90, 260, 110, 9, (0.50, 0.74, 0.52)), (40, 300, 140, 13, (0.56, 0.78, 0.58)),
                           (150, 270, 100, 8, (0.48, 0.72, 0.50)), (-40, 170, 60, 4, (0.36, 0.64, 0.32)),
                           (70, 160, 60, 3.5, (0.34, 0.62, 0.30))):
        hill(x, y, rx, h, c)
    scatter(55, (-80, 90), (120, 170), [], lambda x, y, r: tree(x, y, r.uniform(1.4, 2.0)), seed=3)
    scatter(4, (-30, -12), (60, 80), [], lambda x, y, r: tree(x, y, r.uniform(1.1, 1.4)), seed=4)
    scatter(8, (-14, 24), (10, 60), avoid, lambda x, y, r: bush(x, y, r.uniform(0.35, 0.55) * (0.6 + y / 40), 'grass_dark'), seed=5)
    flowers(avoid, (-8, 10), (8, 22))
    clouds()


def flowers(avoid, xr, yr, n=60, seed=7):
    for col, sd in (((1.0, 0.95, 0.95), seed), ((1.0, 0.86, 0.30), seed + 1), ((0.98, 0.50, 0.62), seed + 2)):
        scatter(n // 3, xr, yr, avoid, lambda x, y, r, c=col: C.sphere('fl', 0.045, (x, y, -0.2), C.mat('fl' + str(c), c),
                                                                       segments=8, rings=5), seed=sd)


def scene_forest(cam, E, P, avoid):
    sky((0.50, 0.78, 0.70), (0.85, 0.95, 0.80), light=0.45)
    ground('grass_dark', col2='grass')
    platform('pe', ENEMY, 'grass', 'grass_dark', 'bark', ring_col='leaf')
    platform('pp', PLAYER, 'grass', 'grass_dark', 'bark', ring_col='leaf')
    # a wall of big trees enclosing the clearing
    scatter(80, (-70, 80), (62, 110), [], lambda x, y, r: tree(x, y, r.uniform(2.2, 3.0), 'leaf', 'leaf_dark',
                                                                r.choice(['pine', 'round'])), seed=11)
    scatter(8, (-30, 34), (44, 58), avoid, lambda x, y, r: tree(x, y, r.uniform(1.2, 1.6), 'leaf_dark', 'leaf_dark',
                                                                 'pine'), seed=12)
    scatter(14, (-16, 24), (8, 50), avoid, lambda x, y, r: bush(x, y, r.uniform(0.35, 0.55) * (0.6 + y / 40), 'leaf'), seed=13)
    flowers(avoid, (-8, 10), (8, 22))
    L = bpy.data.lights.new('sunspot', 'SPOT')
    L.energy = 30000
    L.spot_size = math.radians(30)
    L.spot_blend = 0.9
    L.color = (1.0, 0.95, 0.75)
    o = bpy.data.objects.new('sunspot', L)
    o.location = (-6, 0, 40)
    o.rotation_euler = (Vector((6, 25, -40)).to_track_quat('-Z', 'Y')).to_euler()
    bpy.context.scene.collection.objects.link(o)


def scene_rock(cam, E, P, avoid):
    sky((0.48, 0.66, 0.92), (0.98, 0.88, 0.72))
    ground((0.72, 0.60, 0.46), col2=(0.80, 0.68, 0.52))
    platform('pe', ENEMY, 'rock', 'rock_dark', 'rock_dark', ring_col=(0.62, 0.58, 0.54))
    platform('pp', PLAYER, 'rock', 'rock_dark', 'rock_dark', ring_col=(0.62, 0.58, 0.54))
    rnd = random.Random(21)
    for x, y, sx, h, c in ((-120, 330, 50, 14, (0.78, 0.52, 0.36)), (-40, 360, 40, 18, (0.72, 0.46, 0.32)),
                           (40, 340, 60, 11, (0.80, 0.56, 0.40)), (110, 320, 40, 16, (0.74, 0.48, 0.34)),
                           (200, 370, 70, 15, (0.78, 0.54, 0.38)), (-70, 170, 14, 5, (0.66, 0.44, 0.32)),
                           (90, 190, 18, 6, (0.68, 0.46, 0.33)), (-25, 230, 12, 4, (0.70, 0.48, 0.34))):
        o = C.box('mesa', (sx, sx * 0.7, h), (x, y, h / 2 - 0.3), C.mat('mesa' + str(c), c, rough=0.9), bevel=sx * 0.06)
        C.box('mesa_top', (sx * 0.96, sx * 0.66, h * 0.03), (x, y, h - 0.2), C.mat('mesat', (0.62, 0.64, 0.36), rough=0.9),
              bevel=0.1)
        for k in range(3):
            C.box('strata', (sx * 1.005, sx * 0.705, h * 0.04), (x, y, h * (0.25 + k * 0.22)),
                  C.mat('strata' + str(c), tuple(v * 0.86 for v in c), rough=0.9))
    scatter(26, (-26, 34), (8, 70), avoid, lambda x, y, r: rock(x, y, r.uniform(0.2, 0.45) * (0.7 + y / 60)), seed=22)
    clouds()


def scene_beach(cam, E, P, avoid):
    sky((0.30, 0.62, 0.98), (0.88, 0.96, 1.0))
    ground('sand', col2=(0.96, 0.88, 0.66))
    sea = C.plane('sea', 600, 400, (0, 260, -0.18), C.mat('sea', 'water', rough=0.45, spec=0.3))
    C.plane('shallow', 600, 8, (0, 60, -0.2), C.mat('shallow', (0.36, 0.80, 0.86), rough=0.5, spec=0.3))
    C.plane('foam', 600, 0.6, (0, 56.2, -0.15), C.mat('foamm', 'foam', rough=0.5))
    C.plane('foam2', 600, 0.4, (0, 63.5, -0.16), C.mat('foamm', 'foam', rough=0.5))
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
    C.sphere('island', 1.0, (70, 330, -1), C.mat('isl', (0.36, 0.62, 0.42)), scale=(40, 14, 9))
    C.sphere('island2', 1.0, (-110, 380, -1), C.mat('isl2', (0.50, 0.70, 0.62)), scale=(50, 16, 11))
    for px_, py_, ps in ((-11, 44, 1.2), (-6.5, 50, 1.0), (14.5, 52, 1.1), (-13.5, 55, 0.9)):
        palm(px_, py_, ps)
    scatter(10, (-18, 22), (3, 30), avoid, lambda x, y, r: rock(x, y, r.uniform(0.2, 0.5), (0.80, 0.70, 0.60), 'shell'),
            seed=32)
    clouds()


def scene_city(cam, E, P, avoid):
    sky((0.40, 0.66, 0.96), (0.92, 0.94, 1.0))
    ground('grass')
    C.plane('road', 400, 5, (0, 66, -0.22), C.mat('road', (0.48, 0.48, 0.54), rough=0.9))
    C.plane('walk', 400, 1.2, (0, 62.5, -0.21), C.mat('walk', 'wall_shade', rough=0.9))
    platform('pe', ENEMY, 'grass_light', 'path', 'path_dark', ring_col='path')
    platform('pp', PLAYER, 'grass_light', 'path', 'path_dark', ring_col='path')
    rnd = random.Random(41)
    cols = ['roof_blue', 'wall', 'roof_orange', (0.70, 0.80, 0.92), 'wall_shade', (0.86, 0.70, 0.78), 'roof_green']
    win = emit_mat('win', (0.75, 0.90, 1.0), 0.9)
    x = -280
    while x < 300:
        w = rnd.uniform(14, 26)
        h = rnd.uniform(10, 26)
        y = rnd.uniform(200, 240)
        col = rnd.choice(cols)
        C.box('bld', (w, 12, h), (x + w / 2, y, h / 2), C.mat('bld' + str(col), col, rough=0.7), bevel=0.2)
        C.box('roof', (w + 0.8, 12.8, 1.2), (x + w / 2, y, h + 0.3), C.mat('roofc', (0.40, 0.42, 0.50)), bevel=0.1)
        rows = int((h - 1) / 3.5)
        for r_ in range(rows):
            C.box('winrow', (w * 0.8, 0.1, 1.4), (x + w / 2, y - 6.02, 2.5 + r_ * 3.5), win)
        x += w + rnd.uniform(0.5, 3)
    scatter(36, (-70, 80), (72, 90), [], lambda x, y, r: tree(x, y, r.uniform(1.2, 1.6)), seed=42)
    scatter(10, (-18, 26), (10, 52), avoid, lambda x, y, r: bush(x, y, r.uniform(0.35, 0.5) * (0.6 + y / 40), 'leaf'), seed=43)
    flowers(avoid, (-8, 12), (8, 24), n=45, seed=44)
    clouds()


def scene_gym(cam, E, P, avoid):
    sky((0.10, 0.10, 0.18), (0.16, 0.16, 0.26), light=0.35)
    ground((0.30, 0.34, 0.46), name='floor', rough=0.4)
    # arena court
    C.plane('court', 30, 60, (3, 20, -0.24), C.mat('court', (0.86, 0.74, 0.52), rough=0.6, spec=0.3))
    C.plane('courtline', 30.6, 60.6, (3, 20, -0.245), C.mat('cline', (0.95, 0.95, 0.98), rough=0.4))
    C.plane('courtmid', 30, 0.3, (3, 26, -0.235), C.mat('cline', (0.95, 0.95, 0.98)))
    platform('pe', ENEMY, (0.92, 0.92, 0.96), 'roof_red', (0.30, 0.30, 0.40), ring_col='roof_red')
    platform('pp', PLAYER, (0.92, 0.92, 0.96), 'roof_blue', (0.30, 0.30, 0.40), ring_col='roof_blue')
    # stands
    for i in range(6):
        C.box('stand', (200, 1.6, 0.6 + i * 0.55), (0, 52 + i * 1.6, (0.6 + i * 0.55) / 2 - 0.25),
              C.mat('stand%d' % (i % 2), (0.36, 0.40, 0.62) if i % 2 else (0.30, 0.34, 0.54), rough=0.6))
    C.box('led', (200, 0.1, 0.12), (0, 51.15, 0.2), emit_mat('led', (1.0, 0.45, 0.35), 3.0))
    C.box('wall', (200, 2, 40), (0, 68, 20), C.mat('gwall', (0.22, 0.24, 0.40), rough=0.7))
    C.box('band', (200, 0.4, 0.35), (0, 66.8, 4.0), emit_mat('band', (0.40, 0.80, 1.0), 2.5))
    C.box('band2', (200, 0.4, 0.12), (0, 66.8, 3.6), emit_mat('band2', (1.0, 0.85, 0.40), 2.0))
    # crowd dots
    rnd = random.Random(51)
    for i in range(6):
        for k in range(110):
            x = -95 + k * 1.75 + rnd.uniform(-0.3, 0.3)
            c = rnd.choice([(0.95, 0.40, 0.40), (0.40, 0.60, 0.95), (0.98, 0.86, 0.40), (0.60, 0.85, 0.50), (0.9, 0.9, 0.9)])
            C.sphere('fan', 0.3, (x, 52.2 + i * 1.6, 0.35 + i * 0.55 + 0.25), C.mat('fan' + str(c), c), segments=8, rings=5)
    # stadium lights
    lm = emit_mat('lamp', (1.0, 0.98, 0.90), 12)
    for x in (-40, -14, 20, 46):
        C.box('rig', (8, 0.6, 2.2), (x, 64, 4.9), C.mat('rig', (0.15, 0.15, 0.20)))
        for j in range(3):
            for i in range(2):
                C.sphere('lamp', 0.5, (x - 2.6 + j * 2.6, 63.5, 4.2 + i * 0.9), lm, segments=12, rings=6)
        L = bpy.data.lights.new('spot', 'SPOT')
        L.energy = 2500
        L.spot_size = math.radians(70)
        L.spot_blend = 0.6
        L.color = (1.0, 0.97, 0.9)
        o = bpy.data.objects.new('spot', L)
        o.location = (x, 58, 14)
        o.rotation_euler = (Vector((3 - x * 0.6, 26 - 58, -14)).to_track_quat('-Z', 'Y')).to_euler()
        bpy.context.scene.collection.objects.link(o)


def scene_cave(cam, E, P, avoid):
    sky((0.05, 0.05, 0.10), (0.10, 0.08, 0.16), light=0.5)
    ground((0.36, 0.32, 0.36), col2=(0.44, 0.40, 0.44))
    platform('pe', ENEMY, (0.46, 0.42, 0.44), (0.30, 0.27, 0.30), (0.22, 0.20, 0.24), ring_col=(0.38, 0.34, 0.38))
    platform('pp', PLAYER, (0.46, 0.42, 0.44), (0.30, 0.27, 0.30), (0.22, 0.20, 0.24), ring_col=(0.38, 0.34, 0.38))
    wallm = C.mat('cwall', (0.34, 0.30, 0.36), rough=0.95)
    rnd = random.Random(61)
    # back wall of lumpy rock + ceiling
    for i in range(60):
        x = -100 + i * 3.6
        C.sphere('cw', rnd.uniform(5, 8), (x, 64 + rnd.uniform(-3, 3), rnd.uniform(0, 4)), wallm,
                 scale=(1, 0.8, 1.6), segments=10, rings=6, smooth=False)
    C.plane('ceil', 300, 300, (0, 100, 5.2), wallm, rot=(math.pi, 0, 0))
    darkm = C.mat('cwall2', (0.26, 0.23, 0.28), rough=0.95)
    for i in range(70):
        x = rnd.uniform(-60, 70)
        y = rnd.uniform(30, 62)
        C.cone('stal', rnd.uniform(0.3, 0.7), 0, rnd.uniform(1.0, 2.6), (x, y, 5.2 - 0.6), darkm, rot=(math.pi, 0, 0),
               vertices=7, smooth=False)
    scatter(20, (-30, 40), (40, 62), avoid, lambda x, y, r: C.cone('stag', r.uniform(0.4, 0.9), 0, r.uniform(1.2, 3),
                                                                   (x, y, 0.5), darkm, vertices=7, smooth=False),
            seed=62)
    scatter(14, (-24, 34), (20, 60), avoid, lambda x, y, r: rock(x, y, r.uniform(0.15, 0.3) * (0.6 + y / 40), (0.40, 0.36, 0.40)), seed=63)
    # glowing crystals
    for col, seed in (((0.55, 0.85, 1.0), 64), ((0.85, 0.55, 1.0), 65)):
        cm = emit_mat('crys' + str(seed), col, 0.8)
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
        scatter(4, (-30, 40), (30, 58), avoid, cr, seed=seed)
    # soft top light on the arena
    L = bpy.data.lights.new('hole', 'SPOT')
    L.energy = 6000
    L.spot_size = math.radians(60)
    L.spot_blend = 0.8
    L.color = (0.85, 0.90, 1.0)
    o = bpy.data.objects.new('hole', L)
    o.location = (2, 18, 4.8)
    o.rotation_euler = (Vector((0, 10, -4.8)).to_track_quat('-Z', 'Y')).to_euler()
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
    C._mat_cache.clear()   # work-around: common.mat's cache holds freed materials after reset_scene
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
