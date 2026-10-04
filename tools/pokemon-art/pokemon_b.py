"""pokemon_b: faithful 3D replicas of Cyndaquil, Totodile, Torchic, Treecko and Mudkip.

    blender -b --factory-startup --python tools/pokemon-art/pokemon_b.py
    blender -b --factory-startup --python tools/pokemon-art/pokemon_b.py -- mudkip hero   (iterate)

Args after "--": species names (default all), 'hero' (hero only), 'sheet' (sheets only),
'one' (sheet: only the stand frame of each row), 'nospec' (do not write spec.json),
'draft' (hero at 1/2 samples for quick looks).

For each species S it renders
  mon_S   4 rows (down, left, right, up) x 3 cols (step-L, stand, step-R), 80x80 frames,
          oblique camera (C.fixed_oblique_frame), anchor = feet point (40, 70)
  hero_S  384x384 3/4 hero render, facing the camera turned slightly to the viewer's left

Modelling: bodies are smooth "sculpted" surfaces made of metaball ellipsoids/capsules that
melt into each other, converted to meshes and painted with procedural vertex colours
(markings follow the anatomy). Thin parts (fins, feathers, gills, spikes) are inflated
"pillow" shapes or lofted tubes; eyes and mouths are decals projected onto the head.
Every frame is rebuilt from pose parameters (step, hero), so the walk cycle is consistent.
Model space: feet centre at the origin, facing -Y (toward the camera), +X = the Pokemon's
left (viewer's right when it faces the camera).
"""
import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, '/home/user/CLASS-APP/tools/pokemon-art')
import common as C  # noqa: E402

GROUP = 'pokemon_b'
SPECIES = ['cyndaquil', 'totodile', 'torchic', 'treecko', 'mudkip']
FRAME = 80
HERO = 384
HERO_ELEV = 14.0          # hero: low 3/4 view like the HOME renders (same as pokemon_a)
HERO_YAW = -38.0          # model turned so it faces the viewer's left (HOME-like 3/4 view)
SHEET_SAMPLES = 32
HERO_SAMPLES = 64
ROWS = [('down', 0.0), ('left', -90.0), ('right', 90.0), ('up', 180.0)]
STEPS = [-1, 0, 1]        # step-L, stand, step-R
SPRITE_TILT = 12.0        # sprites: heads look up a little so faces read from the 55 deg camera

WORK = C.work_dir(GROUP)
ARGV = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ONLY = [a for a in ARGV if a in SPECIES] or SPECIES
DO_HERO = 'sheet' not in ARGV
DO_SHEET = 'hero' not in ARGV
ONE_FRAME = 'one' in ARGV
if 'draft' in ARGV:
    HERO_SAMPLES = 24

MODEL = []                # objects of the model being built
RES = 0.02                # metaball tessellation size (model units)
NOINK = None              # collection excluded from freestyle lines
INK_DECALS = True         # eyes get ink lines on the hero only
HL_SCALE = 0.36           # eye highlight radius / eye radius
Z = Vector((0, 0, 1))


# ── small maths ─────────────────────────────────────────────────────────────

def lin4(c):
    return (*C.srgb_to_linear(c), 1.0)


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def sstep(e0, e1, x):
    if e0 == e1:
        return 1.0 if x >= e1 else 0.0
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def band(x, lo, hi, soft=0.01):
    return sstep(lo - soft, lo + soft, x) * (1 - sstep(hi - soft, hi + soft, x))


def sdir(az, el):
    """Unit vector: az = degrees from the front (-Y) toward +X (the Pokemon's left), el = up."""
    a, e = math.radians(az), math.radians(el)
    return Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))


def bdir(lat, el):
    """Unit vector pointing backward (+Y): lat = degrees toward +X, el = degrees up."""
    a, e = math.radians(lat), math.radians(el)
    return Vector((math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), math.sin(e)))


def q_from_x(direction, roll=0.0):
    q = Vector((1, 0, 0)).rotation_difference(Vector(direction).normalized())
    if roll:
        q = q @ Quaternion((1, 0, 0), math.radians(roll))
    return q


def lift_m(deg):
    """Rotation about X that lifts the front (-Y side) up by deg."""
    return Matrix.Rotation(math.radians(-deg), 3, 'X')


def about(p, pivot, m):
    return Vector(pivot) + m @ (Vector(p) - Vector(pivot))


def piecewise(x, pts):
    """Linear interpolation through sorted (x, y) points, clamped."""
    if x <= pts[0][0]:
        return pts[0][1]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if x <= x1:
            return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    return pts[-1][1]


# ── scene / materials ───────────────────────────────────────────────────────

def new_scene(w, h, samples, ink_thickness=1.4):
    global NOINK
    MODEL.clear()
    C.reset_scene()
    # common.mat() caches materials by name, but reset_scene() deletes them; a stale
    # cache entry raises ReferenceError on access, so start the cache fresh.
    C._mat_cache.clear()
    C.setup_render(w, h, samples=samples, outline=True)
    C.set_outline(True, thickness=ink_thickness)
    C.add_lights()
    scene = bpy.context.scene
    NOINK = bpy.data.collections.new('noink')
    scene.collection.children.link(NOINK)
    ls = bpy.context.view_layer.freestyle_settings.linesets[0]
    ls.select_by_collection = True
    ls.collection = NOINK
    ls.collection_negation = 'EXCLUSIVE'
    return scene


def M(name, color, rough=0.42, spec=0.35, **kw):
    return C.mat(name, color, rough=rough, spec=spec, **kw)


def vc_mat(name, rough=0.42, spec=0.35):
    """Kit material whose base colour comes from the 'Col' vertex colours."""
    m = C.mat(name, (1, 1, 1), rough=rough, spec=spec)
    nt = m.node_tree
    if not any(n.type == 'ATTRIBUTE' for n in nt.nodes):
        a = nt.nodes.new('ShaderNodeAttribute')
        a.attribute_name = 'Col'
        nt.links.new(a.outputs['Color'], nt.nodes.get('Principled BSDF').inputs['Base Color'])
    return m


def vc_glow_mat(name, strength=1.2):
    """Vertex-coloured emissive material (flames)."""
    m = C.mat(name, (1, 1, 1), rough=0.6, spec=0.1, emission=(1, 1, 1), emission_strength=strength)
    nt = m.node_tree
    if not any(n.type == 'ATTRIBUTE' for n in nt.nodes):
        a = nt.nodes.new('ShaderNodeAttribute')
        a.attribute_name = 'Col'
        p = nt.nodes.get('Principled BSDF')
        nt.links.new(a.outputs['Color'], p.inputs['Base Color'])
        ek = 'Emission Color' if 'Emission Color' in p.inputs else 'Emission'
        nt.links.new(a.outputs['Color'], p.inputs[ek])
    return m


def _link(o, ink=True):
    (bpy.context.scene.collection if ink else NOINK).objects.link(o)
    MODEL.append(o)
    return o


def clear_model():
    for o in MODEL:
        data = o.data
        bpy.data.objects.remove(o, do_unlink=True)
        if data is not None and data.users == 0 and isinstance(data, bpy.types.Mesh):
            bpy.data.meshes.remove(data)
    MODEL.clear()
    for o in list(bpy.context.scene.objects):
        if o.type == 'EMPTY':
            bpy.data.objects.remove(o, do_unlink=True)


def set_cols(me, cols):
    attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    flat = []
    for c in cols:
        flat.extend(lin4(c))
    attr.data.foreach_set('color', flat)


def paint(o, fn):
    me = o.data
    set_cols(me, [fn(v.co, v.normal) for v in me.vertices])
    return o


def _recalc(me):
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()


