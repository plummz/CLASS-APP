/* ============================================================
   PAGE RENDERERS — builds the HTML for each section
   ============================================================ */

const Pages = (() => {

  let _data = null;

  function init(data) { _data = data; }

  /* ── HELPERS ── */
  const H = Utils.escHtml;
  const badge = (region) => `<span class="region-badge ${Utils.regionBadgeClass(region)}">${H(region)}</span>`;
  const roleBadge = (role) => `<span class="role-badge ${Utils.roleBadgeClass(role)}">${H(role)}</span>`;

  /* ── HOME PAGE ── */
  function renderHome() {
    const teams   = DataEngine.getTeams(_data.teams);
    const players = DataEngine.getPlayers(_data.players);
    const worlds  = DataEngine.getWorldsHistory(_data.tournaments);
    const stats   = DataEngine.getGlobalRecords(_data.stats);
    const dynas   = DataEngine.getDynastyScores(_data.stats);
    const goat    = DataEngine.getGoatIndex(_data.stats);
    const worldsByRegion = DataEngine.getWorldsWinnersByRegion(_data.stats);
    const msiByRegion    = DataEngine.getMSIWinnersByRegion(_data.stats);

    return `
<!-- ── TICKER ── -->
<div class="stats-ticker">
  <div class="stats-ticker__inner" id="ticker-inner">
    ${buildTicker(teams, players, worlds)}
    ${buildTicker(teams, players, worlds)}
  </div>
</div>

<!-- ── HERO ── -->
<div class="page-hero reveal">
  <div class="page-hero__label">League of Legends Esports</div>
  <h1 class="page-hero__title gradient-hero">Global Analytics<br>Terminal</h1>
  <p class="page-hero__subtitle">The most comprehensive LoL esports database — championships, dynasties, records, and historical data since 2011.</p>
</div>

<!-- ── GLOBAL STAT CARDS ── -->
<div class="stat-cards-row stagger-children" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:var(--space-4);margin-bottom:var(--space-8);">
  ${buildStatCard('Total Worlds', worlds.length, '🏆', 'Seasons competed')}
  ${buildStatCard('Champions', [...new Set(worlds.filter(w=>w.champion).map(w=>w.champion_id))].length, '👑', 'Unique champions')}
  ${buildStatCard("T1 Titles", 4, '⚡', "SKT / T1 combined")}
  ${buildStatCard('LCK Dominance', 9, '🇰🇷', 'Worlds titles (2011–2023)')}
  ${buildStatCard('LPL Surge', 4, '🇨🇳', 'Worlds titles since 2018')}
  ${buildStatCard("Faker's Worlds", 4, '🐐', 'Most by any player')}
</div>

<!-- ── CHARTS ROW ── -->
<div class="section-header reveal">
  <div>
    <h2 class="section-title">Championship History</h2>
    <p class="section-subtitle">All-time Worlds & MSI titles by team and region</p>
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6);margin-bottom:var(--space-8);">
  <div class="chart-container reveal" style="height:320px;">
    <div class="chart-title">Worlds Titles by Team</div>
    <canvas id="chart-worlds-titles" style="height:260px;"></canvas>
  </div>
  <div class="chart-container reveal" style="height:320px;">
    <div class="chart-title">Titles by Region</div>
    <canvas id="chart-region-pie" style="height:260px;"></canvas>
  </div>
</div>

<!-- ── ERA CHART ── -->
<div class="chart-container reveal" style="height:360px;margin-bottom:var(--space-8);">
  <div class="chart-title">Cumulative Worlds Titles Over Time</div>
  <canvas id="chart-era-timeline" style="height:300px;"></canvas>
</div>

<!-- ── DYNASTY RANKINGS ── -->
<div class="section-header reveal">
  <div>
    <h2 class="section-title">Dynasty Rankings</h2>
    <p class="section-subtitle">Composite score based on titles, finals appearances, and consistency</p>
  </div>
</div>
<div class="card reveal" style="margin-bottom:var(--space-8);">
  <div class="data-table-wrapper">
    <table class="data-table" id="table-dynasties">
      <thead>
        <tr>
          <th style="width:48px;">#</th>
          <th data-sort="team">Team</th>
          <th data-sort="score">Dynasty Score</th>
          <th data-sort="worlds">Worlds 🏆</th>
          <th data-sort="msi">MSI ⚔️</th>
          <th data-sort="finals">Finals</th>
          <th>Bar</th>
        </tr>
      </thead>
      <tbody>
        ${buildDynastyRows(dynas)}
      </tbody>
    </table>
  </div>
</div>

<!-- ── GOAT RANKINGS ── -->
<div class="section-header reveal">
  <div>
    <h2 class="section-title">GOAT Index</h2>
    <p class="section-subtitle">Historical greatness ranking across titles, consistency, era, and impact</p>
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6);margin-bottom:var(--space-8);">
  <div class="chart-container reveal" style="height:400px;">
    <div class="chart-title">Player GOAT Rankings</div>
    <canvas id="chart-goat" style="height:340px;"></canvas>
  </div>
  <div class="card reveal" style="padding:0;overflow:hidden;">
    <div style="padding:var(--space-4) var(--space-6);border-bottom:1px solid var(--glass-border);">
      <div class="chart-title" style="margin:0;">Top GOAT Profiles</div>
    </div>
    ${buildGoatList(goat.slice(0, 8), players)}
  </div>
</div>

<!-- ── WORLDS CHAMPIONS TIMELINE ── -->
<div class="section-header reveal">
  <div>
    <h2 class="section-title">Champions Timeline</h2>
    <p class="section-subtitle">Every Worlds champion from Season 1 to present</p>
  </div>
</div>
<div class="card reveal" style="margin-bottom:var(--space-8);">
  ${buildChampionsTimeline(worlds)}
</div>

<!-- ── RADAR CHART ── -->
<div class="section-header reveal">
  <div>
    <h2 class="section-title">Team Domination Radar</h2>
    <p class="section-subtitle">Multi-dimensional comparison of the top 5 dynasties</p>
  </div>
</div>
<div class="chart-container reveal" style="height:420px;margin-bottom:var(--space-8);">
  <canvas id="chart-radar" style="height:360px;"></canvas>
</div>

<!-- ── NOTABLE RECORDS ── -->
<div class="section-header reveal">
  <div>
    <h2 class="section-title">All-Time Records</h2>
  </div>
</div>
<div class="rift-grid stagger-children" style="margin-bottom:var(--space-8);">
  ${buildRecordCards(stats)}
</div>
    `;
  }

  function buildTicker(teams, players, worlds) {
    const t1 = teams.find(t => t.id === 't1');
    return [
      `<span class="stats-ticker__item">🏆 Most Worlds Titles: <strong>${t1?.name || 'T1'} (4)</strong></span>`,
      `<span class="stats-ticker__item">⚔️ MSI Cancelled: <strong>2020 (COVID-19)</strong></span>`,
      `<span class="stats-ticker__item">👑 Most Titled Player: <strong>Faker (4x World Champion)</strong></span>`,
      `<span class="stats-ticker__item">🇰🇷 LCK: <strong>9 Worlds Titles</strong> — The most dominant region in history</span>`,
      `<span class="stats-ticker__item">🇨🇳 LPL: <strong>4 Worlds Titles</strong> since 2018</span>`,
      `<span class="stats-ticker__item">🐉 Last Worlds: <strong>T1 vs Weibo Gaming (2023) — T1 won 3-0</strong></span>`,
      `<span class="stats-ticker__item">📅 Total Worlds: <strong>${worlds.length} seasons</strong> of competition</span>`,
      `<span class="stats-ticker__item">⚡ T1 Finals: <strong>6 Worlds finals</strong> — most by any team</span>`,
    ].join('');
  }

  function buildStatCard(label, value, icon, sub) {
    return `
    <div class="stat-card reveal-scale">
      <div class="stat-card__label">${H(label)}</div>
      <div class="stat-card__value" data-counter="${value}">${value}</div>
      <div class="stat-card__sub">${H(sub || '')}</div>
      <div class="stat-card__icon">${icon}</div>
    </div>`;
  }

  function buildDynastyRows(dynasties) {
    return dynasties.map((d, i) => {
      const team = DataEngine.getTeamById(_data.teams, d.team?.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, ''));
      const wT = team?.stats?.worlds_titles || '—';
      const mT = team?.stats?.msi_titles || '—';
      const fin = team?.stats?.worlds_finals || '—';
      return `
      <tr>
        <td class="rank-cell rank-${i+1}" data-key="rank" data-value="${i+1}">${i+1}</td>
        <td data-key="team" data-value="${H(d.team)}">
          <div style="display:flex;align-items:center;gap:var(--space-2);">
            <span style="font-weight:700;font-family:var(--font-display);font-size:var(--text-base);">${H(d.team)}</span>
          </div>
        </td>
        <td data-key="score" data-value="${d.score}">
          <span style="font-family:var(--font-mono);font-weight:700;color:var(--gold);">${d.score}</span>
        </td>
        <td data-key="worlds" data-value="${wT}" style="font-family:var(--font-mono);font-weight:700;color:var(--gold-light);">${wT}</td>
        <td data-key="msi" data-value="${mT}" style="font-family:var(--font-mono);color:var(--cyan);">${mT}</td>
        <td data-key="finals" data-value="${fin}" style="font-family:var(--font-mono);color:var(--text-secondary);">${fin}</td>
        <td style="width:120px;">
          <div class="progress-bar">
            <div class="progress-bar__fill" data-width="${d.score}%" style="width:0;"></div>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function buildGoatList(goat, allPlayers) {
    return goat.map(g => {
      const player = allPlayers.find(p => p.name === g.player);
      const role = player?.role || '';
      return `
      <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--border-subtle);cursor:pointer;"
           class="hover-lift" onclick="Router.navigate('players?id=${H(player?.id || '')}')">
        <div style="font-family:var(--font-mono);font-size:var(--text-xl);font-weight:700;color:var(--gold);width:28px;text-align:center;">
          ${goat.indexOf(g) + 1}
        </div>
        <div style="flex:1;">
          <div style="font-family:var(--font-display);font-size:var(--text-lg);font-weight:700;">${H(g.player)}</div>
          <div style="display:flex;gap:var(--space-2);margin-top:2px;">
            ${role ? roleBadge(role) : ''}
            <span style="font-size:var(--text-xs);color:var(--text-muted);">${H(g.note || '')}</span>
          </div>
        </div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xl);font-weight:700;color:var(--gold);">${g.score}</div>
      </div>`;
    }).join('');
  }

  function buildChampionsTimeline(worlds) {
    const sorted = [...worlds].sort((a, b) => a.year - b.year);
    return `
    <div style="overflow-x:auto;">
      <div style="display:flex;gap:var(--space-4);padding:var(--space-6);min-width:max-content;">
        ${sorted.map(w => `
          <div style="min-width:100px;text-align:center;cursor:pointer;"
               onclick="Router.navigate('teams?id=${H(w.champion_id || '')}')">
            <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-1);">${w.year}</div>
            <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:var(--space-3);transition:all var(--transition-base);"
                 onmouseover="this.style.borderColor='var(--gold)';this.style.background='var(--gold-dim)';"
                 onmouseout="this.style.borderColor='';this.style.background='';">
              <div style="font-size:20px;margin-bottom:var(--space-1);">🏆</div>
              <div style="font-family:var(--font-display);font-size:var(--text-sm);font-weight:700;line-height:1.2;">${H(w.champion || 'TBD')}</div>
              <div style="margin-top:4px;">${w.champion_region ? badge(w.champion_region) : ''}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
  }

  function buildRecordCards(records) {
    const items = [
      { icon: '🏆', title: 'Most Worlds Titles (Team)', value: 'T1 — 4 titles', sub: '2013, 2015, 2016, 2023' },
      { icon: '👑', title: 'Most Worlds Titles (Player)', value: 'Faker — 4 titles', sub: '2013, 2015, 2016, 2023' },
      { icon: '⚔️', title: 'Most MSI Titles (Team)', value: 'T1 — 3 titles', sub: '2016, 2017, 2022' },
      { icon: '🎯', title: 'Highest GOAT Index', value: 'Faker — 100/100', sub: '12+ year career' },
      { icon: '🌍', title: 'Most Dominant Region', value: 'LCK — 9 Worlds', sub: '68.4% international winrate' },
      { icon: '⚡', title: 'Most Worlds Finals', value: 'T1 — 6 finals', sub: 'Highest by any organization' },
      { icon: '🔥', title: 'LCK Consecutive Titles', value: '5 straight (2013-2017)', sub: 'Broken by IG in 2018' },
      { icon: '🏅', title: '3 Decades Champion', value: 'Faker', sub: 'Only player to win in 2013, 2016, 2023' },
    ];
    return items.map(item => `
    <div class="card card--gold hover-lift neon-border">
      <div style="font-size:32px;margin-bottom:var(--space-3);">${item.icon}</div>
      <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--space-1);">${H(item.title)}</div>
      <div style="font-family:var(--font-display);font-size:var(--text-xl);font-weight:700;color:var(--gold);margin-bottom:var(--space-1);">${H(item.value)}</div>
      <div style="font-size:var(--text-sm);color:var(--text-secondary);">${H(item.sub)}</div>
    </div>`).join('');
  }

  /* ── TEAMS PAGE ── */
  function renderTeams(filter = {}) {
    let teams = DataEngine.getTeams(_data.teams);
    if (filter.region) teams = teams.filter(t => t.region.toLowerCase() === filter.region.toLowerCase());
    if (filter.search) {
      const q = filter.search.toLowerCase();
      teams = teams.filter(t => t.name.toLowerCase().includes(q) || t.aliases?.some(a => a.toLowerCase().includes(q)));
    }
    if (filter.tier) teams = teams.filter(t => (t.tier || '').toLowerCase() === filter.tier.toLowerCase());

    const allRegions = [...new Set(DataEngine.getTeams(_data.teams).map(t => t.region))].sort();

    return `
<div class="page-hero reveal">
  <div class="page-hero__label">Organizations</div>
  <h1 class="page-hero__title">Teams</h1>
  <p class="page-hero__subtitle">${teams.length} organizations with international history</p>
</div>
<div class="filter-bar reveal">
  <input type="text" class="navbar__search-input" placeholder="🔍 Search teams…" id="team-search"
         style="width:220px;border-radius:var(--radius-md);" value="${H(filter.search || '')}"
         oninput="Pages.filterTeams()">
  <select class="filter-select" id="team-region-filter" onchange="Pages.filterTeams()">
    <option value="">All Regions</option>
    ${allRegions.map(r => `<option value="${H(r)}" ${filter.region===r?'selected':''}>${H(r)}</option>`).join('')}
  </select>
  <select class="filter-select" id="team-tier-filter" onchange="Pages.filterTeams()">
    <option value="">All Tiers</option>
    <option value="S" ${filter.tier==='S'?'selected':''}>S-Tier</option>
    <option value="A" ${filter.tier==='A'?'selected':''}>A-Tier</option>
    <option value="B" ${filter.tier==='B'?'selected':''}>B-Tier</option>
  </select>
  <span style="font-size:var(--text-sm);color:var(--text-muted);margin-left:auto;">${teams.length} teams</span>
</div>
<div class="rift-grid stagger-children" id="teams-grid">
  ${teams.map(t => buildTeamCard(t)).join('')}
</div>`;
  }

  function buildTeamCard(team) {
    const s = team.stats || {};
    return `
    <div class="team-card neon-border hover-lift" onclick="Router.navigate('teams?id=${H(team.id)}')">
      <div class="team-card__header">
        <div class="team-card__avatar" style="${Utils.teamAvatarStyle(team)}">${Utils.initials(team.name)}</div>
        <div>
          <div class="team-card__name">${H(team.name)}</div>
          <div>${badge(team.region)}</div>
        </div>
        ${team.tier === 'S' ? `<span class="badge badge-gold" style="margin-left:auto;">S-Tier</span>` : ''}
      </div>
      <div class="team-card__stats">
        <div class="team-card__stat-item">
          <span class="team-card__stat-value">${s.worlds_titles || 0}</span>
          <span class="team-card__stat-label">Worlds</span>
        </div>
        <div class="team-card__stat-item">
          <span class="team-card__stat-value">${s.msi_titles || 0}</span>
          <span class="team-card__stat-label">MSI</span>
        </div>
        <div class="team-card__stat-item">
          <span class="team-card__stat-value">${s.worlds_appearances || '—'}</span>
          <span class="team-card__stat-label">Worlds Apps</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2);">
        <span style="font-size:var(--text-xs);color:var(--text-muted);">Dynasty Score</span>
        <span style="font-family:var(--font-mono);font-size:var(--text-sm);font-weight:700;color:var(--gold);">${s.dynasty_score || '—'}/100</span>
      </div>
      <div class="team-card__dynasty-bar">
        <div class="team-card__dynasty-fill" data-width="${s.dynasty_score || 0}%" style="width:0%;background:linear-gradient(90deg,${team.color_primary||'var(--gold-dark)'},${team.color_primary||'var(--gold)'});"></div>
      </div>
    </div>`;
  }

  /* ── TEAM DETAIL PAGE ── */
  function renderTeamDetail(teamId) {
    const team = DataEngine.getTeamById(_data.teams, teamId);
    if (!team) return `<div class="empty-state"><div class="empty-state__icon">🔍</div><div class="empty-state__title">Team not found</div></div>`;

    const s = team.stats || {};
    const worldsH = team.worlds_history || [];
    const msiH = team.msi_history || [];

    return `
<div style="display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-8);">
  <button class="btn btn-ghost" onclick="Router.navigate('teams')">← Back to Teams</button>
</div>
<div class="page-hero reveal">
  <div class="page-hero__label">${badge(team.region)} ${H(team.country || '')}</div>
  <h1 class="page-hero__title" style="color:${team.color_primary || 'var(--gold)'};">${H(team.name)}</h1>
  ${team.aliases?.length ? `<p style="font-size:var(--text-sm);color:var(--text-muted);">Also known as: ${team.aliases.join(', ')}</p>` : ''}
</div>

<!-- Key Stats -->
<div class="stat-cards-row stagger-children" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:var(--space-4);margin-bottom:var(--space-8);">
  ${buildStatCard('Worlds 🏆', s.worlds_titles || 0, '', 'Championships won')}
  ${buildStatCard('MSI ⚔️', s.msi_titles || 0, '', 'MSI championships')}
  ${buildStatCard('Finals', s.worlds_finals || 0, '', 'Worlds finals')}
  ${buildStatCard('Appearances', s.worlds_appearances || 0, '', 'Worlds appearances')}
  ${buildStatCard('Dynasty', s.dynasty_score || '—', '', '/100 score')}
  ${buildStatCard('Intl WR', s.international_winrate ? s.international_winrate.toFixed(1)+'%' : '—', '', 'International games')}
</div>

<!-- Performance Chart -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6);margin-bottom:var(--space-8);">
  <div class="chart-container reveal" style="height:300px;">
    <div class="chart-title">Worlds Performance by Year</div>
    <canvas id="chart-team-performance" style="height:240px;"></canvas>
  </div>
  <div class="card reveal">
    <div class="chart-title">Trophy Cabinet</div>
    <div class="trophy-cabinet" id="trophy-cabinet">
      ${buildTrophyCabinet(team)}
    </div>
  </div>
</div>

<!-- Worlds History -->
<div class="section-header reveal"><div><h2 class="section-title">Worlds History</h2></div></div>
<div class="card reveal" style="padding:0;overflow:hidden;margin-bottom:var(--space-6);">
  <div class="data-table-wrapper">
    <table class="data-table">
      <thead><tr>
        <th>Year</th><th>Result</th><th>Series</th><th>Eliminated By</th>
      </tr></thead>
      <tbody>
        ${[...worldsH].sort((a,b)=>b.year-a.year).map(h => `
        <tr>
          <td style="font-family:var(--font-mono);font-weight:700;">${h.year}</td>
          <td>${Utils.resultPill(h.result)}</td>
          <td style="font-family:var(--font-mono);color:var(--text-secondary);">${H(h.series || '—')}</td>
          <td style="color:var(--text-secondary);">${H(h.eliminated_by || '—')}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>

${msiH.length ? `
<!-- MSI History -->
<div class="section-header reveal"><div><h2 class="section-title">MSI History</h2></div></div>
<div class="card reveal" style="padding:0;overflow:hidden;margin-bottom:var(--space-6);">
  <div class="data-table-wrapper">
    <table class="data-table">
      <thead><tr><th>Year</th><th>Result</th><th>Series</th></tr></thead>
      <tbody>
        ${[...msiH].sort((a,b)=>b.year-a.year).map(h => `
        <tr>
          <td style="font-family:var(--font-mono);font-weight:700;">${h.year}</td>
          <td>${Utils.resultPill(h.result)}</td>
          <td style="font-family:var(--font-mono);color:var(--text-secondary);">${H(h.series || '—')}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>` : ''}

<!-- Roster Eras -->
${team.roster_eras ? `
<div class="section-header reveal"><div><h2 class="section-title">Legendary Rosters</h2></div></div>
<div class="rift-grid stagger-children" style="margin-bottom:var(--space-8);">
  ${team.roster_eras.map(era => `
  <div class="card card--gold">
    <div style="font-family:var(--font-display);font-size:var(--text-xl);font-weight:700;color:var(--gold);margin-bottom:var(--space-1);">${H(era.era)}</div>
    <div style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-3);">${H(era.years)}</div>
    <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);">
      ${(era.players || []).map(p => `<span class="badge badge-gold">${H(p)}</span>`).join('')}
    </div>
  </div>`).join('')}
</div>` : ''}
    `;
  }

  function buildTrophyCabinet(team) {
    const items = [];
    (team.worlds_history || []).filter(h => h.result === 'Champion').forEach(h =>
      items.push({ icon: '🏆', year: h.year, event: 'Worlds' })
    );
    (team.msi_history || []).filter(h => h.result === 'Champion').forEach(h =>
      items.push({ icon: '⚔️', year: h.year, event: 'MSI' })
    );
    items.sort((a, b) => a.year - b.year);
    if (!items.length) return `<div style="color:var(--text-muted);font-size:var(--text-sm);padding:var(--space-4)">No international titles yet.</div>`;
    return items.map(i => `
    <div class="trophy-item animate-glow-gold" style="animation-delay:${Math.random()*1}s">
      <span class="trophy-emoji">${i.icon}</span>
      <span class="trophy-year">${i.year}</span>
      <span class="trophy-event">${i.event}</span>
    </div>`).join('');
  }

  /* ── PLAYERS PAGE ── */
  function renderPlayers(filter = {}) {
    let players = DataEngine.getPlayers(_data.players);
    if (filter.role) players = players.filter(p => p.role.toLowerCase() === filter.role.toLowerCase());
    if (filter.search) {
      const q = filter.search.toLowerCase();
      players = players.filter(p => p.name.toLowerCase().includes(q) || p.real_name?.toLowerCase().includes(q));
    }
    if (filter.active === 'active') players = players.filter(p => p.active);
    if (filter.active === 'retired') players = players.filter(p => !p.active);

    return `
<div class="page-hero reveal">
  <div class="page-hero__label">Legends</div>
  <h1 class="page-hero__title">Players</h1>
  <p class="page-hero__subtitle">${players.length} historic players in the database</p>
</div>
<div class="filter-bar reveal">
  <input type="text" class="navbar__search-input" placeholder="🔍 Search players…" id="player-search"
         style="width:220px;border-radius:var(--radius-md);" value="${H(filter.search || '')}"
         oninput="Pages.filterPlayers()">
  <select class="filter-select" id="player-role-filter" onchange="Pages.filterPlayers()">
    <option value="">All Roles</option>
    ${['Top','Jungle','Mid','Bot','Support'].map(r =>
      `<option value="${r}" ${filter.role===r?'selected':''}>${r}</option>`
    ).join('')}
  </select>
  <select class="filter-select" id="player-active-filter" onchange="Pages.filterPlayers()">
    <option value="">All Players</option>
    <option value="active" ${filter.active==='active'?'selected':''}>Active Only</option>
    <option value="retired" ${filter.active==='retired'?'selected':''}>Retired Only</option>
  </select>
  <span style="font-size:var(--text-sm);color:var(--text-muted);margin-left:auto;">${players.length} players</span>
</div>
<div class="rift-grid stagger-children" id="players-grid">
  ${players.map(p => buildPlayerCard(p)).join('')}
</div>`;
  }

  function buildPlayerCard(player) {
    const s = player.stats || {};
    const titles = [];
    if (s.worlds_titles) for(let i=0;i<s.worlds_titles;i++) titles.push('🏆');
    if (s.msi_titles) for(let i=0;i<s.msi_titles;i++) titles.push('⚔️');

    return `
    <div class="player-card hover-lift neon-border" onclick="Router.navigate('players?id=${H(player.id)}')">
      <div class="player-card__avatar" style="${player.active ? 'border-color:var(--gold);box-shadow:0 0 20px var(--gold-glow);' : ''}">${Utils.initials(player.name)}</div>
      <div class="player-card__name">${H(player.name)}</div>
      <div class="player-card__real-name">${H(player.real_name || '')}</div>
      <div class="player-card__badges">
        ${roleBadge(player.role)}
        <span class="region-badge region-${(player.current_team ? (DataEngine.getTeamById(_data.teams, player.current_team)?.region || 'other') : 'other').toLowerCase()}">${
          player.current_team ? (DataEngine.getTeamById(_data.teams, player.current_team)?.name || player.current_team) : '—'
        }</span>
        ${!player.active ? `<span class="retired-badge">Retired</span>` : ''}
      </div>
      <div class="player-card__titles">
        ${titles.join(' ') || '<span style="font-size:var(--text-xs);color:var(--text-muted);">No intl. titles</span>'}
      </div>
      <div style="display:flex;gap:var(--space-4);margin-top:var(--space-3);">
        <div style="text-align:center;">
          <div style="font-family:var(--font-mono);font-weight:700;font-size:var(--text-lg);color:var(--gold);">${s.worlds_titles || 0}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);">Worlds</div>
        </div>
        <div style="text-align:center;">
          <div style="font-family:var(--font-mono);font-weight:700;font-size:var(--text-lg);color:var(--cyan);">${s.msi_titles || 0}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);">MSI</div>
        </div>
        <div style="text-align:center;">
          <div style="font-family:var(--font-mono);font-weight:700;font-size:var(--text-lg);color:var(--gold);">${s.goat_score || '—'}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);">GOAT</div>
        </div>
      </div>
    </div>`;
  }

  /* ── PLAYER DETAIL ── */
  function renderPlayerDetail(playerId) {
    const player = DataEngine.getPlayerById(_data.players, playerId);
    if (!player) return `<div class="empty-state"><div class="empty-state__icon">🔍</div><div class="empty-state__title">Player not found</div></div>`;

    const s = player.stats || {};
    const currentTeam = player.current_team ? DataEngine.getTeamById(_data.teams, player.current_team) : null;

    return `
