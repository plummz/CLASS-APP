# Pokémon World art spec

All art for the Pokémon game is built in Blender with Python scripts in this folder,
rendered to PNG frames, then packed into WebP sheets by `pack.py`. The game reads
`features/pokemon/art/manifest.json`.

## Tools

```bash
# Blender 5.2 LTS (headless). Install once per machine:
bash tools/pokemon-art/setup.sh             # downloads Blender to ~/tools if missing
BLENDER=~/tools/blender-5.2.2-linux-x64/blender   # in the cloud session: /home/user/tools/...

# Render one group, then pack it (Pillow needed: pip install pillow)
$BLENDER -b --factory-startup --python tools/pokemon-art/<group>.py
python3 tools/pokemon-art/pack.py <group>
python3 tools/pokemon-art/pack.py --merge   # rebuild manifest.json from all groups
```

Every script must `import common as C` (see `common.py`) and use its camera, lights,
outline and material helpers, so all assets share one look. `_work/` is scratch output
(not committed).

## Global rules

* **Scale:** 1 Blender unit = 1 map tile = 64 px (`C.PPU`). The game draws at 32 px per
  tile, so all art is 2x for sharp phones.
* **Axes:** +X east (right), +Y north (up the screen / away), +Z up. A thing standing on
  tile (0,0) occupies x 0..1, y 0..1. Characters and Pokémon face **south (-Y)** when
  "facing down" (toward the camera).
* **Cameras:** ground tiles use `C.camera_top`. Everything that stands up uses the
  oblique camera (`C.camera_oblique` / `C.fit_oblique` / `C.fixed_oblique_frame`):
  orthographic, 55° above the horizon, looking north. Never invent another angle.
* **Light:** only `C.add_lights()` (front-left key + fill + sky). Outlines on
  (`C.setup_render(..., outline=True)`) for everything that stands up; off for ground tiles.
* **Style:** bright, clean, toy-like 3D like the 3DS / Switch Pokémon games: smooth
  shapes, saturated colours from `C.PALETTE` where it fits, soft shadows, no noise,
  no photorealism. Silhouettes must read at 32 px.
* **Samples:** 24–48 is plenty. Keep each frame under ~2 s.
* **Anchors:** `anchor` = pixel in the frame where the footprint's **south-west ground
  corner** is (objects, buildings) or the **feet point** (people, Pokémon). Get it from
  `C.to_pixel(point)`. The game places the image so this pixel lands on the map.
* **Output:** call `C.write_spec(group, outputs)` at the end (see `common.write_spec`
  docstring for fields). Frames in one output must all be the same size.
* **Self-check:** after rendering, make a contact sheet / mock scene PNG and LOOK at it
  (Read the PNG). Fix anything that looks wrong before finishing.

## Groups, keys and layouts

Keys are exact: the game looks them up by name.

### 1. `terrain` — ground tiles (top-down, 64×64, seamless, no outline, `kind: 'tile'`)

| key | frames | notes |
|---|---|---|
| `grass` | 4 (cols 4) | 4 variants of short lawn grass, tile seamlessly with each other in any order |
| `tall_grass` | 3 (cols 3) | tall grass clump overlay **with alpha**, frames = sway left / centre / right; drawn on top of `grass`; bottom ~40% of the tile should be dense so a character standing in it is hidden from the knees down |
| `path` | 4 | worn dirt path, seamless |
| `sand` | 4 | beach sand with subtle ripples, seamless |
| `rock_ground` | 4 | rocky / gravel ground (walkable), seamless |
| `water` | 8 (cols 8) | animated water loop (frame 8 → 1 seamless), seamless spatially too |
| `floor_pc` | 1 | Pokémon Center floor: pink/white glossy tiles |
| `floor_gym` | 1 | gym floor: polished grey stone slabs (the game tints per gym) |
| `floor_mart` | 1 | shop floor: clean light tiles |
| `floor_house` | 1 | warm wooden planks |
| `counter` | 1 | top of a wooden counter / furniture block seen from above with a darker front edge |

Edges between terrain types are blended by the game; tiles themselves are full squares.

### 2. `nature` — standing objects (oblique, outline on, `kind: 'object'`, anchor = SW corner, `foot: [1,1]`)

| key | frames | notes |
|---|---|---|
| `tree` | 4 (cols 4) | 4 tree variants (round leafy, tall pine, fruit tree, bushy) on a 1×1 footprint; canopy may overhang neighbours a little; same frame size for all 4 |
| `tree_dense` | 2 | darker forest-edge trees for map borders (look good packed in a solid wall) |
| `bush` | 2 | small round bush (decor, non-solid) |
| `flowers` | 4 | flower patches (red, yellow, white, purple) — low, decor |
| `boulder` | 3 | rocks for the rocky zone (decor) |
| `sign` | 1 | wooden signpost with blank board (game writes the text) |
| `lamp` | 1 | street lamp for the city |
| `item_ball` | 1 | Poké Ball lying on the ground (0.35 tile wide) |
| `item_potion` | 1 | potion spray bottle (purple/pink) on the ground |

### 3. `buildings` — oblique, outline on, `kind: 'object'`, anchor = SW corner of footprint, `foot: [w,h]`

