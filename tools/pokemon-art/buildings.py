"""Buildings group: towns, Pokémon Centers, Marts, gyms, city blocks.

    blender -b --factory-startup --python tools/pokemon-art/buildings.py [-- key1 key2]

Every building stands on its footprint x 0..w, y 0..d with the front (south) wall at y=0.
Anchor = pixel of the south-west footprint corner (0,0,0).
"""
import math
import os
import sys

import bmesh
import bpy

sys.path.insert(0, '/home/user/CLASS-APP/tools/pokemon-art')
import common as C  # noqa: E402

GROUP = 'buildings'
ONLY = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SAMPLES = 32

# ── materials ──────────────────────────────────────────────────────────────

def M(name, col, **kw):
    return C.mat(name, col, **kw)


def mats():
    return {
        'white': M('white', (0.97, 0.96, 0.94), rough=0.5),
        'cream': M('cream', C.PALETTE['wall']),
        'cream_d': M('cream_d', C.PALETTE['wall_shade']),
        'wood': M('wood', C.PALETTE['wood']),
        'wood_d': M('wood_d', (0.38, 0.22, 0.11)),
        'glass': M('glass', C.PALETTE['glass'], rough=0.15, emission=(0.45, 0.70, 0.90), emission_strength=0.35, spec=0.6),
        'glass_d': M('glass_d', (0.35, 0.60, 0.85), rough=0.15, emission=(0.25, 0.45, 0.70), emission_strength=0.3, spec=0.6),
        'dark': M('dark', (0.14, 0.13, 0.16)),
        'grey': M('grey', (0.70, 0.70, 0.72)),
        'grey_d': M('grey_d', (0.45, 0.45, 0.48)),
        'stone': M('stone', C.PALETTE['rock']),
        'stone_d': M('stone_d', C.PALETTE['rock_dark']),
        'red': M('red', (0.88, 0.18, 0.14), rough=0.4),
        'yellow': M('yellow', (0.98, 0.82, 0.16), rough=0.45),
        'blue': M('blue', C.PALETTE['roof_blue'], rough=0.45),
        'flower_r': M('flower_r', (0.95, 0.30, 0.35)),
        'flower_y': M('flower_y', (1.0, 0.88, 0.25)),
        'leaf': M('leafm', C.PALETTE['leaf']),
        'brick': M('brick', (0.72, 0.36, 0.26)),
    }


def roof_mats(key, col):
    r, g, b = col
    a = M('roof_' + key, col, rough=0.45)
    bm = M('roof_' + key + '_d', (r * 0.80, g * 0.80, b * 0.80), rough=0.45)
    lt = M('roof_' + key + '_l', (min(1, r * 1.15 + 0.05), min(1, g * 1.15 + 0.05), min(1, b * 1.15 + 0.05)), rough=0.45)
    return a, bm, lt


# ── geometry helpers ───────────────────────────────────────────────────────

def bx(name, x0, x1, y0, y1, z0, z1, mat, bevel=0.0):
    return C.box(name, (x1 - x0, y1 - y0, z1 - z0), ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), mat, bevel=bevel)


def mesh_obj(name, bm, mats_list):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    for m in mats_list:
        me.materials.append(m)
    return o


