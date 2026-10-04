"""nature group: trees, bushes, flowers, boulders, sign, lamp, items (oblique, outline on).

    blender -b --factory-startup --python tools/pokemon-art/nature.py
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import common as C  # noqa: E402

GROUP = 'nature'
OUT = C.work_dir(GROUP)
PAD = 4  # px around the union bbox
ONLY = os.environ.get('NATURE_ONLY', '')  # comma-separated keys for quick iteration


def M(name, color, **kw):
    return C.mat(name, color, **kw)


def blob(name, r, loc, material, scale=(1, 1, 1), seg=24, rings=12):
    return C.sphere(name, r, loc, material, scale=scale, segments=seg, rings=rings)


def trunk(r_bot, r_top, h, x=0.5, y=0.5, material=None):
    return C.cone('trunk', r_bot, r_top, h, (x, y, h / 2), material or M('bark', 'bark', rough=0.8), vertices=16)


SHADOW = {}


def shadow_disc(rx, ry, cx=0.5, cy=0.5):
    """Request a soft contact shadow ellipse (tiles) composited under the render."""
    SHADOW['v'] = (rx, ry, cx, cy)


def add_shadow(path, strength=0.45):
    """Composite a soft dark ellipse under the rendered sprite (premultiplied 'under')."""
    import numpy as np
    if 'v' not in SHADOW:
        return
    rx, ry, cx, cy = SHADOW['v']
    px, py = C.to_pixel((cx, cy, 0))
    sx = rx * C.PPU
    sy = ry * C.PPU * math.sin(math.radians(C.ELEV_DEG))
    img = bpy.data.images.load(path)
    w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]  # top-down
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx + 0.5 - px) / sx) ** 2 + ((yy + 0.5 - py) / sy) ** 2)
    s = strength * np.clip(1.0 - d, 0, 1) ** 0.8
    s = np.where(d < 1, np.clip(s * 1.0 + 0.0, 0, 1), 0)
    al = a[..., 3]
    out_a = al + s * (1 - al)
    rgb = a[..., :3] * al[..., None] + np.array([0.02, 0.10, 0.03]) * (s * (1 - al))[..., None]
    a[..., :3] = np.where(out_a[..., None] > 1e-5, rgb / np.maximum(out_a, 1e-5)[..., None], 0)
    a[..., 3] = out_a
    img.pixels[:] = a[::-1].ravel()
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)


def setup_noink():
    col = bpy.data.collections.get('noink') or bpy.data.collections.new('noink')
    if col.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(col)
    ls = bpy.context.view_layer.freestyle_settings.linesets[0]
    ls.select_by_collection = True
    ls.collection = col
    ls.collection_negation = 'EXCLUSIVE'


def no_outline(*objs):
    # Exclude helper objects (shadow) from freestyle lines.
    for o in objs:
        try:
            o.visible_shadow = False
        except AttributeError:
            pass
        if hasattr(bpy.data, 'collections'):
            pass
    return objs


# ── Models ──────────────────────────────────────────────────────────────────

def canopy_cluster(seed, center, radius, n, mat_main, mat_hi, squash=0.9):
    rnd = random.Random(seed)
    objs = [blob('can', radius, center, mat_main, scale=(1, 1, squash))]
    for i in range(n):
        a = i / n * math.tau + rnd.uniform(-0.3, 0.3)
        rr = radius * rnd.uniform(0.50, 0.62)
        d = radius * 0.62
        z = center[2] + radius * rnd.uniform(-0.25, 0.35) * squash
        objs.append(blob('can', rr, (center[0] + math.cos(a) * d, center[1] + math.sin(a) * d * 0.8, z), mat_main))
    # top highlight lumps
    for i in range(3):
        a = i / 3 * math.tau + 0.6
        objs.append(blob('hi', radius * 0.45, (center[0] + math.cos(a) * radius * 0.3 - 0.06,
                                               center[1] + math.sin(a) * radius * 0.3 - 0.05,
                                               center[2] + radius * 0.52 * squash), mat_hi))
    return objs


def tree_round():
    leaf = M('leaf', 'leaf', rough=0.6)
    hi = M('leaf_hi', (0.36, 0.70, 0.24), rough=0.6)
    trunk(0.13, 0.09, 0.75)
    canopy_cluster(1, (0.5, 0.5, 1.12), 0.48, 7, leaf, hi)
    shadow_disc(0.48, 0.40)


def tree_pine():
    pine = M('pine', (0.10, 0.44, 0.26), rough=0.6)
    pine_hi = M('pine_hi', (0.18, 0.56, 0.30), rough=0.6)
    trunk(0.11, 0.08, 0.5)
    tiers = [(0.45, 0.42, 0.62), (0.98, 0.34, 0.56), (1.44, 0.24, 0.50)]
    for i, (z, r, h) in enumerate(tiers):
        C.cone('tier', r, 0.02, h, (0.5, 0.5, z + h / 2), pine if i % 2 == 0 else pine_hi, vertices=10, smooth=False)
    shadow_disc(0.40, 0.34)


def tree_fruit():
    leaf = M('leaf_f', (0.24, 0.60, 0.20), rough=0.6)
    hi = M('leaf_fhi', (0.40, 0.74, 0.26), rough=0.6)
    fruit = M('fruit', (0.92, 0.22, 0.16), rough=0.35, spec=0.5)
    trunk(0.13, 0.09, 0.72)
    c = (0.5, 0.5, 1.10)
    canopy_cluster(3, c, 0.47, 6, leaf, hi, squash=0.85)
    rnd = random.Random(7)
    for i in range(9):
        a = i / 9 * math.tau + rnd.uniform(-0.2, 0.2)
        z = c[2] + rnd.uniform(-0.25, 0.25)
        rr = 0.50 * math.sqrt(max(0.0, 1 - ((z - c[2]) / 0.5) ** 2)) + 0.04
        p = (c[0] + math.cos(a) * rr, c[1] + math.sin(a) * rr * 0.85, z)
        if p[1] > c[1] + 0.15:
            continue  # only fruit on the visible side
        blob('fruit', 0.065, p, fruit, seg=12, rings=8)
    shadow_disc(0.48, 0.40)


def tree_bushy():
    leaf = M('leaf_b', (0.16, 0.52, 0.22), rough=0.6)
    hi = M('leaf_bhi', (0.30, 0.66, 0.26), rough=0.6)
    trunk(0.12, 0.09, 0.45)
    canopy_cluster(5, (0.5, 0.52, 0.80), 0.42, 8, leaf, hi, squash=0.95)
    canopy_cluster(6, (0.5, 0.55, 1.30), 0.30, 5, leaf, hi)
    shadow_disc(0.50, 0.42)


def tree_dense(v):
    leaf = M('leaf_d', (0.10, 0.36, 0.14), rough=0.65)
    hi = M('leaf_dhi', (0.18, 0.48, 0.18), rough=0.65)
    trunk(0.15, 0.10, 0.65, material=M('bark_d', (0.30, 0.19, 0.10), rough=0.8))
    if v == 0:
        canopy_cluster(11, (0.5, 0.5, 1.05), 0.56, 8, leaf, hi, squash=0.85)
        canopy_cluster(12, (0.5, 0.56, 1.55), 0.36, 5, leaf, hi)
    else:
        tiers = [(0.36, 0.68, 0.72), (0.92, 0.52, 0.64), (1.44, 0.34, 0.56)]
        pine = M('pine_d', (0.07, 0.32, 0.18), rough=0.65)
        pine_hi = M('pine_dhi', (0.12, 0.42, 0.22), rough=0.65)
        for i, (z, r, h) in enumerate(tiers):
            C.cone('tier', r, 0.02, h, (0.5, 0.5, z + h / 2), pine if i % 2 == 0 else pine_hi, vertices=12, smooth=False)
    shadow_disc(0.52, 0.44)


def bush(v):
    leaf = M('bush%d' % v, [(0.24, 0.62, 0.22), (0.18, 0.54, 0.26)][v], rough=0.6)
    hi = M('bushhi%d' % v, [(0.42, 0.76, 0.30), (0.32, 0.68, 0.32)][v], rough=0.6)
    canopy_cluster(20 + v, (0.5, 0.5, 0.28), 0.27, 6, leaf, hi, squash=0.85)
    if v == 1:
        berry = M('berry', (0.95, 0.35, 0.55), rough=0.4)
        for a in (-1.8, -1.3, -0.6, -2.4):
            blob('berry', 0.045, (0.5 + math.cos(a) * 0.30, 0.5 + math.sin(a) * 0.26, 0.32), berry, seg=10, rings=6)
    shadow_disc(0.40, 0.32)


FLOWER_COLS = [((0.92, 0.18, 0.20), 'red'), ((0.98, 0.84, 0.16), 'yellow'),
               ((0.97, 0.97, 0.95), 'white'), ((0.64, 0.36, 0.90), 'purple')]


def flowers(v):
    col = M('petal%d' % v, FLOWER_COLS[v][0], rough=0.45)
    centre = M('fcentre', (1.0, 0.78, 0.18) if v != 1 else (0.85, 0.45, 0.10), rough=0.5)
    stem = M('stem', (0.26, 0.60, 0.20), rough=0.6)
    rnd = random.Random(40 + v)
    spots = [(0.25, 0.30), (0.62, 0.22), (0.80, 0.55), (0.45, 0.62), (0.20, 0.72), (0.70, 0.82)]
    for (x, y) in spots:
        x += rnd.uniform(-0.04, 0.04); y += rnd.uniform(-0.04, 0.04)
        h = rnd.uniform(0.14, 0.22)
        # leafy tuft
        blob('tuft', 0.09, (x, y, 0.04), stem, scale=(1.2, 1.0, 0.6), seg=12, rings=6)
        C.cylinder('stem', 0.015, h, (x, y, h / 2), stem, vertices=6)
        for k in range(5):
            a = k / 5 * math.tau
            blob('pet', 0.05, (x + math.cos(a) * 0.05, y + math.sin(a) * 0.05, h), col, scale=(1, 1, 0.45), seg=10, rings=6)
        blob('ctr', 0.032, (x, y, h + 0.02), centre, seg=10, rings=6)


def boulder(v):
    rock = M('rock', 'rock', rough=0.85)
    rock_hi = M('rock_hi', (0.68, 0.64, 0.60), rough=0.85)
    rnd = random.Random(60 + v)

    def lump(r, loc, scale, m):
        o = blob('rock', r, loc, m, scale=scale, seg=10, rings=6)
        o.data.polygons.foreach_set('use_smooth', [False] * len(o.data.polygons))
        # jitter vertices for a chunky faceted rock
        for vt in o.data.vertices:
            vt.co += Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))) * r * 0.08
        C.subsurf(o, 1)
        return o
    if v == 0:
        lump(0.40, (0.5, 0.5, 0.30), (1.05, 0.95, 0.85), rock)
    elif v == 1:
        lump(0.30, (0.40, 0.55, 0.24), (1.0, 1.0, 0.9), rock)
        lump(0.22, (0.70, 0.36, 0.16), (1.0, 0.9, 0.8), rock_hi)
    else:
        lump(0.20, (0.32, 0.40, 0.14), (1.2, 1.0, 0.8), rock_hi)
        lump(0.16, (0.70, 0.60, 0.12), (1.0, 1.0, 0.8), rock)
        lump(0.11, (0.62, 0.28, 0.08), (1.0, 1.0, 0.8), rock)
    shadow_disc(0.44, 0.36)


def sign():
    wood = M('wood', 'wood', rough=0.7)
    board = M('board', (0.80, 0.60, 0.36), rough=0.7)
    for x in (0.22, 0.78):
        C.box('post', (0.09, 0.09, 0.62), (x, 0.5, 0.31), wood, bevel=0.015)
    C.box('board', (0.86, 0.07, 0.42), (0.5, 0.46, 0.66), board, bevel=0.02)
    C.box('frame', (0.92, 0.09, 0.05), (0.5, 0.47, 0.88), wood, bevel=0.015)
    shadow_disc(0.40, 0.16)


def lamp():
    metal = M('lampmetal', (0.20, 0.24, 0.32), rough=0.35, metal=0.6)
    glow = M('lampglow', (1.0, 0.94, 0.70), emission=(1.0, 0.90, 0.60), emission_strength=1.6)
    C.cylinder('base', 0.13, 0.12, (0.5, 0.5, 0.06), metal)
    C.cylinder('pole', 0.045, 1.55, (0.5, 0.5, 0.85), metal, vertices=12)
    C.box('head', (0.30, 0.30, 0.05), (0.5, 0.5, 1.64), metal, bevel=0.02)
    C.box('glass', (0.24, 0.24, 0.24), (0.5, 0.5, 1.75), glow, bevel=0.02)
    C.cone('cap', 0.24, 0.04, 0.16, (0.5, 0.5, 1.95), metal, vertices=4, rot=(0, 0, math.pi / 4), smooth=False)
    shadow_disc(0.22, 0.18)


def item_ball():
    red = M('ballred', (0.92, 0.12, 0.12), rough=0.25, spec=0.6)
    white = M('ballwhite', (0.97, 0.97, 0.97), rough=0.25, spec=0.6)
    black = M('ballblack', (0.08, 0.08, 0.10), rough=0.4)
    r = 0.175
    c = (0.5, 0.5, r)
    top = C.sphere('top', r, c, red)
    bot = C.sphere('bot', r * 0.995, c, white)
    # cut hemispheres: delete verts above/below centre
    import bmesh
    for o, keep_top in ((top, True), (bot, False)):
        bm = bmesh.new(); bm.from_mesh(o.data)
        kill = [v for v in bm.verts if (v.co.z < -0.001) == keep_top]
        bmesh.ops.delete(bm, geom=kill, context='VERTS')
        bm.to_mesh(o.data); bm.free()
    C.cylinder('band', r * 1.01, 0.03, c, black, vertices=32)
    btn = C.cylinder('btn', 0.055, 0.03, (0.5, 0.5 - r * 0.97, r), black, rot=(math.pi / 2, 0, 0))
    C.cylinder('btnw', 0.035, 0.03, (0.5, 0.5 - r * 1.04, r), white, rot=(math.pi / 2, 0, 0))
    _ = btn
    parent_tilt([top, bot] + [o for o in bpy.context.scene.objects if o.name.startswith(('band', 'btn'))])
    shadow_disc(0.20, 0.15)


def parent_tilt(objs):
    e = C.parent_all('ball', objs, loc=(0.5, 0.5, 0.175))
    for o in objs:
        o.location = Vector(o.location) - Vector((0.5, 0.5, 0.175))
    e.rotation_euler = (math.radians(-30), 0, math.radians(-10))
    bpy.context.view_layer.update()


def item_potion():
    body = M('potion', (0.66, 0.30, 0.82), rough=0.25, spec=0.6)
    pink = M('potionpink', (0.98, 0.50, 0.74), rough=0.3, spec=0.5)
    grey = M('nozzle', (0.80, 0.82, 0.86), rough=0.3, metal=0.3)
    C.cylinder('body', 0.13, 0.30, (0.5, 0.5, 0.15), body)
    C.cylinder('label', 0.133, 0.10, (0.5, 0.5, 0.15), pink)
    C.cylinder('shoulder', 0.09, 0.06, (0.5, 0.5, 0.33), body)
    C.box('nozzle', (0.12, 0.10, 0.10), (0.5, 0.5, 0.40), grey, bevel=0.02)
    C.box('spout', (0.06, 0.12, 0.04), (0.5, 0.42, 0.42), grey)
    C.box('trigger', (0.05, 0.05, 0.10), (0.5, 0.42, 0.36), grey)
    shadow_disc(0.18, 0.14)


ASSETS = [
    ('tree', 4, [tree_round, tree_pine, tree_fruit, tree_bushy]),
    ('tree_dense', 2, [lambda: tree_dense(0), lambda: tree_dense(1)]),
    ('bush', 2, [lambda: bush(0), lambda: bush(1)]),
    ('flowers', 4, [lambda v=v: flowers(v) for v in range(4)]),
    ('boulder', 3, [lambda v=v: boulder(v) for v in range(3)]),
    ('sign', 1, [sign]),
    ('lamp', 1, [lamp]),
    ('item_ball', 1, [item_ball]),
    ('item_potion', 1, [item_potion]),
]


def build(fn):
    C.clear_objects()
    fn()
    bpy.context.view_layer.update()


def local_extent():
    """Camera-local bbox (tiles) of all meshes, relative to world origin's projection."""
    cam = C.camera_oblique(256, 256, (0, 0, 0))
    inv = cam.matrix_world.inverted()
    o0 = inv @ Vector((0, 0, 0))
    pts = [inv @ p for p in C._mesh_world_points([o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.get('no_extent')])]
    # always include the footprint so the anchor lies inside the frame
    pts += [inv @ Vector(c) for c in ((0, 0, 0), (1, 0, 0), (0, 1, 0), (1, 1, 0))]
    return (min(p.x for p in pts) - o0.x, max(p.x for p in pts) - o0.x,
            min(p.y for p in pts) - o0.y, max(p.y for p in pts) - o0.y)


