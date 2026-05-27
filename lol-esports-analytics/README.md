# LOL Esports Analytics

A premium, standalone interactive analytics platform for League of Legends competitive history.
No build tools required. No frameworks. Pure HTML, CSS, and JavaScript.

## Features

- **Global Analytics Terminal** — stat counters, animated charts, dynasty rankings, GOAT index
- **Worlds Champions Timeline** — every champion from Season 1 (2011) to present
- **Regional Dominance Index** — LCK, LPL, LEC, LCS, PCS, LJL, VCS, CBLOL
- **Team Profiles** — trophy cabinet, performance charts, roster eras, full history
- **Player Profiles** — career timeline, signature champions, international records
- **Match Database** — notable matches, historic upsets, reverse sweeps
- **Tournament History** — Worlds, MSI, and EWC complete records
- **Comparison Tool** — team vs team, player vs player head-to-head
- **Live Search** — instant search across teams, players, and tournaments
- **Dark / Light Mode** — toggle with the ☀️/🌙 button
- **Fully Responsive** — mobile, tablet, desktop, ultrawide

## Setup

Because the site uses `fetch()` to load JSON data files, you need a local HTTP server.

### Option 1: Python (recommended, no install)
```bash
cd lol-esports-analytics
python3 -m http.server 8080
# Then open http://localhost:8080
```

### Option 2: Node.js (npx)
```bash
cd lol-esports-analytics
npx serve .
```

### Option 3: VS Code Live Server
Install the "Live Server" extension, right-click `index.html` → "Open with Live Server".

### Option 4: PHP
```bash
php -S localhost:8080
```

## Project Structure

```
lol-esports-analytics/
├── index.html              — Main SPA shell
├── README.md               — This file
│
├── styles/
│   ├── design-system.css   — CSS tokens, typography, colors, glass system
│   ├── components.css      — All UI components (cards, tables, nav, charts)
│   ├── animations.css      — Keyframes, scroll reveals, hover effects
│   └── responsive.css      — Mobile-first breakpoints + iOS safe area
│
├── scripts/
│   ├── data.js             — Data engine (loads + queries all JSON)
│   ├── utils.js            — Counters, formatters, scroll reveal, toast, modal
│   ├── charts.js           — Chart.js configurations (8 chart types)
│   ├── pages.js            — Page renderers for every section
│   └── app.js              — App init, Router, theme, search, modal
│
└── data/
    ├── teams.json          — 16 major teams with full history
    ├── players.json        — 12 legendary players with career data
    ├── tournaments.json    — All Worlds, MSI, EWC results
    ├── regions.json        — All 12+ regions with stats
    ├── matches.json        — Notable/historic matches database
    └── stats.json          — Global records, GOAT index, dynasty scores
```

## Design System

The visual language is documented in `styles/design-system.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `--gold` | `#C89B3C` | Primary accent, titles, highlights |
| `--cyan` | `#00D4FF` | Secondary accent, MSI, charts |
| `--win` | `#00E676` | Win state, positive indicators |
| `--loss` | `#FF4444` | Loss state, negative indicators |
| `--bg-primary` | `#060914` | Main background |
| `--glass-bg` | `rgba(255,255,255,0.04)` | Glassmorphism cards |
| Font Display | Rajdhani | Headers, names, stats |
| Font Body | Inter | Paragraphs, labels |
| Font Mono | JetBrains Mono | Numbers, data |

## Updating Data

Data is stored as plain JSON files. To update:

1. Open the relevant file in `data/`
2. Add or modify entries following the existing schema
3. Refresh the browser

### Updating from Liquipedia

The primary data source is [Liquipedia LoL](https://liquipedia.net/leagueoflegends/).

Key pages to monitor:
- `liquipedia.net/leagueoflegends/World_Championship`
- `liquipedia.net/leagueoflegends/Mid-Season_Invitational`
- `liquipedia.net/leagueoflegends/Esports_World_Cup`
- Individual team and player pages

## Adding New Teams

Add to `data/teams.json` following this schema:

```json
{
  "id": "unique-id",
  "name": "Team Name",
  "region": "LCK",
  "color_primary": "#RRGGBB",
  "color_secondary": "#RRGGBB",
  "stats": {
    "worlds_titles": 0,
    "msi_titles": 0,
    "worlds_finals": 0,
    "worlds_appearances": 0,
    "dynasty_score": 50,
    "international_winrate": 50.0
  },
  "worlds_history": [],
  "msi_history": []
}
```

## Adding New Players

Add to `data/players.json`:

```json
{
  "id": "unique-id",
  "name": "IGN",
  "real_name": "Full Name",
  "nationality": "KR",
  "role": "Mid",
  "current_team": "team-id",
  "active": true,
  "stats": {
    "worlds_titles": 0,
    "msi_titles": 0,
    "goat_score": 60
  },
  "signature_champions": ["Champion1", "Champion2"],
  "career_teams": [
    {"team": "team-id", "years": "2023–present", "team_name": "Team Name"}
  ]
}
```

## Technical Notes

- **No build step** — works directly in browser when served via HTTP
- **Chart.js** loaded from CDN (`cdn.jsdelivr.net`)
- **Google Fonts** loaded for Rajdhani, Inter, JetBrains Mono
- **Hash routing** — URL format `#page`, `#teams?id=t1`, `#players?id=faker`
- **LocalStorage** — saves dark/light mode preference

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+ (iOS 14+)
- All major mobile browsers

## License

Open-source for personal use. Data sourced from publicly available esports records.
Liquipedia data is licensed under CC BY-SA 3.0.

---

Built to be comparable to Oracle's Elixir, Liquipedia, and Riot Games Esports portals.
