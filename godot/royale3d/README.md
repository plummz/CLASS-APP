# Battle Royale 3D (Godot 4.7)

First-person battle royale for the CLASS-APP Arcade, using the same POV and touch layout as the
Dungeon of Knowledge. Rules follow PUBG / Rules of Survival.

## How a match works

- **Plane:** a plane crosses the island at 330 m. Tap JUMP (Space) to drop. Bots jump along the path.
- **Freefall and parachute:** steer with the stick; look down to dive faster. The chute opens by
  itself at 90 m, or tap CHUTE (Space) earlier.
- **Loot:** guns, ammo, armour, meds and grenades lie inside houses (walk in through the doors),
  at campsites and in the military base (best loot). Ammo, meds and armour upgrades are picked up
  automatically; tap PICK UP (F) for guns.
- **Zone:** after landing, a blue zone shrinks in 6 phases. Damage outside it grows from 1 to
  14 HP per second. The map (M) shows the current circle (blue) and the next one (white).
- **Airdrop:** at phase 2 a red crate parachutes into the safe zone with an AWM or M249,
  level-3 vest and helmet, and a med kit.
- **End:** last one standing wins. Coins (5 per kill plus a placement bonus) go to the same
  balance as the 2D Battle Royale (`localStorage['rl_coins_v1']`).

| Guns | Ammo |
|---|---|
| P92, R1895 (pistols), UMP45, Vector (SMGs) | 9mm |
| M416, M249 (airdrop) | 5.56mm |
| AKM, SKS (4x), Kar98k (6x), AWM (8x, airdrop) | 7.62mm |
| S686 shotgun | 12 Gauge |

Armour: vest and helmet levels 1–3 reduce damage by 30 / 40 / 55% until their durability runs
out. Meds: bandage (+10 up to 75), first aid kit (to 75), med kit (to 100), energy drink (boost
that heals over time).

Controls: WASD move, mouse look, left click fire, right click aim, R reload, F pick up, H heal,
G grenade, 1/2 or Q weapon slots, Shift run, C crouch, Z prone, Space jump / parachute, M map,
Esc pause. On phones: PUBG-Mobile-style buttons (FIRE on both sides, AIM, RELOAD, JUMP, CROUCH,
PRONE, contextual PICK UP / HEAL / GRENADE, MAP, PAUSE); drag the right half to look.

## Files

- `scripts/royale_game.gd`: match flow, zone, shooting, loot, airdrop, results
- `scripts/world.gd`: island generator (terrain, towns, walk-in houses, nature, minimap)
- `scripts/player.gd`: first-person player; `scripts/bot.gd`: AI players
- `scripts/hud.gd`, `scripts/touch_controls.gd`, `scripts/sfx.gd` (synthesised sounds), `scripts/items.gd`
- `assets/`: CC0 models from Kenney (Blaster, Nature, City Suburban/Commercial, Survival kits)
  and KayKit Adventurers. Licences are in `assets/LICENSE-*.txt`.
- `tools/trim_characters.gd`: saves the characters with only the animations bots use (smaller web build)

## Build and test

Godot 4.7.2 with the Web export templates.

```bash
G="$USERPROFILE/Downloads/Godot_v4.7.2-stable_win64.exe/Godot_v4.7.2-stable_win64_console.exe"
"$G" --headless --path . --script res://tools/trim_characters.gd     # after changing characters
"$G" --headless --path . -- --smoke                                   # full bot match, prints ROYALE_SMOKE_PASS
"$G" --headless --path . -- --doortest                                # walks into houses (door closed = blocked, open = inside)
"$G" --path . --resolution 1280x720 -- --screenshots=<dir> [--clean] [--touch-preview]
"$G" --headless --path . --export-release Web ../../features/royale3d/game/index.html
```

The export goes to `features/royale3d/game/`, which the CLASS-APP server serves with its own
CSP (WebAssembly needs `wasm-unsafe-eval`) and `Cache-Control: max-age=0` so phones pick up new
builds. Commit the exported files together with the source changes.

## Soldiers, vehicles and art (v1.10)

- **Soldier** (`scripts/soldier.gd`): one Mixamo rig shared by the player (third person),
  bots and classmates. An AnimationTree blends standing / crouched / prone / unarmed movement
  from the real ground speed and direction, layers aim, fire, reload, heal, throw, punch and hit
  reactions on the spine and arms, and swaps to skydive, parachute, driving and death clips.
  The spine bends with the aim pitch. The rifle grip offset (`RoyaleSoldier.gun_rot_deg`) was
  measured in the aim pose so the barrel points straight ahead; re-measure if the rig changes.
- **Guns** (`Items.gun_node`): Quaternius models scaled to real length, barrel -Z, with a
  `Muzzle` marker. The Gatling is built from shapes (its `Barrels` node spins).
- **Skins** (`scripts/skins.gd`, shop UI in `features/royale3d/shop.js`): weapon finishes and
  outfits are shaders, so a new skin is one dictionary entry in both files (same id, name, tier).
- **Vehicles** (`scripts/vehicle.gd`): cars and motorcycles are CharacterBody3D arcade cars; ro-ro
  ferries are AnimatableBody3D platforms that carry anything standing on the deck.
- **Isla Verde**: second island built in `world.gd` (`_build_island2`), with its own height grid.
- **Materials** (`scripts/materials.gd`): Poly Haven photo textures on terrain and buildings,
  water shader, wind sway for MegaKit plants.

### Rebuilding the art

`assets_src/` (ignored by Godot and git) holds the downloads: Mixamo FBX files (Swat Guy + 34
clips: see `tools/build_assets.gd` for the file names), the Quaternius / poly.pizza GLB packs and
the Poly Haven JPGs. Run:

    godot --headless --path . --script res://tools/build_assets.gd [-- only=soldier,guns,interior,nature,vehicles,textures]

Mixamo files can't be shared, so `assets/soldier/` is not in git either; download them again
from Mixamo (character "Swat Guy", FBX, 30 fps, clips "without skin", locomotion "in place")
and run the tool before exporting. Preview the rig with `tools/preview_soldier.gd` (needs a window).