def prism(name, pts_xz, y0, depth, mat):
    """Extrude a polygon drawn in the XZ plane (as seen from the front) along +Y."""
    bm = bmesh.new()
    f = [bm.verts.new((x, y0, z)) for x, z in pts_xz]
    b = [bm.verts.new((x, y0 + depth, z)) for x, z in pts_xz]
    n = len(pts_xz)
    bm.faces.new(f)
    bm.faces.new(list(reversed(b)))
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([f[i], f[j], b[j], b[i]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(name, bm, [mat])


def disc(name, r, cx, cz, y0, depth, mat, a0=0.0, a1=2 * math.pi, seg=40):
    """Disc / circular sector facing south (-Y), front face at y0."""
    full = abs(a1 - a0) >= 2 * math.pi - 1e-6
    pts = []
    n = seg if full else max(4, int(seg * abs(a1 - a0) / (2 * math.pi)) + 1)
    for i in range(n if full else n + 1):
        a = a0 + (a1 - a0) * i / n
        pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    if not full:
        pts.append((cx, cz))
    return prism(name, pts, y0, depth, mat)


def text(name, s, cx, cz, y, size, mat, depth=0.025):
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = s
    cu.size = size
    cu.extrude = depth
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    o = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(o)
    o.rotation_euler = (math.radians(90), 0, 0)
    o.location = (cx, y, cz)
    bpy.context.view_layer.objects.active = o
    for ob in bpy.context.selected_objects:
        ob.select_set(False)
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.view_layer.objects.active
    o.data.materials.clear()
    o.data.materials.append(mat)
    return o


def sign(cx, cz, w, h, label, board, txt, frame=None, y=-0.06):
    if frame is not None:
        bx('signf', cx - w / 2 - 0.05, cx + w / 2 + 0.05, y + 0.005, y + 0.06, cz - h / 2 - 0.05, cz + h / 2 + 0.05, frame, bevel=0.02)
    bx('sign', cx - w / 2, cx + w / 2, y, y + 0.06, cz - h / 2, cz + h / 2, board, bevel=0.015)
    if label:
        tsize = min(h * 0.78, w / (0.62 * max(1, len(label))))
        text('t_' + label, label, cx, cz, y - 0.012, tsize, txt, depth=0.012)


def window(cx, cz, ww, wh, frame, glass, mull=True, sill=None, shutters=None, y=0.0):
    bx('wfr', cx - ww / 2 - 0.07, cx + ww / 2 + 0.07, y - 0.035, y + 0.02, cz - wh / 2 - 0.07, cz + wh / 2 + 0.07, frame, bevel=0.012)
    bx('wgl', cx - ww / 2, cx + ww / 2, y - 0.045, y - 0.02, cz - wh / 2, cz + wh / 2, glass)
    # light glint
    bx('wgl2', cx - ww / 2 + 0.04, cx - ww / 2 + 0.09, y - 0.05, y - 0.04, cz - wh / 2 + 0.06, cz + wh / 2 - 0.06, M('glint', (0.92, 0.98, 1.0), emission=(0.9, 0.97, 1), emission_strength=0.6))
    if mull:
        bx('wm1', cx - 0.025, cx + 0.025, y - 0.06, y - 0.03, cz - wh / 2, cz + wh / 2, frame)
        bx('wm2', cx - ww / 2, cx + ww / 2, y - 0.06, y - 0.03, cz - 0.025, cz + 0.025, frame)
    if sill is not None:
        bx('wsill', cx - ww / 2 - 0.12, cx + ww / 2 + 0.12, y - 0.10, y + 0.02, cz - wh / 2 - 0.13, cz - wh / 2 - 0.06, sill, bevel=0.01)
    if shutters is not None:
        for s in (-1, 1):
            x0 = cx + s * (ww / 2 + 0.09)
            x1 = x0 + s * ww * 0.42
            bx('shut', min(x0, x1), max(x0, x1), y - 0.04, y + 0.01, cz - wh / 2 - 0.04, cz + wh / 2 + 0.04, shutters, bevel=0.01)
            for k in range(3):
                zz = cz - wh / 2 + (k + 0.5) * (wh / 3)
                bx('slat', min(x0, x1) + 0.02, max(x0, x1) - 0.02, y - 0.055, y - 0.035, zz - 0.012, zz + 0.012, M('slat', (0.15, 0.12, 0.10)))


def flower_box(cx, cz, w, mm):
    bx('fbox', cx - w / 2, cx + w / 2, -0.16, -0.02, cz - 0.10, cz, mm['wood'], bevel=0.01)
    n = max(3, int(w / 0.12))
    for i in range(n):
        x = cx - w / 2 + 0.06 + i * (w - 0.12) / max(1, n - 1)
        C.sphere('fl', 0.055, (x, -0.10, cz + 0.03), mm['flower_r'] if i % 2 else mm['flower_y'], segments=10, rings=6)
        C.sphere('fll', 0.05, (x + 0.03, -0.07, cz + 0.0), mm['leaf'], segments=8, rings=5)


def wood_door(cx, w, h, mm, col=None, y=0.0):
    col = col or mm['wood']
    bx('dfr', cx - w / 2 - 0.08, cx + w / 2 + 0.08, y - 0.04, y + 0.02, 0, h + 0.08, mm['white'], bevel=0.015)
    bx('door', cx - w / 2, cx + w / 2, y - 0.06, y - 0.02, 0, h, col, bevel=0.01)
    for zz in (h * 0.3, h * 0.72):
        bx('dpan', cx - w / 2 + 0.06, cx + w / 2 - 0.06, y - 0.075, y - 0.05, zz - h * 0.14, zz + h * 0.14, mm['wood_d'], bevel=0.008)
    C.sphere('knob', 0.035, (cx + w / 2 - 0.08, y - 0.08, h * 0.5), mm['yellow'], segments=10, rings=6)
    bx('step', cx - w / 2 - 0.12, cx + w / 2 + 0.12, y - 0.14, y, 0, 0.05, mm['grey'], bevel=0.01)


def glass_door(cx, w, h, frame, mm, y=0.0):
    bx('gdfr', cx - w / 2 - 0.08, cx + w / 2 + 0.08, y - 0.04, y + 0.02, 0, h + 0.08, frame, bevel=0.015)
    bx('gd', cx - w / 2, cx + w / 2, y - 0.06, y - 0.02, 0, h, mm['glass'])
    bx('gdm', cx - 0.025, cx + 0.025, y - 0.075, y - 0.05, 0, h, frame)
    for s in (-1, 1):
        bx('gdh', cx + s * 0.07 - 0.015, cx + s * 0.07 + 0.015, y - 0.09, y - 0.06, h * 0.35, h * 0.6, mm['grey'])
    bx('gdglint', cx - w / 2 + 0.05, cx - w / 2 + 0.10, y - 0.07, y - 0.06, 0.1, h - 0.1, M('glint', (0.92, 0.98, 1.0)))
    bx('mat', cx - w / 2 - 0.1, cx + w / 2 + 0.1, y - 0.16, y, 0, 0.03, mm['grey_d'])


def double_door(cx, w, h, col, frame, mm, y=0.0):
    bx('ddfr', cx - w / 2 - 0.1, cx + w / 2 + 0.1, y - 0.05, y + 0.02, 0, h + 0.1, frame, bevel=0.02)
    for s in (-1, 1):
        x0 = cx + (0 if s > 0 else -w / 2) + 0.015
        x1 = x0 + w / 2 - 0.03
        bx('dd', x0, x1, y - 0.07, y - 0.03, 0, h, col, bevel=0.01)
        bx('ddp', x0 + 0.07, x1 - 0.07, y - 0.085, y - 0.06, h * 0.45, h - 0.12, mm['glass'], bevel=0.005)
        C.sphere('ddk', 0.04, (cx + s * 0.08, y - 0.09, h * 0.42), mm['yellow'], segments=10, rings=6)
    bx('ddstep', cx - w / 2 - 0.2, cx + w / 2 + 0.2, y - 0.2, y, 0, 0.06, mm['grey'], bevel=0.01)


def walls(w, d, H, mat, base=None, base_h=0.18, band=None, band_z=None):
    bx('walls', 0, w, 0, d, 0, H, mat)
    if base is not None:
        bx('base', 0, w, -0.02, d, 0, base_h, base, bevel=0.01)
    if band is not None:
        bz = band_z if band_z is not None else H - 0.12
        bx('band', -0.01, w + 0.01, -0.03, d, bz - 0.08, bz + 0.08, band, bevel=0.012)
    # corner trims
    for x in (0.0, w):
        bx('corner', x - 0.04, x + 0.04, -0.04, d, 0, H, base if base is not None else mat, bevel=0.01)


def gable_roof(w, d, H, rise, cols, wall_mat, ov=0.22, rows=None, side_ov=0.16):
    """Gable roof with the ridge running east-west; bevelled tile strips on both slopes."""
    main, dark, light = cols
    x0, x1 = -side_ov, w + side_ov
    yc = d / 2
    ridge = H + rise
    # solid core (wall-coloured gable ends + roof underside)
    bm = bmesh.new()
    pts = [(-ov, H - 0.02), (yc, ridge - 0.04), (d + ov, H - 0.02)]
    gx0, gx1 = 0.0, w
    a = [bm.verts.new((gx0, y, z)) for y, z in pts]
    b = [bm.verts.new((gx1, y, z)) for y, z in pts]
    bm.faces.new(a)
    bm.faces.new(list(reversed(b)))
    for i in range(3):
        j = (i + 1) % 3
        bm.faces.new([a[i], a[j], b[j], b[i]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh_obj('gable', bm, [wall_mat])
    # roof slabs
    half = yc + ov
    slope_len = math.hypot(half, rise)
    ang = math.atan2(rise, half)
    if rows is None:
        rows = max(3, int(round(slope_len / 0.28)))
    th = 0.07
    for side in (-1, 1):
        # slab base
        # point along slope: from eave (y_e, H) to ridge (yc, ridge)
        y_e = -ov if side < 0 else d + ov
        for i in range(rows):
            t0 = i / rows
            t1 = (i + 1) / rows + 0.02
            tm = (t0 + t1) / 2
            yy = y_e + (yc - y_e) * tm
            zz = H + rise * tm
            ln = slope_len * (t1 - t0)
            nrm_y = side * math.sin(ang) * -1  # outward normal y
            nrm_z = math.cos(ang)
            # stack strips like shingles: lower rows sit a bit further out
            off = th * 0.5 + 0.02 * (1 - tm)
            loc = (w / 2, yy + nrm_y * off * -1 if False else yy - (-side) * 0 + (side * math.sin(ang)) * off, zz + nrm_z * off)
            m = main if i % 2 == 0 else light
            if i == 0:
                m = dark
            C.box('tile', (x1 - x0, ln, th), loc, m, bevel=0.025, rot=(side * -ang if side > 0 else ang, 0, 0))
    # ridge cap
    C.cylinder('ridge', 0.08, x1 - x0 + 0.04, (w / 2, yc, ridge + 0.05), dark, rot=(0, math.radians(90), 0), vertices=12)
    # fascia boards along the gable ends
    for x in (x0 - 0.01, x1 + 0.01):
        for side in (-1, 1):
            y_e = -ov if side < 0 else d + ov
            yy = (y_e + yc) / 2
            zz = H + rise / 2 + 0.05
            C.box('fascia', (0.06, slope_len + 0.05, 0.14), (x, yy, zz), dark, bevel=0.01,
                  rot=(ang if side < 0 else -ang, 0, 0))
    return ridge


def flat_roof(w, d, H, top, parapet, ph=0.18, ov=0.05):
    top = M('rooftop_warm', (0.80, 0.78, 0.74), rough=0.8)
    bx('rooftop', 0, w, 0, d, H, H + 0.04, top)
    t = 0.12
    bx('parS', -ov, w + ov, -ov, t - ov, H, H + ph, parapet, bevel=0.015)
    bx('parN', -ov, w + ov, d - t + ov, d + ov, H, H + ph, parapet, bevel=0.015)
    bx('parW', -ov, t - ov, -ov, d + ov, H, H + ph, parapet, bevel=0.015)
    bx('parE', w - t + ov, w + ov, -ov, d + ov, H, H + ph, parapet, bevel=0.015)


def roof_grid(w, d, H, mm, col=None):
    # subtle drain line + vents instead of a full grid (a grid read like a spreadsheet)
    dm = M('roofvent', (0.58, 0.58, 0.62))
    bx('drain', 0.3, w - 0.3, d * 0.5 - 0.02, d * 0.5 + 0.02, H + 0.04, H + 0.05, dm)
    for i in range(max(1, int(w / 2.5))):
        x = 1.1 + i * 2.5
        C.cylinder('vent', 0.07, 0.18, (x, 0.45, H + 0.12), dm, vertices=10)
    return
    col = col or M('roofgrid', (0.62, 0.62, 0.66))
    x = 0.6
    while x < w - 0.3:
        bx('rg', x - 0.015, x + 0.015, 0.12, d - 0.12, H + 0.04, H + 0.06, col)
        x += 0.6
    y = 0.6
    while y < d - 0.3:
        bx('rg', 0.12, w - 0.12, y - 0.015, y + 0.015, H + 0.04, H + 0.06, col)
        y += 0.6


def roof_garden(x0, x1, y0, y1, H, mm):
    bx('planter', x0, x1, y0, y1, H, H + 0.16, mm['wood'], bevel=0.02)
    bx('soil', x0 + 0.05, x1 - 0.05, y0 + 0.05, y1 - 0.05, H + 0.16, H + 0.18, M('soil', (0.35, 0.24, 0.15)))
    n = max(2, int((x1 - x0) / 0.35))
    for i in range(n):
        x = x0 + 0.17 + i * (x1 - x0 - 0.34) / max(1, n - 1)
        C.sphere('rbush', 0.17, (x, (y0 + y1) / 2, H + 0.3), mm['leaf'], segments=12, rings=8)


def solar(x0, y0, nx, ny, H, mm):
    pm = M('solar', (0.14, 0.22, 0.45), rough=0.25, spec=0.6)
    for i in range(nx):
        for j in range(ny):
            C.box('pv', (0.5, 0.38, 0.04), (x0 + i * 0.56, y0 + j * 0.5, H + 0.2), pm, bevel=0.01, rot=(math.radians(-25), 0, 0))
            bx('pvleg', x0 + i * 0.56 - 0.02, x0 + i * 0.56 + 0.02, y0 + j * 0.5 - 0.02, y0 + j * 0.5 + 0.02, H, H + 0.18, mm['grey_d'])


def stair_house(x, y, H, mm, wall):
    bx('stairh', x - 0.45, x + 0.45, y - 0.35, y + 0.35, H, H + 0.7, wall, bevel=0.02)
    bx('stairr', x - 0.5, x + 0.5, y - 0.4, y + 0.4, H + 0.7, H + 0.78, mm['grey_d'], bevel=0.015)
    bx('staird', x - 0.18, x + 0.18, y - 0.37, y - 0.33, H, H + 0.5, mm['dark'])


def rooftop_units(w, d, H, mm, n=2):
    for i in range(n):
        x = w * (0.25 + 0.5 * i / max(1, n - 1)) if n > 1 else w * 0.7
        bx('ac', x - 0.3, x + 0.3, d * 0.5, d * 0.5 + 0.45, H, H + 0.3, mm['grey'], bevel=0.03)
        C.cylinder('fan', 0.12, 0.04, (x, d * 0.5 + 0.22, H + 0.31), mm['grey_d'], vertices=14)


def chimney(x, y, z0, h, mm):
    bx('chim', x - 0.16, x + 0.16, y - 0.16, y + 0.16, z0, z0 + h, mm['brick'], bevel=0.02)
    bx('chimtop', x - 0.2, x + 0.2, y - 0.2, y + 0.2, z0 + h, z0 + h + 0.08, mm['grey_d'], bevel=0.015)


def awning(x0, x1, z, depth, c1, c2, stripes=None):
    """Striped shop awning sloping out from the wall."""
    w = x1 - x0
    n = stripes or max(3, int(w / 0.25))
    ang = math.radians(28)
    ln = depth / math.cos(ang)
    for i in range(n):
        a = x0 + i * w / n
        b = a + w / n
        C.box('awn', (b - a, ln, 0.04), ((a + b) / 2, -depth / 2, z - depth * math.tan(ang) / 2), c1 if i % 2 == 0 else c2, rot=(-ang, 0, 0))
        # valance scallop
        C.box('awnv', (b - a, 0.03, 0.12), ((a + b) / 2, -depth - 0.01, z - depth * math.tan(ang) - 0.05), c1 if i % 2 == 0 else c2)


# ── emblems (front-facing, at y0) ──────────────────────────────────────────

def pokeball(cx, cz, r, y0, mm):
    disc('pb_ring', r * 1.08, cx, cz, y0 + 0.01, 0.05, mm['dark'])
    disc('pb_top', r, cx, cz, y0 - 0.01, 0.04, mm['red'], 0, math.pi)
    disc('pb_bot', r, cx, cz, y0 - 0.01, 0.04, mm['white'], math.pi, 2 * math.pi)
    bx('pb_band', cx - r, cx + r, y0 - 0.03, y0 + 0.02, cz - r * 0.09, cz + r * 0.09, mm['dark'])
    disc('pb_btn_o', r * 0.32, cx, cz, y0 - 0.04, 0.03, mm['dark'])
    disc('pb_btn', r * 0.2, cx, cz, y0 - 0.06, 0.03, mm['white'])
    disc('pb_shine', r * 0.16, cx - r * 0.45, cz + r * 0.5, y0 - 0.02, 0.01, M('shine', (1, 0.75, 0.72)))


def leaf_emblem(cx, cz, r, y0, mm):
    disc('le_bg', r, cx, cz, y0, 0.05, mm['white'])
    disc('le_ring', r * 1.1, cx, cz, y0 + 0.02, 0.05, M('le_ring', (0.16, 0.42, 0.18)))
    pts = []
    n = 24
    for i in range(n + 1):
        t = i / n
        z = -0.8 + 1.6 * t
        wdt = 0.55 * math.sin(math.pi * t) ** 0.8
        pts.append((wdt, z))
    left = [(-x, z) for x, z in reversed(pts[1:-1])]
    poly = [(cx + x * r, cz + z * r) for x, z in pts + left]
    o = prism('leaf', poly, y0 - 0.04, 0.04, M('leaf_e', (0.30, 0.72, 0.28)))
    o.rotation_euler = (0, math.radians(-30), 0)
    o.location = (0, 0, 0)
    # rotate around emblem centre
    import mathutils
    o.matrix_world = mathutils.Matrix.Translation((cx, 0, cz)) @ mathutils.Matrix.Rotation(math.radians(-30), 4, 'Y') @ mathutils.Matrix.Translation((-cx, 0, -cz))
    vein = C.box('vein', (0.035, 0.02, r * 1.4), (cx, y0 - 0.05, cz), M('vein', (0.18, 0.45, 0.16)))
    vein.matrix_world = mathutils.Matrix.Translation((cx, 0, cz)) @ mathutils.Matrix.Rotation(math.radians(-30), 4, 'Y') @ mathutils.Matrix.Translation((-cx, 0, -cz)) @ vein.matrix_world


def bolt_emblem(cx, cz, r, y0, mm):
    disc('bo_ring', r * 1.1, cx, cz, y0 + 0.02, 0.05, mm['dark'])
    disc('bo_bg', r, cx, cz, y0, 0.05, mm['yellow'])
    p = [(0.15, 0.85), (-0.45, -0.05), (-0.02, -0.05), (-0.22, -0.85), (0.45, 0.12), (0.03, 0.12), (0.30, 0.85)]
    prism('bolt', [(cx + x * r, cz + z * r) for x, z in p], y0 - 0.05, 0.05, mm['dark'])


def wave_emblem(cx, cz, r, y0, mm):
    disc('wa_ring', r * 1.1, cx, cz, y0 + 0.02, 0.05, M('navy', (0.10, 0.22, 0.52)))
    disc('wa_bg', r, cx, cz, y0, 0.05, M('wa_sky', (0.55, 0.82, 1.0)))
    # lower water body with a curling wave crest
    pts = []
    n = 30
    for i in range(n + 1):
        t = i / n
        x = -0.92 + 1.84 * t
        z = 0.05 + 0.22 * math.sin(t * math.pi * 2.0 + 0.6) * (0.4 + 0.6 * t)
        pts.append((x, z))
    # close along the disc bottom
    bottom = []
    for i in range(1, 20):
        a = -math.atan2(0.2, 0.9) - (math.pi - 2 * math.atan2(0.2, 0.9)) * i / 20
        bottom.append((0.95 * math.cos(a), 0.95 * math.sin(a) * 0.98))
    poly = [(cx + x * r, cz + z * r) for x, z in pts + bottom]
    prism('wave', poly, y0 - 0.03, 0.03, mm['blue'])
    for k, (ox, oz) in enumerate(((-0.35, 0.15), (0.35, -0.05))):
        C.torus = None
    disc('foam1', r * 0.13, cx + r * 0.55, cz + r * 0.32, y0 - 0.045, 0.02, mm['white'])
    disc('foam2', r * 0.09, cx + r * 0.25, cz + r * 0.18, y0 - 0.045, 0.02, mm['white'])


def boulder_emblem(cx, cz, r, y0, mm):
    disc('bd_ring', r * 1.1, cx, cz, y0 + 0.02, 0.05, M('bd_ring', (0.40, 0.25, 0.12)))
    disc('bd_bg', r, cx, cz, y0, 0.05, M('bd_bg', (0.92, 0.80, 0.55)))
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=r * 0.62, location=(cx, y0 - 0.02, cz - r * 0.05))
    o = bpy.context.view_layer.objects.active
    o.scale = (1.0, 0.35, 0.82)
    C.assign(o, mm['stone'])
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=r * 0.3, location=(cx + r * 0.4, y0 - 0.06, cz - r * 0.35))
    o = bpy.context.view_layer.objects.active
    o.scale = (1.0, 0.4, 0.8)
    C.assign(o, mm['stone_d'])


def clock(cx, cz, r, y0, mm):
    disc('ck_ring', r * 1.15, cx, cz, y0 + 0.01, 0.05, M('gold', (0.85, 0.66, 0.20), metal=0.3, rough=0.35))
    disc('ck_face', r, cx, cz, y0 - 0.01, 0.04, mm['white'])
    for i in range(12):
        a = i * math.pi / 6
        bx('tick', cx + 0.78 * r * math.cos(a) - 0.012, cx + 0.78 * r * math.cos(a) + 0.012, y0 - 0.03, y0 - 0.01,
           cz + 0.78 * r * math.sin(a) - 0.012, cz + 0.78 * r * math.sin(a) + 0.012, mm['dark'])
    bx('hand1', cx - 0.018, cx + 0.018, y0 - 0.045, y0 - 0.025, cz, cz + r * 0.62, mm['dark'])
    bx('hand2', cx, cx + r * 0.45, y0 - 0.05, y0 - 0.03, cz - 0.018, cz + 0.018, mm['dark'])


# ── building builders ─────────────────────────────────────────────────────

def pokecenter(w, d, mm, big=False):
    H = 2.0 if w <= 3 else (2.1 if not big else 2.4)
    rcol = roof_mats('red', C.PALETTE['roof_red'])
    walls(w, d, H, mm['white'], base=mm['red'], base_h=0.2, band=mm['red'], band_z=H - 0.1)
    rise = 0.75 if w <= 3 else 0.85
    gable_roof(w, d, H, rise, rcol, mm['white'])
    cx = w / 2
    dw = 0.9 if w <= 3 else (1.1 if not big else 1.4)
    dh = 0.95 if w <= 3 else 1.05
    glass_door(cx, dw, dh, mm['red'], mm)
    # pediment holding the big Poké Ball, rising above the eaves
    pr = 0.42 if w <= 3 else (0.52 if not big else 0.62)
    pz = H + 0.15
    disc('ped_bg', pr * 1.3, cx, pz, -0.24, 0.12, mm['white'])
    disc('ped_rim', pr * 1.38, cx, pz, -0.2, 0.1, mm['red'])
    bx('ped_post', cx - pr * 0.9, cx + pr * 0.9, -0.22, 0.0, dh + 0.1, pz, mm['white'], bevel=0.02)
    pokeball(cx, pz, pr, -0.26, mm)
    # windows
    if w <= 3:
        for x in (0.5, w - 0.5):
            window(x, 1.1, 0.42, 0.55, mm['red'], mm['glass'], sill=mm['white'])
        sign(cx, dh + 0.24, 0.62, 0.17, 'P.C.', mm['red'], mm['white'], y=-0.09)
    else:
        n = 2 if not big else 3
        span = (w / 2 - dw / 2 - 0.25)
        for s in (-1, 1):
            for i in range(n):
                x = cx + s * (dw / 2 + 0.25 + span * (i + 0.5) / n)
                window(x, 1.15, min(0.6, span / n - 0.3), 0.65, mm['red'], mm['glass'], sill=mm['white'])
        label = 'POKéMON CENTER' if big else 'POKéMON'
        sign(cx + (-1.9 if big else -1.35), H - 0.35, 1.2 if big else 0.95, 0.24, 'P.C.', mm['red'], mm['white'], y=-0.08)
    # little planters by the door
    for s in (-1, 1):
        x = cx + s * (dw / 2 + 0.25)
        C.cylinder('pot', 0.12, 0.16, (x, -0.2, 0.08), mm['red'], vertices=14)
        C.sphere('bushp', 0.15, (x, -0.2, 0.25), mm['leaf'], segments=12, rings=8)


def mart(w, d, mm):
    H = 2.0
    rcol = roof_mats('blue', C.PALETTE['roof_blue'])
    walls(w, d, H, mm['white'], base=mm['blue'], base_h=0.2, band=mm['blue'])
    gable_roof(w, d, H, 0.75, rcol, mm['white'])
    cx = w / 2
    glass_door(cx, 0.9, 0.95, mm['blue'], mm)
    sign(cx, H + 0.2, 1.5, 0.42, 'MART', mm['blue'], mm['white'], frame=mm['white'], y=-0.3)
    bx('signpost', cx - 0.5, cx + 0.5, -0.25, 0.0, H - 0.1, H + 0.05, mm['white'])
    for x in (0.5, w - 0.5):
        window(x, 1.1, 0.48, 0.6, mm['blue'], mm['glass'], sill=mm['white'])
    # crates of goods by the door
    bx('crate', 0.18, 0.5, -0.32, -0.04, 0, 0.26, mm['wood'], bevel=0.02)
    C.sphere('apple', 0.07, (0.28, -0.18, 0.3), mm['red'], segments=10, rings=6)
    C.sphere('apple2', 0.07, (0.4, -0.2, 0.29), mm['flower_y'], segments=10, rings=6)


def house(w, d, mm, key, col, chim, variant):
    H = 2.0
    rcol = roof_mats(key, col)
    wall = mm['cream']
    walls(w, d, H, wall, base=mm['stone'], base_h=0.18)
    # timber trim band
    bx('trim', -0.01, w + 0.01, -0.03, d, H - 0.1, H, mm['wood'], bevel=0.01)
    ridge = gable_roof(w, d, H, 0.8, rcol, wall)
    cx = w / 2
    wood_door(cx, 0.55, 0.95, mm, col=M('door_' + key, tuple(c * 0.75 for c in col)))
    # little porch roof over the door
    C.box('porch', (0.95, 0.42, 0.05), (cx, -0.18, 1.12), rcol[1], bevel=0.015, rot=(math.radians(-20), 0, 0))
    for s in (-1, 1):
        bx('bracket', cx + s * 0.42 - 0.025, cx + s * 0.42 + 0.025, -0.3, 0.0, 0.98, 1.05, mm['wood'])
    for x in (0.55, w - 0.55):
        window(x, 1.05, 0.42, 0.5, mm['white'], mm['glass'], shutters=rcol[1] if variant % 2 == 0 else None)
        flower_box(x, 0.73, 0.62, mm)
    # round attic window under the eaves
    disc('attic_f', 0.2, cx, H - 0.38, -0.04, 0.05, mm['white'])
    disc('attic_g', 0.14, cx, H - 0.38, -0.06, 0.03, mm['glass'])
    if chim:
        chimney(w * 0.78, d * 0.62, H + 0.3, 0.75, mm)
    # attic window in the roof (dormer-like round window on the slope)
    if variant in (1, 3):
        chimney(w * 0.22, d * 0.66, H + 0.3, 0.6, mm)
    # mailbox
    bx('mbpost', w - 0.12, w - 0.08, -0.32, -0.28, 0, 0.42, mm['wood'])
    bx('mbox', w - 0.2, w, -0.38, -0.22, 0.42, 0.55, rcol[0], bevel=0.02)


def town_hall(w, d, mm):
    H = 2.2
    rcol = roof_mats('purple', C.PALETTE['roof_purple'])
    walls(w, d, H, mm['cream'], base=mm['stone'], base_h=0.22, band=mm['white'])
    gable_roof(w, d, H, 0.9, rcol, mm['cream'])
    cx = w / 2
    # portico: columns + triangular pediment with clock
    pw = 2.2
    bx('stepA', cx - pw / 2 - 0.15, cx + pw / 2 + 0.15, -0.55, 0.0, 0, 0.07, mm['grey'], bevel=0.01)
    bx('stepB', cx - pw / 2 - 0.05, cx + pw / 2 + 0.05, -0.45, 0.0, 0.07, 0.14, mm['grey'], bevel=0.01)
    for i in range(4):
        x = cx - pw / 2 + 0.12 + i * (pw - 0.24) / 3
        C.cylinder('col', 0.085, H - 0.1, (x, -0.33, 0.14 + (H - 0.1) / 2), mm['white'], vertices=16)
        bx('cap', x - 0.13, x + 0.13, -0.46, -0.2, H + 0.02, H + 0.1, mm['white'])
    bx('entab', cx - pw / 2 - 0.05, cx + pw / 2 + 0.05, -0.5, 0.0, H + 0.08, H + 0.28, mm['white'], bevel=0.015)
    prism('pedi', [(cx - pw / 2 - 0.1, H + 0.28), (cx + pw / 2 + 0.1, H + 0.28), (cx, H + 1.05)], -0.52, 0.5, mm['white'])
    prism('pedi_in', [(cx - pw / 2 + 0.15, H + 0.34), (cx + pw / 2 - 0.15, H + 0.34), (cx, H + 0.92)], -0.54, 0.03, rcol[1])
    clock(cx, H + 0.56, 0.2, -0.57, mm)
    double_door(cx, 0.8, 1.05, mm['wood'], mm['white'], mm)
    for x in (0.45, w - 0.45):
        window(x, 1.25, 0.38, 0.85, mm['white'], mm['glass'], sill=mm['white'])
    sign(cx, H - 0.25, 0.9, 0.16, 'TOWN HALL', rcol[0], mm['white'], y=-0.1)
    # flag
    C.cylinder('flagpole', 0.025, 0.7, (cx, -0.3, H + 1.3), mm['grey'], vertices=8)
    bx('flag', cx + 0.02, cx + 0.34, -0.31, -0.29, H + 1.42, H + 1.62, mm['red'])


def gym(w, d, mm, kind):
    cx = w / 2
    if kind == 'grass':
        H = 2.4
        rcol = roof_mats('green', C.PALETTE['roof_green'])
        wall = mm['cream']
        walls(w, d, H, wall, base=M('gbase', (0.30, 0.50, 0.25)), base_h=0.25, band=rcol[1])
        gable_roof(w, d, H, 1.0, rcol, wall)
        door_col, frame = M('gdoor', (0.35, 0.62, 0.30)), mm['wood']
        emb = leaf_emblem
        sign_txt, sign_col = 'GYM', rcol[1]
    elif kind == 'rock':
        H = 2.4
        rcol = roof_mats('brown', (0.55, 0.36, 0.20))
        wall = mm['stone']
        walls(w, d, H, wall, base=mm['stone_d'], base_h=0.28, band=mm['stone_d'])
        # stone block courses
        for i in range(1, 6):
            z = 0.28 + i * (H - 0.4) / 6
            bx('course', 0.02, w - 0.02, -0.02, 0.01, z - 0.015, z + 0.015, mm['stone_d'])
            for j in range(int(w / 0.6) + 1):
                x = j * 0.6 + (0.3 if i % 2 else 0)
                if 0.05 < x < w - 0.05:
                    bx('joint', x - 0.012, x + 0.012, -0.02, 0.01, z, z + (H - 0.4) / 6, mm['stone_d'])
        gable_roof(w, d, H, 0.95, rcol, wall)
        door_col, frame = mm['wood'], mm['stone_d']
        emb = boulder_emblem
        sign_txt, sign_col = 'GYM', rcol[1]
    elif kind == 'water':
        H = 2.4
        rcol = roof_mats('wblue', (0.25, 0.55, 0.88))
        wall = mm['white']
        walls(w, d, H, wall, base=M('navy', (0.10, 0.22, 0.52)), base_h=0.22, band=rcol[0])
        # wavy stripe
        for i in range(int(w / 0.35)):
            x = 0.175 + i * 0.35
            disc('wv', 0.13, x, 0.42, -0.02, 0.03, M('wa_sky', (0.55, 0.82, 1.0)), 0, math.pi, seg=16)
        gable_roof(w, d, H, 0.95, rcol, wall)
        door_col, frame = rcol[0], M('navy', (0.10, 0.22, 0.52))
        emb = wave_emblem
        sign_txt, sign_col = 'GYM', M('navy', (0.10, 0.22, 0.52))
    else:  # electric
        H = 2.9
        wall = mm['yellow']
        walls(w, d, H, wall, base=mm['dark'], base_h=0.25)
        # hazard stripes band
        bx('hz', -0.01, w + 0.01, -0.025, d, H - 0.32, H - 0.02, mm['dark'])
        for i in range(int(w / 0.3)):
            x = 0.1 + i * 0.3
            prism('hzs', [(x, H - 0.3), (x + 0.12, H - 0.3), (x + 0.24, H - 0.04), (x + 0.12, H - 0.04)], -0.04, 0.02, mm['yellow'])
        flat_roof(w, d, H, mm['grey'], mm['dark'], ph=0.3)
        roof_grid(w, d, H, mm)
        solar(1.0, 0.7, 6, 2, H, mm)
        solar(w - 4.0, 0.7, 6, 2, H, mm)
        rooftop_units(w, d, H, mm, n=3)
        # rooftop antenna / lightning rod
        C.cylinder('rod', 0.03, 1.0, (w - 0.8, d * 0.6, H + 0.5), mm['grey'], vertices=8)
        C.sphere('rodball', 0.08, (w - 0.8, d * 0.6, H + 1.02), mm['yellow'], segments=10, rings=6)
        door_col, frame = mm['dark'], mm['dark']
        emb = bolt_emblem
        sign_txt, sign_col = 'GYM', mm['dark']
    big = w >= 11
    dw = 1.5 if big else 1.25
    double_door(cx, dw, 1.2, door_col, frame, mm)
    # emblem on a pediment above the door
    er = 0.6 if big else 0.5
    ez = H + 0.25 if kind != 'electric' else H - 0.15
    if kind != 'electric':
        bx('emb_post', cx - er * 0.8, cx + er * 0.8, -0.2, 0.0, 1.35, ez, mm['white'] if kind != 'rock' else mm['stone_d'], bevel=0.02)
    emb(cx, ez, er, -0.26, mm)
    # GYM signs left & right of the door
    for s in (-1, 1):
        sign(cx + s * (dw / 2 + 0.75), 1.65, 0.8, 0.28, sign_txt, sign_col, mm['white'] if kind != 'electric' else mm['yellow'], y=-0.08)
    # windows
    nwin = 3 if big else 2
    span = w / 2 - dw / 2 - 1.3
    for s in (-1, 1):
        for i in range(nwin):
            x = cx + s * (dw / 2 + 1.3 + span * (i + 0.5) / nwin)
            window(x, 1.2, 0.55, 0.8, frame if kind != 'electric' else mm['dark'], mm['glass'], sill=mm['white'] if kind != 'electric' else None)
    # side pillars / statues
    for x in (0.0, w):
        bx('pil', x - 0.12, x + 0.12, -0.12, 0.12, 0, H + 0.05, frame if kind != 'grass' else mm['wood'], bevel=0.02)
    if kind == 'grass':
        for x in (0.4, w - 0.4):
            C.sphere('hedge', 0.28, (x, -0.25, 0.25), mm['leaf'], scale=(1.3, 0.8, 0.9), segments=14, rings=8)
            for k in range(3):
                C.sphere('hfl', 0.05, (x - 0.2 + k * 0.2, -0.45, 0.35 + 0.05 * (k % 2)), mm['flower_r'] if k % 2 else mm['flower_y'], segments=8, rings=5)
        # vines on walls
        for x in (1.0, w - 1.0):
            for k in range(5):
                C.sphere('vine', 0.13, (x + 0.12 * math.sin(k), -0.04, H - 0.15 - k * 0.3), M('vine', (0.25, 0.58, 0.22)), scale=(1, 0.4, 1), segments=10, rings=6)


def city_shop(w, d, mm, variant):
    H = 2.6
    if variant == 'a':
        wall, top, awn1, label, lc = M('shop_a', (0.98, 0.86, 0.70)), mm['brick'], mm['red'], 'CAFE', mm['white']
    else:
        wall, top, awn1, label, lc = M('shop_b', (0.78, 0.90, 0.80)), M('shop_b_t', (0.20, 0.52, 0.45)), M('shop_b_a', (0.20, 0.60, 0.50)), 'SHOP', mm['white']
    walls(w, d, H, wall, base=mm['grey_d'], base_h=0.15)
    flat_roof(w, d, H, mm['grey'], top, ph=0.22)
    roof_grid(w, d, H, mm)
    rooftop_units(w, d, H, mm, n=1)
    roof_garden(0.4, 2.0, d - 0.8, d - 0.35, H, mm)
    cx = w / 2
    glass_door(cx, 0.75, 1.0, top, mm)
    # upper floor windows
    for i in range(4):
        x = 0.7 + i * (w - 1.4) / 3
        window(x, 2.1, 0.5, 0.42, top, mm['glass'], sill=mm['white'])
    # shop windows
    for s in (-1, 1):
        x = cx + s * 1.45
        bx('swf', x - 0.85, x + 0.85, -0.04, 0.02, 0.2, 1.15, top, bevel=0.015)
        bx('swg', x - 0.78, x + 0.78, -0.055, 0.0, 0.27, 1.08, mm['glass'])
        for k in (-0.26, 0.26):
            bx('swm', x + k - 0.02, x + k + 0.02, -0.07, -0.04, 0.27, 1.08, top)
        # goods inside
        for k in range(3):
            C.sphere('good', 0.08, (x - 0.5 + k * 0.5, -0.07, 0.38), [mm['flower_r'], mm['yellow'], mm['flower_y']][k], segments=10, rings=6)
    awning(0.1, w - 0.1, 1.42, 0.45, awn1, mm['white'])
    sign(cx, 1.68, 1.6, 0.32, label, top, lc, frame=mm['white'], y=-0.08)
    if variant == 'a':
        # cafe table out front
        C.cylinder('table', 0.18, 0.03, (w - 0.45, -0.45, 0.32), mm['white'], vertices=14)
        C.cylinder('tleg', 0.025, 0.32, (w - 0.45, -0.45, 0.16), mm['dark'], vertices=8)
        C.cylinder('umb', 0.0, 0.0, (0, 0, 0), None) if False else None
    else:
        bx('bench', 0.3, 0.9, -0.5, -0.3, 0.2, 0.26, mm['wood'], bevel=0.01)
        for x in (0.35, 0.85):
            bx('bleg', x - 0.02, x + 0.02, -0.48, -0.32, 0, 0.2, mm['dark'])


def apartment(w, d, mm, variant):
    H = {'a': 4.6, 'b': 4.3, 'c': 5.0}[variant]
    wall = {'a': M('apt_a', (0.93, 0.80, 0.60)), 'b': mm['brick'], 'c': M('apt_c', (0.70, 0.84, 0.92))}[variant]
    trim = {'a': M('apt_a_t', (0.62, 0.42, 0.25)), 'b': mm['white'], 'c': M('apt_c_t', (0.22, 0.40, 0.62))}[variant]
    walls(w, d, H, wall, base=mm['grey_d'], base_h=0.18)
    flat_roof(w, d, H, mm['grey'], trim, ph=0.2)
    roof_grid(w, d, H, mm)
    rooftop_units(w, d, H, mm, n=2)
    if variant == 'a':
        roof_garden(0.4, 2.2, 0.4, 0.85, H, mm)
    if variant == 'c':
        solar(0.6, 0.6, 4, 2, H, mm)
    stair_house(w - 0.9, d - 0.8, H, mm, wall)
    if variant == 'b':
        bx('tank', 0.5, 1.2, d * 0.55, d * 0.55 + 0.6, H, H + 0.6, mm['grey_d'], bevel=0.04)
    cx = w / 2
    glass_door(cx, 0.8, 1.0, trim, mm)
    C.box('canopy', (1.3, 0.5, 0.06), (cx, -0.25, 1.16), trim, bevel=0.015)
    floors = int((H - 1.3) / 0.85) + 1
    for f in range(floors):
        z = 1.65 + f * 0.85 if f > 0 else 0.7
        bx('floorline', -0.01, w + 0.01, -0.025, d, z - 0.5, z - 0.45, trim) if f > 0 else None
        cols = 4 if f > 0 else 2
        for i in range(cols):
            if f == 0:
                x = [0.8, w - 0.8][i]
            else:
                x = 0.65 + i * (w - 1.3) / (cols - 1)
            if z + 0.3 > H - 0.1:
                continue
            window(x, z, 0.5, 0.48, trim, mm['glass'] if (i + f) % 3 else mm['glass_d'], sill=mm['white'] if variant != 'b' else mm['grey'])
            if f > 0 and variant == 'a' and i % 2 == 0:
                # small balcony
                bx('balc', x - 0.38, x + 0.38, -0.25, 0.0, z - 0.34, z - 0.28, mm['white'])
                for k in range(5):
                    xx = x - 0.34 + k * 0.17
                    bx('bal', xx - 0.012, xx + 0.012, -0.25, -0.22, z - 0.28, z - 0.1, mm['white'])
                bx('balr', x - 0.38, x + 0.38, -0.26, -0.21, z - 0.12, z - 0.08, mm['white'])
    sign(cx, 1.38, 1.1, 0.24, {'a': 'APTS', 'b': 'FLATS', 'c': 'HOMES'}[variant], trim if variant != 'b' else M('flats_b', (0.25, 0.30, 0.40)), mm['white'], y=-0.06)


def dept_store(w, d, mm):
    H = 4.4
    wall = M('dept', (0.96, 0.92, 0.86))
    trim = M('dept_t', (0.85, 0.30, 0.45))
    walls(w, d, H, wall, base=mm['grey_d'], base_h=0.18)
    flat_roof(w, d, H, mm['grey'], trim, ph=0.25)
    roof_grid(w, d, H, mm)
    rooftop_units(w, d, H, mm, n=2)
    roof_garden(0.4, 2.4, d - 0.9, d - 0.4, H, mm)
    cx = w / 2
    # big glass front on ground floor
    bx('gf', 0.25, w - 0.25, -0.04, 0.02, 0.18, 1.25, trim, bevel=0.015)
    bx('gfg', 0.32, w - 0.32, -0.055, 0.0, 0.25, 1.18, mm['glass'])
    for i in range(1, 6):
        x = 0.32 + i * (w - 0.64) / 6
        bx('gfm', x - 0.02, x + 0.02, -0.07, -0.04, 0.25, 1.18, trim)
    glass_door(cx, 1.0, 1.05, trim, mm, y=-0.06)
    awning(0.3, w - 0.3, 1.5, 0.4, trim, mm['white'])
    # upper floors: wide ribbon windows
    for z in (2.05, 2.85, 3.65):
        bx('rib', 0.3, w - 0.3, -0.04, 0.02, z - 0.28, z + 0.28, trim, bevel=0.015)
        bx('ribg', 0.36, w - 0.36, -0.055, 0.0, z - 0.22, z + 0.22, mm['glass'])
        for i in range(1, 8):
            x = 0.36 + i * (w - 0.72) / 8
            bx('ribm', x - 0.018, x + 0.018, -0.07, -0.04, z - 0.22, z + 0.22, mm['white'])
    sign(cx, H + 0.45, 2.6, 0.5, 'DEPT STORE', trim, mm['white'], frame=mm['white'], y=-0.12)
    for s in (-1, 1):
        bx('signleg', cx + s * 1.0 - 0.04, cx + s * 1.0 + 0.04, -0.06, 0.0, H, H + 0.2, mm['grey_d'])


def office(w, d, mm):
    H = 6.6
    wall = M('office', (0.82, 0.86, 0.90))
    trim = M('office_t', (0.30, 0.38, 0.50))
    walls(w, d, H, wall, base=trim, base_h=0.25)
    flat_roof(w, d, H, mm['grey'], trim, ph=0.25)
    roof_grid(w, d, H, mm)
    rooftop_units(w, d, H, mm, n=3)
    # rooftop helipad-ish crown
    bx('crown', w * 0.3, w * 0.7, d * 0.3, d * 0.8, H, H + 0.55, wall, bevel=0.03)
    bx('crownb', w * 0.3 - 0.03, w * 0.7 + 0.03, d * 0.3 - 0.03, d * 0.8 + 0.03, H + 0.45, H + 0.6, trim)
    cx = w / 2
    # lobby
    bx('lobby', cx - 1.5, cx + 1.5, -0.04, 0.02, 0.2, 1.3, trim, bevel=0.015)
    bx('lobbyg', cx - 1.42, cx + 1.42, -0.055, 0.0, 0.25, 1.22, mm['glass'])
    glass_door(cx, 0.9, 1.05, trim, mm, y=-0.06)
    C.box('canopy', (3.3, 0.55, 0.07), (cx, -0.27, 1.38), trim, bevel=0.015)
    # curtain-wall grid
    for f in range(6):
        z = 1.9 + f * 0.8
        bx('band', 0.25, w - 0.25, -0.04, 0.02, z - 0.3, z + 0.3, trim, bevel=0.01)
        bx('bandg', 0.3, w - 0.3, -0.055, 0.0, z - 0.25, z + 0.25, mm['glass'] if f % 2 else mm['glass_d'])
        for i in range(1, 10):
            x = 0.3 + i * (w - 0.6) / 10
            bx('mul', x - 0.018, x + 0.018, -0.07, -0.04, z - 0.25, z + 0.25, wall)
    for s in (-1, 1):
        x = cx + s * 2.6
        window(x, 0.75, 0.6, 0.6, trim, mm['glass'], sill=mm['white'])
    sign(cx, 1.6, 2.0, 0.24, 'SILPH OFFICE', trim, mm['white'], y=-0.06)


# ── registry ──────────────────────────────────────────────────────────────

BUILDINGS = [
    ('bld_pc_5x3', 5, 3, lambda mm: pokecenter(5, 3, mm)),
    ('bld_pc_3x3', 3, 3, lambda mm: pokecenter(3, 3, mm)),
    ('bld_pc_7x4', 7, 4, lambda mm: pokecenter(7, 4, mm, big=True)),
    ('bld_mart_3x3', 3, 3, lambda mm: mart(3, 3, mm)),
    ('bld_house_3x3_red', 3, 3, lambda mm: house(3, 3, mm, 'red', C.PALETTE['roof_red'], True, 0)),
    ('bld_house_3x3_blue', 3, 3, lambda mm: house(3, 3, mm, 'blue', C.PALETTE['roof_blue'], False, 1)),
    ('bld_house_3x3_green', 3, 3, lambda mm: house(3, 3, mm, 'green', C.PALETTE['roof_green'], False, 2)),
    ('bld_house_3x3_orange', 3, 3, lambda mm: house(3, 3, mm, 'orange', C.PALETTE['roof_orange'], True, 3)),
    ('bld_hall_5x3', 5, 3, lambda mm: town_hall(5, 3, mm)),
    ('bld_gym_grass_11x3', 11, 3, lambda mm: gym(11, 3, mm, 'grass')),
    ('bld_gym_rock_7x3', 7, 3, lambda mm: gym(7, 3, mm, 'rock')),
    ('bld_gym_water_7x3', 7, 3, lambda mm: gym(7, 3, mm, 'water')),
    ('bld_gym_electric_11x4', 11, 4, lambda mm: gym(11, 4, mm, 'electric')),
    ('bld_city_5x3_a', 5, 3, lambda mm: city_shop(5, 3, mm, 'a')),
    ('bld_city_5x3_b', 5, 3, lambda mm: city_shop(5, 3, mm, 'b')),
    ('bld_city_5x4_a', 5, 4, lambda mm: apartment(5, 4, mm, 'a')),
    ('bld_city_5x4_b', 5, 4, lambda mm: apartment(5, 4, mm, 'b')),
    ('bld_city_5x4_c', 5, 4, lambda mm: apartment(5, 4, mm, 'c')),
    ('bld_city_6x4_a', 6, 4, lambda mm: dept_store(6, 4, mm)),
    ('bld_city_7x4_a', 7, 4, lambda mm: office(7, 4, mm)),
]


def main():
    out_dir = C.work_dir(GROUP)
    outputs = []
    for key, w, d, build in BUILDINGS:
        path = os.path.join(out_dir, key + '.png')
        C.reset_scene()
        C._mat_cache.clear()
        C.setup_render(64, 64, samples=SAMPLES, outline=True)
        C.add_lights()
        mm = mats()
        build(mm)
        C.fit_oblique(pad_px=8)
        ax, ay = C.to_pixel((0, 0, 0))
        if not ONLY or key in ONLY:
            C.render(path)
        rx, ry = bpy.context.scene.render.resolution_x, bpy.context.scene.render.resolution_y
        outputs.append({'key': key, 'kind': 'object', 'frames': [path], 'cols': 1,
                        'anchor': [round(ax, 2), round(ay, 2)], 'foot': [w, d]})
        print('[buildings]', key, rx, ry, round(ax, 1), round(ay, 1))
    C.write_spec(GROUP, outputs)


main()
