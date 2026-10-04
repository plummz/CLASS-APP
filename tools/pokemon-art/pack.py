#!/usr/bin/env python3
"""Packs rendered frames into WebP sheets and writes the art manifest.

    python3 tools/pokemon-art/pack.py terrain        # pack one group
    python3 tools/pokemon-art/pack.py --all          # pack every group with a spec.json
    python3 tools/pokemon-art/pack.py --merge        # (re)build features/pokemon/art/manifest.json

Needs Pillow with WebP support (pip install pillow).
"""
import hashlib
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
WORK_ROOT = os.path.join(HERE, '_work')
ART_ROOT = os.path.join(REPO, 'features', 'pokemon', 'art')


def pack_group(group):
    spec_path = os.path.join(WORK_ROOT, group, 'spec.json')
    with open(spec_path) as fh:
        spec = json.load(fh)
    out_dir = os.path.join(ART_ROOT, group)
    os.makedirs(out_dir, exist_ok=True)
    part = {}
    total = 0
    for out in spec['outputs']:
        key = out['key']
        frames = [Image.open(p).convert('RGBA') for p in out['frames']]
        if not frames:
            raise SystemExit(f'{group}/{key}: no frames')
        fw, fh = frames[0].size
        for i, f in enumerate(frames):
            if f.size != (fw, fh):
                raise SystemExit(f'{group}/{key}: frame {i} is {f.size}, expected {(fw, fh)}')
        cols = int(out.get('cols') or len(frames))
        rows = (len(frames) + cols - 1) // cols
        sheet = Image.new('RGBA', (fw * cols, fh * rows), (0, 0, 0, 0))
        for i, f in enumerate(frames):
            sheet.paste(f, ((i % cols) * fw, (i // cols) * fh))
        kind = out.get('kind', 'object')
        lossless = out.get('lossless', kind == 'tile')
        file_rel = f'{group}/{key}.webp'
        file_abs = os.path.join(ART_ROOT, file_rel)
        if lossless:
            sheet.save(file_abs, 'WEBP', lossless=True, method=6)
        else:
            sheet.save(file_abs, 'WEBP', quality=int(out.get('quality', 90)), method=6, alpha_quality=100)
        size = os.path.getsize(file_abs)
        total += size
        entry = {
            'file': file_rel,
            'kind': kind,
            'fw': fw, 'fh': fh,
            'cols': cols, 'rows': rows,
            'frames': len(frames),
        }
        if 'anchor' in out:
            entry['ax'], entry['ay'] = round(out['anchor'][0], 2), round(out['anchor'][1], 2)
        if 'foot' in out:
            entry['foot'] = out['foot']
        if 'meta' in out:
            entry['meta'] = out['meta']
        part[key] = entry
        print(f'  {file_rel:42s} {fw}x{fh} x{len(frames):<3d} {size/1024:7.1f} KB')
    with open(os.path.join(out_dir, 'manifest.part.json'), 'w') as fh:
        json.dump(part, fh, indent=1, sort_keys=True)
    print(f'[pack] {group}: {len(part)} assets, {total/1024:.1f} KB')
    return part


def merge():
    entries = {}
    for group in sorted(os.listdir(ART_ROOT)):
        part_path = os.path.join(ART_ROOT, group, 'manifest.part.json')
        if not os.path.isfile(part_path):
            continue
        with open(part_path) as fh:
            part = json.load(fh)
        for key, entry in part.items():
            if key in entries:
                raise SystemExit(f'duplicate asset key {key!r} in group {group}')
            file_abs = os.path.join(ART_ROOT, entry['file'])
            with open(file_abs, 'rb') as bf:
                entry['v'] = hashlib.sha1(bf.read()).hexdigest()[:8]  # cache-busting per file
            entries[key] = entry
    total = sum(os.path.getsize(os.path.join(ART_ROOT, e['file'])) for e in entries.values())
    manifest = {'ppu': 64, 'tile': 32, 'assets': entries}
    out = os.path.join(ART_ROOT, 'manifest.json')
    with open(out, 'w') as fh:
        json.dump(manifest, fh, separators=(',', ':'), sort_keys=True)
    print(f'[merge] {len(entries)} assets, {total/1024/1024:.2f} MB -> {os.path.relpath(out, REPO)}')


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args:
        raise SystemExit(__doc__)
    if '--all' in args:
        args = sorted(g for g in os.listdir(WORK_ROOT) if os.path.isfile(os.path.join(WORK_ROOT, g, 'spec.json')))
        args.append('--merge')
    for a in args:
        if a == '--merge':
            merge()
        else:
            pack_group(a)
