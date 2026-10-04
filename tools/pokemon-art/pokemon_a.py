"""pokemon_a: faithful 3D replicas of Pikachu, Eevee, Bulbasaur, Squirtle and Chikorita.

    blender -b --factory-startup --python tools/pokemon-art/pokemon_a.py
    blender -b --factory-startup --python tools/pokemon-art/pokemon_a.py -- pikachu hero   (iterate)

For each species S it renders
  mon_S   4 rows (down, left, right, up) x 3 cols (step-L, stand, step-R), 80x80 frames,
          oblique camera, anchor = feet point
  hero_S  384x384 3/4 hero render (facing the camera, turned slightly to the viewer's left)

Modelling approach: every body is a sculpted-looking blobby surface built from Blender
metaballs (ellipsoids / capsules that melt into each other), converted to a mesh and
painted with procedural vertex colours (markings). Thin parts (ears, tails, leaves) are
lofted tubes or bevelled slabs; eyes, cheeks, mouths and spots are conformal decals
projected onto the head surface. Each frame re-builds the model from pose parameters,
so walk cycles stay perfectly consistent.
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, '/home/user/CLASS-APP/tools/pokemon-art')
import common as C  # noqa: E402

GROUP = 'pokemon_a'
SPECIES = ['pikachu', 'eevee', 'bulbasaur', 'squirtle', 'chikorita']
FRAME = 80
HERO = 384
HERO_ELEV = 14.0          # hero shot: low 3/4 view like the HOME renders
HERO_YAW = -28.0          # model turned so its face points to the viewer's left
SHEET_SAMPLES = 32
HERO_SAMPLES = 64
ROWS = [('down', 0.0), ('left', -90.0), ('right', 90.0), ('up', 180.0)]
STEPS = [-1, 0, 1]        # step-L, stand, step-R

WORK = C.work_dir(GROUP)

# Args after "--": species names and/or 'hero' / 'sheet' / 'nospec'
ARGV = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ONLY = [a for a in ARGV if a in SPECIES] or SPECIES
DO_HERO = 'sheet' not in ARGV
DO_SHEET = 'hero' not in ARGV
ONE_FRAME = 'one' in ARGV   # sheet: only the stand frame of each row (fast preview)

MODEL = []                # objects of the model being built
RES = 0.016               # metaball tessellation (model units)
NOINK = None              # collection excluded from freestyle lines
INK_DECALS = True         # outline decals (eyes...) - on for hero
HL_SCALE = 0.36           # eye highlight radius / eye radius (smaller on sprites)
SPRITE_TILT = 12.0        # sprites: heads look up a little so faces read from the 55 deg camera


# ── small maths ─────────────────────────────────────────────────────────────

def V(*a):
    return Vector(a[0]) if len(a) == 1 else Vector(a)


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


def band(x, lo, hi, soft=0.006):
    return sstep(lo - soft, lo + soft, x) * (1 - sstep(hi - soft, hi + soft, x))


def sdir(az, el):
    """Unit vector: az = degrees from the front (-Y) toward +X, el = degrees up."""
    a, e = math.radians(az), math.radians(el)
    return Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))


def q_from_x(direction, roll=0.0):
    """Quaternion turning local +X onto direction (for capsules / ellipsoids)."""
    q = Vector((1, 0, 0)).rotation_difference(Vector(direction).normalized())
    if roll:
        q = q @ Quaternion((1, 0, 0), math.radians(roll))
    return q


def rotz(v, deg):
    return Matrix.Rotation(math.radians(deg), 3, 'Z') @ Vector(v)


def rot_about(p, pivot, axis, deg):
    return Vector(pivot) + Matrix.Rotation(math.radians(deg), 3, axis) @ (Vector(p) - Vector(pivot))


# ── scene / materials ───────────────────────────────────────────────────────

def new_scene(w, h, samples, ink_thickness=1.4):
    global NOINK
    MODEL.clear()             # objects die with the old scene
    C.reset_scene()
    C._mat_cache.clear()      # reset_scene() wipes materials; the kit's cache would hold dead refs
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


def vc_mat(name, rough=0.45, spec=0.35):
    """Kit material whose base colour comes from the 'Col' vertex colours."""
    m = C.mat(name, (1, 1, 1), rough=rough, spec=spec)
    nt = m.node_tree
    if not any(n.type == 'ATTRIBUTE' for n in nt.nodes):
        a = nt.nodes.new('ShaderNodeAttribute')
        a.attribute_name = 'Col'
        nt.links.new(a.outputs['Color'], nt.nodes.get('Principled BSDF').inputs['Base Color'])
    return m


def M(name, color, rough=0.45, spec=0.35, **kw):
    return C.mat(name, color, rough=rough, spec=spec, **kw)


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


def paint(o, fn):
    """Vertex colours from fn(point, normal) -> sRGB, evaluated in model space."""
    me = o.data
    attr = me.color_attributes.get('Col') or me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    flat = []
    for v in me.vertices:
        flat.extend(lin4(fn(v.co, v.normal)))
    attr.data.foreach_set('color', flat)
    return o


def set_cols(me, cols):
    attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    flat = []
    for c in cols:
        flat.extend(lin4(c))
    attr.data.foreach_set('color', flat)


# ── geometry builders ───────────────────────────────────────────────────────

def blob(name, elems, mat=None, paint_fn=None, ink=True, res=None):
    """Metaball surface. elems: dicts with
         c = centre, r = radius (ball/capsule) or (a, b, c) semi-axes (ellipsoid),
         t = 'B' ball | 'E' ellipsoid | 'C' capsule (len = full length along its local X),
         q = Quaternion, s = stiffness (2 = soft blending, 4-6 = firmer), neg = subtract.
       Radii are the VISIBLE radii of a lone element."""
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
        elif t == 'C':
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


def capsule_el(a, b, r, s=2.0):
    a, b = Vector(a), Vector(b)
    return dict(t='C', c=(a + b) / 2, r=r, len=(b - a).length, q=q_from_x(b - a), s=s)


def ell_el(c, semi, direction=None, roll=0.0, s=2.0):
    d = dict(t='E', c=Vector(c), r=tuple(semi), s=s)
    if direction is not None:
        d['q'] = q_from_x(direction, roll)
    return d


def _recalc(me):
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()


def loft(name, path, radii, ref, mat=None, segs=18, colors=None, ink=True, subd=1, closed=False,
         colfn=None, shape=None):
    """Tube through path points; radii = [(r1, r2)] per point (r1 along ref, r2 across).
    Open tubes close in a pole at each end, so taper radii toward 0 for points / round tips.
    colors: per-point sRGB list, or colfn(i, th, offset_dir) -> sRGB per vertex.
    shape(i, th) -> (m1, m2) optional multipliers on the ring (e.g. flatten one side)."""
    path = [Vector(p) for p in path]
    ref = Vector(ref)
    n = len(path)
    verts, faces, cols = [], [], []
    for i, p in enumerate(path):
        if closed:
            a, b = path[(i - 1) % n], path[(i + 1) % n]
        else:
            a, b = path[max(i - 1, 0)], path[min(i + 1, n - 1)]
        t = (b - a).normalized()
        a1 = (ref - ref.dot(t) * t).normalized()
        a2 = t.cross(a1)
        r1, r2 = radii[i]
        for j in range(segs):
            th = 2 * math.pi * j / segs
            m1, m2 = shape(i, th) if shape else (1.0, 1.0)
            off = a1 * (r1 * m1 * math.cos(th)) + a2 * (r2 * m2 * math.sin(th))
            verts.append(p + off)
            if colfn:
                cols.append(colfn(i, th, (a1 * math.cos(th) + a2 * math.sin(th))))
            elif colors:
                cols.append(colors[i])
    rings = n if closed else n - 1
    for i in range(rings):
        i2 = (i + 1) % n
        for j in range(segs):
            j2 = (j + 1) % segs
            faces.append((i * segs + j, i * segs + j2, i2 * segs + j2, i2 * segs + j))
    if not closed:
        p0 = len(verts)
        verts.append(path[0] - (path[1] - path[0]).normalized() * 0.002)
        verts.append(path[-1] + (path[-1] - path[-2]).normalized() * 0.002)
        if cols:
            cols += [cols[0], cols[(n - 1) * segs]]
        for j in range(segs):
            j2 = (j + 1) % segs
            faces.append((p0, j2, j))
            faces.append((p0 + 1, (n - 1) * segs + j, (n - 1) * segs + j2))
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    _recalc(me)
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


def cone_tuft(name, base, tip, r, mat, ink=True, segs=10, colors=None):
    """Small pointed tuft / claw / spike."""
    base, tip = Vector(base), Vector(tip)
    d = tip - base
    ref = Vector((0, 0, 1)) if abs(d.normalized().z) < 0.9 else Vector((1, 0, 0))
    pts = [base + d * t for t in (0, 0.25, 0.55, 0.8, 1.0)]
    rad = [(r * f, r * f) for f in (0.8, 1.0, 0.75, 0.4, 0.02)]
    return loft(name, pts, rad, ref, mat=mat, segs=segs, ink=ink, subd=1, colors=colors)


def tube_profile(n, base_r, tip=0.0, bulge=0.3, power=1.0):
    """Radius multipliers along a tapered tube: rounded base, widest at `bulge`, tip -> `tip`."""
    out = []
    for i in range(n):
        t = i / (n - 1)
        if t <= bulge:
            f = math.sqrt(max(0.0, 1 - ((bulge - t) / bulge) ** 2)) * 0.35 + 0.65 if bulge > 0 else 1
        else:
            u = (t - bulge) / (1 - bulge)
            f = (1 - u ** power) ** 0.5 * (1 - tip) + tip
        out.append(base_r * f)
    return out


def offset_outline(spine, half):
    """Lightning-bolt style outline: miter-offset a polyline by half-widths."""
    pts = [Vector((p[0], p[1])) for p in spine]
    n = len(pts)
    left, right = [], []
    for i in range(n):
        if i == 0:
            d = (pts[1] - pts[0]).normalized()
            nrm = Vector((-d.y, d.x))
            s = half[i]
        elif i == n - 1:
            d = (pts[-1] - pts[-2]).normalized()
            nrm = Vector((-d.y, d.x))
            s = half[i]
        else:
            d0 = (pts[i] - pts[i - 1]).normalized()
            d1 = (pts[i + 1] - pts[i]).normalized()
            n0 = Vector((-d0.y, d0.x))
            n1 = Vector((-d1.y, d1.x))
            nrm = (n0 + n1).normalized()
            s = min(half[i] / max(nrm.dot(n0), 0.25), half[i] * 2.5)
        left.append(pts[i] + nrm * s)
        right.append(pts[i] - nrm * s)
    return [tuple(p) for p in right] + [tuple(p) for p in reversed(left)]


def slab(name, poly, thick, basis, origin, mats, split_v=None, bevel=0.01, ink=True):
    """Extruded 2D polygon (u, v) with bevelled edges, placed with basis=(U, Vax, W) at origin.
    split_v: faces with centroid v < split_v get material 1 (two-tone, e.g. tail base)."""
    bm = bmesh.new()
    vs = [bm.verts.new((u, v, -thick / 2)) for u, v in poly]
    f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    nv = [g for g in r['geom'] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=nv, vec=(0, 0, thick))
    if split_v is not None:
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                               plane_co=(0, split_v, 0), plane_no=(0, 1, 0))
        for fc in bm.faces:
            fc.material_index = 1 if fc.calc_center_median().y < split_v else 0
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    U, Va, W = (Vector(x) for x in basis)
    mtx = Matrix((
        (U.x, Va.x, W.x, origin[0]),
        (U.y, Va.y, W.y, origin[1]),
        (U.z, Va.z, W.z, origin[2]),
        (0, 0, 0, 1)))
    bm.transform(mtx)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.shade_smooth()
    for m in mats:
        me.materials.append(m)
    o = bpy.data.objects.new(name, me)
    _link(o, ink)
    if bevel:
        b = o.modifiers.new('bevel', 'BEVEL')
        b.width = bevel
        b.segments = 3
        b.limit_method = 'ANGLE'
        b.harden_normals = True
    return o


def sheet_surface(name, fn, nu, nv, mat=None, thick=0.012, cols_fn=None, ink=True, subd=1):
    """Parametric thin surface fn(u, v) -> point (u, v in 0..1), solidified."""
    verts, faces, cols = [], [], []
    for i in range(nu + 1):
        for j in range(nv + 1):
            u, v = i / nu, j / nv
            verts.append(fn(u, v))
            if cols_fn:
                cols.append(cols_fn(u, v))
    for i in range(nu):
        for j in range(nv):
            a = i * (nv + 1) + j
            faces.append((a, a + nv + 1, a + nv + 2, a + 1))
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    me.shade_smooth()
    if cols_fn:
        set_cols(me, cols)
    o = bpy.data.objects.new(name, me)
    _link(o, ink)
    if mat:
        me.materials.append(mat)
    sol = o.modifiers.new('solid', 'SOLIDIFY')
    sol.thickness = thick
    sol.offset = 0
    if subd:
        C.subsurf(o, subd)
    return o


# ── surface decals (eyes, cheeks, mouths, spots) ────────────────────────────

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
    """Point + normal where a ray from far outside toward `center` along -direction hits."""
    d = Vector(direction).normalized()
    loc, nor, _, _ = bvh.ray_cast(Vector(center) + d * 5.0, -d)
    if loc is None:
        raise RuntimeError('surf: no hit')
    return loc, nor.normalized()


def frame_at(n, up=Vector((0, 0, 1))):
    n = Vector(n).normalized()
    t1 = up.cross(n)
    if t1.length < 1e-4:
        t1 = Vector((0, 1, 0)).cross(n)
    t1.normalize()
    t2 = n.cross(t1).normalized()
    return t1, t2


def shape_radius(shape, th):
    kind = shape[0]
    if kind == 'ellipse':
        a, b = shape[1], shape[2]
        c, s = math.cos(th), math.sin(th)
        return 1.0 / math.sqrt((c / a) ** 2 + (s / b) ** 2)
    if kind == 'poly':      # star-shaped polygon around the origin
        pts = shape[1]
        d = Vector((math.cos(th), math.sin(th)))
        best = None
        for i in range(len(pts)):
            p, q = Vector(pts[i]), Vector(pts[(i + 1) % len(pts)])
            e = q - p
            den = d.x * e.y - d.y * e.x
            if abs(den) < 1e-9:
                continue
            t = (p.x * e.y - p.y * e.x) / den
            u = (p.x * d.y - p.y * d.x) / den
            if t > 0 and -1e-6 <= u <= 1 + 1e-6:
                best = t if best is None else min(best, t)
        return best or 0.0
    raise ValueError(kind)


def decal(name, bvh, p, n, shape, mat, lift=0.002, bulge=0.0, rot=0.0, off=(0.0, 0.0),
          rings=5, segs=36, ink=None, up=Vector((0, 0, 1)), dome=None):
    """Thin cap that follows the surface around point p (normal n).
    dome=(a, b, h): instead of its own bulge, sit on a shared dome of semi-axes a, b and
    height h centred on p (so iris / pupil / highlight stack cleanly on the eyeball)."""
    if ink is None:
        ink = INK_DECALS
    t1, t2 = frame_at(n, up)
    pc = Vector(p)
    ou, ov = off
    cr, sr = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    verts = []

    def place(u, v, rr):
        u, v = u * cr - v * sr + ou, u * sr + v * cr + ov
        p0 = pc + t1 * u + t2 * v
        loc, nor, _, _ = bvh.ray_cast(p0 + n * 0.3, -n)
        if loc is None:
            loc, nor = p0, n
        if dome:
            da, db, dh = dome
            h = dh * max(0.0, 1 - (u / da) ** 2 - (v / db) ** 2)
        else:
            h = bulge * (1 - rr * rr)
        return loc + nor.normalized() * (lift + h)

    verts.append(place(0, 0, 0))
    for k in range(1, rings + 1):
        rr = k / rings
        for j in range(segs):
            th = 2 * math.pi * j / segs
            R = shape_radius(shape, th) * rr
            verts.append(place(R * math.cos(th), R * math.sin(th), rr))
    faces = []
    for j in range(segs):
        faces.append((0, 1 + j, 1 + (j + 1) % segs))
    for k in range(rings - 1):
        a0 = 1 + k * segs
        a1 = 1 + (k + 1) * segs
        for j in range(segs):
            j2 = (j + 1) % segs
            faces.append((a0 + j, a1 + j, a1 + j2, a0 + j2))
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    _recalc(me)
    me.shade_smooth()
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me)
    _link(o, ink)
    return o


def stroke(name, bvh, p, n, pts2d, radius, mat, lift=0.0025, ink=False, up=Vector((0, 0, 1))):
    """Thin line drawn on the surface (mouths, shell seams)."""
    t1, t2 = frame_at(n, up)
    path = []
    for u, v in pts2d:
        p0 = Vector(p) + t1 * u + t2 * v
        loc, nor, _, _ = bvh.ray_cast(p0 + n * 0.3, -n)
        if loc is None:
            loc, nor = p0, n
        path.append(loc + nor.normalized() * lift)
    m = len(path)
    rad = [(radius * (0.55 if i in (0, m - 1) else 1.0),) * 2 for i in range(m)]
    return loft(name, path, rad, ref=n, mat=mat, segs=8, ink=ink, subd=1)


def eye(prefix, bvh, center, az, el, size, kind, mirror=False, hl_off=(-0.25, 0.35), tilt=0.0,
        sclera=None, iris_col=None, iris_scale=0.8, iris_off=(0.0, 0.0), pupil_scale=0.45, bulge=0.012,
        dirv=None):
    """Cartoon eye on the head surface. kind 'black' (Pikachu/Eevee) or 'iris' (white + iris)."""
    p, n = surf(bvh, center, dirv if dirv is not None else sdir(az, el))
    a, b = size
    sgn = -1 if mirror else 1
    rot = tilt * sgn
    dome = (a * 1.02, b * 1.02, bulge)
    parts = []
    if kind == 'black':
        parts.append(decal(prefix + '_eye', bvh, p, n, ('ellipse', a, b), M('eye_dark', iris_col or (0.07, 0.05, 0.06), rough=0.12, spec=0.7),
                           lift=0.0015, rot=rot, dome=dome))
    else:
        scl = sclera or ('ellipse', a, b)
        if scl[0] == 'poly' and mirror:
            scl = ('poly', [(-u, v) for u, v in reversed(scl[1])])
        parts.append(decal(prefix + '_scl', bvh, p, n, scl, M('eye_white', (0.97, 0.97, 0.96), rough=0.2, spec=0.5),
                           lift=0.0015, rot=0 if scl[0] == 'poly' else rot, dome=dome))
        ia, ib = a * iris_scale, b * iris_scale
        io = (iris_off[0] * a * sgn, iris_off[1] * b)
        parts.append(decal(prefix + '_iris', bvh, p, n, ('ellipse', ia, ib), M('iris_' + prefix[:2], iris_col, rough=0.15, spec=0.6),
                           lift=0.0028, rot=rot, off=io, dome=dome))
        parts.append(decal(prefix + '_pup', bvh, p, n, ('ellipse', ia * pupil_scale, ib * pupil_scale * 1.1),
                           M('pupil', (0.10, 0.03, 0.05), rough=0.12, spec=0.7),
                           lift=0.0041, rot=rot, off=io, dome=dome))
    # glossy highlight (no ink)
    hr = min(a, b) * HL_SCALE
    parts.append(decal(prefix + '_hl', bvh, p, n, ('ellipse', hr, hr * 1.1), M('hl', (1, 1, 1), emission=(1, 1, 1), emission_strength=1.2),
                       lift=0.0055, off=(hl_off[0] * a * sgn, hl_off[1] * b), ink=False, dome=dome))
    return parts


def ear_dir(sx, lean, pose, away_k=0.38):
    """Sprite ear direction: up + sideways splay, nudged away from the camera so no
    row sees an ear end-on (the oblique camera looks down at 55 deg)."""
    away = pose.get('away', Vector((0, 1, 0)))
    side = math.sin(math.radians(lean))
    return (Vector((side * sx, 0, math.cos(math.radians(lean)))) + away * away_k).normalized()


class HeadXf:
    """Rigid head pose: tilt (degrees, + looks up) and yaw about a neck pivot."""

    def __init__(self, pivot, tilt=0.0, yaw=0.0):
        self.pivot = Vector(pivot)
        self.R = Matrix.Rotation(math.radians(yaw), 3, 'Z') @ Matrix.Rotation(math.radians(-tilt), 3, 'X')
        self.qr = self.R.to_quaternion()

    def p(self, v):
        return self.pivot + self.R @ (Vector(v) - self.pivot)

    def d(self, v):
        return self.R @ Vector(v)

    def ell(self, c, semi, direction=None, roll=0.0, s=2.0):
        e = ell_el(self.p(c), semi, direction=direction, roll=roll, s=s)
        e['q'] = self.qr @ e['q'] if 'q' in e else self.qr
        return e

    def inv(self, v):
        return self.pivot + self.R.transposed() @ (Vector(v) - self.pivot)


# ── species ─────────────────────────────────────────────────────────────────
# Every builder works in model space: feet centre at the origin, facing -Y (toward the
# camera), +X = the Pokemon's left. pose: step -1/0/1 (step-L, stand, step-R), hero bool.

def build_pikachu(pose):
    st = pose.get('step', 0)
    hero = pose.get('hero', False)
    YEL = (1.00, 0.84, 0.06)
    BRN = (0.55, 0.31, 0.13)
    BLK = (0.10, 0.08, 0.08)
    bob = -0.015 * abs(st)
    hz = 0.745 + bob
    H = HeadXf((0, 0.0, 0.52 + bob), tilt=0 if hero else SPRITE_TILT, yaw=0)

    # body + head + legs: one melted surface - pear body under a big round head
    def body_col(p, n):
        c = YEL
        if p.y > 0.04 and p.z < 0.56:
            w = 1 - sstep(0.14, 0.18, abs(p.x))
            for zc in (0.46, 0.355):
                c = mix(c, BRN, w * band(p.z, zc - 0.021, zc + 0.021, 0.006) * sstep(0.04, 0.10, p.y))
        return c
    fy = 0.07 * st
    els = [
        H.ell((0, 0.00, hz), (0.29, 0.245, 0.235)),                 # head
        H.ell((0.15, -0.05, hz - 0.08), (0.13, 0.12, 0.11)),        # jowls
        H.ell((-0.15, -0.05, hz - 0.08), (0.13, 0.12, 0.11)),
        ell_el((0, 0.02, 0.45 + bob), (0.185, 0.165, 0.15)),        # chest
        ell_el((0, 0.03, 0.26 + bob), (0.245, 0.215, 0.205)),       # belly / hips (pear)
    ]
    for sx, dy in ((1, fy), (-1, -fy)):                              # short thighs + small feet
        els.append(ell_el((0.115 * sx, 0.0 + dy * 0.5, 0.12 + bob * 0.5), (0.075, 0.075, 0.075)))
        els.append(ell_el((0.105 * sx, -0.06 + dy, 0.024), (0.036, 0.062, 0.024), direction=(0.3 * sx, -1, 0), s=3.0))
    body = blob('pk_body', els, vc_mat('pk_vc'), paint_fn=body_col)
    head_c = H.p((0, -0.01, hz))

    # stubby arms with round paws
    sw = 0.05 * st
    if hero:
        arm_l = [(0.16, -0.05, 0.50), (0.23, -0.15, 0.46), (0.22, -0.19, 0.55)]       # bent up (own left)
        arm_r = [(-0.16, -0.05, 0.50), (-0.27, -0.10, 0.53), (-0.36, -0.12, 0.58)]   # waving out
    else:
        arm_l = [(0.16, -0.05, 0.50 + bob), (0.22, -0.13 - sw, 0.44 + bob), (0.22, -0.18 - sw, 0.45 + bob)]
        arm_r = [(-0.16, -0.05, 0.50 + bob), (-0.22, -0.13 + sw, 0.44 + bob), (-0.22, -0.18 + sw, 0.45 + bob)]
    arm_els = []
    for arm in (arm_l, arm_r):
        arm_els.append(capsule_el(arm[0], arm[1], 0.05))
        arm_els.append(capsule_el(arm[1], arm[2], 0.048))
        arm_els.append(dict(t='B', c=arm[2], r=0.054))
    blob('pk_arms', arm_els, M('pk_yel', YEL))

    # ears: long, pointed, black tips (sprites: less sideways splay so side views do not see them end-on)
    for sx in (1, -1):
        base = Vector((0.14 * sx, 0.03, hz + 0.15))
        if hero:
            d = Vector((math.sin(math.radians(30 if sx > 0 else 40)) * sx, 0.12, 0.8)).normalized()
        else:
            d = ear_dir(sx, 17, pose)
        L = 0.47
        ts = [0, 0.08, 0.2, 0.32, 0.45, 0.56, 0.625, 0.635, 0.72, 0.82, 0.9, 0.96, 1.0]
        pts = [H.p(base + d * (L * t) + Vector((0, 0.03, 0)) * (t * t)) for t in ts]
        w = [0.066, 0.078, 0.084, 0.083, 0.077, 0.068, 0.061, 0.060, 0.052, 0.038, 0.024, 0.012, 0.002]
        rad = [(wi, wi * 0.5) for wi in w]
        cols = [BLK if t > 0.63 else YEL for t in ts]
        loft('pk_ear', pts, rad, ref=H.d((sx, 0, 0)), mat=vc_mat('pk_vc'), colors=cols)

    # lightning-bolt tail (bevelled slab), brown base
    yaw = -40 + 8 * st
    U = rotz((0, 1, 0), yaw)
    Wn = U.cross(Vector((0, 0, 1))).normalized()
    spine = [(0.0, 0.0), (0.13, 0.075), (0.085, 0.175), (0.27, 0.285), (0.20, 0.41), (0.50, 0.73)]
    half = [0.024, 0.026, 0.036, 0.045, 0.056, 0.088]
    slab('pk_tail', offset_outline(spine, half), 0.032, (U, Vector((0, 0, 1)), Wn), (0.09, 0.14, 0.22 + bob),
         [M('pk_yel', YEL), M('pk_brn', BRN)], split_v=0.095, bevel=0.011)

    # face
    bvh = make_bvh([body])
    hc = head_c
    for sx in (1, -1):
        eye('pk_e%d' % sx, bvh, hc, 0, 0, (0.043, 0.054), 'black', mirror=sx < 0,
            hl_off=(-0.2, 0.34), bulge=0.010, dirv=H.d(sdir(27 * sx, 17)))
        p, n = surf(bvh, H.p((0, -0.01, hz - 0.03)), H.d(sdir(58 * sx, -9)))
        decal('pk_cheek', bvh, p, n, ('ellipse', 0.074, 0.072), M('pk_red', (0.93, 0.16, 0.13), rough=0.4),
              lift=0.0015, bulge=0.004)
    p, n = surf(bvh, hc, H.d(sdir(0, 3)))
    decal('pk_nose', bvh, p, n, ('ellipse', 0.014, 0.009), M('pk_nose', (0.12, 0.06, 0.06)), lift=0.0015, bulge=0.003)
    p, n = surf(bvh, hc, H.d(sdir(0, -10)))
    mouth = ('poly', [(-0.045, 0.016), (-0.026, 0.021), (0, 0.012), (0.026, 0.021), (0.045, 0.016),
                      (0.04, -0.012), (0.018, -0.040), (-0.018, -0.040), (-0.04, -0.012)])
    decal('pk_mouth', bvh, p, n, mouth, M('mouth_dk', (0.42, 0.08, 0.10), rough=0.6), lift=0.0015)
    decal('pk_tongue', bvh, p, n, ('ellipse', 0.026, 0.014), M('pk_tongue', (0.96, 0.50, 0.55), rough=0.5),
          lift=0.003, off=(0, -0.022), ink=False)
    return dict(head=head_c)


def quad_legs(st, k=0.06):
    """Foot y-offsets for a diagonal-pair walk: step-L = front-left + back-right forward."""
    return dict(fl=k * st, br=k * st, fr=-k * st, bl=-k * st)


def build_eevee(pose):
    st = pose.get('step', 0)
    hero = pose.get('hero', False)
    FUR = (0.86, 0.57, 0.27)
    CRM = (0.97, 0.92, 0.70)
    DK = (0.36, 0.20, 0.10)
    bob = -0.012 * abs(st)
    hz, hy = 0.72 + bob, -0.11
    H = HeadXf((0, -0.08, 0.50 + bob), tilt=0 if hero else SPRITE_TILT * 0.8)
    lg = quad_legs(st, 0.055)
    vcm = vc_mat('ev_vc', rough=0.55, spec=0.3)
    fur = M('ev_fur', FUR, rough=0.55, spec=0.3)

    els = [
        H.ell((0, hy, hz), (0.235, 0.20, 0.20)),                       # head
        H.ell((0.13, hy - 0.04, hz - 0.075), (0.115, 0.105, 0.09)),    # cheeks
        H.ell((-0.13, hy - 0.04, hz - 0.075), (0.115, 0.105, 0.09)),
        H.ell((0, hy - 0.13, hz - 0.075), (0.075, 0.06, 0.055), s=3),  # little muzzle
        ell_el((0, 0.10, 0.31 + bob), (0.13, 0.22, 0.115)),            # torso
        ell_el((0, 0.21, 0.31 + bob), (0.135, 0.10, 0.12)),            # haunch
        ell_el((0, -0.06, 0.38 + bob), (0.11, 0.11, 0.12)),            # chest / neck
        ell_el((0.08, 0.22, 0.25 + bob), (0.065, 0.09, 0.10)),         # thighs
        ell_el((-0.08, 0.22, 0.25 + bob), (0.065, 0.09, 0.10)),
    ]
    body = blob('ev_body', els, fur)
    head_c = H.p((0, hy, hz))

    # cream ruff with fluffy tufts
    rz = 0.44 + bob
    ruff = blob('ev_ruff', [
        ell_el((0, -0.14, rz), (0.20, 0.12, 0.115)),
        ell_el((0, -0.17, rz - 0.07), (0.14, 0.09, 0.09)),
        ell_el((0.14, -0.07, rz + 0.01), (0.10, 0.12, 0.10)),
        ell_el((-0.14, -0.07, rz + 0.01), (0.10, 0.12, 0.10)),
        ell_el((0, 0.0, rz + 0.06), (0.15, 0.10, 0.08)),
    ], M('ev_crm', CRM, rough=0.6, spec=0.25))
    crm = M('ev_crm', CRM, rough=0.6, spec=0.25)
    for i, a in enumerate(range(-156, 157, 24)):
        ar = math.radians(a)
        rad = Vector((math.sin(ar) * 0.19, -math.cos(ar) * 0.13 - 0.07, 0))
        base = Vector((0, 0, rz - 0.03 - 0.04 * math.cos(ar))) + rad * 0.82
        tip = base + rad.normalized() * (0.09 + 0.02 * (i % 2)) + Vector((0, 0, -0.07 - 0.03 * math.cos(ar)))
        cone_tuft('ev_tuft%d' % i, base, tip, 0.045, crm)
    for sx in (1, -1):                                                  # cheek fur spikes
        b = H.p((0.21 * sx, hy - 0.02, hz - 0.08))
        cone_tuft('ev_ctuft', b, H.p((0.29 * sx, hy + 0.02, hz - 0.10)), 0.032, fur)

    # legs + paws
    legs = [('fl', 0.075, -0.10), ('fr', -0.075, -0.10), ('bl', 0.085, 0.235), ('br', -0.085, 0.235)]
    paw_els = []
    for key, x, y in legs:
        dy = lg[key]
        top = Vector((x, y, 0.30 + bob))
        foot = Vector((x * 1.05, y + dy, 0.04))
        mid = (top + foot) / 2 + Vector((0, 0.012 if y > 0 else -0.004, 0))
        loft('ev_leg', [top, mid, foot], [(0.05, 0.05), (0.042, 0.042), (0.04, 0.04)], ref=(1, 0, 0),
             mat=fur, segs=12)
        paw_els.append(ell_el(foot + Vector((0, -0.014, -0.008)), (0.05, 0.062, 0.034)))
    blob('ev_paws', paw_els, fur)

    # bushy tail with cream tip
    sway = 8 * st
    tb = Vector((0, 0.30, 0.36 + bob))
    tpts = [(0, 0.30, 0.36), (0.03, 0.41, 0.46), (0.06, 0.48, 0.60), (0.08, 0.49, 0.74), (0.08, 0.44, 0.87)]
    tpts = [rot_about(Vector(p) + Vector((0, 0, bob)), tb, 'Z', sway) for p in tpts]
    trad = [0.05, 0.10, 0.13, 0.12, 0.075]
    tail_els = [dict(t='B', c=p, r=r) for p, r in zip(tpts, trad)]
    for i in range(len(tpts) - 1):
        tail_els.append(dict(t='B', c=(tpts[i] + tpts[i + 1]) / 2, r=(trad[i] + trad[i + 1]) / 2 * 0.95))
    tip_z = 0.73 + bob

    def tail_col(p, n):
        return mix(FUR, CRM, sstep(tip_z - 0.015, tip_z + 0.015, p.z + 0.25 * (p.y - 0.44)))
    blob('ev_tail', tail_els, vcm, paint_fn=tail_col)

    # big ears: dark inner, orange rim
    for sx in (1, -1):
        base = Vector((0.12 * sx, hy + 0.05, hz + 0.12))
        if hero:
            a = math.radians(50 if sx > 0 else 20)
            d = Vector((math.sin(a) * sx, 0.10, math.cos(a))).normalized()
        else:
            d = ear_dir(sx, 28, pose, 0.42)
        L = 0.50
        ts = [0, 0.07, 0.16, 0.28, 0.40, 0.52, 0.64, 0.75, 0.85, 0.93, 1.0]
        w = [0.075, 0.10, 0.118, 0.12, 0.112, 0.098, 0.08, 0.06, 0.04, 0.02, 0.002]
        pts = [H.p(base + d * (L * t)) for t in ts]
        fwd = H.d((0, -1, 0))

        def ear_col(i, th, off, ts=ts, fwd=fwd):
            inner = off.dot(fwd) > 0.35 and abs(math.cos(th)) < 0.80 and 0.05 < ts[i] < 0.93
            return DK if inner else FUR

        def ear_shape(i, th):
            return (1.0, 0.25 if math.sin(th) * (1 if sx > 0 else -1) < 0 else 1.0)
        loft('ev_ear', pts, [(wi, 0.032) for wi in w], ref=H.d((sx, 0, 0)), mat=vcm, colfn=ear_col,
             shape=ear_shape, segs=20)

    # head-top tuft
    for k, (x, ang) in enumerate(((0.0, 0), (0.045, 18), (-0.045, -18))):
        b = H.p((x, hy - 0.06, hz + 0.17))
        t = H.p((x + math.sin(math.radians(ang)) * 0.06, hy - 0.10, hz + 0.25 - abs(ang) * 0.001))
        cone_tuft('ev_htuft%d' % k, b, t, 0.035, fur)

    # face
    bvh = make_bvh([body])
    for sx in (1, -1):
        eye('ev_e%d' % sx, bvh, head_c, 0, 0, (0.058, 0.074), 'black', mirror=sx < 0, tilt=-8,
            iris_col=(0.16, 0.08, 0.04), hl_off=(-0.18, 0.36), bulge=0.013, dirv=H.d(sdir(33 * sx, 6)))
    p, n = surf(bvh, head_c, H.d(sdir(0, -10)))
    decal('ev_nose', bvh, p, n, ('poly', [(-0.015, 0.006), (0.015, 0.006), (0, -0.009)]),
          M('ev_nose', (0.20, 0.10, 0.06)), lift=0.0015, bulge=0.003)
    p, n = surf(bvh, head_c, H.d(sdir(0, -18)))
    stroke('ev_mouth', bvh, p, n, [(-0.034, 0.008), (-0.017, -0.005), (0, 0.006), (0.017, -0.005), (0.034, 0.008)],
           0.0045, M('ev_line', (0.25, 0.12, 0.06)))
    return dict(head=head_c)


def build_bulbasaur(pose):
    st = pose.get('step', 0)
    hero = pose.get('hero', False)
    TEAL = (0.50, 0.83, 0.75)
    SPOT = (0.25, 0.55, 0.45)
    BULB = (0.36, 0.72, 0.22)
    bob = -0.012 * abs(st)
    H = HeadXf((0, -0.02, 0.36 + bob), tilt=0 if hero else SPRITE_TILT * 0.7)
    hz, hy = 0.44 + bob, -0.15
    lg = quad_legs(st, 0.06)
    teal = M('bs_teal', TEAL, rough=0.42, spec=0.35)

    els = [
        H.ell((0, hy, hz), (0.29, 0.235, 0.19)),                      # wide flat head
        H.ell((0.15, hy - 0.05, hz - 0.06), (0.15, 0.13, 0.12)),      # jowls
        H.ell((-0.15, hy - 0.05, hz - 0.06), (0.15, 0.13, 0.12)),
        H.ell((0, hy - 0.10, hz - 0.03), (0.17, 0.12, 0.12)),         # snout
        ell_el((0, 0.12, 0.31 + bob), (0.22, 0.25, 0.18)),            # body
    ]
    for key, x, y in (('fl', 0.17, -0.09), ('fr', -0.17, -0.09), ('bl', 0.18, 0.27), ('br', -0.18, 0.27)):
        dy = lg[key]
        els.append(ell_el((x, y + dy * 0.4, 0.19 + bob * 0.5), (0.085, 0.09, 0.11)))      # thigh
        els.append(ell_el((x * 1.03, y - 0.02 + dy, 0.05), (0.08, 0.10, 0.052), s=3))   # foot
    body = blob('bs_body', els, teal)
    head_c = H.p((0, hy, hz))

    # claws on the front feet
    white = M('claw', (0.97, 0.97, 0.95), rough=0.3)
    for key, x in (('fl', 0.17), ('fr', -0.17)):
        fy = -0.11 + lg[key] - 0.085
        for k in (-1, 0, 1):
            b = Vector((x * 1.03 + k * 0.035, fy + 0.01, 0.022))
            cone_tuft('bs_claw', b, b + Vector((k * 0.008, -0.03, -0.012)), 0.012, white, segs=8)

    # ears
    for sx in (1, -1):
        b = H.p((0.19 * sx, hy + 0.02, hz + 0.12))
        d = H.d(Vector((0.55 * sx, 0.12, 0.82)).normalized())
        ts = [0, 0.25, 0.5, 0.75, 1.0]
        loft('bs_ear', [b + d * (0.15 * t) for t in ts], [(0.06 * (1 - t) + 0.003, 0.03 * (1 - t) + 0.002) for t in ts],
             ref=H.d((sx, 0, 0)), mat=teal, segs=12)

    # the bulb: overlapping lobes twisting to a point, tilted back
    bulb = M('bs_bulb', BULB, rough=0.38, spec=0.4)
    bc = Vector((0, 0.17, 0.47 + bob))                  # centre of the bulb's footprint on the back
    tip = bc + Vector((0, 0.17, 0.40))
    for i in range(5):
        a = math.radians(i * 72 + 36)
        bp = bc + Vector((math.sin(a) * 0.20, -math.cos(a) * 0.17, 0.02))
        ax = tip - bp
        c = bp + ax * 0.42 + Vector((math.sin(a) * 0.03, -math.cos(a) * 0.03, 0))
        blob('bs_lobe%d' % i, [
            ell_el(c, (ax.length * 0.52, 0.15, 0.125), direction=ax, roll=math.degrees(a)),
        ], bulb)
    loft('bs_tip', [tip + Vector((0, -0.06, -0.10)), tip + Vector((0, -0.03, -0.04)), tip,
                    tip + Vector((0, 0.03, 0.02)), tip + Vector((0, 0.07, 0.02))],
         [(0.06, 0.06), (0.045, 0.045), (0.028, 0.028), (0.014, 0.014), (0.002, 0.002)], ref=(1, 0, 0), mat=bulb,
         segs=14)

    # face
    bvh = make_bvh([body])
    red = (0.85, 0.12, 0.17)
    scl = ('poly', [(-0.062, -0.03), (-0.04, -0.052), (0.015, -0.056), (0.055, -0.034), (0.07, 0.004),
                    (0.064, 0.042), (0.04, 0.054), (-0.064, 0.012)])
    for sx in (1, -1):
        eye('bs_e%d' % sx, bvh, head_c, 0, 0, (0.068, 0.056), 'iris', mirror=sx < 0, sclera=scl,
            iris_col=red, iris_scale=0.80, iris_off=(-0.16, -0.05), pupil_scale=0.40,
            hl_off=(-0.32, 0.26), bulge=0.010, dirv=H.d(sdir(37 * sx, 12)))
    for sx in (1, -1):
        p, n = surf(bvh, head_c, H.d(sdir(7 * sx, -4)))
        decal('bs_nostril', bvh, p, n, ('ellipse', 0.008, 0.006), M('nostril', (0.15, 0.25, 0.22)), lift=0.0015)
    p, n = surf(bvh, head_c, H.d(sdir(0, -24)))
    mouth = ('poly', [(-0.19, 0.04), (-0.10, 0.03), (0, 0.027), (0.10, 0.03), (0.19, 0.04),
                      (0.15, -0.01), (0.08, -0.055), (0, -0.07), (-0.08, -0.055), (-0.15, -0.01)])
    decal('bs_mouth', bvh, p, n, mouth, M('bs_mouth', (0.93, 0.47, 0.45), rough=0.5), lift=0.0015, ink=True)
    decal('bs_throat', bvh, p, n, ('ellipse', 0.11, 0.024), M('bs_throat', (0.72, 0.26, 0.30), rough=0.5),
          lift=0.003, off=(0, 0.004), ink=False)
    for sx in (1, -1):
        decal('bs_fang', bvh, p, n, ('poly', [(-0.01, 0.0), (0.01, 0.0), (0.0, -0.018)]), white,
              lift=0.0045, off=(0.09 * sx, 0.028), ink=False)
    # dark-green patches (no ink, like the art)
    spot = M('bs_spot', SPOT, rough=0.45, spec=0.3)
    patches = [
        (head_c, H.d(sdir(0, 52)), [(-0.06, 0.0), (-0.02, 0.05), (0.06, 0.03), (0.05, -0.03), (-0.03, -0.035)]),
        (head_c, H.d(sdir(-26, 48)), [(-0.025, 0.0), (0.0, 0.03), (0.025, 0.0), (0.0, -0.022)]),
        (head_c, H.d(sdir(28, 44)), [(-0.022, 0.012), (0.024, 0.02), (0.0, -0.025)]),
        (Vector((0, 0.12, 0.31 + bob)), sdir(80, 10), [(-0.05, 0.0), (0.0, 0.035), (0.05, 0.0), (0.0, -0.03)]),
        (Vector((0, 0.12, 0.31 + bob)), sdir(-82, 6), [(-0.04, 0.01), (0.02, 0.035), (0.05, -0.01), (-0.01, -0.03)]),
        (Vector((0, 0.12, 0.31 + bob)), sdir(120, 20), [(-0.03, 0.0), (0.0, 0.025), (0.035, 0.0), (0.0, -0.02)]),
        (Vector((0, 0.12, 0.31 + bob)), sdir(-125, 18), [(-0.03, 0.0), (0.0, 0.03), (0.03, 0.0), (0.0, -0.025)]),
    ]
    for c, d, poly in patches:
        p, n = surf(bvh, c, d)
        decal('bs_spot', bvh, p, n, ('poly', poly), spot, lift=0.0012, ink=False)
    for key, x, y in (('fl', 0.17, -0.09), ('fr', -0.17, -0.09), ('bl', 0.18, 0.27), ('br', -0.18, 0.27)):
        sx = 1 if x > 0 else -1
        c = Vector((x, y + lg[key] * 0.4, 0.17))
        p, n = surf(bvh, c, Vector((sx, -0.5, 0.25)))
        decal('bs_spot', bvh, p, n, ('poly', [(-0.03, 0.0), (0.0, 0.03), (0.035, 0.005), (0.005, -0.03)]), spot,
              lift=0.0012, ink=False)
    return dict(head=head_c)


def build_squirtle(pose):
    st = pose.get('step', 0)
    hero = pose.get('hero', False)
    BLUE = (0.42, 0.77, 0.95)
    PLATE = (0.93, 0.85, 0.60)
    SHELL = (0.58, 0.32, 0.16)
    RIM = (0.97, 0.95, 0.88)
    bob = -0.015 * abs(st)
    hz = 0.79 + bob
    H = HeadXf((0, 0.0, 0.58 + bob), tilt=0 if hero else SPRITE_TILT)
    blue = M('sq_blue', BLUE, rough=0.38, spec=0.4)
    fy = 0.075 * st

    els = [
        H.ell((0, -0.02, hz), (0.245, 0.235, 0.225)),                 # round head
        H.ell((0, -0.12, hz - 0.06), (0.17, 0.13, 0.12)),             # snout
        ell_el((0, 0.0, 0.60 + bob), (0.12, 0.11, 0.10)),             # neck
        ell_el((0, 0.03, 0.38 + bob), (0.19, 0.17, 0.21)),            # torso core
    ]
    for sx, dy in ((1, fy), (-1, -fy)):
        els.append(ell_el((0.13 * sx, 0.0 + dy * 0.4, 0.17 + bob * 0.5), (0.10, 0.10, 0.115)))          # thigh
        els.append(ell_el((0.14 * sx, -0.07 + dy, 0.04), (0.08, 0.105, 0.045), direction=(0.2 * sx, -1, 0), s=3))
    body = blob('sq_body', els, blue)
    head_c = H.p((0, -0.03, hz))

    # belly plate + shell + rim
    plate = blob('sq_plate', [ell_el((0, -0.075, 0.38 + bob), (0.20, 0.13, 0.235), s=3)],
                 M('sq_plate', PLATE, rough=0.4, spec=0.35))
    shell = blob('sq_shell', [ell_el((0, 0.08, 0.40 + bob), (0.245, 0.20, 0.27), s=3)],
                 M('sq_shell', SHELL, rough=0.35, spec=0.45))
    rim_pts = []
    for k in range(28):
        a = 2 * math.pi * k / 28
        rim_pts.append(Vector((math.sin(a) * 0.236, -0.005 + 0.03 * math.cos(a) ** 2, 0.40 + bob + math.cos(a) * 0.26)))
    loft('sq_rim', rim_pts, [(0.035, 0.028)] * 28, ref=(0, 1, 0), mat=M('sq_rim', RIM, rough=0.4), segs=10,
         closed=True)

    # arms
    sw = 0.06 * st
    if hero:
        arm_l = [(0.16, -0.02, 0.52), (0.27, -0.12, 0.47), (0.35, -0.18, 0.50)]
        arm_r = [(-0.16, -0.02, 0.52), (-0.28, -0.08, 0.46), (-0.39, -0.12, 0.47)]
    else:
        arm_l = [(0.16, -0.02, 0.52 + bob), (0.25, -0.10 - sw, 0.45 + bob), (0.30, -0.15 - sw, 0.43 + bob)]
        arm_r = [(-0.16, -0.02, 0.52 + bob), (-0.25, -0.10 + sw, 0.45 + bob), (-0.30, -0.15 + sw, 0.43 + bob)]
    arm_els = []
    for arm in (arm_l, arm_r):
        arm_els.append(capsule_el(arm[0], arm[1], 0.058))
        arm_els.append(capsule_el(arm[1], arm[2], 0.052))
        arm_els.append(ell_el(arm[2], (0.06, 0.06, 0.045), direction=Vector(arm[2]) - Vector(arm[1])))
    blob('sq_arms', arm_els, blue)

    # curled tail (spiral in the side plane)
    sway = 7 * st
    tb = Vector((0, 0.18, 0.16 + bob))
    pts, rad = [], []
    for k in range(26):
        t = k / 25
        if t < 0.35:
            u = t / 0.35
            p = Vector((0, 0.18 + 0.30 * u, 0.16 - 0.05 * math.sin(u * math.pi) + 0.04 * u))
        else:
            u = (t - 0.35) / 0.65
            ang = -math.pi / 2 + u * 1.75 * math.pi
            r = 0.135 * (1 - 0.62 * u)
            cc = Vector((0, 0.48, 0.20 + 0.135))
            p = cc + Vector((0, math.cos(ang) * r, math.sin(ang) * r))
        pts.append(rot_about(p + Vector((0, 0, bob)), tb, 'Z', sway - 22))
        rad.append(0.07 * (1 - 0.45 * t) + 0.014)
    rad[-1] *= 0.6
    loft('sq_tail', pts, [(r, r) for r in rad], ref=(1, 0, 0), mat=blue, segs=14)

    # face
    bvh = make_bvh([body])
    for sx in (1, -1):
        eye('sq_e%d' % sx, bvh, head_c, 0, 0, (0.05, 0.062), 'iris', mirror=sx < 0, tilt=-6,
            iris_col=(0.62, 0.12, 0.18), iris_scale=0.78, iris_off=(-0.12, 0.12), pupil_scale=0.52,
            hl_off=(-0.25, 0.38), bulge=0.012, dirv=H.d(sdir(30 * sx, 10)))
    for sx in (1, -1):
        p, n = surf(bvh, head_c, H.d(sdir(6 * sx, -6)))
        decal('sq_nostril', bvh, p, n, ('ellipse', 0.007, 0.006), M('nostril_sq', (0.15, 0.25, 0.35)), lift=0.0015)
    p, n = surf(bvh, head_c, H.d(sdir(0, -19)))
    stroke('sq_mouth', bvh, p, n, [(-0.09, 0.022), (-0.06, 0.0), (-0.03, -0.006), (0, 0.0), (0.03, -0.006),
                                   (0.06, 0.0), (0.09, 0.024)], 0.0045, M('sq_line', (0.12, 0.25, 0.38)))
    if hero:   # plate seams
        pb = make_bvh([plate])
        p, n = surf(pb, Vector((0, -0.075, 0.38)), Vector((0, -1, 0)))
        ln = M('sq_seam', (0.50, 0.36, 0.20))
        for pts2 in ([(0, 0.22), (0, -0.22)],
                     [(-0.17, 0.08), (-0.09, 0.06), (0, 0.065), (0.09, 0.06), (0.17, 0.08)],
                     [(-0.18, -0.06), (-0.09, -0.07), (0, -0.065), (0.09, -0.07), (0.18, -0.06)]):
            stroke('sq_seam', pb, p, n, pts2, 0.006, ln, lift=0.002)
    return dict(head=head_c)


def build_chikorita(pose):
    st = pose.get('step', 0)
    hero = pose.get('hero', False)
    BODY = (0.74, 0.87, 0.50)
    LEAF = (0.42, 0.78, 0.30)
    VEIN = (0.30, 0.62, 0.22)
    BUD = (0.30, 0.62, 0.22)
    bob = -0.012 * abs(st)
    H = HeadXf((0, -0.04, 0.50 + bob), tilt=0 if hero else SPRITE_TILT * 0.8)
    hz = 0.69 + bob
    lg = quad_legs(st, 0.055)
    skin = M('ck_skin', BODY, rough=0.45, spec=0.32)

    els = [
        H.ell((0, -0.06, hz), (0.25, 0.22, 0.205)),                  # head (wide jowls)
        H.ell((0, -0.05, hz + 0.14), (0.165, 0.155, 0.13)),          # tapering crown
        H.ell((0, -0.04, hz + 0.25), (0.075, 0.075, 0.07)),          # pointed top
        H.ell((0, -0.16, hz - 0.05), (0.14, 0.10, 0.09), s=3),       # snout
        ell_el((0, -0.05, 0.43 + bob), (0.16, 0.14, 0.13)),          # chest / neck
        ell_el((0, 0.10, 0.31 + bob), (0.18, 0.25, 0.17)),           # body
    ]
    for key, x, y in (('fl', 0.12, -0.10), ('fr', -0.12, -0.10), ('bl', 0.14, 0.25), ('br', -0.14, 0.25)):
        dy = lg[key]
        els.append(ell_el((x, y + dy * 0.4, 0.17 + bob * 0.5), (0.075, 0.08, 0.10)))
        els.append(ell_el((x * 1.04, y - 0.03 + dy, 0.042), (0.068, 0.088, 0.042), s=3))
    body = blob('ck_body', els, skin)
    head_c = H.p((0, -0.06, hz))
    bvh = make_bvh([body])

    # toenails
    white = M('claw', (0.97, 0.97, 0.95), rough=0.3)
    for key, x, y in (('fl', 0.12, -0.10), ('fr', -0.12, -0.10)):
        b = Vector((x * 1.04, y - 0.03 + lg[key] - 0.085, 0.02))
        cone_tuft('ck_nail', b, b + Vector((0, -0.022, -0.008)), 0.011, white, segs=8)

    # ring of green buds around the neck
    budm = M('ck_bud', BUD, rough=0.4, spec=0.4)
    nc = Vector((0, -0.05, 0.47 + bob))
    bud_els = []
    for a in (-118, -72, -26, 26, 72, 118, 180):
        d = sdir(a, -8)
        p, n = surf(bvh, nc, d)
        bud_els.append(dict(t='B', c=p + n * 0.014, r=0.034))
    blob('ck_buds', bud_els, budm)

    # leaf on a short stem
    top = H.p((0, -0.04, hz + 0.31))
    stem_end = H.p((0, -0.02, hz + 0.42))
    loft('ck_stem', [H.p((0, -0.04, hz + 0.27)), top, (top + stem_end) / 2 + H.d((0, -0.01, 0)), stem_end],
         [(0.022, 0.022), (0.02, 0.02), (0.017, 0.017), (0.015, 0.015)], ref=(1, 0, 0),
         mat=M('ck_leaf', LEAF, rough=0.4, spec=0.35), segs=10)
    if hero:
        D = H.d(Vector((0.18, 0.72, 0.55)).normalized())
        L, Wm = 0.82, 0.215
    else:
        away = pose.get('away', Vector((0, 1, 0)))
        D = H.d((Vector((0, 0, 0.95)) + away * 0.55 + Vector((0, 0.15, 0))).normalized())
        L, Wm = 0.68, 0.19
    side = Vector((0, 0, 1)).cross(D)
    if side.length < 0.1:
        side = Vector((1, 0, 0))
    side.normalize()
    nrm = side.cross(D).normalized()
    if nrm.z < 0:
        nrm = -nrm

    def leaf_pt(u, v):
        v = v * 2 - 1
        hw = Wm * math.sin(math.pi * min(1.0, u ** 0.85)) ** 0.85
        hw *= 1.0 + 0.12 * math.sin(math.pi * u)
        p = stem_end + D * (L * u) + side * (hw * v)
        p += nrm * (0.05 * abs(v) * hw / max(Wm, 1e-6))          # V-fold along the midrib
        p += nrm * (0.10 * math.sin(math.pi * u) * L * 0.4) - nrm * (0.12 * L * u * u)   # arch, droop
        return p

    def leaf_col(u, v):
        return mix(LEAF, VEIN, 1 - sstep(0.025, 0.06, abs(v * 2 - 1)) * 1.0) if u < 0.93 else LEAF
    sheet_surface('ck_leaf', leaf_pt, 24, 12, mat=vc_mat('ck_vc', rough=0.4, spec=0.35), thick=0.016,
                  cols_fn=leaf_col)

    # face
    for sx in (1, -1):
        eye('ck_e%d' % sx, bvh, head_c, 0, 0, (0.050, 0.064), 'iris', mirror=sx < 0, tilt=-4,
            iris_col=(0.78, 0.10, 0.17), iris_scale=0.80, iris_off=(-0.10, -0.02), pupil_scale=0.40,
            hl_off=(-0.25, 0.36), bulge=0.012, dirv=H.d(sdir(33 * sx, 8)))
    p, n = surf(bvh, head_c, H.d(sdir(0, -17)))
    stroke('ck_mouth', bvh, p, n, [(-0.045, 0.012), (-0.022, -0.004), (0, 0.002), (0.022, -0.004), (0.045, 0.012)],
           0.0045, M('ck_line', (0.30, 0.40, 0.18)))
    return dict(head=head_c)


BUILDERS = {
    'pikachu': build_pikachu,
    'eevee': build_eevee,
    'bulbasaur': build_bulbasaur,
    'squirtle': build_squirtle,
    'chikorita': build_chikorita,
}


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


def sprite_pose(step, yaw):
    a = math.radians(yaw)
    return dict(step=step, yaw=yaw, away=Vector((math.sin(a), math.cos(a), 0)))


def place_root(yaw, scale):
    root = C.parent_all('root', [o for o in MODEL if o.parent is None])
    root.rotation_euler = (0, 0, math.radians(yaw))
    root.scale = (scale, scale, scale)
    bpy.context.view_layer.update()
    return root


def sprite_scale(species):
    """Largest scale at which every row/step fits the 80x80 frame (feet at 40,70)."""
    global RES
    new_scene(FRAME, FRAME, SHEET_SAMPLES)
    RES = 0.03
    worst = 10.0
    fx, fy = FRAME / 2, FRAME - 10
    margin = 2.5
    for _, yaw in ROWS:
        for st in (-1, 0, 1):
            clear_model()
            BUILDERS[species](sprite_pose(st, yaw))
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


def render_sheet(species):
    global RES, INK_DECALS, HL_SCALE
    scale = sprite_scale(species) * SPRITE_FILL.get(species, 1.0)
    print('[pokemon_a] %s sprite scale %.3f' % (species, scale))
    new_scene(FRAME, FRAME, SHEET_SAMPLES)
    RES = 0.022
    INK_DECALS = False
    HL_SCALE = 0.24
    frames = []
    for r, (row, yaw) in enumerate(ROWS):
        for c, st in enumerate(STEPS):
            path = os.path.join(WORK, 'mon_' + species, 'r%d_c%d.png' % (r, c))
            frames.append(path)
            if ONE_FRAME and st != 0:
                continue
            clear_model()
            BUILDERS[species](sprite_pose(st, yaw))
            place_root(yaw, scale)
            C.fixed_oblique_frame(FRAME, FRAME, (0, 0, 0))
            if 'zoom' in ARGV:      # debug: same framing at 4x resolution
                bpy.context.scene.render.resolution_x = FRAME * 4
                bpy.context.scene.render.resolution_y = FRAME * 4
                path = path.replace('.png', '_z.png')
            C.render(path)
    anchor = [FRAME / 2, FRAME - 10]
    clear_model()
    return frames, anchor, scale


def render_hero(species):
    global RES, INK_DECALS, HL_SCALE
    new_scene(HERO, HERO, HERO_SAMPLES, ink_thickness=1.5)
    RES = 0.009
    INK_DECALS = True
    HL_SCALE = 0.36
    clear_model()
    BUILDERS[species](dict(hero=True))
    place_root(HERO_YAW, 1.0)
    old = C.ELEV_DEG
    C.ELEV_DEG = HERO_ELEV
    cam = C.camera_oblique(HERO, HERO, (0, 0, 0))
    C.ELEV_DEG = old
    inv = cam.matrix_world.inverted()
    loc = [inv @ p for p in model_points(2)]
    x0, x1 = min(p.x for p in loc), max(p.x for p in loc)
    y0, y1 = min(p.y for p in loc), max(p.y for p in loc)
    size = max(x1 - x0, y1 - y0) * 1.12
    cam.data.ortho_scale = size
    cam.location = cam.matrix_world @ Vector(((x0 + x1) / 2, (y0 + y1) / 2, 0))
    bpy.context.view_layer.update()
    path = os.path.join(WORK, 'hero_' + species + '.png')
    C.render(path)
    clear_model()
    return path


SPRITE_FILL = {}


def main():
    for sp in ONLY:
        if sp not in BUILDERS:
            continue
        if DO_HERO:
            render_hero(sp)
        if DO_SHEET:
            render_sheet(sp)
    outputs = []
    for sp in SPECIES:
        if sp not in BUILDERS:
            continue
        frames = [os.path.join(WORK, 'mon_' + sp, 'r%d_c%d.png' % (r, c)) for r in range(4) for c in range(3)]
        outputs.append(dict(key='mon_' + sp, kind='sheet', frames=frames, cols=3, anchor=[FRAME / 2, FRAME - 10],
                            meta=dict(rows=['down', 'left', 'right', 'up'], cols=['step-L', 'stand', 'step-R'], species=sp)))
        outputs.append(dict(key='hero_' + sp, kind='image', frames=[os.path.join(WORK, 'hero_' + sp + '.png')],
                            meta=dict(species=sp)))
    if 'nospec' not in ARGV:
        C.write_spec(GROUP, outputs)


main()