def _mesh_obj(name, verts, faces, mat=None, ink=True, cols=None, subd=0, smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    _recalc(me)
    if smooth:
        me.shade_smooth()
    if cols:
        set_cols(me, cols)
    o = bpy.data.objects.new(name, me)
    _link(o, ink)
    if mat:
        me.materials.append(mat)
    if subd:
        C.subsurf(o, subd)
    return o


# ── geometry builders ───────────────────────────────────────────────────────

def blob(name, elems, mat=None, paint_fn=None, ink=True, res=None):
    """Metaball surface from elements (dicts):
         c = centre, r = radius (ball / capsule) or semi-axes (ellipsoid),
         t = 'B' | 'E' | 'C', len = capsule length, q = Quaternion,
         s = stiffness (2 soft blend .. 5 firm), neg = subtract.
       Radii are the visible radii of a lone element."""
    res = res or RES
    mb = bpy.data.metaballs.new(name + '_mb')
    mb.resolution = res
    mb.render_resolution = res
    mb.threshold = 0.6
    for el in elems:
        e = mb.elements.new()
        s = el.get('s', 2.0)
        k = math.sqrt(1 - (0.6 / s) ** (1 / 3))
        e.stiffness = s
        e.co = Vector(el['c'])
        t = el.get('t', 'E' if isinstance(el['r'], (tuple, list, Vector)) else 'B')
        if t == 'B':
            e.type = 'BALL'
            e.radius = el['r'] / k
        elif t == 'E':
            e.type = 'ELLIPSOID'
            e.radius = 1.0 / k
            e.size_x, e.size_y, e.size_z = el['r']
        else:
            e.type = 'CAPSULE'
            e.radius = el['r'] / k
            e.size_x = el['len'] / 2
        if 'q' in el:
            e.rotation = el['q']
        e.use_negative = el.get('neg', False)
    tmp = bpy.data.objects.new(name + '_mb', mb)
    bpy.context.scene.collection.objects.link(tmp)
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(deps))
    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.metaballs.remove(mb)
    me.name = name
    me.shade_smooth()
    o = bpy.data.objects.new(name, me)
    _link(o, ink)
    if paint_fn:
        paint(o, paint_fn)
    if mat:
        me.materials.append(mat)
    return o


def E(c, semi, direction=None, roll=0.0, s=2.0, q=None):
    d = dict(t='E', c=Vector(c), r=tuple(semi), s=s)
    if q is not None:
        d['q'] = q
    elif direction is not None:
        d['q'] = q_from_x(direction, roll)
    return d


def B(c, r, s=2.0):
    return dict(t='B', c=Vector(c), r=r, s=s)


def CAP(a, b, r, s=2.0):
    a, b = Vector(a), Vector(b)
    return dict(t='C', c=(a + b) / 2, r=r, len=(b - a).length, q=q_from_x(b - a), s=s)


def loft(name, path, radii, ref, mat=None, segs=16, ink=True, subd=1, colfn=None):
    """Tube through path points; radii[i] = (r1 along ref, r2 across). Ends close in poles.
    colfn(t, th) -> sRGB with t = 0..1 along the path."""
    path = [Vector(p) for p in path]
    ref = Vector(ref)
    n = len(path)
    verts, faces, cols = [], [], []
    for i, p in enumerate(path):
        a, b = path[max(i - 1, 0)], path[min(i + 1, n - 1)]
        t = (b - a).normalized()
        a1 = (ref - ref.dot(t) * t)
        if a1.length < 1e-6:
            a1 = Vector((1, 0, 0)) - t.x * t
        a1.normalize()
        a2 = t.cross(a1)
        r1, r2 = radii[i]
        for j in range(segs):
            th = 2 * math.pi * j / segs
            verts.append(p + a1 * (r1 * math.cos(th)) + a2 * (r2 * math.sin(th)))
            if colfn:
                cols.append(colfn(i / (n - 1), th))
    for i in range(n - 1):
        for j in range(segs):
            j2 = (j + 1) % segs
            faces.append((i * segs + j, i * segs + j2, (i + 1) * segs + j2, (i + 1) * segs + j))
    p0 = len(verts)
    verts.append(path[0] - (path[1] - path[0]).normalized() * min(radii[0]) * 0.3)
    verts.append(path[-1] + (path[-1] - path[-2]).normalized() * min(radii[-1]) * 0.3)
    if colfn:
        cols += [colfn(0.0, 0.0), colfn(1.0, 0.0)]
    for j in range(segs):
        j2 = (j + 1) % segs
        faces.append((p0, j2, j))
        faces.append((p0 + 1, (n - 1) * segs + j, (n - 1) * segs + j2))
    return _mesh_obj(name, verts, faces, mat=mat, ink=ink, cols=cols or None, subd=subd)


def taper(n, r0, r1=0.0, power=1.0, swell=0.0):
    """n radii from r0 to r1; swell > 0 adds a bulge in the middle."""
    out = []
    for i in range(n):
        t = i / (n - 1)
        out.append(r0 + (r1 - r0) * t ** power + swell * math.sin(math.pi * t))
    return out


def spike(name, base, tip, r, mat, ink=True, flat=1.0, ref=None, segs=12, colfn=None):
    """Pointed cone-like spike / claw / flame tongue (flat < 1 squashes along ref)."""
    base, tip = Vector(base), Vector(tip)
    d = tip - base
    if ref is None:
        ref = Vector((0, 0, 1)) if abs(d.normalized().z) < 0.9 else Vector((1, 0, 0))
    pts = [base + d * t for t in (0.0, 0.2, 0.45, 0.7, 0.88, 1.0)]
    rs = [r * f for f in (0.85, 1.0, 0.8, 0.5, 0.24, 0.02)]
    return loft(name, pts, [(x * flat, x) for x in rs], ref, mat=mat, segs=segs, ink=ink, subd=1, colfn=colfn)


def poly_radius(pts, c, th):
    """Distance from c along angle th to a star-shaped polygon's outline."""
    d = Vector((math.cos(th), math.sin(th)))
    best = None
    n = len(pts)
    for i in range(n):
        p = Vector(pts[i]) - c
        q = Vector(pts[(i + 1) % n]) - c
        e = q - p
        den = d.x * e.y - d.y * e.x
        if abs(den) < 1e-12:
            continue
        t = (p.x * e.y - p.y * e.x) / den
        u = (p.x * d.y - p.y * d.x) / den
        if t > 0 and -1e-6 <= u <= 1 + 1e-6:
            best = t if best is None else min(best, t)
    return best or 0.0


def smooth_poly(pts, iters=2):
    """Chaikin corner cutting (keeps shapes soft); pts closed polygon."""
    for _ in range(iters):
        out = []
        n = len(pts)
        for i in range(n):
            p, q = Vector(pts[i]), Vector(pts[(i + 1) % n])
            out.append(tuple(p * 0.75 + q * 0.25))
            out.append(tuple(p * 0.25 + q * 0.75))
        pts = out
    return pts


def pillow(name, outline, thick, basis, origin, mat=None, center=(0, 0), segs=56, rings=7, ink=True,
           colfn=None, subd=1, warp=None, prof=0.5):
    """Inflated flat shape: star-shaped 2D outline (u, v) inflated to `thick` in the middle,
    rounded edges. basis = (U, V, W) world axes for u, v and the thickness direction.
    colfn(u, v, s) -> sRGB (s = 0 centre .. 1 rim). warp(u, v, w) -> (u, v, w) bends it."""
    c = Vector(center)
    U, Va, W = (Vector(x).normalized() for x in basis)
    org = Vector(origin)
    R = [poly_radius(outline, c, 2 * math.pi * j / segs) for j in range(segs)]
    verts, cols = [], []

    def put(u, v, w, s):
        if warp:
            u, v, w = warp(u, v, w)
        verts.append(org + U * u + Va * v + W * w)
        if colfn:
            cols.append(colfn(u, v, s))

    ss = [math.sin(0.5 * math.pi * k / rings) for k in range(rings + 1)]
    hh = [thick / 2 * (1 - s * s) ** prof for s in ss]
    # top: centre + rings 1..rings ; bottom: centre + rings 1..rings-1 (rim shared)
    put(c.x, c.y, hh[0], 0.0)
    for k in range(1, rings + 1):
        for j in range(segs):
            th = 2 * math.pi * j / segs
            put(c.x + ss[k] * R[j] * math.cos(th), c.y + ss[k] * R[j] * math.sin(th), hh[k], ss[k])
    bot0 = len(verts)
    put(c.x, c.y, -hh[0], 0.0)
    for k in range(1, rings):
        for j in range(segs):
            th = 2 * math.pi * j / segs
            put(c.x + ss[k] * R[j] * math.cos(th), c.y + ss[k] * R[j] * math.sin(th), -hh[k], ss[k])

    def top(k, j):
        return 0 if k == 0 else 1 + (k - 1) * segs + (j % segs)

    def bot(k, j):
        if k == rings:
            return top(rings, j)
        return bot0 if k == 0 else bot0 + 1 + (k - 1) * segs + (j % segs)

    faces = []
    for j in range(segs):
        faces.append((top(0, 0), top(1, j), top(1, j + 1)))
        faces.append((bot(0, 0), bot(1, j + 1), bot(1, j)))
    for k in range(1, rings):
        for j in range(segs):
            faces.append((top(k, j), top(k + 1, j), top(k + 1, j + 1), top(k, j + 1)))
            faces.append((bot(k, j), bot(k, j + 1), bot(k + 1, j + 1), bot(k + 1, j)))
    return _mesh_obj(name, verts, faces, mat=mat, ink=ink, cols=cols or None, subd=subd)