The front (south) wall's bottom edge sits on the footprint's south edge. Doors are in the
front wall, centred unless noted (the map's door tiles are directly south of the building).
Image may extend above the footprint (roof) — that is expected.

| key | footprint | look |
|---|---|---|
| `bld_pc_5x3` | 5×3 | Pokémon Center: white walls, red roof, big Poké Ball emblem, glass sliding door |
| `bld_pc_3x3` | 3×3 | small Pokémon Center / rest cabin, same style |
| `bld_pc_7x4` | 7×4 | big city Pokémon Center |
| `bld_mart_3x3` | 3×3 | PokéMart: white walls, blue roof, "MART" sign board |
| `bld_house_3x3_red` / `_blue` / `_green` / `_orange` | 3×3 | cosy family houses, roof colour as named, windows, chimney on some |
| `bld_hall_5x3` | 5×3 | town hall: purple roof, columns, clock |
| `bld_gym_grass_11x3` | 11×3 | Forest gym: green roof, leaf emblem, big double doors centred |
| `bld_gym_rock_7x3` | 7×3 | Rock gym: stone walls, brown roof, boulder emblem |
| `bld_gym_water_7x3` | 7×3 | Coast gym: white/blue, wave emblem |
| `bld_gym_electric_11x4` | 11×4 | City gym: yellow/black, lightning emblem |
| `bld_city_5x3_a` / `_b` | 5×3 | city shops (different colours/signs) |
| `bld_city_5x4_a` / `_b` / `_c` | 5×4 | apartment blocks (taller, flat roofs, many windows) |
| `bld_city_6x4_a` | 6×4 | department store |
| `bld_city_7x4_a` | 7×4 | office tower (tallest) |

Each building one frame. Keep total under ~1.2 MB packed.

### 4. `chars` — people (oblique, outline on, `kind: 'sheet'`, anchor = feet point)

All frames 64×96, feet at the same pixel in every frame (use `C.fixed_oblique_frame`).
Rows: **0 = down (facing camera), 1 = left, 2 = right, 3 = up (back to camera)**.

| key | layout | look |
|---|---|---|
| `player` | 4 rows × 3 cols: step-L, stand, step-R | boy trainer: red-and-white cap, black hair, blue jacket, dark jeans, yellow backpack — the classic hero look |
| `npc_youngster` | 4 rows × 1 | shorts, cap, cheerful |
| `npc_lass` | 4 rows × 1 | skirt, long hair |
| `npc_hiker` | 4 rows × 1 | beard, big backpack, sturdy |
| `npc_bugcatcher` | 4 rows × 1 | straw hat, net |
| `npc_swimmer` | 4 rows × 1 | swimsuit, goggles |
| `npc_nurse` | 4 rows × 1 | Pokémon Center nurse (pink hair, white uniform) |
| `npc_clerk` | 4 rows × 1 | Mart clerk (blue uniform) |
| `leader_sylvia` | 1 row × 2 (idle bob) facing down | grass gym leader: green outfit, flower in hair |
| `leader_granite` | 1 × 2 | rock gym leader: hard hat, brown work clothes |
| `leader_marina` | 1 × 2 | water gym leader: blue and white sailor style |
| `leader_voltex` | 1 × 2 | electric gym leader: yellow jacket, spiky hair, headphones |

### 5. `pokemon_a` / `pokemon_b` — the 10 starters as faithful 3D replicas (outline on)

Group `pokemon_a` (script `pokemon_a.py`): `pikachu, eevee, bulbasaur, squirtle, chikorita`.
Group `pokemon_b` (script `pokemon_b.py`): `cyndaquil, totodile, torchic, treecko, mudkip`.
For each species `S`:

| key | layout | notes |
|---|---|---|
| `mon_S` | 4 rows × 3 cols, frames 80×80, `kind: 'sheet'`, anchor = feet | overworld follower walk cycle, rows/cols as `player` (down, left, right, up × step-L, stand, step-R) |
| `hero_S` | 1 frame 384×384, `kind: 'image'` | 3/4 view hero render facing the camera slightly to the left, used on the starter selection screen |

Model each Pokémon to match the official design as closely as possible: proportions,
colours, markings, ears/tail/spikes. Download the official art and the 3D HOME render
for reference and compare side by side with your renders until they match:

```
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/<dex>.png
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/<dex>.png
```
Dex numbers: pikachu 25, eevee 133, bulbasaur 1, squirtle 7, chikorita 152,
cyndaquil 155, totodile 158, torchic 255, treecko 252, mudkip 258.

### 6. `battle` — battle backdrops (opaque, `kind: 'image'`, no anchor)

1600×560 px (the battle field is 800×280 at 1x). Camera: perspective is fine here (low
3/4 view of a 3D diorama), no outline needed. Each backdrop has two oval battle platforms:

* enemy platform ellipse centre at pixel **(1180, 330)**, radii ≈ **240 × 60**
* player platform ellipse centre at pixel **(440, 545)**, radii ≈ **300 × 72** (bottom part may be cut off)

| key | scene |
|---|---|
| `bg_grass` | sunny meadow, distant trees and hills |
| `bg_forest` | deep green forest clearing, light shafts |
| `bg_rock` | rocky canyon / mountain |
| `bg_beach` | beach with sea and sky |
| `bg_city` | city park with buildings in the distance |
| `bg_gym` | indoor gym arena with stadium lights |
| `bg_cave` | dark cave (used indoors / at night) |

Save as lossy WebP quality ~82 (`'quality': 82` in the output dict). Keep each < 180 KB.