<div style="display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-8);">
  <button class="btn btn-ghost" onclick="Router.navigate('players')">← Back to Players</button>
</div>
<div class="page-hero reveal">
  <div class="page-hero__label">${roleBadge(player.role)} ${badge(currentTeam?.region || 'other')}</div>
  <h1 class="page-hero__title gradient-gold">${H(player.name)}</h1>
  <p style="font-size:var(--text-lg);color:var(--text-secondary);">${H(player.real_name || '')} · ${H(player.nationality || '')} · ${player.active ? '<span style="color:var(--win);">● Active</span>' : '<span style="color:var(--text-muted);">Retired ' + (player.retired_year || '') + '</span>'}</p>
  ${player.bio ? `<p class="page-hero__subtitle" style="margin-top:var(--space-3);">${H(player.bio)}</p>` : ''}
</div>

<!-- Key Stats -->
<div class="stat-cards-row stagger-children" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:var(--space-4);margin-bottom:var(--space-8);">
  ${buildStatCard('Worlds 🏆', s.worlds_titles || 0, '', 'Championships')}
  ${buildStatCard('MSI ⚔️', s.msi_titles || 0, '', 'MSI titles')}
  ${buildStatCard('Worlds Finals', s.worlds_finals || 0, '', 'Finals appearances')}
  ${buildStatCard('GOAT Index', s.goat_score || '—', '', '/100 all-time rank')}
  ${buildStatCard('Peak Elo', s.elo_peak ? s.elo_peak.toLocaleString() : '—', '', 'Estimated peak')}
  ${buildStatCard('Est. KDA', s.estimated_career_kda || '—', '', 'Career avg')}