# ── surface decals (eyes, mouths) ───────────────────────────────────────────

def make_bvh(objs):
    deps = bpy.context.evaluated_depsgraph_get()
    verts, polys = [], []
    for o in objs:
        ev = o.evaluated_get(deps)
        me = ev.to_mesh()
        mw = ev.matrix_world
        off = len(verts)
        verts.extend(mw @ v.co for v in me.vertices)
        polys.extend([off + i for i in p.vertices] for p in me.polygons)
        ev.to_mesh_clear()
    return BVHTree.FromPolygons(verts, polys)


def surf(bvh, center, direction):
    """Surface point + normal hit by a ray from far outside toward `center`."""
    d = Vector(direction).normalized()
    loc, nor, _, _ = bvh.ray_cast(Vector(center) + d * 5.0, -d)
    if loc is None:
        raise RuntimeError('surf: no hit')
    return loc, nor.normalized()


def frame_at(n, up=Z):
    n = Vector(n).normalized()
    t1 = up.cross(n)
    if t1.length < 1e-4:
        t1 = Vector((0, 1, 0)).cross(n)
    t1.normalize()
    return t1, n.cross(t1).normalized()


def ell_r(a, b):
    return lambda th: 1.0 / math.sqrt((math.cos(th) / a) ** 2 + (math.sin(th) / b) ** 2)


def decal(name, bvh, p, n, rfun, mat, lift=0.002, off=(0.0, 0.0), rot=0.0, dome=None,
          rings=5, segs=32, ink=None, up=Z):
    """Thin cap following the surface around p (normal n); rfun(th) = outline radius."""
    if ink is None:
        ink = INK_DECALS
    t1, t2 = frame_at(n, up)
    cr, sr = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    pc = Vector(p)

    def place(u, v):
        uu = u * cr - v * sr + off[0]
        vv = u * sr + v * cr + off[1]
        p0 = pc + t1 * uu + t2 * vv
        loc, nor, _, _ = bvh.ray_cast(p0 + n * 0.3, -n)
        if loc is None:
            loc, nor = p0, n
        h = 0.0
        if dome:
            da, db, dh = dome
            h = dh * max(0.0, 1 - (uu / da) ** 2 - (vv / db) ** 2)
        return loc + nor.normalized() * (lift + h)

    verts = [place(0, 0)]
    for k in range(1, rings + 1):
        rr = k / rings
        for j in range(segs):
            th = 2 * math.pi * j / segs
            R = rfun(th) * rr
            verts.append(place(R * math.cos(th), R * math.sin(th)))
    faces = [(0, 1 + j, 1 + (j + 1) % segs) for j in range(segs)]
    for k in range(rings - 1):
        a0, a1 = 1 + k * segs, 1 + (k + 1) * segs
        for j in range(segs):
            j2 = (j + 1) % segs
            faces.append((a0 + j, a1 + j, a1 + j2, a0 + j2))
    return _mesh_obj(name, verts, faces, mat=mat, ink=ink)


def stroke(name, bvh, p, n, pts2d, radius, mat, lift=0.002, ink=False, up=Z):
    """Thin line drawn on the surface (closed eyes, mouths)."""
    t1, t2 = frame_at(n, up)
    path = []
    for u, v in pts2d:
        p0 = Vector(p) + t1 * u + t2 * v
        loc, nor, _, _ = bvh.ray_cast(p0 + n * 0.3, -n)
        if loc is None:
            loc, nor = p0, n
        path.append(loc + nor.normalized() * lift)
    m = len(path)
    rad = [(radius * (0.5 if i in (0, m - 1) else 1.0),) * 2 for i in range(m)]
    return loft(name, path, rad, ref=n, mat=mat, segs=8, ink=ink, subd=1)


def eye(prefix, bvh, center, direction, a, b, kind, sx=1, tilt=0.0, iris_col=None, iris_s=0.78,
        iris_off=(0.0, 0.0), pupil_s=0.5, hl_off=(-0.32, 0.38), bulge=0.012, sclera_col=None, up=Z):
    """Cartoon eye. kind: 'black' (glossy black), 'iris' (white + iris + pupil),
    'slit' (coloured eye with a vertical slit pupil). sx = +1 left eye, -1 right eye
    (mirrors tilt / iris offsets; iris_off u is in 'toward the face front' units)."""
    p, n = surf(bvh, center, direction)
    rot = tilt * sx
    dome = (a * 1.04, b * 1.04, bulge)
    parts = []
    hl_mat = M('hl', (1, 1, 1), emission=(1, 1, 1), emission_strength=1.0)
    if kind == 'black':
        parts.append(decal(prefix + '_eye', bvh, p, n, ell_r(a, b),
                           M('eye_black', (0.06, 0.05, 0.08), rough=0.12, spec=0.7),
                           lift=0.0015, rot=rot, dome=dome))
    else:
        scol = sclera_col or (0.97, 0.97, 0.96)
        parts.append(decal(prefix + '_scl', bvh, p, n, ell_r(a, b), M('scl_' + prefix[:3], scol, rough=0.2, spec=0.5),
                           lift=0.0015, rot=rot, dome=dome))
        io = (iris_off[0] * a * sx, iris_off[1] * b)
        if kind == 'iris':
            ia, ib = a * iris_s, b * iris_s
            parts.append(decal(prefix + '_iris', bvh, p, n, ell_r(ia, ib), M('iris_' + prefix[:3], iris_col, rough=0.15, spec=0.6),
                               lift=0.0027, rot=rot, off=io, dome=dome))
            pa, pb = ia * pupil_s, ib * pupil_s
        else:
            pa, pb = a * 0.2, b * 0.86
        parts.append(decal(prefix + '_pup', bvh, p, n, ell_r(pa, pb), M('pupil', (0.05, 0.03, 0.05), rough=0.12, spec=0.7),
                           lift=0.0039, rot=rot, off=io, dome=dome))
    hr = min(a, b) * HL_SCALE
    parts.append(decal(prefix + '_hl', bvh, p, n, ell_r(hr, hr * 1.1), hl_mat, lift=0.0052,
                       off=(hl_off[0] * a, hl_off[1] * b), ink=False, dome=dome))
    return parts


def tilt_head(objs, pivot, deg, z0, z1, mask=None):
    """Sprites: smoothly rotate everything above the neck so the face lifts by `deg`."""
    if not deg:
        return
    pivot = Vector(pivot)
    for o in objs:
        if o.type != 'MESH':
            continue
        me = o.data
        for v in me.vertices:
            w = sstep(z0, z1, v.co.z)
            if mask:
                w *= mask(v.co)
            if w <= 0:
                continue
            v.co = about(v.co, pivot, lift_m(deg * w))
        me.update()


