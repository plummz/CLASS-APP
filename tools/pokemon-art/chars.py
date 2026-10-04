"""Group `chars` (ART_SPEC section 4): player trainer, 7 NPC types, 4 gym leaders.

Run:  blender -b --factory-startup --python tools/pokemon-art/chars.py
      python3 tools/pokemon-art/pack.py chars

Optional env var for quick iteration:
  CHARS_ONLY=player,npc_lass   re-render only these keys (spec.json still lists every key;
                               the other keys keep their frames from the previous run)

Every character is a small rig built from smooth primitives (chibi 3DS-style
proportions: head ~40 % of the on-screen height). The rig is built once, facing
south (-Y, toward the camera), then posed and turned for each frame:

  lean (whole model tilted back LEAN degrees about the feet point, see below)
   '- root (turned about Z for the 4 directions)
       |- pelvis / skirt (fixed)        |- leg_L, leg_R pivots at the hip joints
       '- upper (bobs down on step frames)
            |- torso, backpack ...
            |- arm_L, arm_R pivots at the shoulders
            '- head pivot at the neck: head, hair, eyes, hats ...

The character's own LEFT side is +X when it faces the camera. The camera is the
shared C.fixed_oblique_frame camera; feet land on the same pixel in every frame.
"""
import math
import os
import sys

sys.path.insert(0, '/home/user/CLASS-APP/tools/pokemon-art')
import common as C  # noqa: E402

import bmesh  # noqa: E402
import bpy  # noqa: E402
from mathutils import Euler, Matrix, Vector  # noqa: E402

GROUP = 'chars'
FW, FH = 64, 96
FOOT = (0.0, 0.0, 0.0)          # world feet point (between the feet, on the ground)
FOOT_PX = (FW / 2, FH - 9)     # where the feet land in every frame
SAMPLES = 40
# The whole model leans back (top toward +Y, away from the camera) about the feet point, so
# the shared 55-degree camera sees people like a ~30-degree one: faces read at 32x48 px the
# way 3DS overworld trainers do. The camera itself is the standard oblique camera.
LEAN = 26.0
SCALE = 0.95                    # default model scale (kids smaller, big adults larger)
HEAD_YAW = 30.0                 # side views: head turned this much toward the camera so the face reads

DIRS = [('down', 0.0), ('left', -90.0), ('right', 90.0), ('up', 180.0)]
WORK = C.work_dir(GROUP)

ONLY = [k for k in os.environ.get('CHARS_ONLY', '').split(',') if k]


# ── colour helpers ───────────────────────────────────────────────────────────

def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


_mats = {}


def M(color, rough=0.55, spec=0.3):
    """Material keyed by its look, so different characters never share a wrong colour."""
    if isinstance(color, str):
        color = C.PALETTE[color] if color in C.PALETTE else hexc(color)
    key = (tuple(round(c, 3) for c in color), rough, spec)
    if key not in _mats:
        name = 'ch_%02x%02x%02x_%d_%d' % (int(color[0] * 255), int(color[1] * 255), int(color[2] * 255),
                                          int(rough * 100), len(_mats))
        _mats[key] = C.mat(name, color, rough=rough, spec=spec)
    return _mats[key]


SKIN = C.PALETTE['skin']
SKIN_TAN = hexc('#e2a46e')
EYE = hexc('#1d1622')
WHITE = hexc('#f6f6f4')
BLACK = hexc('#25222a')


# ── mesh + rig helpers ───────────────────────────────────────────────────────

def _update():
    bpy.context.view_layer.update()


def attach(obj, parent):
    """Parent keeping the current world transform."""
    _update()
    mw = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_parent_inverse = parent.matrix_world.inverted()
    obj.matrix_world = mw
    return obj


def pivot(name, loc, parent=None):
    e = bpy.data.objects.new(name, None)
    e.location = loc
    bpy.context.scene.collection.objects.link(e)
    if parent is not None:
        attach(e, parent)
    return e


def _euler(rot):
    return Euler(tuple(math.radians(a) for a in rot), 'XYZ')


def _xform(center, rot):
    return Matrix.LocRotScale(Vector(center), _euler(rot).to_quaternion(), None)