</div>

<!-- Awards & Records -->
${player.awards?.length ? `
<div class="section-header reveal"><div><h2 class="section-title">Awards & Records</h2></div></div>
<div class="rift-grid stagger-children" style="margin-bottom:var(--space-8);">
  ${player.awards.map(a => `
  <div class="card card--gold hover-lift">
    <div style="font-size:24px;margin-bottom:var(--space-2);">🥇</div>
    <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-primary);">${H(a)}</div>
  </div>`).join('')}
</div>` : ''}

<!-- Signature Champions -->
${player.signature_champions?.length ? `
<div class="section-header reveal"><div><h2 class="section-title">Signature Champions</h2></div></div>
<div style="display:flex;flex-wrap:wrap;gap:var(--space-3);margin-bottom:var(--space-8);">
  ${player.signature_champions.map(c => `
  <div class="filter-chip active" style="font-size:var(--text-sm);font-weight:600;padding:var(--space-2) var(--space-4);">
    🎮 ${H(c)}
  </div>`).join('')}
</div>` : ''}

<!-- Career Timeline -->
${player.career_teams?.length ? `
<div class="section-header reveal"><div><h2 class="section-title">Career Timeline</h2></div></div>
<div class="timeline reveal">
  ${player.career_teams.map((ct, i) => `
  <div class="timeline-item">
    <div class="timeline-year">${H(ct.years)}</div>
    <div class="timeline-content">
      <div style="font-family:var(--font-display);font-size:var(--text-lg);font-weight:700;">${H(ct.team_name)}</div>
    </div>
  </div>`).join('')}
</div>` : ''}