# ── species ─────────────────────────────────────────────────────────────────
# pose: step -1 / 0 / 1 (step-L, stand, step-R), hero bool.

def biped_feet(st, stride=0.07, lift=0.03):
    """Per-foot (dy, dz) for a biped step: step-L = the Pokemon's left foot (+X) forward."""
    # returns {+1: (dy, dz), -1: (dy, dz)}
    if st == 0:
        return {1: (0.0, 0.0), -1: (0.0, 0.0)}
    fwd = 1 if st < 0 else -1     # which side steps forward
    return {fwd: (-stride, lift), -fwd: (stride * 0.8, 0.0)}


def build_cyndaquil(pose):
    st = pose.get('step', 0)
    hero = pose.get('hero', False)
    DARK = (0.12, 0.40, 0.50)
    CRM = (0.99, 0.93, 0.62)
    SOLE = (0.72, 0.64, 0.74)
    bob = -0.014 * abs(st)
    feet = biped_feet(st, stride=0.06, lift=0.03)
    zb = bob

    def col(p, n):
        z = p.z - zb
        # dark cap on the head + the top of the snout (boundary just above the eyes)
        hb = piecewise(p.y, [(-0.66, 0.60), (-0.42, 0.64), (-0.24, 0.685), (-0.12, 0.74), (0.0, 0.745),
                             (0.08, 0.66), (0.16, 0.54)])
        d_head = sstep(-0.012, 0.012, z - hb)
        # dark back: behind a line running down the back, fading out at the hips
        yb = piecewise(z, [(0.12, 0.24), (0.22, 0.10), (0.36, 0.035), (0.50, 0.0), (0.62, 0.0), (0.9, 0.0)])
        d_back = sstep(-0.012, 0.012, p.y - yb) * sstep(0.14, 0.21, z)
        c = mix(CRM, DARK, max(d_head, d_back))
        if p.z < 0.045 and n.z < -0.5:
            c = mix(c, SOLE, 0.8)
        return c

    hc = Vector((0, -0.05, 0.68 + zb))
    els = [
        E((0, 0.06, 0.25 + zb), (0.215, 0.205, 0.21)),         # pear lower body
        E((0, -0.02, 0.24 + zb), (0.175, 0.175, 0.17)),        # round belly
        E((0, 0.04, 0.43 + zb), (0.155, 0.15, 0.12)),          # shoulders
        E(hc, (0.215, 0.225, 0.18)),                           # head
        E(hc + Vector((0, 0.05, 0.02)), (0.18, 0.18, 0.155)),  # back of the head
        CAP((0, -0.17, 0.675 + zb), (0, -0.34, 0.655 + zb), 0.105, s=2.4),    # long snout
        CAP((0, -0.34, 0.655 + zb), (0, -0.50, 0.63 + zb), 0.072, s=2.6),
        CAP((0, -0.50, 0.63 + zb), (0, -0.60, 0.612 + zb), 0.046, s=3.0),
    ]
    # legs: thick short thighs + small feet
    for sx in (1, -1):
        dy, dz = feet[sx]
        els.append(E((0.125 * sx, 0.03 + dy * 0.5, 0.11 + zb * 0.5 + dz * 0.5), (0.095, 0.105, 0.095)))
        els.append(E((0.14 * sx, -0.055 + dy, 0.034 + dz), (0.072, 0.10, 0.034), direction=(0.15 * sx, -1, 0), s=3.0))
    body = blob('cq_body', els, vc_mat('cq_vc'), paint_fn=col)
    bvh = make_bvh([body])

    # arms: stubby, paws held in front of the chest
    arm_m = M('cq_crm', CRM)
    sw = 0.05 * st
    for sx in (1, -1):
        sh = Vector((0.14 * sx, -0.04, 0.42 + zb))
        if hero:
            hand = Vector((0.065 * sx, -0.20, 0.40 + zb))
        else:
            hand = Vector((0.095 * sx, -0.18 + sw * sx, 0.36 + zb))
        blob('cq_arm%d' % sx, [CAP(sh, hand, 0.048, s=2.5), B(hand, 0.052, s=3.0)], arm_m)

    # closed eyes: smiling arcs on the cream face just under the dark cap
    eyem = M('cq_eyeline', (0.10, 0.08, 0.10), rough=0.4)
    for sx in (1, -1):
        p, n = surf(bvh, hc, sdir(55 * sx, 8))
        k = 0.05
        pts = [(k * math.cos(math.radians(a)), k * 0.6 * math.sin(math.radians(a)) - 0.016) for a in range(10, 171, 16)]
        stroke('cq_eye%d' % sx, bvh, p, n, pts, 0.0085 if hero else 0.013, eyem, lift=0.002, ink=False)

    # flames: a spiky burst from the back - yellow core, orange tongues
    YEL = (1.0, 0.86, 0.26)
    ORG = (0.98, 0.50, 0.12)
    TIP = (0.93, 0.36, 0.08)

    def fcol(t, th):
        c = mix(YEL, ORG, sstep(0.12, 0.42, t))
        return mix(c, TIP, sstep(0.75, 1.0, t))
    fm = vc_glow_mat('cq_flame', 1.0)
    rng = random.Random(155)
    root = Vector((0, 0.02, 0.43 + zb))
    k = 0
    for el in (-42, -24, -6, 12, 30, 48, 66):
        for lat in (-64, -40, -16, 8, 32, 56):
            e2 = el + rng.uniform(-7, 7)
            l2 = lat + rng.uniform(-7, 7) + (12 if (el // 20) % 2 else 0)
            d = bdir(l2, e2)
            try:
                p, n = surf(bvh, root, d)
            except RuntimeError:
                continue
            # longest straight back / up-back, shorter toward the sides, top and bottom
            L = 0.22 + 0.26 * math.cos(math.radians(e2 - 14)) ** 2
            L *= 1.0 - 0.38 * (abs(l2) / 70.0) ** 1.5
            L *= rng.uniform(0.75, 1.25)
            base = p - d * 0.05
            tip = base + d * L + Vector((0, 0, 0.06 * L))
            spike('cq_fl%d' % k, base, tip, 0.058, fm, ink=True, segs=10, colfn=fcol)
            k += 1
    pose['_tilt'] = (Vector((0, -0.02, 0.50 + zb)), 0.48 + zb, 0.60 + zb)


def build_totodile(pose):
    st = pose.get('step', 0)
    hero = pose.get('hero', False)
    BLU = (0.36, 0.77, 0.90)
    YEL = (0.98, 0.91, 0.56)
    RED = (0.86, 0.26, 0.32)
    MOUTH = (0.55, 0.12, 0.16)
    TONGUE = (0.97, 0.52, 0.52)
    bob = -0.014 * abs(st)
    zb = bob
    feet = biped_feet(st, stride=0.065, lift=0.03)
    open_deg = 50 if hero else 22
    up_deg = open_deg * 0.66
    dn_deg = open_deg * 0.34
    hinge = Vector((0, 0.06, 0.635 + zb))
    Mu = lift_m(up_deg)
    Md = lift_m(-dn_deg)
    qu = Mu.to_quaternion()
    qd = Md.to_quaternion()
    J = 0.665 + zb      # closed jaw line height
    MuI = Mu.transposed()
    MdI = Md.transposed()

    def U(p):
        return about(Vector(p) + Vector((0, 0, zb)), hinge, Mu)

    def D(p):
        return about(Vector(p) + Vector((0, 0, zb)), hinge, Md)

    def col(p, n):
        c = BLU
        z = p.z - zb
        # yellow V on the chest (wide at the shoulders, point at the belly)
        if p.y < 0.03:
            v = sstep(-0.012, 0.012, (z - 0.33) - 0.95 * abs(p.x)) * (1 - sstep(0.585, 0.60, z))
            v *= sstep(0.0, 0.05, -p.y + 0.03)
            c = mix(c, YEL, v)
        # mouth interior: between the opened jaws, in front of the hinge
        if p.y < hinge.y - 0.02 and p.z > 0.55 + zb:
            pu = hinge + MuI @ (p - hinge)
            pd = hinge + MdI @ (p - hinge)
            inside = (1 - sstep(J + 0.005, J + 0.02, pu.z)) * sstep(J - 0.02, J - 0.005, pd.z)
            if inside > 0:
                # tongue: pink pad on the floor of the mouth (lower jaw, facing up)
                tongue = (1 - sstep(0.06, 0.085, abs(p.x))) * sstep(0.2, 0.5, n.dot(Md @ Z))
                c = mix(c, mix(MOUTH, TONGUE, tongue), inside)
        return c

    els = [
        E((0, 0.02, 0.255 + zb), (0.205, 0.19, 0.205)),        # belly
        E((0, 0.01, 0.44 + zb), (0.165, 0.15, 0.12)),          # chest
        E((0, 0.07, 0.575 + zb), (0.145, 0.13, 0.08)),         # neck
    ]
    # upper head: cranium + long wide snout + eye bumps + nostril bumps
    els += [
        E(U((0, 0.08, 0.77)), (0.185, 0.17, 0.15), q=qu),
        E(U((0, -0.14, 0.735)), (0.17, 0.23, 0.08), q=qu),
        E(U((0, -0.33, 0.74)), (0.115, 0.08, 0.065), q=qu, s=2.6),
        E(U((0.128, 0.05, 0.84)), (0.075, 0.08, 0.07), q=qu, s=2.8),
        E(U((-0.128, 0.05, 0.84)), (0.075, 0.08, 0.07), q=qu, s=2.8),
        B(U((0.05, -0.355, 0.787)), 0.024, s=3.0),
        B(U((-0.05, -0.355, 0.787)), 0.024, s=3.0),
    ]
    # lower jaw
    els += [
        E(D((0, -0.08, 0.615)), (0.16, 0.22, 0.06), q=qd),
        E(D((0, -0.26, 0.62)), (0.12, 0.09, 0.048), q=qd, s=2.6),
    ]
    # legs + big feet with toes
    for sx in (1, -1):
        dy, dz = feet[sx]
        els.append(E((0.135 * sx, 0.03 + dy * 0.5, 0.12 + zb * 0.5 + dz * 0.5), (0.10, 0.11, 0.105)))
        fc = Vector((0.14 * sx, -0.06 + dy, 0.035 + dz))
        els.append(E(fc, (0.085, 0.12, 0.035), direction=(0.1 * sx, -1, 0), s=3.0))
        for tx in (-0.045, 0.0, 0.045):
            els.append(B(fc + Vector((tx, -0.11, -0.004)), 0.03, s=3.2))
    body = blob('td_body', els, vc_mat('td_vc'), paint_fn=col)
    bvh = make_bvh([body])

    # teeth: two fangs on the upper jaw, two on the lower
    tm = M('td_teeth', (0.98, 0.98, 0.96), rough=0.3)
    for sx in (1, -1):
        b0 = U((0.095 * sx, -0.31, J - zb + 0.008))
        spike('td_tu%d' % sx, b0 + Mu @ Vector((0, 0, 0.02)), b0 - Mu @ Vector((0, 0, 0.06)), 0.022, tm, segs=8)
        b1 = D((0.09 * sx, -0.27, J - zb - 0.008))
        spike('td_td%d' % sx, b1 - Md @ Vector((0, 0, 0.02)), b1 + Md @ Vector((0, 0, 0.05)), 0.02, tm, segs=8)

    # eyes: red iris on white, with the black eye-mark behind
    for sx in (1, -1):
        c0 = U((0.128 * sx, 0.05, 0.84))
        dvec = Mu @ sdir(62 * sx, 10)
        p, n = surf(bvh, c0, dvec)
        decal('td_mask%d' % sx, bvh, p, n, ell_r(0.07, 0.052), M('td_black', (0.06, 0.06, 0.08), rough=0.3),
              lift=0.001, off=(0.03 * sx, 0.008), rot=-18 * sx)
        eye('td_e%d' % sx, bvh, c0, dvec, 0.047, 0.053, 'iris', sx=sx, iris_col=(0.80, 0.10, 0.18),
            iris_s=0.70, iris_off=(-0.26, -0.04), pupil_s=0.5, hl_off=(-0.35, 0.38), bulge=0.012)

    # arms: raised out (hero) / held out low (sprite), three stubby fingers
    am = M('td_blue', BLU)
    sw = 0.05 * st
    for sx in (1, -1):
        sh = Vector((0.15 * sx, 0.0, 0.49 + zb))
        if hero:
            hand = Vector((0.33 * sx, -0.07, 0.62 + zb))
            fd = Vector((0.6 * sx, -0.2, 0.8)).normalized()
        else:
            hand = Vector((0.25 * sx, -0.05 + sw * sx, 0.38 + zb))
            fd = Vector((0.5 * sx, -0.4, -0.5)).normalized()
        els = [CAP(sh, hand, 0.05, s=2.4), B(hand, 0.055, s=2.6)]
        side = fd.cross(Z if abs(fd.z) < 0.9 else Vector((0, 1, 0))).normalized()
        for k in (-1, 0, 1):
            fdir = (fd + side * 0.55 * k).normalized()
            els.append(CAP(hand, hand + fdir * 0.07, 0.022, s=3.2))
        blob('td_arm%d' % sx, els, am)

    # tail + red spikes on the back and tail
    rm = M('td_red', RED, rough=0.45)
    sway = 0.03 * st
    tail = [Vector((0, 0.15, 0.24 + zb)), Vector((sway * 0.3, 0.30, 0.15 + zb)), Vector((sway * 0.7, 0.43, 0.10 + zb)),
            Vector((sway, 0.54, 0.09 + zb)), Vector((sway * 1.1, 0.60, 0.10 + zb))]
    loft('td_tail', tail, [(r, r) for r in (0.11, 0.085, 0.06, 0.035, 0.012)], Vector((1, 0, 0)), mat=am, segs=16)
    for i, (z, L) in enumerate(((0.60, 0.11), (0.49, 0.12), (0.38, 0.11))):
        p, n = surf(bvh, Vector((0, 0.0, z + zb)), bdir(0, 15))
        d = (bdir(0, 35) + n * 0.4).normalized()
        spike('td_sp%d' % i, p - d * 0.02, p + d * L, 0.05, rm, flat=0.35, ref=Vector((1, 0, 0)), segs=12)
    for i, (t, L) in enumerate(((0.35, 0.10), (0.62, 0.08))):
        k = int(t * (len(tail) - 1))
        f = t * (len(tail) - 1) - k
        pc = tail[k].lerp(tail[k + 1], f)
        r = 0.11 + (0.012 - 0.11) * t
        base = pc + Vector((0, 0, r * 0.75))
        d = (Vector((0, 0.5, 1.0))).normalized()
        spike('td_tsp%d' % i, base - d * 0.02, base + d * L, 0.045, rm, flat=0.35, ref=Vector((1, 0, 0)), segs=12)
    pose['_tilt'] = (Vector((0, 0.02, 0.58 + zb)), 0.56 + zb, 0.66 + zb)


def build_torchic(pose):
    st = pose.get('step', 0)
    hero = pose.get('hero', False)
    ORG = (1.0, 0.52, 0.08)
    YEL = (1.0, 0.84, 0.10)
    PALE = (0.99, 0.87, 0.45)
    bob = -0.014 * abs(st)
    zb = bob
    feet = biped_feet(st, stride=0.06, lift=0.035)

    def col(p, n):
        z = p.z - zb
        c = ORG
        c = mix(c, YEL, band(z, 0.385, 0.47, 0.015) * sstep(-0.08, 0.02, -p.y + 0.02))
        return c

    hc = Vector((0, 0.0, 0.615 + zb))
    els = [
        E(hc, (0.272, 0.248, 0.205)),
        E((0, 0.02, 0.305 + zb), (0.168, 0.165, 0.152)),
        E((0, 0.01, 0.44 + zb), (0.155, 0.145, 0.07)),
    ]
    for sx in (1, -1):        # tiny wings
        els.append(E((0.16 * sx, 0.03, 0.35 + zb), (0.035, 0.07, 0.055), direction=(0, 1, -0.6), s=3.0))
    body = blob('tc_body', els, vc_mat('tc_vc'), paint_fn=col)
    bvh = make_bvh([body])

    # yellow fluffy collar: feather tufts around the neck, hanging down over the chest
    ym = M('tc_yel', YEL, rough=0.5)
    for ring, (zr, L, w) in enumerate(((0.455, 0.10, 0.048), (0.425, 0.09, 0.044))):
        n_t = 16 if ring == 0 else 15
        for i in range(n_t):
            az = -140 + 280 * (i + 0.5 * ring) / (n_t - 1)
            if az > 141:
                continue
            p, n = surf(bvh, Vector((0, 0.01, zr + zb)), sdir(az, -12))
            out = Vector((n.x, n.y, 0)).normalized()
            dirv = (out * 0.3 + Vector((0, 0, -0.95))).normalized()
            ll = L * (1.15 if i % 2 == 0 else 0.8)
            spike('tc_fl%d_%d' % (ring, i), p - dirv * 0.015, p + dirv * ll + out * 0.02, w, ym,
                  flat=0.35, ref=out, segs=10)

    # head crest: three broad yellow feathers + small orange ones at the base
    top = surf(bvh, hc, Vector((0, 0.2, 1)))[0]
    feathers = [  # (direction, length, half-width, plane normal, back curl)
        (Vector((0.55, 0.35, 1.0)), 0.34, 0.078, Vector((0.45, -0.9, 0.0)), 0.04),
        (Vector((0.02, -0.05, 1.0)), 0.27, 0.066, Vector((0.1, -1.0, 0.0)), 0.03),
        (Vector((-0.45, 0.05, 1.0)), 0.21, 0.056, Vector((-0.35, -0.95, 0.0)), 0.02),
        (Vector((0.12, 0.85, 0.9)), 0.22, 0.05, Vector((1.0, 0.0, 0.0)), 0.0),
    ]
    for i, (dv, L, w, pn, cu) in enumerate(feathers):
        d = dv.normalized()
        base = top - d * 0.03
        pts = [base + d * (L * t) + Vector((0, cu * t * t, -0.02 * t * t)) for t in (0, 0.18, 0.4, 0.62, 0.82, 0.94, 1.0)]
        rs = [w * f for f in (0.35, 0.85, 1.0, 0.88, 0.55, 0.25, 0.02)]
        loft('tc_cr%d' % i, pts, [(0.026, r) for r in rs], pn, mat=ym, segs=12)
    om = M('tc_org', ORG)
    for i, dv in enumerate((Vector((0.55, -0.35, 0.7)), Vector((-0.5, -0.25, 0.75)), Vector((0.0, -0.6, 0.7)))):
        d = dv.normalized()
        spike('tc_cro%d' % i, top - d * 0.01, top + d * 0.085, 0.04, om, flat=0.5, segs=10)

    # beak (pale yellow) + glossy black eyes
    bm_ = M('tc_beak', PALE, rough=0.35)
    pb, nb = surf(bvh, hc, sdir(0, -12))
    spike('tc_beak_u', pb - nb * 0.02, pb + nb * 0.095 + Vector((0, 0, -0.014)), 0.048, bm_, flat=0.55, ref=Z, segs=12)
    spike('tc_beak_l', pb - nb * 0.02 + Vector((0, 0, -0.022)), pb + nb * 0.055 + Vector((0, 0, -0.034)), 0.034, bm_,
          flat=0.5, ref=Z, segs=12)
    for sx in (1, -1):
        eye('tc_e%d' % sx, bvh, hc, sdir(37 * sx, 10), 0.037, 0.052, 'black', sx=sx, bulge=0.008)

    # thin legs + three forward toes and one back toe
    lm = M('tc_leg', PALE, rough=0.45)
    for sx in (1, -1):
        dy, dz = feet[sx]
        ank = Vector((0.085 * sx, -0.005 + dy, 0.035 + dz))
        hip = Vector((0.08 * sx, 0.02 + dy * 0.3, 0.15 + zb))
        els = [CAP(hip, ank, 0.024, s=3.0), B(ank, 0.03, s=3.0)]
        for a in (-28, 0, 28):
            d = Vector((math.sin(math.radians(a + 6 * sx)), -math.cos(math.radians(a + 6 * sx)), -0.12)).normalized()
            els.append(CAP(ank, ank + d * 0.095, 0.017, s=3.4))
        els.append(CAP(ank, ank + Vector((0, 0.05, -0.012)), 0.016, s=3.4))
        blob('tc_leg%d' % sx, els, lm)
    pose['_tilt'] = (Vector((0, 0.0, 0.44 + zb)), 0.40 + zb, 0.52 + zb)


def build_treecko(pose):
    st = pose.get('step', 0)
    hero = pose.get('hero', False)
    GRN = (0.60, 0.86, 0.33)
    DGRN = (0.07, 0.60, 0.36)
    RED = (0.86, 0.20, 0.14)
    bob = -0.014 * abs(st)
    zb = bob
    feet = biped_feet(st, stride=0.07, lift=0.035)

    def col(p, n):
        z = p.z - zb
        c = GRN
        # long red belly patch from the throat down to the crotch (front only)
        w = 0.095 * math.sqrt(max(0.0, math.sin(math.pi * min(1.0, max(0.0, (z - 0.20) / 0.48)))))
        if z > 0.6:
            w = max(w, 0.055)
        r = sstep(-0.006, 0.006, w - abs(p.x)) * sstep(-0.02, 0.02, -p.y + 0.0) * band(z, 0.21, 0.645, 0.012)
        return mix(c, RED, r)

    hc = Vector((0, -0.01, 0.76 + zb))
    els = [
        E(hc, (0.145, 0.165, 0.14)),                               # skull
        CAP((0, -0.01, 0.82 + zb), (0, 0.085, 0.965 + zb), 0.058, s=2.3),   # pointed crest ridge
        B((0, 0.09, 0.97 + zb), 0.04, s=2.6),
        E((0, -0.155, 0.71 + zb), (0.11, 0.125, 0.08)),            # snout
        E((0, -0.09, 0.645 + zb), (0.09, 0.10, 0.04)),             # jaw
        CAP((0, 0.0, 0.64 + zb), (0, 0.02, 0.55 + zb), 0.068),     # neck
        E((0, 0.02, 0.43 + zb), (0.12, 0.10, 0.14)),               # chest
        E((0, 0.03, 0.27 + zb), (0.125, 0.11, 0.10)),              # hips
    ]
    for sx in (1, -1):
        dy, dz = feet[sx]
        hip = Vector((0.08 * sx, 0.03, 0.25 + zb))
        knee = Vector((0.15 * sx, -0.03 + dy * 0.5, 0.14 + zb * 0.5 + dz))
        ank = Vector((0.155 * sx, 0.01 + dy, 0.035 + dz))
        els += [CAP(hip, knee, 0.045, s=2.6), CAP(knee, ank, 0.032, s=2.8)]
    body = blob('tk_body', els, vc_mat('tk_vc'), paint_fn=col)
    bvh = make_bvh([body])
    gm = M('tk_grn', GRN)

    # feet: three long toes with round pads
    for sx in (1, -1):
        dy, dz = feet[sx]
        ank = Vector((0.155 * sx, 0.01 + dy, 0.03 + dz))
        els = [B(ank, 0.035, s=3.0)]
        for a in (-30, 0, 30):
            aa = math.radians(a + 12 * sx)
            d = Vector((math.sin(aa), -math.cos(aa), -0.15)).normalized()
            tip = ank + d * 0.10
            els += [CAP(ank, tip, 0.016, s=3.4), B(tip + Vector((0, 0, 0.002)), 0.026, s=3.4)]
        blob('tk_foot%d' % sx, els, gm)

    # long arms with three curled fingers ending in round pads
    sw = 0.05 * st
    for sx in (1, -1):
        sh = Vector((0.10 * sx, 0.01, 0.53 + zb))
        if hero:
            el_ = Vector((0.24 * sx, -0.03, 0.53 + zb))
            wr = Vector((0.355 * sx, -0.06, 0.65 + zb))
            fd = Vector((0.45 * sx, -0.25, 1.0)).normalized()
        else:
            el_ = Vector((0.19 * sx, -0.02 + sw * sx * 0.5, 0.45 + zb))
            wr = Vector((0.25 * sx, -0.07 + sw * sx, 0.40 + zb))
            fd = Vector((0.55 * sx, -0.6, -0.2)).normalized()
        els = [CAP(sh, el_, 0.028, s=2.8), CAP(el_, wr, 0.025, s=2.8), B(wr, 0.034, s=3.0)]
        side = fd.cross(Vector((0, -1, 0)) if hero else Z).normalized()
        for k in (-1, 0, 1):
            fdir = (fd + side * 0.6 * k).normalized()
            mid = wr + fdir * 0.06
            tip = mid + (fdir + Vector((0, -0.5, -0.2))).normalized() * 0.035
            els += [CAP(wr, mid, 0.013, s=3.4), CAP(mid, tip, 0.012, s=3.4), B(tip, 0.022, s=3.4)]
        blob('tk_arm%d' % sx, els, gm)

    # big eyes on the sides of the head: yellow with a black slit
    for sx in (1, -1):
        eye('tk_e%d' % sx, bvh, hc + Vector((0, 0, 0.02)), sdir(57 * sx, 12), 0.060, 0.068, 'slit', sx=sx,
            sclera_col=(1.0, 0.82, 0.10), hl_off=(-0.30, 0.45), bulge=0.014, tilt=8)
    # mouth line (hero only)
    if hero:
        mm = M('tk_mouth', (0.45, 0.10, 0.10), rough=0.4)
        for sx in (1, -1):
            p, n = surf(bvh, Vector((0, -0.12, 0.68 + zb)), sdir(55 * sx, -18))
            stroke('tk_m%d' % sx, bvh, p, n, [(-0.06 * sx, 0.005), (-0.02 * sx, 0.0), (0.03 * sx, 0.012), (0.055 * sx, 0.03)],
                   0.006, mm, ink=False)

    # huge dark-green tail lying on the ground, curling up at the end (two lobes)
    tm = M('tk_tail', DGRN, rough=0.45)
    sway = 0.04 * st
    path = [(0, 0.06, 0.25), (0.0, 0.17, 0.155), (sway * 0.4, 0.32, 0.115), (sway * 0.7, 0.50, 0.105),
            (sway * 0.9, 0.67, 0.10), (sway, 0.80, 0.105), (sway, 0.875, 0.14), (sway, 0.885, 0.195),
            (sway, 0.845, 0.225), (sway, 0.80, 0.205), (sway, 0.795, 0.17)]
    path = [Vector((x, y, z + zb * (1 - i / 10.0))) for i, (x, y, z) in enumerate(path)]
    rad = [(0.055, 0.055), (0.08, 0.085), (0.10, 0.105), (0.11, 0.105), (0.10, 0.095), (0.075, 0.07),
           (0.055, 0.052), (0.045, 0.045), (0.038, 0.038), (0.03, 0.03), (0.01, 0.01)]
    loft('tk_tail', path, rad, Vector((1, 0, 0)), mat=tm, segs=18)
    pose['_tilt'] = (Vector((0, 0.0, 0.60 + zb)), 0.58 + zb, 0.70 + zb)


def build_mudkip(pose):
    st = pose.get('step', 0)
    hero = pose.get('hero', False)
    BLU = (0.12, 0.64, 0.96)
    LBL = (0.78, 0.93, 1.0)
    ORG = (1.0, 0.56, 0.12)
    FIN = (0.74, 0.89, 0.99)
    bob = -0.012 * abs(st)
    zb = bob

    hc = Vector((0, -0.08, 0.37 + zb))

    def col(p, n):
        z = p.z - zb
        c = BLU
        # pale lower face (wraps from cheek to cheek under the gills)
        face = (1 - sstep(0.295, 0.32, z)) * (1 - sstep(-0.05, 0.01, p.y)) * sstep(0.15, 0.19, z)
        # pale belly
        belly = sstep(0.3, 0.7, -n.z) * band(z, 0.05, 0.22, 0.03)
        return mix(c, LBL, max(face, belly))

    els = [
        E(hc, (0.258, 0.222, 0.20)),                              # head
        E((0, -0.11, 0.275 + zb), (0.232, 0.17, 0.12)),           # wide jaw / cheeks
        E((0, 0.14, 0.20 + zb), (0.165, 0.22, 0.125)),            # body
        E((0, 0.28, 0.20 + zb), (0.13, 0.11, 0.10)),              # rump
    ]
    # four stubby legs, diagonal pairs: step-L = front-left + back-right forward
    sgn = {(-1, 1): -1, (1, 1): 1, (-1, -1): 1, (1, -1): -1}   # (step, side) -> forward(-1)/back(+1)
    for sx in (1, -1):
        for fy, back in ((-0.06, False), (0.27, True)):
            dy = 0.0
            dz = 0.0
            if st:
                front_fwd_side = 1 if st < 0 else -1          # front leg on this side steps forward
                fwd = (sx == front_fwd_side) != back
                dy = -0.05 if fwd else 0.04
                dz = 0.03 if fwd else 0.0
            top_ = Vector((0.125 * sx, fy, 0.15 + zb))
            ft = Vector((0.135 * sx, fy - 0.01 + dy, 0.04 + dz))
            els.append(CAP(top_, ft, 0.058, s=2.6))
            els.append(E(ft + Vector((0, -0.015, -0.005)), (0.062, 0.07, 0.04), s=3.0))
    body = blob('mk_body', els, vc_mat('mk_vc'), paint_fn=col)
    bvh = make_bvh([body])

    # head fin: tall rounded paddle leaning back
    bm_ = M('mk_blue', BLU)
    ptop, _ = surf(bvh, hc, Vector((0, 0.12, 1)))
    fin = smooth_poly([(-0.07, -0.06), (-0.075, 0.12), (-0.06, 0.26), (-0.02, 0.35), (0.035, 0.38),
                       (0.085, 0.35), (0.115, 0.25), (0.11, 0.12), (0.085, -0.06)], 2)

    def fin_col(u, v, s):
        return mix(BLU, (0.08, 0.50, 0.86), sstep(0.65, 1.0, s) * 0.5)
    pillow('mk_fin', fin, 0.07, ((0, 1, 0), (0, 0, 1), (1, 0, 0)), ptop - Vector((0, 0, 0.025)),
           mat=vc_mat('mk_fin_vc'), center=(0.02, 0.14), colfn=fin_col,
           warp=lambda u, v, w: (u + 0.12 * max(0.0, v) ** 2, v, w))
    # dark line down the fin
    dm = M('mk_finline', (0.05, 0.36, 0.70), rough=0.4)
    for sx in (1, -1):
        pts = [ptop + Vector((0.035 * sx, -0.035 + 0.12 * v * v, 0.0 + v)) for v in (0.05, 0.13, 0.21, 0.28)]
        loft('mk_fl%d' % sx, pts, [(0.0065, 0.0065)] * 4, Vector((1, 0, 0)), mat=dm, segs=6, ink=False)

    # orange three-pointed cheek gills, seen face-on from the front
    om = M('mk_org', ORG, rough=0.45)
    gill = [(-0.01, 0.16), (0.035, 0.05), (0.155, 0.015), (0.045, -0.035), (0.02, -0.135),
            (-0.045, -0.05), (-0.07, 0.0), (-0.055, 0.06)]
    for sx in (1, -1):
        p, n = surf(bvh, hc + Vector((0, 0, -0.05)), sdir(84 * sx, -6))
        Uax = Vector((sx * 0.94, 0.34, 0.0)).normalized()
        Wax = Vector((-0.34 * sx, 0.94, 0.0)).normalized()   # roughly facing forward
        org = p + Uax * 0.035
        pillow('mk_gill%d' % sx, gill, 0.05, (Uax, Z, Wax), org, mat=om, center=(0.0, 0.0))

    # small black eyes, nostrils and a little smile
    for sx in (1, -1):
        eye('mk_e%d' % sx, bvh, hc, sdir(29 * sx, 8), 0.031, 0.042, 'black', sx=sx, bulge=0.006)
    if hero:
        nm = M('mk_nose', (0.05, 0.25, 0.45), rough=0.4)
        for sx in (1, -1):
            p, n = surf(bvh, hc, sdir(7 * sx, -10))
            decal('mk_n%d' % sx, bvh, p, n, ell_r(0.007, 0.006), nm, lift=0.001, ink=False)
        p, n = surf(bvh, hc, sdir(0, -24))
        stroke('mk_mouth', bvh, p, n, [(-0.035, 0.008), (-0.017, -0.002), (0.0, 0.0), (0.017, -0.002), (0.035, 0.008)],
               0.004, nm, ink=False)

    # tail fin: pale two-lobed fan, pointing back and up
    tf = smooth_poly([(0.0, -0.035), (0.11, -0.075), (0.24, -0.07), (0.33, -0.02), (0.345, 0.05), (0.27, 0.105),
                      (0.35, 0.17), (0.38, 0.26), (0.33, 0.33), (0.22, 0.33), (0.11, 0.25), (0.03, 0.13),
                      (-0.01, 0.04)], 2)

    def tf_col(u, v, s):
        return mix(FIN, (0.40, 0.72, 0.96), sstep(0.7, 1.0, s) * 0.55)
    sway = 0.06 * st
    tb, _ = surf(bvh, Vector((0, 0.25, 0.21 + zb)), Vector((0, 1, 0.3)))
    Ut = Vector((sway, 1, 0.25)).normalized()
    pillow('mk_tail', tf, 0.045, (Ut, Z, Ut.cross(Z).normalized()), tb - Vector((0, 0.04, 0.0)),
           mat=vc_mat('mk_tail_vc', rough=0.3), center=(0.18, 0.11), colfn=tf_col)
    # line dividing the two lobes
    tl = M('mk_tailline', (0.36, 0.66, 0.92), rough=0.4)
    Wt = Ut.cross(Z).normalized()
    org = tb - Vector((0, 0.04, 0.0))
    for sw_ in (1, -1):
        pts = [org + Ut * u + Z * v + Wt * (0.021 * sw_) for u, v in ((0.08, 0.06), (0.16, 0.085), (0.24, 0.10))]
        loft('mk_tl%d' % sw_, pts, [(0.005, 0.005)] * 3, Wt, mat=tl, segs=6, ink=False)
    pose['_tilt'] = (Vector((0, -0.02, 0.20 + zb)), 0.14 + zb, 0.30 + zb)


BUILDERS = dict(cyndaquil=build_cyndaquil, totodile=build_totodile, torchic=build_torchic,
                treecko=build_treecko, mudkip=build_mudkip)


# ── rendering ───────────────────────────────────────────────────────────────

def model_points(step=1):
    deps = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in MODEL:
        if o.type != 'MESH':
            continue
        ev = o.evaluated_get(deps)
        me = ev.to_mesh()
        mw = ev.matrix_world
        vs = me.vertices
        pts.extend(mw @ vs[i].co for i in range(0, len(vs), step))
        ev.to_mesh_clear()
    return pts


def build(species, pose):
    BUILDERS[species](pose)
    if not pose.get('hero') and '_tilt' in pose:
        pivot, z0, z1 = pose['_tilt']
        tilt_head(MODEL, pivot, SPRITE_TILT, z0, z1)


def place_root(yaw, scale):
    root = C.parent_all('root', [o for o in MODEL if o.parent is None])
    root.rotation_euler = (0, 0, math.radians(yaw))
    root.scale = (scale, scale, scale)
    bpy.context.view_layer.update()
    return root


def sprite_scale(species):
    """Largest scale at which every row/step fits the 80x80 frame (feet at 40, 70)."""
    global RES
    new_scene(FRAME, FRAME, SHEET_SAMPLES)
    RES = 0.03
    worst = 10.0
    fx, fy = FRAME / 2, FRAME - 10
    margin = 2.5
    for _, yaw in ROWS:
        for st in (-1, 0, 1):
            clear_model()
            build(species, dict(step=st))
            place_root(yaw, 1.0)
            C.fixed_oblique_frame(FRAME, FRAME, (0, 0, 0))
            for p in model_points(3):
                x, y = C.to_pixel(p)
                dx, dy = x - fx, y - fy
                if dx > 1e-3:
                    worst = min(worst, (FRAME - margin - fx) / dx)
                if dx < -1e-3:
                    worst = min(worst, (fx - margin) / -dx)
                if dy < -1e-3:
                    worst = min(worst, (fy - margin) / -dy)
                if dy > 1e-3:
                    worst = min(worst, (FRAME - margin - fy) / dy)
    clear_model()
    return worst


SPRITE_FILL = {}


def render_sheet(species):
    global RES, INK_DECALS, HL_SCALE
    scale = sprite_scale(species) * SPRITE_FILL.get(species, 1.0)
    print('[pokemon_b] %s sprite scale %.3f' % (species, scale))
    new_scene(FRAME, FRAME, SHEET_SAMPLES)
    RES = 0.02
    INK_DECALS = False
    HL_SCALE = 0.26
    frames = []
    for r, (_row, yaw) in enumerate(ROWS):
        for c, st in enumerate(STEPS):
            path = os.path.join(WORK, 'mon_' + species, 'r%d_c%d.png' % (r, c))
            frames.append(path)
            if ONE_FRAME and st != 0:
                continue
            clear_model()
            build(species, dict(step=st))
            place_root(yaw, scale)
            C.fixed_oblique_frame(FRAME, FRAME, (0, 0, 0))
            C.render(path)
    clear_model()
    return frames, scale


def render_hero(species):
    global RES, INK_DECALS, HL_SCALE
    new_scene(HERO, HERO, HERO_SAMPLES, ink_thickness=1.5)
    RES = 0.008
    INK_DECALS = True
    HL_SCALE = 0.34
    clear_model()
    build(species, dict(hero=True))
    place_root(HERO_YAW, 1.0)
    old = C.ELEV_DEG
    C.ELEV_DEG = HERO_ELEV
    cam = C.camera_oblique(HERO, HERO, (0, 0, 0))
    C.ELEV_DEG = old
    inv = cam.matrix_world.inverted()
    loc = [inv @ p for p in model_points(2)]
    x0, x1 = min(p.x for p in loc), max(p.x for p in loc)
    y0, y1 = min(p.y for p in loc), max(p.y for p in loc)
    size = max(x1 - x0, y1 - y0) * 1.1
    cam.data.ortho_scale = size
    cam.location = cam.matrix_world @ Vector(((x0 + x1) / 2, (y0 + y1) / 2, 0))
    bpy.context.view_layer.update()
    path = os.path.join(WORK, 'hero_' + species + '.png')
    C.render(path)
    clear_model()
    return path


def main():
    for sp in ONLY:
        if DO_HERO:
            render_hero(sp)
        if DO_SHEET:
            render_sheet(sp)
    outputs = []
    for sp in SPECIES:
        frames = [os.path.join(WORK, 'mon_' + sp, 'r%d_c%d.png' % (r, c)) for r in range(4) for c in range(3)]
        outputs.append(dict(key='mon_' + sp, kind='sheet', frames=frames, cols=3, anchor=[FRAME / 2, FRAME - 10],
                            meta=dict(rows=['down', 'left', 'right', 'up'], cols=['step-L', 'stand', 'step-R'],
                                      species=sp)))
        outputs.append(dict(key='hero_' + sp, kind='image', frames=[os.path.join(WORK, 'hero_' + sp + '.png')],
                            meta=dict(species=sp)))
    if 'nospec' not in ARGV:
        C.write_spec(GROUP, outputs)


main()