def _new_obj(name, bm, color, parent, rough=0.55, spec=0.3, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    for poly in o.data.polygons:
        poly.use_smooth = smooth
    C.assign(o, M(color, rough=rough, spec=spec))
    attach(o, parent)
    return o


def ell(name, center, radii, color, parent, rot=(0, 0, 0), rough=0.55, seg=24, rings=14, spec=0.3, cut=None):
    """Ellipsoid. cut = list of (point, normal) planes; geometry on the +normal side is removed."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    bmesh.ops.scale(bm, vec=Vector(radii), verts=bm.verts)
    bmesh.ops.transform(bm, matrix=_xform(center, rot), verts=bm.verts)
    for pt, n in cut or ():
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=Vector(pt), plane_no=Vector(n).normalized(),
                               clear_outer=True)
    return _new_obj(name, bm, color, parent, rough, spec)


def capsule(name, a, b, r, color, parent, r2=None, rough=0.55, seg=20, spec=0.3):
    """Capsule from point a to point b (radius r at a, r2 at b)."""
    a = Vector(a)
    b = Vector(b)
    r2 = r if r2 is None else r2
    d = b - a
    L = d.length
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=12, radius=1.0)
    for v in bm.verts:
        if v.co.z > 1e-6:
            v.co = Vector((v.co.x * r2, v.co.y * r2, v.co.z * r2 + L))
        else:
            v.co = v.co * r
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    bmesh.ops.transform(bm, matrix=Matrix.LocRotScale(a, q, None), verts=bm.verts)
    return _new_obj(name, bm, color, parent, rough, spec)


def cyl(name, center, r, depth, color, parent, rot=(0, 0, 0), r2=None, verts=28, rough=0.55,
        scale=(1, 1, 1), spec=0.3):
    """Cylinder / truncated cone along local Z (r at the bottom, r2 at the top)."""
    r2 = r if r2 is None else r2
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts, radius1=r, radius2=r2, depth=depth)
    bmesh.ops.scale(bm, vec=Vector(scale), verts=bm.verts)
    bmesh.ops.transform(bm, matrix=_xform(center, rot), verts=bm.verts)
    o = _new_obj(name, bm, color, parent, rough, spec)
    mod = o.modifiers.new('bevel', 'BEVEL')       # soften the rims (toy look)
    mod.width = min(depth * 0.3, 0.012)
    mod.segments = 2
    mod.limit_method = 'ANGLE'
    return o


def torus(name, center, R, r, color, parent, rot=(0, 0, 0), scale=(1, 1, 1), rough=0.5, arc=None):
    """Torus in the local XY plane. arc=(a0, a1) degrees keeps only that part of the ring."""
    bm = bmesh.new()
    nmaj, nmin = 32, 10
    rings = []
    a0, a1 = arc if arc else (0.0, 360.0)
    closed = arc is None
    count = nmaj if closed else nmaj + 1
    for i in range(count):
        t = math.radians(a0 + (a1 - a0) * i / nmaj)
        ring = []
        for j in range(nmin):
            u = 2 * math.pi * j / nmin
            rr = R + r * math.cos(u)
            ring.append(bm.verts.new((rr * math.cos(t), rr * math.sin(t), r * math.sin(u))))
        rings.append(ring)
    n = len(rings)
    for i in range(n if closed else n - 1):
        ra, rb = rings[i], rings[(i + 1) % n]
        for j in range(nmin):
            bm.faces.new((ra[j], rb[j], rb[(j + 1) % nmin], ra[(j + 1) % nmin]))
    if not closed:
        for ring in (rings[0], rings[-1]):
            bm.faces.new(ring)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.scale(bm, vec=Vector(scale), verts=bm.verts)
    bmesh.ops.transform(bm, matrix=_xform(center, rot), verts=bm.verts)
    return _new_obj(name, bm, color, parent, rough)


def boxm(name, center, size, color, parent, rot=(0, 0, 0), bevel=0.0, rough=0.55):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bmesh.ops.transform(bm, matrix=_xform(center, rot), verts=bm.verts)
    o = _new_obj(name, bm, color, parent, rough, smooth=False)
    if bevel > 0:
        mod = o.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        mod.limit_method = 'NONE'
    return o


def cone_between(name, a, b, r, color, parent, r2=0.004, rough=0.45):
    a, b = Vector(a), Vector(b)
    d = b - a
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=r, radius2=r2, depth=d.length)
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    bmesh.ops.transform(bm, matrix=Matrix.LocRotScale((a + b) / 2, q, None), verts=bm.verts)
    return _new_obj(name, bm, color, parent, rough)


# ── the rig ──────────────────────────────────────────────────────────────────

class Rig:
    def __init__(self, p):
        self.p = p
        hip_z = p['hip_z']
        hx = p['hip_x']
        self.lean = pivot('lean', (0, 0, 0))
        self.root = pivot('root', (0, 0, 0), self.lean)
        self.hips = pivot('hips', (0, 0, hip_z), self.root)
        self.leg_L = pivot('leg_L', (hx, 0, hip_z), self.root)
        self.leg_R = pivot('leg_R', (-hx, 0, hip_z), self.root)
        self.upper = pivot('upper', (0, 0, hip_z), self.root)
        sz = p['shoulder_z']
        sx = p['shoulder_x']
        self.arm_L = pivot('arm_L', (sx, 0, sz), self.upper)
        self.arm_R = pivot('arm_R', (-sx, 0, sz), self.upper)
        self.head = pivot('head', (0, 0, p['neck_z']), self.upper)
        self.hc = Vector((0, 0, p['head_z']))
        self.hr = p['head_r']

    def head_dir(self, az, el):
        a = math.radians(az)
        e = math.radians(el)
        return Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))

    def head_pt(self, az, el, out=0.0):
        """Point on the head surface: az = degrees toward +X from the front (-Y), el = degrees up."""
        n = self.head_dir(az, el)
        return self.hc + n * (self.hr + out), n

    def pose(self, direction=0.0, swing=0.0, arm_swing=None, bob=0.0, arm_out=7.0, head_tilt=0.0,
             arm_L=None, arm_R=None, head_yaw=0.0):
        """swing > 0: LEFT leg forward. Arms swing opposite to the legs."""
        if arm_swing is None:
            arm_swing = swing
        self.lean.rotation_euler = (math.radians(-LEAN), 0, 0)   # top tilts north, away from the camera
        sc = self.p.get('scale', SCALE)
        self.lean.scale = (sc, sc, sc)
        self.root.rotation_euler = (0, 0, math.radians(direction))
        self.leg_L.rotation_euler = (math.radians(-swing), 0, 0)
        self.leg_R.rotation_euler = (math.radians(swing), 0, 0)
        self.arm_L.rotation_euler = _euler(arm_L) if arm_L else (math.radians(arm_swing), math.radians(-arm_out), 0)
        self.arm_R.rotation_euler = _euler(arm_R) if arm_R else (math.radians(-arm_swing), math.radians(arm_out), 0)
        # The upper body sinks a little on step frames (legs apart) - the classic walk bob.
        self.upper.location = (0, 0, self.p['hip_z'] - bob)
        self.head.rotation_euler = (math.radians(head_tilt), 0, math.radians(head_yaw))
        _update()


BASE = dict(hip_z=0.40, hip_x=0.082, shoulder_z=0.84, shoulder_x=0.19, neck_z=0.95, head_z=1.17,
            head_r=0.25, torso_r=(0.17, 0.135), leg_r=0.072, arm_r=0.056, hand_r=0.060,
            arm_len=0.33)


def params(**kw):
    p = dict(BASE)
    p.update(kw)
    return p


# ── shared body parts ────────────────────────────────────────────────────────

def torso_span(p):
    top = p['neck_z'] + 0.02
    bot = p['hip_z']
    return top, bot, (top + bot) / 2, (top - bot) / 2


def front_y(p, x, z, out=0.0, belly=1.0):
    """y of the torso's front surface at (x, z) (negative = toward the face)."""
    top, bot, cz, hz = torso_span(p)
    rx, ry = p['torso_r'][0], p['torso_r'][1] * belly
    k = 1.0 - (x / rx) ** 2 - ((z - cz) / hz) ** 2
    return -(ry * math.sqrt(max(k, 0.0)) + out)


def build_legs(R, p, pants, shoe, sole=None, bare_from=None, sock=None, shoe_len=0.105, boots=None,
               shoe_w=0.08):
    """Legs hang from the hip pivots. bare_from: z below which the legs are skin (shorts)."""
    hz = p['hip_z']
    lr = p['leg_r']
    skin = p.get('skin', SKIN)
    for side, piv in (('L', R.leg_L), ('R', R.leg_R)):
        x = p['hip_x'] * (1 if side == 'L' else -1)
        if bare_from is None:
            capsule('leg' + side, (x, 0, hz + 0.02), (x, 0, 0.12), lr, pants, piv, r2=lr * 0.92)
        else:
            capsule('legskin' + side, (x, 0, bare_from), (x, 0, 0.12), lr * 0.80, skin, piv, r2=lr * 0.74)
            if pants is not None:
                capsule('leg' + side, (x, 0, hz + 0.02), (x, 0, bare_from), lr * 1.08, pants, piv, r2=lr * 1.12)
        if sock:
            cyl('sock' + side, (x, 0, 0.14), lr * 0.80, 0.09, sock, piv)
        if boots:
            cyl('boot' + side, (x, 0, 0.15), lr * 1.0, 0.17, boots, piv, r2=lr * 1.06)
        ell('shoe' + side, (x, -0.03, 0.06), (shoe_w, shoe_len, 0.065), shoe, piv,
            cut=[((0, 0, 0.0), (0, 0, -1))], rough=0.45)
        if sole:
            ell('sole' + side, (x, -0.03, 0.03), (shoe_w + 0.006, shoe_len + 0.008, 0.032), sole, piv,
                cut=[((0, 0, 0.0), (0, 0, -1))], rough=0.6)


def build_pelvis(R, p, color, rz=0.10):
    tr = p['torso_r']
    ell('pelvis', (0, 0, p['hip_z'] + 0.04), (tr[0] * 0.97, tr[1] * 0.97, rz), color, R.hips)


def build_torso(R, p, color, belly=1.0, rough=0.55):
    tr = p['torso_r']
    top, bot, cz, hz = torso_span(p)
    return ell('torso', (0, 0, cz), (tr[0], tr[1] * belly, hz), color, R.upper, rough=rough, seg=28, rings=16)


def build_arms(R, p, sleeve, sleeve_len=1.0, cuff=None, glove=None, sleeve_puff=1.0):
    """sleeve_len = fraction of the arm covered by the sleeve (1 = to the wrist, 0 = bare)."""
    L = p['arm_len']
    ar = p['arm_r']
    skin = p.get('skin', SKIN)
    for side, piv in (('L', R.arm_L), ('R', R.arm_R)):
        sx = p['shoulder_x'] * (1 if side == 'L' else -1)
        sz = p['shoulder_z']
        top = Vector((sx, 0, sz))
        wrist = Vector((sx * 1.06, 0, sz - L))
        if sleeve_len >= 0.999:
            capsule('arm' + side, top, wrist, ar, sleeve, piv, r2=ar * 0.9)
        else:
            capsule('armskin' + side, top, wrist, ar * 0.80, skin, piv, r2=ar * 0.76)
            if sleeve_len > 0:
                mid = top.lerp(wrist, sleeve_len)
                capsule('arm' + side, top, mid, ar * 1.12 * sleeve_puff, sleeve, piv, r2=ar * 1.14 * sleeve_puff)
        if cuff:
            cyl('cuff' + side, wrist + Vector((0, 0, 0.02)), ar * 0.98, 0.04, cuff, piv)
        hr = p['hand_r']
        ell('hand' + side, wrist + Vector((0, 0, -0.04)), (hr, hr, hr * 1.05), glove or skin, piv)


def build_head(R, p, eye_el=0.0, eye_az=29.0, eye_size=(0.036, 0.058), ears=True, mouth=None,
               eye_color=EYE, blush=False, lashes=False):
    hr = p['head_r']
    skin = p.get('skin', SKIN)
    ell('head', R.hc, (hr, hr * 0.98, hr * 0.97), skin, R.head, seg=32, rings=18)
    for s in (1, -1):
        pt, n = R.head_pt(s * eye_az, eye_el, out=-0.006)
        rot = (-math.degrees(math.asin(n.z)), 0, s * eye_az)
        ell('eye%d' % s, pt, (eye_size[0], 0.014, eye_size[1]), eye_color, R.head, rot=rot, rough=0.2,
            spec=0.6, seg=16, rings=10)
        hp, _ = R.head_pt(s * eye_az - s * 3.5, eye_el + 5.5, out=0.005)
        ell('eyehl%d' % s, hp, (0.011, 0.006, 0.014), WHITE, R.head, rot=rot, rough=0.3, seg=8, rings=6)
        if lashes:
            lp, ln = R.head_pt(s * (eye_az + 7), eye_el + 9, out=0.0)
            ell('lash%d' % s, lp, (0.022, 0.012, 0.012), EYE, R.head, rot=(-math.degrees(math.asin(ln.z)), 0,
                                                                          s * (eye_az + 7) + s * 30), seg=10, rings=6)
        if ears:
            ep, _ = R.head_pt(s * 88, 2, out=-0.03)
            ell('ear%d' % s, ep, (0.035, 0.05, 0.062), skin, R.head, seg=12, rings=8)
        if blush:
            bp, bn = R.head_pt(s * 42, -10, out=-0.004)
            ell('blush%d' % s, bp, (0.036, 0.012, 0.02), hexc('#ff9a9a'), R.head,
                rot=(-math.degrees(math.asin(bn.z)), 0, s * 42), seg=12, rings=8)
    if mouth:
        mp, n = R.head_pt(0, -17, out=-0.004)
        ell('mouth', mp, (0.032, 0.012, 0.018), mouth, R.head, rot=(-math.degrees(math.asin(n.z)), 0, 0),
            seg=12, rings=8, rough=0.4)


def shell(name, R, color, keep, out=0.02, parent=None, sq=(1.0, 0.99, 0.98), rough=0.4, seg=48, rings=28,
          center=None, radius=None, spec=0.3):
    """Head-hugging shell (hair, caps): faces whose (az, el) direction fails keep() are removed."""
    hr = (radius or R.hr) + out
    hc = Vector(center) if center is not None else R.hc
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    dead = []
    for f in bm.faces:
        c = f.calc_center_median()
        az = math.degrees(math.atan2(c.x, -c.y))
        el = math.degrees(math.asin(max(-1.0, min(1.0, c.z / max(c.length, 1e-9)))))
        if not keep(az, el):
            dead.append(f)
    bmesh.ops.delete(bm, geom=dead, context='FACES')
    bmesh.ops.scale(bm, vec=Vector((hr * sq[0], hr * sq[1], hr * sq[2])), verts=bm.verts)
    bmesh.ops.translate(bm, vec=hc, verts=bm.verts)
    return _new_obj(name, bm, color, parent or R.head, rough, spec)


def cap_edge(az, front=20.0, back=2.0):
    return back + (front - back) * (1 + math.cos(math.radians(az))) / 2


def baseball_cap(R, p, color, front_color=None, brim_color=None, front=24.0, back=4.0, brim_len=0.062,
                 brim_w=0.15):
    shell('cap', R, color, lambda az, el: el > cap_edge(az, front, back), out=0.03, rough=0.5)
    if front_color:
        shell('capfront', R, front_color,
              lambda az, el: el > cap_edge(az, front, back) + 1 and abs(az) < 48 and el < 64, out=0.036, rough=0.5)
    pt, n = R.head_pt(0, front - 1.5, out=0.02)
    # short brim tilted slightly up, so the eyes stay visible from the oblique camera
    cyl('brim', pt + Vector((0, -brim_len * 0.6, 0.0)), brim_w, 0.026, brim_color or color, R.head,
        rot=(-8, 0, 0), scale=(1.0, brim_len / brim_w, 1.0))


def short_hair_under_cap(R, p, color, front=24.0, back=4.0, side_az=66):
    def keep(az, el):
        a = abs(az)
        if el > cap_edge(az, front, back) + 6 or a < side_az:
            return False
        if a < 105:                 # short sideburn above the ear, tapering toward the face
            return el > 6 - 22 * (a - side_az) / (105 - side_az)
        return el > -12 - 26 * (1 - math.cos(math.radians(az))) / 2
    shell('hair', R, color, keep, out=0.022)


def strap(R, p, x, z0, z1, r, color, n=5, out=-0.002):
    zs = [z0 + (z1 - z0) * i / n for i in range(n + 1)]
    pts = [Vector((x, front_y(p, x, z) + out, z)) for z in zs]
    for i in range(n):
        capsule('strap', pts[i], pts[i + 1], r, color, R.upper, seg=10)


def head_spikes(R, color, specs, parent=None):
    """specs: (az, el, length, radius, droop) cones sticking out of the head surface."""
    for i, (az, el, ln, rad, droop) in enumerate(specs):
        base, n = R.head_pt(az, el, out=-0.02)
        d = (n + Vector((0, 0, droop))).normalized()
        cone_between('spike%d' % i, base, base + d * ln, rad, color, parent or R.head)


# ── characters ───────────────────────────────────────────────────────────────

def char_player():
    p = params()
    R = Rig(p)
    blue = hexc('#2a62d8')
    blue_d = hexc('#1d47a6')
    jeans = hexc('#2b3557')
    red = hexc('#e0262a')
    yellow = hexc('#ffc81e')
    hair = hexc('#231f27')
    top, bot, cz, hz = torso_span(p)
    build_legs(R, p, jeans, red, sole=WHITE)
    build_pelvis(R, p, jeans)
    build_torso(R, p, blue)
    ell('zip', (0, front_y(p, 0, cz) + 0.012, cz), (0.022, 0.02, hz * 0.80), WHITE, R.upper)
    ell('hem', (0, 0, bot + 0.07), (p['torso_r'][0] * 1.04, p['torso_r'][1] * 1.05, 0.045), blue_d, R.upper)
    ell('collar', (0, -0.015, top - 0.04), (0.12, 0.10, 0.04), WHITE, R.upper)
    build_arms(R, p, blue, cuff=WHITE)
    # backpack (yellow) + straps
    ell('pack', (0, p['torso_r'][1] + 0.06, cz + 0.04), (0.15, 0.09, 0.17), yellow, R.upper, rough=0.5)
    ell('packflap', (0, p['torso_r'][1] + 0.11, cz + 0.10), (0.13, 0.06, 0.09), hexc('#f0a810'), R.upper, rough=0.5)
    for s in (1, -1):
        strap(R, p, s * 0.095, top - 0.09, bot + 0.13, 0.02, yellow)
    build_head(R, p)
    short_hair_under_cap(R, p, hair)
    head_spikes(R, hair, [(150, -5, 0.11, 0.06, -0.6), (180, -12, 0.13, 0.065, -0.6), (-150, -5, 0.11, 0.06, -0.6),
                          (112, -12, 0.09, 0.05, -0.5), (-112, -12, 0.09, 0.05, -0.5)])
    baseball_cap(R, p, red, front_color=WHITE)
    return R, dict(walk=True, swing_fb=16, swing_side=24, bob=0.04)


def char_youngster():
    p = params(scale=0.88, torso_r=(0.165, 0.13))
    R = Rig(p)
    cap = hexc('#2f86e8')
    shirt = hexc('#ffd23f')
    shorts = hexc('#3a55c4')
    hair = hexc('#6b3f22')
    top, bot, cz, hz = torso_span(p)
    build_legs(R, p, shorts, hexc('#e8382c'), sole=WHITE, bare_from=p['hip_z'] - 0.10, sock=WHITE)
    build_pelvis(R, p, shorts)
    build_torso(R, p, shirt)
    ell('collar', (0, -0.012, top - 0.04), (0.11, 0.095, 0.035), WHITE, R.upper)
    ell('stripe', (0, 0, cz - 0.02), (p['torso_r'][0] * 1.02, p['torso_r'][1] * 1.03, 0.035), hexc('#f08a1c'), R.upper)
    build_arms(R, p, shirt, sleeve_len=0.35)
    build_head(R, p, mouth=hexc('#b8324a'), blush=True)
    short_hair_under_cap(R, p, hair)
    head_spikes(R, hair, [(165, -8, 0.08, 0.055, -0.6), (-165, -8, 0.08, 0.055, -0.6)])
    baseball_cap(R, p, cap, front_color=WHITE, brim_color=cap)
    return R, dict(pose=dict(arm_out=9))


def char_lass():
    p = params(scale=0.90, torso_r=(0.15, 0.12), shoulder_x=0.172, hip_x=0.07, leg_r=0.062)
    R = Rig(p)
    hair = hexc('#a5532c')
    blouse = WHITE
    skirt = hexc('#e8466e')
    top, bot, cz, hz = torso_span(p)
    build_legs(R, p, None, hexc('#3a2a3a'), bare_from=p['hip_z'] + 0.02, sock=WHITE, shoe_len=0.09)
    build_torso(R, p, blouse)
    ell('bow', (0, front_y(p, 0, top - 0.08) - 0.005, top - 0.08), (0.05, 0.03, 0.03), skirt, R.upper)
    cyl('skirt', (0, 0, p['hip_z'] + 0.02), 0.25, 0.20, skirt, R.hips, r2=0.155, verts=20)
    build_arms(R, p, blouse, sleeve_len=0.35, sleeve_puff=1.1)
    build_head(R, p, blush=True, lashes=True, eye_size=(0.038, 0.062))
    hr = p['head_r']

    def keep(az, el):
        a = abs(az)
        if a < 60 and el < 24 - 0.10 * a:   # face opening with bangs over the forehead
            return False
        return el > -40 or a > 100
    shell('hair', R, hair, keep, out=0.024)
    # long hair down the back
    ell('hairback', R.hc + Vector((0, 0.11, -0.20)), (0.24, 0.13, 0.26), hair, R.head, rough=0.4,
        cut=[(R.hc + Vector((0, -0.02, 0)), (0, -1, 0))])
    for s in (1, -1):
        ell('lock%d' % s, R.hc + Vector((s * 0.215, 0.02, -0.17)), (0.07, 0.08, 0.17), hair, R.head, rough=0.4)
    # red hairband
    torus('band', R.hc + Vector((0, 0.03, 0.03)), hr + 0.026, 0.016, hexc('#e8263c'), R.head, rot=(-62, 0, 0),
          arc=(-180, 0))
    return R, dict(pose=dict(arm_out=6))


def char_hiker():
    p = params(scale=0.92, torso_r=(0.21, 0.17), shoulder_x=0.225, hip_x=0.095, leg_r=0.082, arm_r=0.066,
               hand_r=0.068, skin=hexc('#eab183'))
    R = Rig(p)
    shirt = hexc('#c4782f')
    pants = hexc('#5d6b3a')
    beard = hexc('#5a3220')
    pack = hexc('#3f7f3a')
    top, bot, cz, hz = torso_span(p)
    build_legs(R, p, pants, hexc('#5a3a22'), sole=hexc('#2c2420'), boots=hexc('#6a4428'), shoe_w=0.09)
    build_pelvis(R, p, pants)
    build_torso(R, p, shirt, belly=1.12)
    build_arms(R, p, shirt, sleeve_len=0.6)
    for s in (1, -1):
        strap(R, p, s * 0.11, top - 0.08, bot + 0.16, 0.024, hexc('#3a3026'))
    # BIG backpack with a rolled sleeping bag on top
    ell('pack', (0, p['torso_r'][1] + 0.10, cz + 0.08), (0.21, 0.13, 0.27), pack, R.upper, rough=0.6)
    ell('pocket', (0, p['torso_r'][1] + 0.21, cz - 0.02), (0.13, 0.06, 0.10), hexc('#346a30'), R.upper, rough=0.6)
    cyl('roll', (0, p['torso_r'][1] + 0.09, cz + 0.36), 0.08, 0.36, hexc('#d84a32'), R.upper, rot=(0, 90, 0))
    build_head(R, p, eye_size=(0.032, 0.05), eye_el=6.0)
    # bushy beard around the jaw, moustache, sideburns
    shell('beard', R, beard, lambda az, el: abs(az) < 100 and el < -14 + 8 * (abs(az) / 100.0) and el > -75,
          out=0.028, rough=0.7)
    for s in (1, -1):
        mp, mn = R.head_pt(s * 13, -9, out=0.012)
        ell('stache%d' % s, mp, (0.06, 0.03, 0.03), beard, R.head,
            rot=(-math.degrees(math.asin(mn.z)), 0, s * 13 + s * 14), rough=0.7)
    ell('nose', R.head_pt(0, -3, -0.01)[0], (0.04, 0.035, 0.032), p['skin'], R.head)
    # dark-green beanie with a rolled brim (high enough to show the eyes)
    shell('hat', R, hexc('#2f5a46'), lambda az, el: el > cap_edge(az, 34, 16), out=0.03, rough=0.7)
    torus('hatroll', R.hc + Vector((0, 0.035, R.hr * 0.42)), R.hr * 0.93, 0.036,
          hexc('#3c7058'), R.head, rot=(-14, 0, 0))
    return R, dict(pose=dict(arm_out=10))


def char_bugcatcher():
    p = params(scale=0.88, torso_r=(0.165, 0.13))
    R = Rig(p)
    shirt = hexc('#5cb84a')
    shorts = hexc('#c8a060')
    hair = hexc('#3a2a1e')
    straw = hexc('#f2d27a')
    top, bot, cz, hz = torso_span(p)
    build_legs(R, p, shorts, hexc('#3d6bd0'), sole=WHITE, bare_from=p['hip_z'] - 0.10, sock=WHITE)
    build_pelvis(R, p, shorts)
    build_torso(R, p, shirt)
    ell('collar', (0, -0.012, top - 0.04), (0.11, 0.095, 0.035), WHITE, R.upper)
    build_arms(R, p, shirt, sleeve_len=0.35)
    build_head(R, p, mouth=hexc('#b8324a'))
    short_hair_under_cap(R, p, hair, front=18, back=8)
    # straw hat, pushed back a little so the face shows
    hat = pivot('hatpiv', tuple(R.hc), R.head)
    hat.rotation_euler = (math.radians(-14), 0, 0)
    hz0 = R.hc.z + 0.11
    cyl('hatbrim', (0, 0.0, hz0), 0.36, 0.026, straw, hat, verts=32, rough=0.7)
    cyl('hatcrown', (0, 0.01, hz0 + 0.08), 0.235, 0.17, straw, hat, r2=0.20, verts=28, rough=0.7)
    cyl('hatband', (0, 0.01, hz0 + 0.04), 0.237, 0.05, hexc('#d8322c'), hat, r2=0.229, verts=28)
    # bug net in the right hand (moves with the arm)
    sx = -p['shoulder_x'] * 1.06
    hand_z = p['shoulder_z'] - p['arm_len'] - 0.04
    pole_a = Vector((sx + 0.02, -0.04, hand_z - 0.10))
    pole_b = Vector((sx - 0.13, 0.20, hand_z + 0.52))
    capsule('pole', pole_a, pole_b, 0.017, hexc('#9a6a3a'), R.arm_R, seg=10)
    ring_c = pole_b + (pole_b - pole_a).normalized() * 0.12
    torus('hoop', ring_c, 0.12, 0.014, hexc('#9a6a3a'), R.arm_R, rot=(90, 0, -14))
    ell('mesh', ring_c + Vector((0.0, 0.08, -0.03)), (0.11, 0.14, 0.11), hexc('#eaf4f0'), R.arm_R, rough=0.8,
        cut=[(ring_c, (0, -1, 0))])
    return R, dict(pose=dict(arm_out=8))


def char_swimmer():
    p = params(scale=0.92, torso_r=(0.15, 0.12), shoulder_x=0.172, hip_x=0.07, leg_r=0.064)
    R = Rig(p)
    suit = hexc('#ff7a2a')
    suit2 = hexc('#2a7fe0')
    capc = hexc('#ff7a2a')
    top, bot, cz, hz = torso_span(p)
    build_legs(R, p, None, p.get('skin', SKIN), sole=hexc('#2aa0e0'), bare_from=p['hip_z'] + 0.02, shoe_len=0.09)
    build_pelvis(R, p, suit)
    build_torso(R, p, suit)
    ell('suitstripe', (0, 0, cz + 0.0), (p['torso_r'][0] * 1.025, p['torso_r'][1] * 1.035, 0.07), suit2, R.upper)
    # bare shoulders: skin cap at the top of the torso
    ell('shoulders', (0, 0.0, top - 0.06), (p['torso_r'][0] * 0.97, p['torso_r'][1] * 0.95, 0.10), SKIN, R.upper,
        cut=[((0, 0, top - 0.10), (0, 0, -1))])
    build_arms(R, p, suit, sleeve_len=0.0)
    build_head(R, p, blush=True, lashes=True, eye_size=(0.038, 0.06))
    # swim cap
    shell('scap', R, capc, lambda az, el: el > cap_edge(az, 22, -10), out=0.026, rough=0.35)
    ell('capstripe', R.hc, (R.hr + 0.03, R.hr + 0.03, R.hr + 0.03), WHITE, R.head, seg=32, rings=18,
        cut=[(R.hc + Vector((0.035, 0, 0)), (1, 0, 0)), (R.hc + Vector((-0.035, 0, 0)), (-1, 0, 0)),
             (R.hc + Vector((0, 0, 0.05)), (0, 0, -1))])
    # goggles pushed up on the forehead + strap
    for s in (1, -1):
        gp, gn = R.head_pt(s * 22, 31, out=0.03)
        ell('goggle%d' % s, gp, (0.055, 0.03, 0.045), hexc('#4fd0ff'), R.head,
            rot=(-math.degrees(math.asin(gn.z)), 0, s * 22), rough=0.1, spec=0.8)
        ell('gogrim%d' % s, gp - gn * 0.008, (0.064, 0.03, 0.054), hexc('#20304a'), R.head,
            rot=(-math.degrees(math.asin(gn.z)), 0, s * 22), rough=0.4)
    torus('gstrap', R.hc + Vector((0, 0.02, 0.10)), R.hr + 0.02, 0.012, hexc('#20304a'), R.head, rot=(-24, 0, 0))
    return R, dict(pose=dict(arm_out=6))


def char_nurse():
    p = params(scale=0.95, torso_r=(0.155, 0.125), shoulder_x=0.178, hip_x=0.07, leg_r=0.062)
    R = Rig(p)
    hair = hexc('#ff88b8')
    dress = hexc('#ffc0d8')
    top, bot, cz, hz = torso_span(p)
    build_legs(R, p, None, WHITE, bare_from=p['hip_z'] + 0.02, shoe_len=0.09)
    build_torso(R, p, dress)
    cyl('skirt', (0, 0, p['hip_z'] - 0.01), 0.24, 0.26, dress, R.hips, r2=0.16, verts=24)
    # white apron (front of torso + front of skirt)
    ell('apron', (0, front_y(p, 0, cz - 0.06) + 0.022, cz - 0.06), (0.085, 0.03, 0.13), WHITE, R.upper)
    cyl('apronskirt', (0, -0.035, p['hip_z'] - 0.02), 0.225, 0.24, WHITE, R.hips, r2=0.15, verts=24,
        scale=(0.75, 1.0, 1.0))
    ell('collar', (0, -0.012, top - 0.04), (0.11, 0.095, 0.035), WHITE, R.upper)
    build_arms(R, p, dress, sleeve_len=0.35, sleeve_puff=1.15)
    build_head(R, p, eye_color=hexc('#3a5fb8'), lashes=True, blush=True, eye_size=(0.038, 0.062))

    def keep(az, el):
        a = abs(az)
        if a < 62 and el < 26 - 0.08 * a:
            return False
        return el > -30 or a > 110
    shell('hair', R, hair, keep, out=0.024)
    # Nurse Joy's two big hair loops hanging at the sides
    for s in (1, -1):
        torus('loop%d' % s, R.hc + Vector((s * 0.265, 0.03, -0.20)), 0.08, 0.042, hair, R.head, rot=(90, 0, 0))
    # white nurse cap with a red cross
    shell('ncap', R, WHITE, lambda az, el: el > 34 + 6 * (1 - math.cos(math.radians(az))),
          out=0.05, rough=0.45)
    cp, cn = R.head_pt(0, 45, out=0.06)
    rot = (-math.degrees(math.asin(cn.z)), 0, 0)
    boxm('cross1', cp, (0.075, 0.012, 0.024), hexc('#e8263c'), R.head, rot=rot)
    boxm('cross2', cp, (0.024, 0.012, 0.075), hexc('#e8263c'), R.head, rot=rot)
    return R, dict(pose=dict(arm_out=5))


def char_clerk():
    p = params(scale=0.97, torso_r=(0.175, 0.14))
    R = Rig(p)
    blue = hexc('#3a78e0')
    stripe = hexc('#e8f2ff')
    pants = hexc('#2e3442')
    hair = hexc('#6b4226')
    top, bot, cz, hz = torso_span(p)
    build_legs(R, p, pants, BLACK, sole=hexc('#555060'))
    build_pelvis(R, p, pants)
    build_torso(R, p, blue)
    for i, z in enumerate((cz - 0.10, cz + 0.06)):
        ell('stripe%d' % i, (0, 0, z), (p['torso_r'][0] * 1.02, p['torso_r'][1] * 1.03, 0.03), stripe, R.upper)
    ell('collar', (0, -0.015, top - 0.04), (0.12, 0.10, 0.04), WHITE, R.upper)
    ell('tag', (0.08, front_y(p, 0.08, cz + 0.13) + 0.004, cz + 0.13), (0.035, 0.012, 0.022), WHITE, R.upper,
        rot=(0, 0, 25))
    build_arms(R, p, blue, sleeve_len=0.45)
    build_head(R, p, mouth=hexc('#b8324a'))
    short_hair_under_cap(R, p, hair)
    baseball_cap(R, p, blue, front_color=stripe, brim_color=blue)
    return R, dict(pose=dict(arm_out=6))


def char_sylvia():
    p = params(scale=0.97, torso_r=(0.15, 0.12), shoulder_x=0.172, hip_x=0.07, leg_r=0.062, head_r=0.245)
    R = Rig(p)
    green = hexc('#3fae4e')
    green_d = hexc('#2a8a3c')
    hair = hexc('#8a5a2e')
    top, bot, cz, hz = torso_span(p)
    build_legs(R, p, None, green_d, bare_from=p['hip_z'] + 0.02, shoe_len=0.09, boots=green_d)
    build_torso(R, p, green)
    # leafy skirt: layered cones
    cyl('skirt', (0, 0, p['hip_z'] - 0.03), 0.26, 0.28, green, R.hips, r2=0.155, verts=10)
    cyl('skirt2', (0, 0, p['hip_z'] + 0.05), 0.21, 0.14, hexc('#7bd36a'), R.hips, r2=0.155, verts=10)
    ell('belt', (0, 0, p['hip_z'] + 0.10), (0.158, 0.128, 0.03), hexc('#f2d27a'), R.upper)
    ell('collar', (0, -0.01, top - 0.04), (0.12, 0.10, 0.04), hexc('#7bd36a'), R.upper)
    build_arms(R, p, green, sleeve_len=0.3, sleeve_puff=1.1)
    build_head(R, p, eye_color=hexc('#2a6a3a'), lashes=True, blush=True, eye_size=(0.038, 0.06))

    def keep(az, el):
        a = abs(az)
        if a < 60 and el < 22 - 0.08 * a:
            return False
        return el > -40 or a > 100
    shell('hair', R, hair, keep, out=0.024)
    ell('hairback', R.hc + Vector((0, 0.11, -0.26)), (0.25, 0.13, 0.32), hair, R.head, rough=0.4,
        cut=[(R.hc + Vector((0, -0.02, 0)), (0, -1, 0))])
    for s in (1, -1):
        ell('lock%d' % s, R.hc + Vector((s * 0.215, 0.0, -0.20)), (0.07, 0.08, 0.20), hair, R.head, rough=0.4)
    # big pink flower over the left ear
    fc, fn = R.head_pt(62, 30, out=0.05)
    for i in range(5):
        a = 2 * math.pi * i / 5
        off = Vector((math.cos(a), 0, math.sin(a))) * 0.055
        q = Vector((0, -1, 0)).rotation_difference(fn)
        ell('petal%d' % i, fc + q @ off, (0.045, 0.025, 0.045), hexc('#ff6fa8'), R.head, rough=0.45)
    ell('fcentre', fc + fn * 0.012, (0.03, 0.03, 0.03), hexc('#ffd83a'), R.head)
    return R, dict(idle=True, dirs=[('down', 0.0)], pose=dict(arm_out=8), pose2=dict(arm_out=12))


def char_granite():
    p = params(scale=0.95, torso_r=(0.215, 0.165), shoulder_x=0.235, hip_x=0.10, leg_r=0.088, arm_r=0.072,
               hand_r=0.072, head_r=0.245, skin=hexc('#d99a62'))
    R = Rig(p)
    brown = hexc('#8a5530')
    brown_d = hexc('#5c3a22')
    yellow = hexc('#f5c21a')
    top, bot, cz, hz = torso_span(p)
    build_legs(R, p, brown_d, hexc('#3a2a20'), sole=hexc('#1e1814'), boots=hexc('#4a3424'), shoe_w=0.095)
    build_pelvis(R, p, brown_d)
    build_torso(R, p, brown, belly=1.05)
    ell('vneck', (0, front_y(p, 0, top - 0.07) + 0.01, top - 0.07), (0.07, 0.03, 0.08), hexc('#e8e0cc'), R.upper)
    for s in (1, -1):
        ell('pocket%d' % s, (s * 0.10, front_y(p, s * 0.10, cz + 0.02) + 0.01, cz + 0.02), (0.055, 0.016, 0.045),
            hexc('#9c6438'), R.upper)
    ell('belt', (0, 0, p['hip_z'] + 0.08), (0.222, 0.172, 0.032), hexc('#2a2420'), R.upper)
    ell('buckle', (0, front_y(p, 0, p['hip_z'] + 0.08) - 0.03, p['hip_z'] + 0.08), (0.035, 0.012, 0.025),
        yellow, R.upper)
    build_arms(R, p, brown, sleeve_len=0.55, glove=hexc('#e8e0cc'))
    build_head(R, p, eye_size=(0.032, 0.048))
    # grey moustache + chin beard
    for s in (1, -1):
        mp, mn = R.head_pt(s * 14, -12, out=0.005)
        ell('stache%d' % s, mp, (0.06, 0.025, 0.026), hexc('#8a8a90'), R.head,
            rot=(-math.degrees(math.asin(mn.z)), 0, s * 14 + s * 10), rough=0.7)
    shell('sideburns', R, hexc('#8a8a90'), lambda az, el: 60 < abs(az) < 120 and -30 < el < 18, out=0.012, rough=0.7)
    # yellow hard hat with a full brim and a ridge
    hat = pivot('hatpiv', tuple(R.hc), R.head)
    hat.rotation_euler = (math.radians(-28), 0, 0)
    hat.location = hat.location + Vector((0, 0, 0.035))
    shell('hardhat', R, yellow, lambda az, el: el > 18, out=0.03, rough=0.3, spec=0.5, parent=hat)
    cyl('hhbrim', R.hc + Vector((0, -0.012, (R.hr + 0.03) * math.sin(math.radians(18)))), R.hr + 0.04, 0.022,
        yellow, hat, scale=(1.0, 1.08, 1.0), rough=0.3)
    torus('hhridge', R.hc, R.hr + 0.035, 0.02, yellow, hat, rot=(0, 90, 0), arc=(28, 152))
    return R, dict(idle=True, dirs=[('down', 0.0)], pose=dict(arm_out=12), pose2=dict(arm_out=15))


def char_marina():
    p = params(scale=0.96, torso_r=(0.15, 0.12), shoulder_x=0.172, hip_x=0.07, leg_r=0.062, head_r=0.245)
    R = Rig(p)
    navy = hexc('#1f4fa8')
    hair = hexc('#3cb4f0')
    top, bot, cz, hz = torso_span(p)
    build_legs(R, p, None, WHITE, sole=navy, bare_from=p['hip_z'] + 0.02, shoe_len=0.09, boots=WHITE)
    build_torso(R, p, WHITE)
    cyl('skirt', (0, 0, p['hip_z'] + 0.0), 0.245, 0.22, navy, R.hips, r2=0.155, verts=14)
    # sailor collar (navy, square on the back), red neckerchief
    ell('scollar', (0, 0.02, top - 0.06), (0.165, 0.14, 0.07), navy, R.upper,
        cut=[((0, 0, top - 0.09), (0, 0, -1))])
    ell('collarback', (0, p['torso_r'][1] - 0.015, top - 0.12), (0.12, 0.03, 0.09), navy, R.upper)
    ell('kerchief', (0, front_y(p, 0, top - 0.10) - 0.01, top - 0.10), (0.06, 0.03, 0.035), hexc('#e8263c'), R.upper)
    ell('kerchief2', (0, front_y(p, 0, top - 0.17) - 0.004, top - 0.17), (0.03, 0.02, 0.05), hexc('#e8263c'),
        R.upper)
    build_arms(R, p, WHITE, sleeve_len=0.35, cuff=None, sleeve_puff=1.1)
    build_head(R, p, eye_color=hexc('#1f4fa8'), lashes=True, blush=True, eye_size=(0.038, 0.06))

    def keep(az, el):
        a = abs(az)
        if a < 60 and el < 22 - 0.08 * a:
            return False
        return el > -38 or a > 100
    shell('hair', R, hair, keep, out=0.024)
    ell('hairback', R.hc + Vector((0, 0.10, -0.12)), (0.23, 0.12, 0.20), hair, R.head, rough=0.4,
        cut=[(R.hc + Vector((0, -0.02, 0)), (0, -1, 0))])
    # two long pigtails
    for s in (1, -1):
        ell('tie%d' % s, R.hc + Vector((s * 0.24, 0.07, -0.06)), (0.04, 0.04, 0.04), hexc('#e8263c'), R.head)
        ell('tail%d' % s, R.hc + Vector((s * 0.29, 0.09, -0.26)), (0.075, 0.075, 0.20), hair, R.head, rough=0.4,
            rot=(0, s * -12, 0))
    # little white sailor cap
    hat = pivot('hatpiv', tuple(R.hc), R.head)
    hat.rotation_euler = (math.radians(-12), math.radians(-10), 0)
    hz0 = R.hc.z + R.hr * 0.72
    cyl('sailorcap', (0, 0.02, hz0), 0.165, 0.10, WHITE, hat, r2=0.185, verts=28)
    cyl('sailorband', (0, 0.02, hz0 - 0.03), 0.168, 0.04, navy, hat, r2=0.172, verts=28)
    return R, dict(idle=True, dirs=[('down', 0.0)], pose=dict(arm_out=8), pose2=dict(arm_out=12))


def char_voltex():
    p = params(scale=0.95, torso_r=(0.18, 0.14), shoulder_x=0.20, head_r=0.245)
    R = Rig(p)
    yellow = hexc('#ffd21e')
    black = BLACK
    hair = hexc('#34407e')
    top, bot, cz, hz = torso_span(p)
    build_legs(R, p, black, hexc('#ffd21e'), sole=black)
    build_pelvis(R, p, black)
    build_torso(R, p, yellow)
    ell('zipv', (0, front_y(p, 0, cz) + 0.012, cz), (0.022, 0.02, hz * 0.80), black, R.upper)
    ell('hemv', (0, 0, bot + 0.07), (p['torso_r'][0] * 1.04, p['torso_r'][1] * 1.05, 0.045), black, R.upper)
    ell('collarv', (0, -0.012, top - 0.035), (0.13, 0.11, 0.05), black, R.upper)
    # lightning bolt on the chest (two slanted bars)
    fy = front_y(p, 0.06, cz + 0.05)
    boxm('bolt1', (0.065, fy - 0.004, cz + 0.08), (0.025, 0.012, 0.09), black, R.upper, rot=(0, -30, 0))
    boxm('bolt2', (0.055, fy - 0.004, cz + 0.0), (0.025, 0.012, 0.09), black, R.upper, rot=(0, -30, 0))
    build_arms(R, p, yellow, cuff=black)
    build_head(R, p, eye_size=(0.034, 0.054), mouth=hexc('#b8324a'))

    def keep(az, el):
        a = abs(az)
        if a < 64 and el < 26 - 0.10 * a:
            return False
        return el > -28 or a > 110
    shell('hair', R, hair, keep, out=0.024)
    head_spikes(R, hair, [(0, 40, 0.17, 0.09, 0.9), (55, 36, 0.15, 0.085, 0.6), (-55, 36, 0.15, 0.085, 0.6),
                          (115, 30, 0.15, 0.085, 0.4), (-115, 30, 0.15, 0.085, 0.4), (180, 28, 0.15, 0.085, 0.3),
                          (18, 20, 0.09, 0.05, -0.3), (-22, 20, 0.09, 0.05, -0.3)])
    # headphones: band over the top + big ear cups
    torus('hpband', R.hc, R.hr + 0.075, 0.022, black, R.head, rot=(0, 90, 0), arc=(0, 180))
    for s in (1, -1):
        cyl('hpcup%d' % s, R.hc + Vector((s * (R.hr + 0.03), 0, 0)), 0.095, 0.08, black, R.head, rot=(0, 90, 0))
        cyl('hpcap%d' % s, R.hc + Vector((s * (R.hr + 0.075), 0, 0)), 0.06, 0.02, yellow, R.head, rot=(0, 90, 0))
    return R, dict(idle=True, dirs=[('down', 0.0)], pose=dict(arm_out=9), pose2=dict(arm_out=13))


CHARS = [
    ('player', char_player),
    ('npc_youngster', char_youngster),
    ('npc_lass', char_lass),
    ('npc_hiker', char_hiker),
    ('npc_bugcatcher', char_bugcatcher),
    ('npc_swimmer', char_swimmer),
    ('npc_nurse', char_nurse),
    ('npc_clerk', char_clerk),
    ('leader_sylvia', char_sylvia),
    ('leader_granite', char_granite),
    ('leader_marina', char_marina),
    ('leader_voltex', char_voltex),
]

# layout per key (must match what the builders return; used to describe skipped keys too)
LAYOUT = {k: ('walk' if k == 'player' else 'idle' if k.startswith('leader_') else 'npc') for k, _ in CHARS}


# ── rendering ────────────────────────────────────────────────────────────────

def frame_list(key):
    """[(dir name, angle, frame name)] in row-major order for this key's layout."""
    kind = LAYOUT[key]
    if kind == 'walk':
        return [(d, a, f) for d, a in DIRS for f in ('stepL', 'stand', 'stepR')]
    if kind == 'idle':
        return [('down', 0.0, 'idle0'), ('down', 0.0, 'idle1')]
    return [(d, a, 'stand') for d, a in DIRS]


def frame_path(key, d, f):
    return os.path.join(WORK, key, '%s_%s.png' % (d, f))


def render_char(key, builder):
    C.clear_objects(keep_lights=True, keep_camera=True)
    R, opts = builder()
    for d, ang, f in frame_list(key):
        # Facing left the character's own left side is toward the camera (+yaw), facing right -yaw.
        yaw = {'left': HEAD_YAW, 'right': -HEAD_YAW}.get(d, 0.0)
        if f in ('stepL', 'stepR'):
            side = d in ('left', 'right')
            sw = opts['swing_side'] if side else opts['swing_fb']
            sw = sw if f == 'stepL' else -sw
            R.pose(direction=ang, swing=sw, arm_swing=sw * 1.15, bob=opts.get('bob', 0.05), head_yaw=yaw)
        elif f == 'idle1':
            R.pose(direction=ang, bob=opts.get('bob', 0.04), head_yaw=yaw,
                   **opts.get('pose2', opts.get('pose', {})))
        else:
            R.pose(direction=ang, head_yaw=yaw, **opts.get('pose', {}))
        C.render(frame_path(key, d, f))


def describe(key, anchor):
    kind = LAYOUT[key]
    frames = [frame_path(key, d, f) for d, a, f in frame_list(key)]
    out = {'key': key, 'kind': 'sheet', 'frames': frames, 'anchor': anchor}
    if kind == 'walk':
        out['cols'] = 3
        out['meta'] = {'rows': ['down', 'left', 'right', 'up'], 'cols': ['stepL', 'stand', 'stepR']}
    elif kind == 'idle':
        out['cols'] = 2
        out['meta'] = {'rows': ['down'], 'cols': ['idle0', 'idle1']}
    else:
        out['cols'] = 1
        out['meta'] = {'rows': ['down', 'left', 'right', 'up']}
    return out


def main():
    C.reset_scene()
    C.setup_render(FW, FH, samples=SAMPLES, outline=True)
    C.add_lights()
    # One fixed camera for every frame of every character: feet always land on FOOT_PX.
    C.fixed_oblique_frame(FW, FH, foot_center=FOOT, foot_px=FOOT_PX)
    anchor = [round(v, 2) for v in C.to_pixel(FOOT)]
    outputs = []
    for key, builder in CHARS:
        if not ONLY or key in ONLY:
            print('[chars] rendering', key)
            render_char(key, builder)
        out = describe(key, anchor)
        if all(os.path.isfile(f) for f in out['frames']):
            outputs.append(out)
        else:
            print('[chars] WARNING: frames missing for', key)
    C.write_spec(GROUP, outputs)


main()
