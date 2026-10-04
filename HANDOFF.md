# Handoff prompt (paste into a new Claude Code session)

Continue my CLASS-APP work. Read CLAUDE.md first. Repo: plummz/CLASS-APP.

## 1. Pokémon World 3D — branch `claude/pokemon-world-3d` (PRIORITY)
Goal: drastically upgrade the Pokémon game with Blender-made 3D art in the fast 2D engine.
- Engine is DONE in `features/pokemon/pokemon.js` + new `features/pokemon/pokemon-world.js` (art loader,
  y-sorted 3D renderer, follower Pokémon, day/night, 7 route trainers, new Coast gym, animated Showdown
  battle sprites + Blender backdrops, crits/STAB/smarter AI, Pokédex/Party/Box tabs, save fixes).
  It falls back to the old drawing when art is missing.
- Art: spec in `tools/pokemon-art/ART_SPEC.md`, kit `common.py`, packer `pack.py`. Install Blender 5.2
  (`tools/pokemon-art/setup.sh`) + `pip install pillow`. Groups: terrain, nature, buildings, chars, pokemon_a,
  pokemon_b, battle. Check `features/pokemon/art/` for which groups exist; write/finish the missing
  `tools/pokemon-art/<group>.py`, render, `python3 tools/pokemon-art/pack.py --all`. Look at renders and
  fix quality. Known: player's cap hides his face when facing down — fix in chars.py.
- Then: test in browser at phone size (390x844) and desktop: starter pick, walking, trainer battle on
  Route 1, Coast gym door, Pokédex tabs, save/reload; check art alignment (buildings on footprints,
  doors over door tiles, trees rooted). `window.pokemonModule._debug()` / `_teleport(map,x,y)` help.
- Then: changelog entry in features/updates/changelog.js (next version), bump ?v= for changed files in
  index.html AND sw.js + CACHE_VERSION, push, open PR to main.

## 2. Social Media pages (after Pokémon) — new branch from main
- WIT-PSITS card → https://www.facebook.com/psitswitchapter (old bsitpsitswit is dead).
- Raisa Treñas card → https://www.facebook.com/p/Raisa-Tre%C3%B1as-61553662959404/
- WIT-IT (facebook.com/wititdepartment): Facebook blocks its embed (page restriction). Show a nice
  "Open on Facebook" card instead of an empty box.
- Fix the empty dark embed box (no visible loading/fallback; iframe has loading="lazy"). Check phone + desktop.

## 3. Background music (after Social) — branch `claude/music-background` (code done, tested)
- On touch devices music plays without Web Audio so it survives backgrounding (file picker on
  Reviewers), simulated visualizer; desktop keeps the live analyser; audioSession='playback'; one retry
  on network error. TODO: rebase on main, add changelog entry + bump script.js/changelog versions, PR.

Commit attribution and PR rules as usual; open PRs as drafts.
