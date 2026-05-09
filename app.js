'use strict';

const API_URL = 'https://steamscope-func.azurewebsites.net/api/stats';

function fmt(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function gameIcon(g) {
  return g.iconUrl
    ? `<img class="game-icon" src="${g.iconUrl}" alt="${g.name}" loading="lazy" />`
    : `<div class="game-icon" style="display:flex;align-items:center;justify-content:center;font-size:1.4rem;">🎮</div>`;
}

function render(data) {
  const { player, library, recentlyPlayed, fetchedAt } = data;
  const maxHours = library.topGames[0]?.playtimeHours || 1;

  document.getElementById('root').innerHTML = `
    <header class="header">
      <div class="logo">SteamScope</div>
      <div class="last-updated">Synced ${fmt(fetchedAt)}</div>
    </header>

    <div class="container">

      <div class="profile-card">
        <img class="avatar" src="${player.avatarFull}" alt="${player.name}" />
        <div class="profile-info">
          <div class="profile-name">
            <span class="status-dot ${player.isOnline ? '' : 'offline'}"></span>
            ${player.name}
            ${player.realName ? `<span class="real-name">· ${player.realName}</span>` : ''}
          </div>
          <a class="profile-link" href="${player.profileUrl}" target="_blank" rel="noopener">
            View on Steam →
          </a>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-label">Games Owned</div>
          <div class="stat-value">${library.totalGames}<span class="unit">games</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Playtime</div>
          <div class="stat-value">${library.totalPlaytimeHours}<span class="unit">hrs</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Played Recently</div>
          <div class="stat-value">${recentlyPlayed.totalCount}<span class="unit">games</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Most Played</div>
          <div class="stat-top-game">${library.topGames[0]?.name ?? '—'}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">Recently Played &mdash; Last 2 Weeks</div>
        <div class="recent-grid">
          ${recentlyPlayed.games.map(g => `
            <div class="recent-game">
              ${g.iconUrl
                ? `<img src="${g.iconUrl}" alt="${g.name}" loading="lazy" />`
                : `<div style="width:64px;height:64px;border-radius:6px;background:#1f2937;display:flex;align-items:center;justify-content:center;font-size:1.8rem;">🎮</div>`
              }
              <div class="recent-game-name">${g.name}</div>
              <div class="recent-time">${g.playtime2WeeksHours}h this week</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="section">
        <div class="section-header">Top Games by Total Playtime</div>
        ${library.topGames.map(g => `
          <div class="game-row">
            ${gameIcon(g)}
            <div class="game-info">
              <div class="game-name">${g.name}</div>
              <div class="bar-wrap">
                <div class="bar" style="width:${Math.round((g.playtimeHours / maxHours) * 100)}%"></div>
              </div>
            </div>
            <div class="game-hours">${g.playtimeHours} hrs</div>
          </div>
        `).join('')}
      </div>

    </div>
  `;
}

async function load() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    render(data);
  } catch (err) {
    document.getElementById('root').innerHTML = `
      <div class="splash">
        <p class="error-msg">Failed to load: ${err.message}</p>
        <button class="retry-btn" onclick="load()">Retry</button>
      </div>`;
  }
}

load();
