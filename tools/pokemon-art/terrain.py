"""Terrain group: seamless top-down 64x64 ground tiles (ART_SPEC.md section 1).

Seamless technique: every detail object is placed inside the 1x1 tile and also copied at
+-1 tile offsets when it is near an edge; heightfields use integer-frequency periodic
functions, so anything leaving one edge re-enters at the opposite edge.
"""
import math
import os
import random
import sys

sys.path.insert(0, '/home/user/CLASS-APP/tools/pokemon-art')
import bpy  # noqa: E402
import common as C  # noqa: E402

GROUP = 'terrain'
OUT = C.work_dir(GROUP)
SAMPLES = 32
TAU = 2 * math.pi
P = C.PALETTE


def lerp(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def shade(c, k):
    return tuple(min(1.0, v * k) for v in c)


def new_scene(transparent=False):
    C.reset_scene()
    C._mat_cache.clear()
    C.setup_render(64, 64, samples=SAMPLES, outline=False, transparent=transparent)
    C.add_lights()
    C.camera_top(64, 64, (0.5, 0.5))


def frame_path(key, i):
    return os.path.join(OUT, f'{key}_{i}.png')


# ── helpers ────────────────────────────────────────────────────────────────

def attr_mat(name, rough=0.6, spec=0.25, coat=0.0):
    """Material whose base colour comes from the per-vertex 'Col' attribute."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes.get('Principled BSDF')
    a = nt.nodes.new('ShaderNodeAttribute')
    a.attribute_name = 'Col'
    nt.links.new(a.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = rough
    for key in ('Specular IOR Level', 'Specular'):
        if key in p.inputs:
            p.inputs[key].default_value = spec
            break
    if coat > 0 and 'Coat Weight' in p.inputs:
        p.inputs['Coat Weight'].default_value = coat
    return m


def heightfield(name, hfun, cfun, material, n=64, lo=-0.25, hi=1.25):
    """Grid mesh z=hfun(x,y), vertex colour cfun(x,y,z). Functions must be 1-periodic."""
    steps = int(round(n * (hi - lo)))
    verts, cols, faces = [], [], []
    for j in range(steps + 1):
        y = lo + (hi - lo) * j / steps
        for i in range(steps + 1):
            x = lo + (hi - lo) * i / steps
            z = hfun(x, y)
            verts.append((x, y, z))
            cols.append(cfun(x, y, z))
    w = steps + 1
    for j in range(steps):
        for i in range(steps):
            a = j * w + i
            faces.append((a, a + 1, a + w + 1, a + w))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for k, c in enumerate(cols):
        ca.data[k].color = (*C.srgb_to_linear(c), 1.0)
    for poly in me.polygons:
        poly.use_smooth = True
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(material)
    return o


def wrap(obj, x, y, reach):
    """Place obj at (x,y) inside the tile plus linked copies at +-1 tile when near an edge."""
    z = obj.location.z
    obj.location = (x, y, z)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            if dx == 0 and dy == 0:
                continue
            nx, ny = x + dx, y + dy
            if -reach < nx < 1 + reach and -reach < ny < 1 + reach:
                c = obj.copy()
                c.location = (nx, ny, z)
                bpy.context.scene.collection.objects.link(c)


def noise(x, y, rng_terms):
    """Smooth 1-periodic noise: sum of sines with integer frequencies."""
    s = 0.0
    for (fx, fy, ph, amp) in rng_terms:
        s += amp * math.sin(TAU * (fx * x + fy * y) + ph)
    return s


def make_terms(rng, count, fmax=3, amp=1.0):
    terms = []
    for _ in range(count):
        fx = rng.randint(-fmax, fmax)
        fy = rng.randint(-fmax, fmax)
        if fx == 0 and fy == 0:
            fx = 1
        terms.append((fx, fy, rng.uniform(0, TAU), amp / math.hypot(fx, fy)))
    tot = sum(t[3] for t in terms)
    return [(a, b, c, d / tot) for (a, b, c, d) in terms]


# ── grass ─────────────────────────────────────────────────────────────────

GRASS_SHADES = [P['grass'], P['grass_light'], lerp(P['grass'], P['grass_light'], 0.5),
                lerp(P['grass'], P['grass_dark'], 0.5)]


def blade(name, rng, length, width, color_mat, tilt, azim, z0=0.0):
    o = C.cone(name, width, 0.0, length, (0, 0, z0 + length / 2), color_mat, vertices=5, smooth=False,
               scale=(1, 0.45, 1))
    # pivot at base: shift mesh so origin is at its base
    me = o.data
    for v in me.vertices:
        v.co.z += length / 2
    o.location.z = z0
    o.rotation_euler = (tilt, 0, azim)
    return o


def build_grass(seed):
    rng = random.Random(seed)
    terms = make_terms(rng, 6, 3)
    base_light = lerp(P['grass'], P['grass_light'], 0.25)

    def col(x, y, z):
        t = noise(x, y, terms)
        return lerp(P['grass'], base_light, 0.5 + 0.9 * t) if t > -0.5 else P['grass']
    heightfield('ground', lambda x, y: 0.0, col, attr_mat('g_ground', rough=0.9), n=16)
    mats = [C.mat(f'gb{i}', c, rough=0.75) for i, c in enumerate(GRASS_SHADES)]
    for k in range(70):
        # little tufts of 3 blades
        x, y = rng.random(), rng.random()
        m = mats[rng.choices(range(4), weights=[4, 2, 3, 2])[0]]
        az0 = rng.uniform(0, TAU)
        for b in range(3):
            o = blade(f'b{k}_{b}', rng, rng.uniform(0.07, 0.11), 0.018, m,
                      math.radians(rng.uniform(35, 60)), az0 + b * 2.1 + rng.uniform(-0.3, 0.3))
            wrap(o, x + rng.uniform(-0.01, 0.01), y + rng.uniform(-0.01, 0.01), 0.15)
    # a couple of tiny clover-ish light dots for variety
    dm = C.mat('dots', lerp(P['grass_light'], (1, 1, 0.8), 0.25), rough=0.7)
    for k in range(rng.randint(2, 4)):
        o = C.sphere(f'd{k}', 0.022, (0, 0, 0.004), dm, scale=(1, 1, 0.35), segments=10, rings=6)
        wrap(o, rng.random(), rng.random(), 0.05)


def build_tall_grass(sway):
    rng = random.Random(77)
    lean = math.radians(14) * sway
    mats = [C.mat('tg0', shade(P['grass_dark'], 1.0), rough=0.7),
            C.mat('tg1', P['leaf'], rough=0.7),
            C.mat('tg2', lerp(P['grass'], P['grass_light'], 0.4), rough=0.7)]
    # clump centres: denser toward the bottom (south) of the tile
    centres = []
    for k in range(26):
        y = rng.random() ** 1.6       # skew to small y (south = image bottom)
        centres.append((rng.random(), y))
    for (cx, cy) in [(0.17, 0.2), (0.5, 0.18), (0.83, 0.2), (0.33, 0.55), (0.67, 0.55), (0.0, 0.55),
                     (0.17, 0.85), (0.5, 0.85), (0.83, 0.85)]:
        centres.append((cx, cy))
    for k, (cx, cy) in enumerate(centres):
        nb = 9
        for b in range(nb):
            ang = TAU * b / nb + rng.uniform(-0.2, 0.2)
            m = mats[0] if b % 3 == 0 else (mats[1] if b % 3 == 1 else mats[2])
            length = rng.uniform(0.22, 0.32)
            o = blade(f't{k}_{b}', rng, length, 0.045, m, math.radians(rng.uniform(30, 55)), ang)
            # sway: tilt everything toward +-x a bit
            o.rotation_euler = (o.rotation_euler[0], lean, ang)
            wrap(o, cx + rng.uniform(-0.03, 0.03), cy + rng.uniform(-0.03, 0.03), 0.35)


# ── path / sand / rock ──────────────────────────────────────────────────────

def pebbles(rng, count, colors, rmin, rmax, flat=0.45, reach=0.1, prefix='p'):
    ms = [C.mat(f'{prefix}m{i}', c, rough=0.8) for i, c in enumerate(colors)]
    for k in range(count):
        r = rng.uniform(rmin, rmax)
        o = C.sphere(f'{prefix}{k}', r, (0, 0, 0), ms[rng.randrange(len(ms))],
                     scale=(rng.uniform(0.8, 1.3), rng.uniform(0.7, 1.1), flat), segments=12, rings=8,
                     rot=(0, 0, rng.uniform(0, TAU)))
        wrap(o, rng.random(), rng.random(), reach)


def build_path(seed):
    rng = random.Random(seed)
    terms = make_terms(rng, 7, 3)
    fine = make_terms(rng, 6, 7)
    light = lerp(P['path'], (1, 0.95, 0.8), 0.25)

    def col(x, y, z):
        t = noise(x, y, terms) + 0.4 * noise(x, y, fine)
        if t < -0.25:
            return lerp(P['path'], P['path_dark'], min(0.55, (-t - 0.25) * 1.2))
        return lerp(P['path'], light, max(0, t) * 0.8)
    heightfield('ground', lambda x, y: 0.012 * noise(x, y, terms) + 0.004 * noise(x, y, fine), col,
                attr_mat('pa', rough=0.95, spec=0.1), n=32)
    pebbles(rng, rng.randint(6, 10), [P['path_dark'], lerp(P['path_dark'], P['rock'], 0.5),
                                      lerp(P['path'], (1, 1, 1), 0.3)], 0.012, 0.03, prefix='pb')


def build_sand(seed):
    rng = random.Random(seed)
    terms = make_terms(rng, 5, 2)
    fy = 4 + seed % 2
    fx = 1 if seed % 2 == 0 else -1
    light = lerp(P['sand'], (1, 1, 0.95), 0.4)
    dark = lerp(P['sand'], P['path'], 0.45)

    def h(x, y):
        return 0.012 * math.sin(TAU * (fy * y + fx * x) + 1.2 * math.sin(TAU * x + seed)) + 0.008 * noise(x, y, terms)

    def col(x, y, z):
        t = noise(x, y, terms)
        return lerp(lerp(P['sand'], light, max(0, t)), dark, max(0, -t - 0.3) * 0.6)
    heightfield('ground', h, col, attr_mat('sa', rough=0.9, spec=0.15), n=48)
    if seed % 2 == 1:
        pebbles(rng, 2, [(1.0, 0.86, 0.80), (0.96, 0.94, 0.9)], 0.02, 0.028, flat=0.35, prefix='sh')
    else:
        pebbles(rng, 3, [dark], 0.008, 0.014, prefix='sg')


def build_rock(seed):
    rng = random.Random(seed)
    terms = make_terms(rng, 7, 3)
    lightr = lerp(P['rock'], (1, 1, 1), 0.2)

    def col(x, y, z):
        t = noise(x, y, terms)
        return lerp(lerp(P['rock'], lightr, max(0, t)), lerp(P['rock'], P['path_dark'], 0.4), max(0, -t) * 0.7)
    heightfield('ground', lambda x, y: 0.01 * noise(x, y, terms), col, attr_mat('ra', rough=0.95, spec=0.1), n=32)
    pebbles(rng, 45, [P['rock'], P['rock_dark'], lightr, lerp(P['rock'], P['path'], 0.4)], 0.015, 0.035,
            flat=0.55, prefix='g')
    pebbles(rng, rng.randint(2, 3), [lerp(P['rock'], (1, 1, 1), 0.1), P['rock']], 0.06, 0.09,
            flat=0.4, reach=0.15, prefix='s')


# ── water ─────────────────────────────────────────────────────────────────

def build_water(k):
    ph = TAU * k / 8
    rng = random.Random(5)
    waves = [(0, 2, 0.0, 1.0, 1), (1, 1, 1.3, 0.45, -1), (-1, 1, 2.1, 0.45, 1), (2, 3, 0.6, 0.2, 2),
             (-3, 2, 4.0, 0.15, -2)]

    def w(x, y):
        s = 0.0
        for fx, fy, p0, a, sp in waves:
            s += a * math.sin(TAU * (fx * x + fy * y) + p0 + sp * ph)
        return s / 2.0

    def h(x, y):
        return 0.02 * w(x, y)

    def col(x, y, z):
        t = w(x, y)
        c = lerp(P['water_deep'], P['water'], min(1, max(0, 0.75 + 0.6 * t)))
        if t > 0.6:
            c = lerp(c, P['foam'], min(0.7, (t - 0.6) * 1.6))
        return c
    m = attr_mat('wa', rough=0.15, spec=0.5, coat=0.3)
    heightfield('water', h, col, m, n=48)


# ── floors ─────────────────────────────────────────────────────────────────

def tile_grid(n, colfn, gap_mat, bevel=0.012, height=0.02, rough=0.25, prefix='t', offset_rows=False):
    C.box('grout', (3, 3, 0.01), (0.5, 0.5, 0.0), gap_mat)
    s = 1.0 / n
    for j in range(n):
        for i in range(n):
            x0 = (i + (0.5 if offset_rows and j % 2 else 0)) * s
            c = colfn(i, j)
            m = C.mat(f'{prefix}{i}_{j}', c, rough=rough, spec=0.5)
            o = C.box(f'{prefix}{i}_{j}', (s - 0.008, s - 0.008, height), (0, 0, height / 2), m, bevel=bevel)
            wrap(o, x0 + s / 2, j * s + s / 2, s)


def build_floor(kind):
    if kind == 'pc':
        pink = (0.98, 0.70, 0.78)
        tile_grid(2, lambda i, j: pink if (i + j) % 2 else (0.99, 0.96, 0.97),
                  C.mat('gr', (0.86, 0.62, 0.68)), rough=0.12, prefix='pc')
    elif kind == 'gym':
        rng = random.Random(3)
        tile_grid(2, lambda i, j: lerp((0.66, 0.67, 0.70), (0.76, 0.77, 0.80), rng.random()),
                  C.mat('gr', (0.40, 0.40, 0.43)), bevel=0.02, rough=0.2, prefix='gy', offset_rows=True)
    elif kind == 'mart':
        tile_grid(4, lambda i, j: (0.95, 0.95, 0.92) if (i + j) % 2 else (0.86, 0.90, 0.92),
                  C.mat('gr', (0.70, 0.72, 0.74)), bevel=0.006, rough=0.3, prefix='mt')
    elif kind == 'house':
        rng = random.Random(11)
        C.box('gap', (3, 3, 0.01), (0.5, 0.5, 0), C.mat('gap', shade(P['wood'], 0.5)))
        rows = 4
        s = 1.0 / rows
        for j in range(rows):
            off = rng.choice([0.0, 0.25, 0.5, 0.75])
            for seg in range(2):
                c = lerp(lerp(P['wood'], (0.82, 0.56, 0.32), 0.55), P['wood'], rng.random() * 0.6)
                m = C.mat(f'pl{j}_{seg}', c, rough=0.45, spec=0.35)
                o = C.box(f'pl{j}_{seg}', (0.5 - 0.008, s - 0.012, 0.02), (0, 0, 0.01), m, bevel=0.006)
                wrap(o, (off + seg * 0.5 + 0.25) % 1.0, j * s + s / 2, 0.5)
                # wood grain streaks
                gm = C.mat(f'gn{j}_{seg}', shade(c, 0.85), rough=0.5)
                for g in range(2):
                    st = C.box(f'gn{j}_{seg}_{g}', (rng.uniform(0.15, 0.3), 0.006, 0.002), (0, 0, 0.0205), gm)
                    wrap(st, (off + seg * 0.5 + rng.uniform(0.1, 0.4)) % 1.0,
                         j * s + rng.uniform(0.07, 0.18), 0.3)
    elif kind == 'counter':
        top = lerp(P['wood'], (0.85, 0.58, 0.34), 0.45)
        C.box('front', (1.2, 0.22, 0.4), (0.5, 0.11, 0.2), C.mat('front', shade(P['wood'], 0.62), rough=0.5))
        C.box('top', (1.2, 0.86, 0.06), (0.5, 0.58, 0.43), C.mat('top', top, rough=0.3, spec=0.45), bevel=0.02)
        C.box('lip', (1.2, 0.04, 0.03), (0.5, 0.17, 0.43), C.mat('lip', shade(P['wood'], 0.8), rough=0.4))
        for g in range(5):
            C.box(f'grain{g}', (1.2, 0.005, 0.002), (0.5, 0.3 + g * 0.14, 0.461),
                  C.mat(f'gr{g}', shade(top, 0.9)))


# ── main ─────────────────────────────────────────────────────────────────

def render_set(key, n, builder, transparent=False):
    frames = []
    for i in range(n):
        new_scene(transparent)
        builder(i)
        frames.append(C.render(frame_path(key, i)))
    return frames


def main():
    outputs = []

    def add(key, frames, cols=None, meta=None):
        o = {'key': key, 'kind': 'tile', 'frames': frames, 'cols': cols or len(frames)}
        if meta:
            o['meta'] = meta
        outputs.append(o)

    only = os.environ.get('TERRAIN_ONLY')
    sel = (lambda k: True) if not only else (lambda k: k in only.split(','))

    if sel('grass'):
        add('grass', render_set('grass', 4, lambda i: build_grass(100 + i)), 4)
    if sel('tall_grass'):
        add('tall_grass', render_set('tall_grass', 3, lambda i: build_tall_grass(i - 1), transparent=True), 3,
            {'fps': 4, 'frames': ['left', 'centre', 'right']})
    if sel('path'):
        add('path', render_set('path', 4, lambda i: build_path(200 + i)), 4)
    if sel('sand'):
        add('sand', render_set('sand', 4, lambda i: build_sand(i)), 4)
    if sel('rock_ground'):
        add('rock_ground', render_set('rock_ground', 4, lambda i: build_rock(300 + i)), 4)
    if sel('water'):
        add('water', render_set('water', 8, build_water), 8, {'fps': 6, 'loop': True})
    for kind in ('pc', 'gym', 'mart', 'house'):
        if sel('floor_' + kind):
            add('floor_' + kind, render_set('floor_' + kind, 1, lambda i, k=kind: build_floor(k)), 1)
    if sel('counter'):
        add('counter', render_set('counter', 1, lambda i: build_floor('counter')), 1)

    if not only:
        C.write_spec(GROUP, outputs)


main()
