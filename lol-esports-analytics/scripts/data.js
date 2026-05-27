/* ============================================================
   DATA ENGINE — loads and caches all JSON data files
   ============================================================ */

const DataEngine = (() => {
  const cache = {};

  async function load(name) {
    if (cache[name]) return cache[name];
    try {
      const res = await fetch(`data/${name}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status} loading ${name}.json`);
      cache[name] = await res.json();
      return cache[name];
    } catch (err) {
      console.error(`[DataEngine] Failed to load ${name}:`, err);
      return null;
    }
  }

  async function loadAll() {
    const [teams, players, tournaments, regions, matches, stats] = await Promise.all([
      load('teams'), load('players'), load('tournaments'),
      load('regions'), load('matches'), load('stats')
    ]);
    return { teams, players, tournaments, regions, matches, stats };
  }

  /* ── TEAMS ── */
  function getTeams(data) {
    return data?.teams?.teams || [];
  }

  function getTeamById(data, id) {
    return getTeams(data).find(t => t.id === id) || null;
  }

  function getTeamsByRegion(data, regionId) {
    return getTeams(data).filter(t => t.region.toLowerCase() === regionId.toLowerCase());
  }

  function getTopTeamsByMetric(data, metric, n = 10) {
    return [...getTeams(data)]
      .filter(t => t.stats?.[metric] != null)
      .sort((a, b) => (b.stats[metric] || 0) - (a.stats[metric] || 0))
      .slice(0, n);
  }

  /* ── PLAYERS ── */
  function getPlayers(data) {
    return data?.players?.players || [];
  }

  function getPlayerById(data, id) {
    return getPlayers(data).find(p => p.id === id) || null;
  }

  function getPlayersByRole(data, role) {
    return getPlayers(data).filter(p => p.role.toLowerCase() === role.toLowerCase());
  }

  function getPlayersByTeam(data, teamId) {
    const team = getTeamById(data.teams, teamId);
    if (!team) return [];
    return getPlayers(data).filter(p => team.notable_players?.includes(p.id));
  }

  /* ── TOURNAMENTS ── */
  function getWorldsHistory(data) {
    return data?.tournaments?.worlds || [];
  }

  function getMSIHistory(data) {
    return data?.tournaments?.msi || [];
  }

  function getEWCHistory(data) {
    return data?.tournaments?.ewc || [];
  }

  function getAllTournaments(data) {
    const worlds = (data?.tournaments?.worlds || []).map(t => ({ ...t, type: 'worlds' }));
    const msi    = (data?.tournaments?.msi || []).map(t => ({ ...t, type: 'msi' }));
    const ewc    = (data?.tournaments?.ewc || []).map(t => ({ ...t, type: 'ewc' }));
    return [...worlds, ...msi, ...ewc].sort((a, b) => b.year - a.year);
  }

  /* ── REGIONS ── */
  function getRegions(data) {
    return data?.regions?.regions || [];
  }

  function getRegionById(data, id) {
    return getRegions(data).find(r => r.id === id) || null;
  }

  function getActiveRegions(data) {
    return getRegions(data).filter(r => r.active);
  }

  /* ── MATCHES ── */
  function getNotableMatches(data) {
    return data?.matches?.notable_matches || [];
  }

  function getMatchesByTag(data, tag) {
    return getNotableMatches(data).filter(m => m.tags?.includes(tag));
  }

  function getMatchesByTeam(data, teamId) {
    return getNotableMatches(data).filter(m =>
      m.team1 === teamId || m.team2 === teamId
    );
  }

  /* ── GLOBAL STATS ── */
  function getGlobalRecords(data) {
    return data?.stats?.global_records || {};
  }

  function getRegionalDominance(data) {
    return data?.stats?.regional_dominance_index || [];
  }

  function getDynastyScores(data) {
    return data?.stats?.team_dynasty_scores || [];
  }

  function getGoatIndex(data) {
    return data?.stats?.goat_index || [];
  }

  function getEraAnalysis(data) {
    return data?.stats?.era_analysis || [];
  }

  function getWorldsWinnersByRegion(data) {
    return data?.stats?.worlds_winner_by_region || {};
  }

  function getMSIWinnersByRegion(data) {
    return data?.stats?.msi_winner_by_region || {};
  }

  /* ── SEARCH ── */
  function search(data, query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const results = [];

    // Teams
    for (const team of getTeams(data.teams)) {
      const match = team.name.toLowerCase().includes(q)
        || team.aliases?.some(a => a.toLowerCase().includes(q));
      if (match) results.push({ type: 'team', id: team.id, name: team.name, sub: team.region });
    }

    // Players
    for (const player of getPlayers(data.players)) {
      const match = player.name.toLowerCase().includes(q)
        || player.real_name?.toLowerCase().includes(q);
      if (match) results.push({ type: 'player', id: player.id, name: player.name, sub: player.role });
    }

    // Tournaments
    const allT = getAllTournaments(data.tournaments);
    for (const t of allT) {
      if ((t.champion || '').toLowerCase().includes(q)
        || (t.name || '').toLowerCase().includes(q)) {
        results.push({ type: 'tournament', id: t.id, name: t.name, sub: t.year });
      }
    }

    return results.slice(0, 12);
  }

  return {
    load, loadAll,
    getTeams, getTeamById, getTeamsByRegion, getTopTeamsByMetric,
    getPlayers, getPlayerById, getPlayersByRole, getPlayersByTeam,
    getWorldsHistory, getMSIHistory, getEWCHistory, getAllTournaments,
    getRegions, getRegionById, getActiveRegions,
    getNotableMatches, getMatchesByTag, getMatchesByTeam,
    getGlobalRecords, getRegionalDominance, getDynastyScores, getGoatIndex,
    getEraAnalysis, getWorldsWinnersByRegion, getMSIWinnersByRegion,
    search
  };
})();