def main():
    C.reset_scene()
    C.setup_render(64, 64, samples=32, outline=True)
    C.add_lights()
    setup_noink()
    outputs = []
    for key, n, fns in ASSETS:
        if ONLY and key not in ONLY.split(','):
            continue
        ext = None
        for fn in fns:
            build(fn)
            e = local_extent()
            ext = e if ext is None else (min(ext[0], e[0]), max(ext[1], e[1]), min(ext[2], e[2]), max(ext[3], e[3]))
        pad = PAD / C.PPU
        x0, x1, y0, y1 = ext[0] - pad, ext[1] + pad, ext[2] - pad, ext[3] + pad
        # keep the anchor on whole pixels: snap the box outward
        ax = math.ceil(-x0 * C.PPU)
        ay = math.ceil(y1 * C.PPU)
        rw = ax + math.ceil(x1 * C.PPU)
        rh = ay + math.ceil(-y0 * C.PPU)
        rw += rw % 2; rh += rh % 2
        frames = []
        for i, fn in enumerate(fns):
            C.fixed_oblique_frame(rw, rh, foot_center=(0, 0, 0), foot_px=(ax, ay))
            SHADOW.clear()
            build(fn)
            C.fixed_oblique_frame(rw, rh, foot_center=(0, 0, 0), foot_px=(ax, ay))
            p = C.render(os.path.join(OUT, f'{key}_{i}.png'))
            add_shadow(p)
            frames.append(p)
        anchor = C.to_pixel((0, 0, 0))
        outputs.append({'key': key, 'kind': 'object', 'frames': frames, 'cols': n,
                        'anchor': [round(anchor[0], 2), round(anchor[1], 2)], 'foot': [1, 1]})
        print('[nature]', key, rw, rh, anchor)
    if not ONLY:
        C.write_spec(GROUP, outputs)


main()