<!-- Worlds History -->
${player.worlds_history?.length ? `
<div class="section-header reveal" style="margin-top:var(--space-8);"><div><h2 class="section-title">International Results</h2></div></div>
<div class="card reveal" style="padding:0;overflow:hidden;margin-bottom:var(--space-6);">
  <div class="data-table-wrapper">
    <table class="data-table">
      <thead><tr><th>Year</th><th>Tournament</th><th>Result</th></tr></thead>
      <tbody>
        ${[...player.worlds_history].sort((a,b)=>b.year-a.year).map(h => `
        <tr>
          <td style="font-family:var(--font-mono);font-weight:700;">${h.year}</td>
          <td style="text-transform:capitalize;">${H(h.tournament)}</td>
          <td>${Utils.resultPill(h.result)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>` : ''}
    `;
  }

  /* ── REGIONS PAGE ── */
  function renderRegions() {
    const regions = DataEngine.getActiveRegions(_data.regions);
    const domIndex = DataEngine.getRegionalDominance(_data.stats);

    return `
<div class="page-hero reveal">
  <div class="page-hero__label">Global Coverage</div>
  <h1 class="page-hero__title">Regions</h1>
  <p class="page-hero__subtitle">Major and minor league coverage from around the world</p>
</div>

<!-- Regional Winrate Chart -->
<div class="chart-container reveal" style="height:380px;margin-bottom:var(--space-8);">
  <div class="chart-title">Regional International Winrate</div>
  <canvas id="chart-regional-winrate" style="height:320px;"></canvas>
</div>

<!-- Dominance Index Table -->
<div class="section-header reveal"><div><h2 class="section-title">Dominance Index</h2></div></div>
<div class="card reveal" style="padding:0;overflow:hidden;margin-bottom:var(--space-8);">
  <div class="data-table-wrapper">
    <table class="data-table" id="table-regions">
      <thead><tr>
        <th style="width:48px;">#</th>
        <th data-sort="region">Region</th>
        <th data-sort="index">Dominance Index</th>
        <th data-sort="worlds">Worlds 🏆</th>
        <th data-sort="msi">MSI ⚔️</th>
        <th data-sort="winrate">Intl WR %</th>
        <th>Strength Bar</th>
      </tr></thead>
      <tbody>
        ${domIndex.map((r, i) => `
        <tr>
          <td class="rank-cell rank-${i+1}" data-key="rank" data-value="${i+1}">${i+1}</td>
          <td data-key="region" data-value="${H(r.region)}">
            <div style="display:flex;align-items:center;gap:var(--space-2);">
              ${badge(r.region)}
              <span style="font-weight:700;font-family:var(--font-display);font-size:var(--text-base);">${H(r.region)}</span>
            </div>
          </td>
          <td data-key="index" data-value="${r.index}">
            <span style="font-family:var(--font-mono);font-weight:700;font-size:var(--text-lg);color:${r.index >= 80 ? 'var(--gold)' : r.index >= 60 ? 'var(--cyan)' : 'var(--text-secondary)'};">${r.index}</span>
          </td>
          <td data-key="worlds" data-value="${r.worlds_titles}" style="font-family:var(--font-mono);font-weight:700;color:var(--gold-light);">${r.worlds_titles}</td>
          <td data-key="msi" data-value="${r.msi_titles}" style="font-family:var(--font-mono);color:var(--cyan);">${r.msi_titles}</td>
          <td data-key="winrate" data-value="${r.intl_winrate}"  style="font-family:var(--font-mono);color:${r.intl_winrate >= 60 ? 'var(--win)' : r.intl_winrate >= 40 ? 'var(--gold)' : 'var(--text-secondary)'};">${r.intl_winrate.toFixed(1)}%</td>
          <td style="width:120px;">
            <div class="progress-bar">
              <div class="progress-bar__fill" data-width="${r.index}%" style="width:0%;background:${Utils.regionColor(r.region)};"></div>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>

<!-- Region Cards -->
<div class="section-header reveal"><div><h2 class="section-title">All Regions</h2></div></div>
<div class="rift-grid stagger-children">
  ${regions.map(r => buildRegionCard(r)).join('')}
</div>`;
  }

  function buildRegionCard(region) {
    const s = region.stats || {};
    return `
    <div class="card hover-lift neon-border" style="border-color:${region.color}22;cursor:pointer;"
         onclick="Utils.showToast('Region detail view coming soon!', 'info')">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4);">
        <div style="display:flex;align-items:center;gap:var(--space-3);">
          <span style="font-size:24px;">${region.flag || '🌐'}</span>
          <div>
            <div style="font-family:var(--font-display);font-size:var(--text-xl);font-weight:700;color:${region.color};">${H(region.name)}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);">${H(region.country)}</div>
          </div>
        </div>
        ${!region.active ? `<span class="retired-badge">Inactive</span>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3);">
        <div style="text-align:center;">
          <div style="font-family:var(--font-mono);font-weight:700;font-size:var(--text-xl);color:${region.color};">${s.worlds_titles || 0}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);">Worlds</div>
        </div>
        <div style="text-align:center;">
          <div style="font-family:var(--font-mono);font-weight:700;font-size:var(--text-xl);color:var(--cyan);">${s.msi_titles || 0}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);">MSI</div>
        </div>
        <div style="text-align:center;">
          <div style="font-family:var(--font-mono);font-weight:700;font-size:var(--text-xl);color:${(s.international_winrate_vs_all||0) >= 60 ? 'var(--win)' : 'var(--text-secondary)'};">${s.international_winrate_vs_all?.toFixed(0) || '—'}%</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);">Intl WR</div>
        </div>
      </div>
    </div>`;
  }

  /* ── MATCHES PAGE ── */
  function renderMatches(filter = {}) {
    let matches = DataEngine.getNotableMatches(_data.matches);
    if (filter.tag) matches = matches.filter(m => m.tags?.includes(filter.tag));
    if (filter.search) {
      const q = filter.search.toLowerCase();
      matches = matches.filter(m =>
        (m.team1 || '').includes(q) || (m.team2 || '').includes(q) ||
        (m.notable || '').toLowerCase().includes(q) ||
        (m.round || '').toLowerCase().includes(q)
      );
    }

    const allTags = [...new Set(DataEngine.getNotableMatches(_data.matches).flatMap(m => m.tags || []))].sort();

    return `
<div class="page-hero reveal">
  <div class="page-hero__label">Historic Matches</div>
  <h1 class="page-hero__title">Match Database</h1>
  <p class="page-hero__subtitle">${matches.length} historic matches, reverse sweeps, and upsets</p>
</div>
<div class="filter-bar reveal">
  <input type="text" class="navbar__search-input" placeholder="🔍 Search matches…" id="match-search"
         style="width:220px;border-radius:var(--radius-md);" value="${H(filter.search || '')}"
         oninput="Pages.filterMatches()">
  <select class="filter-select" id="match-tag-filter" onchange="Pages.filterMatches()">
    <option value="">All Types</option>
    ${allTags.map(t => `<option value="${H(t)}" ${filter.tag===t?'selected':''}>${H(t.replace(/-/g,' '))}</option>`).join('')}
  </select>
  <span style="font-size:var(--text-sm);color:var(--text-muted);margin-left:auto;">${matches.length} matches</span>
</div>
<div class="rift-grid stagger-children" id="matches-grid">
  ${matches.map(m => buildMatchCard(m)).join('')}
</div>`;
  }

  function buildMatchCard(match) {
    const team1 = DataEngine.getTeamById(_data.teams, match.team1);
    const team2 = DataEngine.getTeamById(_data.teams, match.team2);
    const isFinal = match.tags?.includes('final');

    return `
    <div class="card hover-lift ${isFinal ? 'card--gold' : ''}" style="cursor:default;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
        <div>
          <span class="badge badge-neutral" style="text-transform:capitalize;">${H((match.round||'').replace(/-/g,' '))}</span>
          ${match.date ? `<span style="font-size:var(--text-xs);color:var(--text-muted);margin-left:var(--space-2);">${Utils.formatDate(match.date)}</span>` : ''}
        </div>
        ${isFinal ? '<span style="font-size:18px;">🏆</span>' : ''}
      </div>
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3);">
        <div style="flex:1;text-align:center;">
          <div style="font-family:var(--font-display);font-size:var(--text-xl);font-weight:700;">${H(team1?.name || match.team1)}</div>
          ${team1 ? `<div>${badge(team1.region)}</div>` : ''}
        </div>
        <div style="font-family:var(--font-display);font-size:var(--text-3xl);font-weight:700;color:var(--gold);padding:0 var(--space-3);">
          ${match.team1_score ?? '?'} – ${match.team2_score ?? '?'}
        </div>
        <div style="flex:1;text-align:center;">
          <div style="font-family:var(--font-display);font-size:var(--text-xl);font-weight:700;">${H(team2?.name || match.team2)}</div>
          ${team2 ? `<div>${badge(team2.region)}</div>` : ''}
        </div>
      </div>
      ${match.notable ? `<p style="font-size:var(--text-sm);color:var(--text-secondary);line-height:var(--leading-loose);border-top:1px solid var(--border-subtle);padding-top:var(--space-3);">${H(match.notable)}</p>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);margin-top:var(--space-3);">
        ${(match.tags||[]).map(tag => `<span class="era-tag">${H(tag.replace(/-/g,' '))}</span>`).join('')}
      </div>
    </div>`;
  }

  /* ── TOURNAMENTS PAGE ── */
  function renderTournaments() {
    const worlds = DataEngine.getWorldsHistory(_data.tournaments);
    const msi    = DataEngine.getMSIHistory(_data.tournaments);
    const ewc    = DataEngine.getEWCHistory(_data.tournaments);

    return `
