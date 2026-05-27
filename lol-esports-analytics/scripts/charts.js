/* ============================================================
   CHART ENGINE — Chart.js configurations and renders
   ============================================================ */

const Charts = (() => {

  /* ── SHARED DEFAULTS ── */
  const GOLD  = '#C89B3C';
  const CYAN  = '#00D4FF';
  const WIN   = '#00E676';
  const LOSS  = '#FF4444';
  const MUTED = '#4A5568';

  const FONT_DISPLAY = "'Rajdhani', sans-serif";
  const FONT_MONO    = "'JetBrains Mono', monospace";
  const FONT_BODY    = "'Inter', sans-serif";

  const TEXT_PRIMARY   = '#F0F2F8';
  const TEXT_SECONDARY = '#9BA3B5';
  const BG_CARD        = 'rgba(255,255,255,0.04)';
  const BG_ELEVATED    = '#141b2d';
  const BORDER_COLOR   = 'rgba(255,255,255,0.08)';

  const REGION_COLORS = {
    LCK:   GOLD,
    LPL:   '#FF4B4B',
    LEC:   '#9B59B6',
    LCS:   '#00A1DE',
    PCS:   '#E67E22',
    LMS:   '#E67E22',
    LJL:   '#E74C3C',
    CBLOL: '#27AE60',
    VCS:   '#F39C12',
    LLA:   '#16A085',
    Other: MUTED
  };

  function defaults() {
    if (!window.Chart) return;
    Chart.defaults.color = TEXT_SECONDARY;
    Chart.defaults.font.family = FONT_BODY;
    Chart.defaults.font.size = 12;
    Chart.defaults.plugins.legend.labels.color = TEXT_SECONDARY;
    Chart.defaults.plugins.tooltip.backgroundColor = BG_ELEVATED;
    Chart.defaults.plugins.tooltip.borderColor = BORDER_COLOR;
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.titleColor = TEXT_PRIMARY;
    Chart.defaults.plugins.tooltip.bodyColor = TEXT_SECONDARY;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.titleFont = { family: FONT_DISPLAY, weight: '700', size: 14 };
  }

  const instances = {};

  function destroy(id) {
    if (instances[id]) {
      instances[id].destroy();
      delete instances[id];
    }
  }

  /* ── WORLDS TITLES BAR CHART ── */
  function worldsTitlesBar(canvasId, teams) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    const top = teams
      .filter(t => t.stats?.worlds_titles > 0)
      .sort((a, b) => b.stats.worlds_titles - a.stats.worlds_titles)
      .slice(0, 10);

    instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: top.map(t => t.name),
        datasets: [{
          label: 'Worlds Titles',
          data: top.map(t => t.stats.worlds_titles),
          backgroundColor: top.map(t => t.color_primary || GOLD),
          borderColor: top.map(t => t.color_primary || GOLD),
          borderWidth: 0,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: ctx => ctx[0].label,
              label: ctx => `🏆 ${ctx.raw} World Championship${ctx.raw !== 1 ? 's' : ''}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: BORDER_COLOR, drawTicks: false },
            ticks: { color: TEXT_SECONDARY, font: { family: FONT_DISPLAY, weight: '600', size: 13 } }
          },
          y: {
            beginAtZero: true,
            max: 5,
            ticks: { stepSize: 1, color: TEXT_SECONDARY, font: { family: FONT_MONO, size: 11 } },
            grid: { color: BORDER_COLOR }
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart',
          delay: ctx => ctx.dataIndex * 80
        }
      }
    });
    return instances[canvasId];
  }

  /* ── REGION PIE CHART — Worlds Titles ── */
  function regionPie(canvasId, regionWinners) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    const data = Object.entries(regionWinners)
      .map(([region, info]) => ({ region, count: info.count }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);

    instances[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.region),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: data.map(d => REGION_COLORS[d.region] || MUTED),
          borderColor: '#0a0f1e',
          borderWidth: 3,
          hoverBorderWidth: 5,
          hoverBorderColor: data.map(d => REGION_COLORS[d.region] || MUTED),
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: TEXT_SECONDARY,
              font: { family: FONT_DISPLAY, weight: '600', size: 13 },
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 12
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.raw} title${ctx.raw !== 1 ? 's' : ''}`
            }
          }
        },
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1200,
          easing: 'easeOutQuart'
        }
      }
    });
    return instances[canvasId];
  }

  /* ── ERA TIMELINE LINE CHART ── */
  function eraTimeline(canvasId) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    const years = [2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023];
    const lckWins  = [1,0,1,1,1,1,1,0,0,1,0,1,1];
    const lplWins  = [0,0,0,0,0,0,0,1,1,0,1,0,0];
    const lecWins  = [1,0,0,0,0,0,0,0,0,0,0,0,0];
    const otherWins= [0,1,0,0,0,0,0,0,0,0,0,0,0];

    // Running total over time
    function cumulative(arr) {
      let s = 0; return arr.map(v => (s += v));
    }

    instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: years,
        datasets: [
          {
            label: 'LCK',
            data: cumulative(lckWins),
            borderColor: GOLD,
            backgroundColor: 'rgba(200,155,60,0.08)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: GOLD,
            pointRadius: 4,
            pointHoverRadius: 7
          },
          {
            label: 'LPL',
            data: cumulative(lplWins),
            borderColor: '#FF4B4B',
            backgroundColor: 'rgba(255,75,75,0.06)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#FF4B4B',
            pointRadius: 4,
            pointHoverRadius: 7
          },
          {
            label: 'LEC',
            data: cumulative(lecWins),
            borderColor: '#9B59B6',
            backgroundColor: 'rgba(155,89,182,0.06)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#9B59B6',
            pointRadius: 3,
            pointHoverRadius: 6
          },
          {
            label: 'Other',
            data: cumulative(otherWins),
            borderColor: MUTED,
            backgroundColor: 'rgba(127,140,141,0.04)',
            borderWidth: 1.5,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: MUTED,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderDash: [4, 4]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: TEXT_SECONDARY,
              font: { family: FONT_DISPLAY, weight: '600', size: 13 },
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            callbacks: {
              title: ctx => 'Worlds ' + ctx[0].label,
              label: ctx => ` ${ctx.dataset.label}: ${ctx.raw} cumulative title${ctx.raw !== 1 ? 's' : ''}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: BORDER_COLOR },
            ticks: { color: TEXT_SECONDARY, font: { family: FONT_MONO, size: 11 } }
          },
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: TEXT_SECONDARY,
              font: { family: FONT_MONO, size: 11 }
            },
            grid: { color: BORDER_COLOR }
          }
        },
        animation: { duration: 1400, easing: 'easeOutQuart' }
      }
    });
    return instances[canvasId];
  }

  /* ── DYNASTY RADAR CHART ── */
  function dynastyRadar(canvasId, teams) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    const top5 = [...teams]
      .sort((a, b) => (b.stats?.dynasty_score || 0) - (a.stats?.dynasty_score || 0))
      .slice(0, 5);

    const labels = ['Worlds Titles', 'MSI Titles', 'Finals Apps', 'Consistency', 'Peak Era'];

    function teamRadarData(t) {
      return [
        Math.min(100, (t.stats?.worlds_titles || 0) * 25),
        Math.min(100, (t.stats?.msi_titles || 0) * 30),
        Math.min(100, (t.stats?.worlds_finals || 0) * 16),
        t.stats?.international_winrate || 40,
        t.stats?.dynasty_score || 40
      ];
    }

    const palette = [GOLD, '#FF4B4B', '#9B59B6', CYAN, WIN];

    instances[canvasId] = new Chart(canvas, {
      type: 'radar',
      data: {
        labels,
        datasets: top5.map((t, i) => ({
          label: t.name,
          data: teamRadarData(t),
          borderColor: palette[i],
          backgroundColor: palette[i].replace(')', ',0.08)').replace('rgb', 'rgba'),
          borderWidth: 2,
          pointBackgroundColor: palette[i],
          pointRadius: 4
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: TEXT_SECONDARY, font: { family: FONT_DISPLAY, weight: '600', size: 12 }, padding: 12 }
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            grid: { color: BORDER_COLOR },
            angleLines: { color: BORDER_COLOR },
            ticks: {
              color: TEXT_SECONDARY,
              backdropColor: 'transparent',
              font: { size: 10 },
              stepSize: 25
            },
            pointLabels: {
              color: TEXT_SECONDARY,
              font: { family: FONT_BODY, size: 11 }
            }
          }
        },
        animation: { duration: 1200 }
      }
    });
    return instances[canvasId];
  }

  /* ── REGIONAL WINRATE BAR ── */
  function regionalWinrateBar(canvasId, regions) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    const data = regions
      .filter(r => r.stats?.international_winrate_vs_all != null)
      .sort((a, b) => b.stats.international_winrate_vs_all - a.stats.international_winrate_vs_all);

    const getColor = (wr) => {
      if (wr >= 60) return GOLD;
      if (wr >= 45) return CYAN;
      if (wr >= 35) return '#9B59B6';
      return MUTED;
    };

    instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(r => r.name),
        datasets: [{
          label: 'International Winrate %',
          data: data.map(r => r.stats.international_winrate_vs_all),
          backgroundColor: data.map(r => getColor(r.stats.international_winrate_vs_all)),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.raw.toFixed(1)}% international winrate`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            ticks: { callback: v => v + '%', color: TEXT_SECONDARY, font: { family: FONT_MONO, size: 11 } },
            grid: { color: BORDER_COLOR }
          },
          y: {
            ticks: { color: TEXT_SECONDARY, font: { family: FONT_DISPLAY, weight: '600', size: 13 } },
            grid: { display: false }
          }
        },
        animation: { duration: 1000, delay: ctx => ctx.dataIndex * 60 }
      }
    });
    return instances[canvasId];
  }

  /* ── PLAYER GOAT SCORE HORIZONTAL BAR ── */
  function goatIndexBar(canvasId, players) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    const sorted = [...players]
      .filter(p => p.stats?.goat_score)
      .sort((a, b) => b.stats.goat_score - a.stats.goat_score)
      .slice(0, 10);

    const palette = [
      GOLD, '#E8B94F', CYAN, '#9B59B6', WIN,
      '#FF4B4B', '#E67E22', '#27AE60', '#00A1DE', '#F39C12'
    ];

    instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map(p => p.name),
        datasets: [{
          label: 'GOAT Index',
          data: sorted.map(p => p.stats.goat_score),
          backgroundColor: palette,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` GOAT Score: ${ctx.raw}/100`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 105,
            ticks: { color: TEXT_SECONDARY, font: { family: FONT_MONO, size: 11 } },
            grid: { color: BORDER_COLOR }
          },
          y: {
            ticks: { color: TEXT_SECONDARY, font: { family: FONT_DISPLAY, weight: '700', size: 14 } },
            grid: { display: false }
          }
        },
        animation: { duration: 1200, delay: ctx => ctx.dataIndex * 80 }
      }
    });
    return instances[canvasId];
  }

  /* ── TEAM PERFORMANCE OVER TIME ── */
  function teamPerformanceLine(canvasId, team) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    const history = team.worlds_history || [];
    const resultScore = (r) => {
      const s = r.toLowerCase();
      if (s.includes('champion')) return 100;
      if (s.includes('finalist')) return 80;
      if (s.includes('semi')) return 60;
      if (s.includes('quarter')) return 40;
      if (s.includes('group') || s.includes('play')) return 20;
      return 0;
    };

    const sorted = [...history].sort((a, b) => a.year - b.year);

    instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: sorted.map(h => h.year),
        datasets: [{
          label: team.name + ' Worlds Performance',
          data: sorted.map(h => resultScore(h.result)),
          borderColor: team.color_primary || GOLD,
          backgroundColor: (team.color_primary || GOLD) + '15',
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: sorted.map(h => resultScore(h.result) === 100 ? GOLD : team.color_primary || CYAN),
          pointRadius: sorted.map(h => resultScore(h.result) === 100 ? 7 : 4),
          pointHoverRadius: 9
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: ctx => 'Worlds ' + ctx[0].label,
              label: ctx => {
                const h = sorted[ctx.dataIndex];
                return ` ${h.result}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 110,
            ticks: {
              callback: v => {
                const map = { 100: '🏆', 80: 'Finals', 60: 'Semi', 40: 'QF', 20: 'Groups', 0: '' };
                return map[v] || '';
              },
              color: TEXT_SECONDARY,
              font: { family: FONT_DISPLAY, size: 11 }
            },
            grid: { color: BORDER_COLOR }
          },
          x: {
            ticks: { color: TEXT_SECONDARY, font: { family: FONT_MONO, size: 11 } },
            grid: { color: BORDER_COLOR }
          }
        },
        animation: { duration: 1200 }
      }
    });
    return instances[canvasId];
  }

  /* ── MSI TITLES LINE ── */
  function msiTitlesBar(canvasId, teams) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    const top = teams
      .filter(t => t.stats?.msi_titles > 0)
      .sort((a, b) => b.stats.msi_titles - a.stats.msi_titles);

    instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: top.map(t => t.name),
        datasets: [{
          label: 'MSI Titles',
          data: top.map(t => t.stats.msi_titles),
          backgroundColor: top.map(t => t.color_primary || CYAN),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { color: BORDER_COLOR },
            ticks: { color: TEXT_SECONDARY, font: { family: FONT_DISPLAY, weight: '600', size: 13 } }
          },
          y: {
            beginAtZero: true,
            max: 4,
            ticks: { stepSize: 1, color: TEXT_SECONDARY, font: { family: FONT_MONO, size: 11 } },
            grid: { color: BORDER_COLOR }
          }
        },
        animation: { duration: 900, delay: ctx => ctx.dataIndex * 70 }
      }
    });
    return instances[canvasId];
  }

  return {
    defaults, destroy,
    worldsTitlesBar, regionPie, eraTimeline,
    dynastyRadar, regionalWinrateBar, goatIndexBar,
    teamPerformanceLine, msiTitlesBar
  };
})();