<div class="page-hero reveal">
  <div class="page-hero__label">Competition History</div>
  <h1 class="page-hero__title">Tournaments</h1>
  <p class="page-hero__subtitle">Complete international tournament history since 2011</p>
</div>

<!-- WORLDS -->
<div class="section-header reveal"><div><h2 class="section-title">🏆 World Championship</h2></div></div>
<div class="card reveal" style="padding:0;overflow:hidden;margin-bottom:var(--space-8);">
  <div class="data-table-wrapper">
    <table class="data-table">
      <thead><tr>
        <th>Year</th><th>Champion</th><th>Region</th><th>Runner-Up</th><th>Series</th><th>MVP</th><th>Location</th>
      </tr></thead>
      <tbody>
        ${[...worlds].sort((a,b)=>b.year-a.year).map(w => `
        <tr>
          <td style="font-family:var(--font-mono);font-weight:700;color:var(--gold);">${w.year}</td>
          <td>
            <div style="display:flex;align-items:center;gap:var(--space-2);">
              <span style="font-size:14px;">🏆</span>
              <span style="font-weight:700;font-family:var(--font-display);">${H(w.champion || 'TBD')}</span>
            </div>
          </td>
          <td>${w.champion_region ? badge(w.champion_region) : '—'}</td>
          <td style="color:var(--text-secondary);">${H(w.runner_up || '—')}</td>
          <td style="font-family:var(--font-mono);color:var(--cyan);">${H(w.series || '—')}</td>
          <td style="font-weight:600;">${H(w.mvp || '—')}</td>
          <td style="font-size:var(--text-xs);color:var(--text-secondary);">${H(w.location || '—')}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>

<!-- MSI -->
<div class="section-header reveal"><div><h2 class="section-title">⚔️ Mid-Season Invitational</h2></div></div>
<div class="card reveal" style="padding:0;overflow:hidden;margin-bottom:var(--space-8);">
  <div class="data-table-wrapper">
    <table class="data-table">
      <thead><tr>
        <th>Year</th><th>Champion</th><th>Region</th><th>Runner-Up</th><th>Series</th><th>Location</th>
      </tr></thead>
      <tbody>
        ${[...msi].sort((a,b)=>b.year-a.year).map(m => `
        <tr>
          <td style="font-family:var(--font-mono);font-weight:700;color:var(--cyan);">${m.year}</td>
          <td>
            ${m.champion ? `
            <div style="display:flex;align-items:center;gap:var(--space-2);">
              <span>⚔️</span>
              <span style="font-weight:700;font-family:var(--font-display);">${H(m.champion)}</span>
            </div>` : '<span style="color:var(--text-muted);">Cancelled</span>'}
          </td>
          <td>${m.champion_region ? badge(m.champion_region) : '—'}</td>
          <td style="color:var(--text-secondary);">${H(m.runner_up || '—')}</td>
          <td style="font-family:var(--font-mono);color:var(--text-secondary);">${H(m.series || '—')}</td>
          <td style="font-size:var(--text-xs);color:var(--text-secondary);">${H(m.location || '—')}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>

<!-- EWC -->
<div class="section-header reveal"><div><h2 class="section-title">🌍 Esports World Cup</h2></div></div>
<div class="rift-grid stagger-children">
  ${ewc.map(e => `
  <div class="card card--cyan hover-lift">
    <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-muted);">EWC ${e.year}</div>
    <div style="font-family:var(--font-display);font-size:var(--text-2xl);font-weight:700;color:var(--cyan);margin:var(--space-2) 0;">${H(e.champion || 'TBD')}</div>
    ${e.champion_region ? badge(e.champion_region) : ''}
    <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:var(--space-3);">${H(e.location || '—')}</div>
    ${e.notable ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-3);border-top:1px solid var(--border-subtle);padding-top:var(--space-3);">${H(e.notable)}</div>` : ''}
  </div>`).join('')}
</div>`;
  }

  /* ── COMPARE PAGE ── */
  function renderCompare() {
    const teams = DataEngine.getTeams(_data.teams);
    const players = DataEngine.getPlayers(_data.players);

    return `
<div class="page-hero reveal">
  <div class="page-hero__label">Analytics Tool</div>
  <h1 class="page-hero__title">Compare</h1>
  <p class="page-hero__subtitle">Head-to-head comparison tool for teams and players</p>
</div>

<!-- Tabs -->
<div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-6);">
  <button class="filter-chip active" id="compare-tab-teams" onclick="Pages.switchCompareTab('teams')">Teams</button>
  <button class="filter-chip" id="compare-tab-players" onclick="Pages.switchCompareTab('players')">Players</button>
</div>

<!-- Team Compare -->
<div id="compare-teams" class="reveal">
  <div class="comparison-select">
    <select class="filter-select" id="compare-team1" onchange="Pages.renderTeamComparison()" style="height:48px;font-size:var(--text-base);">
      <option value="">Select Team 1…</option>
      ${teams.map(t => `<option value="${H(t.id)}">${H(t.name)}</option>`).join('')}
    </select>
    <div class="comparison-vs">VS</div>
    <select class="filter-select" id="compare-team2" onchange="Pages.renderTeamComparison()" style="height:48px;font-size:var(--text-base);">
      <option value="">Select Team 2…</option>
      ${teams.map(t => `<option value="${H(t.id)}">${H(t.name)}</option>`).join('')}
    </select>
  </div>
  <div id="compare-team-result"></div>
</div>

<!-- Player Compare -->
<div id="compare-players" style="display:none;" class="reveal">
  <div class="comparison-select">
    <select class="filter-select" id="compare-player1" onchange="Pages.renderPlayerComparison()" style="height:48px;font-size:var(--text-base);">
      <option value="">Select Player 1…</option>
      ${players.map(p => `<option value="${H(p.id)}">${H(p.name)}</option>`).join('')}
    </select>
    <div class="comparison-vs">VS</div>
    <select class="filter-select" id="compare-player2" onchange="Pages.renderPlayerComparison()" style="height:48px;font-size:var(--text-base);">
      <option value="">Select Player 2…</option>
      ${players.map(p => `<option value="${H(p.id)}">${H(p.name)}</option>`).join('')}
    </select>
  </div>
  <div id="compare-player-result"></div>
</div>`;
  }

  function switchCompareTab(tab) {
    document.getElementById('compare-teams').style.display  = tab === 'teams'   ? '' : 'none';
    document.getElementById('compare-players').style.display = tab === 'players' ? '' : 'none';
    document.getElementById('compare-tab-teams').classList.toggle('active', tab === 'teams');
    document.getElementById('compare-tab-players').classList.toggle('active', tab === 'players');
  }

  function renderTeamComparison() {
    const id1 = document.getElementById('compare-team1')?.value;
    const id2 = document.getElementById('compare-team2')?.value;
    const res = document.getElementById('compare-team-result');
    if (!res || !id1 || !id2 || id1 === id2) {
      if (res) res.innerHTML = '';
      return;
    }
    const t1 = DataEngine.getTeamById(_data.teams, id1);
    const t2 = DataEngine.getTeamById(_data.teams, id2);
    if (!t1 || !t2) return;

    const metrics = [
      { label: 'Worlds Titles',    key: 'worlds_titles',    higher: true },
      { label: 'MSI Titles',       key: 'msi_titles',       higher: true },
      { label: 'Worlds Finals',    key: 'worlds_finals',    higher: true },
      { label: 'Worlds Appearances', key: 'worlds_appearances', higher: true },
      { label: 'Dynasty Score',    key: 'dynasty_score',    higher: true },
      { label: 'Intl Winrate %',   key: 'international_winrate', higher: true },
    ];

    res.innerHTML = `
    <div class="card">
      <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:var(--space-4);margin-bottom:var(--space-6);">
        <div style="text-align:center;">
          <div class="team-card__avatar" style="${Utils.teamAvatarStyle(t1)};width:64px;height:64px;font-size:var(--text-2xl);margin:0 auto var(--space-3);">${Utils.initials(t1.name)}</div>
          <div style="font-family:var(--font-display);font-size:var(--text-2xl);font-weight:700;color:${t1.color_primary||'var(--gold)'};">${H(t1.name)}</div>
          ${badge(t1.region)}
        </div>
        <div style="font-family:var(--font-display);font-size:var(--text-5xl);font-weight:700;color:var(--text-muted);align-self:center;">VS</div>
        <div style="text-align:center;">
          <div class="team-card__avatar" style="${Utils.teamAvatarStyle(t2)};width:64px;height:64px;font-size:var(--text-2xl);margin:0 auto var(--space-3);">${Utils.initials(t2.name)}</div>
          <div style="font-family:var(--font-display);font-size:var(--text-2xl);font-weight:700;color:${t2.color_primary||'var(--gold)'};">${H(t2.name)}</div>
          ${badge(t2.region)}
        </div>
      </div>
      ${metrics.map(m => {
        const v1 = t1.stats?.[m.key] || 0;
        const v2 = t2.stats?.[m.key] || 0;
        const winner = v1 > v2 ? 1 : v1 < v2 ? 2 : 0;
        return `
        <div class="comparison-bar">
          <div style="text-align:right;font-family:var(--font-mono);font-size:var(--text-xl);font-weight:700;color:${winner===1?'var(--win)':winner===2?'var(--loss)':'var(--text-secondary)'};">${v1}</div>
          <div class="comparison-bar__label">${H(m.label)}</div>
          <div style="text-align:left;font-family:var(--font-mono);font-size:var(--text-xl);font-weight:700;color:${winner===2?'var(--win)':winner===1?'var(--loss)':'var(--text-secondary)'};">${v2}</div>
        </div>`;
      }).join('')}
    </div>`;
  }

  function renderPlayerComparison() {
    const id1 = document.getElementById('compare-player1')?.value;
    const id2 = document.getElementById('compare-player2')?.value;
    const res = document.getElementById('compare-player-result');
    if (!res || !id1 || !id2 || id1 === id2) {
      if (res) res.innerHTML = '';
      return;
    }
    const p1 = DataEngine.getPlayerById(_data.players, id1);
    const p2 = DataEngine.getPlayerById(_data.players, id2);
    if (!p1 || !p2) return;

    const metrics = [
      { label: 'Worlds Titles',  key: 'worlds_titles',  higher: true },
      { label: 'MSI Titles',     key: 'msi_titles',     higher: true },
      { label: 'GOAT Score',     key: 'goat_score',     higher: true },
      { label: 'Peak Elo',       key: 'elo_peak',       higher: true },
      { label: 'Est. KDA',       key: 'estimated_career_kda', higher: true },
    ];

    res.innerHTML = `
    <div class="card">
      <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:var(--space-4);margin-bottom:var(--space-6);">
        <div style="text-align:center;">
          <div class="player-card__avatar" style="width:64px;height:64px;font-size:var(--text-2xl);margin:0 auto var(--space-3);">${Utils.initials(p1.name)}</div>
          <div style="font-family:var(--font-display);font-size:var(--text-2xl);font-weight:700;">${H(p1.name)}</div>
          ${roleBadge(p1.role)}
        </div>
        <div style="font-family:var(--font-display);font-size:var(--text-5xl);font-weight:700;color:var(--text-muted);align-self:center;">VS</div>
        <div style="text-align:center;">
          <div class="player-card__avatar" style="width:64px;height:64px;font-size:var(--text-2xl);margin:0 auto var(--space-3);">${Utils.initials(p2.name)}</div>
          <div style="font-family:var(--font-display);font-size:var(--text-2xl);font-weight:700;">${H(p2.name)}</div>
          ${roleBadge(p2.role)}
        </div>
      </div>
      ${metrics.map(m => {
        const v1 = p1.stats?.[m.key] || 0;
        const v2 = p2.stats?.[m.key] || 0;
        const winner = v1 > v2 ? 1 : v1 < v2 ? 2 : 0;
        return `
        <div class="comparison-bar">
          <div style="text-align:right;font-family:var(--font-mono);font-size:var(--text-xl);font-weight:700;color:${winner===1?'var(--win)':winner===2?'var(--loss)':'var(--text-secondary)'};">${v1}</div>
          <div class="comparison-bar__label">${H(m.label)}</div>
          <div style="text-align:left;font-family:var(--font-mono);font-size:var(--text-xl);font-weight:700;color:${winner===2?'var(--win)':winner===1?'var(--loss)':'var(--text-secondary)'};">${v2}</div>
        </div>`;
      }).join('')}
    </div>`;
  }

  /* ── FILTER HELPERS (called from inline handlers) ── */
  function filterTeams() {
    const search = document.getElementById('team-search')?.value || '';
    const region = document.getElementById('team-region-filter')?.value || '';
    const tier   = document.getElementById('team-tier-filter')?.value || '';
    const grid = document.getElementById('teams-grid');
    if (grid) grid.innerHTML = '<div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div></div>';
    setTimeout(() => {
      if (grid) grid.innerHTML = DataEngine.getTeams(_data.teams)
        .filter(t => (!region || t.region === region) && (!tier || t.tier === tier) &&
          (!search || t.name.toLowerCase().includes(search.toLowerCase()) || t.aliases?.some(a => a.toLowerCase().includes(search.toLowerCase()))))
        .map(t => buildTeamCard(t)).join('');
      Utils.initScrollReveal();
    }, 150);
  }

  function filterPlayers() {
    const search = document.getElementById('player-search')?.value || '';
    const role   = document.getElementById('player-role-filter')?.value || '';
    const active = document.getElementById('player-active-filter')?.value || '';
    const grid = document.getElementById('players-grid');
    if (grid) {
      grid.innerHTML = DataEngine.getPlayers(_data.players)
        .filter(p =>
          (!role   || p.role === role) &&
          (!active || (active === 'active' ? p.active : !p.active)) &&
          (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.real_name?.toLowerCase().includes(search.toLowerCase()))
        )
        .map(p => buildPlayerCard(p)).join('');
      Utils.initScrollReveal();
    }
  }

  function filterMatches() {
    const search = document.getElementById('match-search')?.value || '';
    const tag    = document.getElementById('match-tag-filter')?.value || '';
    const grid = document.getElementById('matches-grid');
    if (grid) {
      grid.innerHTML = DataEngine.getNotableMatches(_data.matches)
        .filter(m =>
          (!tag    || m.tags?.includes(tag)) &&
          (!search || [(m.team1||''),(m.team2||''),(m.notable||''),(m.round||'')].join(' ').toLowerCase().includes(search.toLowerCase()))
        )
        .map(m => buildMatchCard(m)).join('');
      Utils.initScrollReveal();
    }
  }

  return {
    init,
    renderHome, renderTeams, renderTeamDetail,
    renderPlayers, renderPlayerDetail,
    renderRegions, renderMatches, renderTournaments, renderCompare,
    filterTeams, filterPlayers, filterMatches,
    switchCompareTab, renderTeamComparison, renderPlayerComparison
  };
})();
