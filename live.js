const GAME_STORAGE_KEY = "nba-playoffs-challenge-state";
const PLAYOFF_START_DATE = "2026-04-18";
const PLAYOFF_END_DATE = "2026-06-30";
const ESPN_SCOREBOARD_ENDPOINT = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

const TEAM_LIBRARY = {
  det: { id: "det", name: "Detroit Pistons" },
  bos: { id: "bos", name: "Boston Celtics" },
  nyk: { id: "nyk", name: "New York Knicks" },
  cle: { id: "cle", name: "Cleveland Cavaliers" },
  tor: { id: "tor", name: "Toronto Raptors" },
  atl: { id: "atl", name: "Atlanta Hawks" },
  phi: { id: "phi", name: "Philadelphia 76ers" },
  orl: { id: "orl", name: "Orlando Magic" },
  cha: { id: "cha", name: "Charlotte Hornets" },
  okc: { id: "okc", name: "Oklahoma City Thunder" },
  sas: { id: "sas", name: "San Antonio Spurs" },
  den: { id: "den", name: "Denver Nuggets" },
  lal: { id: "lal", name: "Los Angeles Lakers" },
  hou: { id: "hou", name: "Houston Rockets" },
  min: { id: "min", name: "Minnesota Timberwolves" },
  por: { id: "por", name: "Portland Trail Blazers" },
  phx: { id: "phx", name: "Phoenix Suns" },
  gsw: { id: "gsw", name: "Golden State Warriors" }
};

const elements = {
  viewerLabel: document.querySelector("#live-viewer-label"),
  lastUpdated: document.querySelector("#live-last-updated"),
  sourceStatus: document.querySelector("#live-source-status"),
  refreshButton: document.querySelector("#live-refresh-button"),
  standingsStrip: document.querySelector("#live-standings-strip"),
  squadGrid: document.querySelector("#live-squad-grid")
};

const liveQueryParams = typeof URLSearchParams === "function"
  ? new URLSearchParams(window.location.search)
  : null;
const viewerId = liveQueryParams
  ? liveQueryParams.get("viewer") || ""
  : "";

function createDefaultGameState() {
  return {
    settings: {
      teamsPerPlayer: 4,
      finalsBonusWithTeam: 5,
      finalsBonusWithoutTeam: 3
    },
    players: [
      { id: "nosrac", name: "Nosrac" },
      { id: "samuel", name: "Samuel" },
      { id: "mason", name: "Mason" },
      { id: "winston-lover", name: "Winston Lover" }
    ],
    draftOrder: ["nosrac", "samuel", "mason", "winston-lover"],
    teams: [],
    picks: [],
    draftStarted: false,
    finalsPredictions: {},
    championTeamId: null,
    updatedAt: new Date().toISOString()
  };
}

function buildSnakeTurns(order, rounds) {
  const turns = [];

  for (let round = 1; round <= rounds; round += 1) {
    const roundOrder = round % 2 === 1 ? order : [...order].reverse();
    for (const playerId of roundOrder) {
      turns.push({ round, playerId });
    }
  }

  return turns;
}

function buildDerivedGame(game) {
  const turns = buildSnakeTurns(game.draftOrder, game.settings.teamsPerPlayer);
  const picksByPlayer = Object.fromEntries(game.players.map((player) => [player.id, []]));

  for (const pick of game.picks) {
    picksByPlayer[pick.playerId].push(pick.teamId);
  }

  return {
    ...game,
    derived: {
      draftComplete: game.picks.length >= turns.length,
      allFinalsPicksLocked: game.players.every((player) => Boolean(game.finalsPredictions[player.id])),
      picksByPlayer
    }
  };
}

function loadGame() {
  const saved = localStorage.getItem(GAME_STORAGE_KEY);
  return buildDerivedGame(saved ? JSON.parse(saved) : createDefaultGameState());
}

function getFinalsTeamById(teamId) {
  return TEAM_LIBRARY[teamId] || null;
}

function getTeamDisplayName(game, teamId) {
  return game.teams.find((team) => team.id === teamId)?.name || getFinalsTeamById(teamId)?.name || "Unknown team";
}

function draftedTeamCoversFinalsPick(game, draftedTeamId, finalsPickId) {
  const draftedTeam = game.teams.find((team) => team.id === draftedTeamId);
  return Boolean(draftedTeam && (draftedTeam.finalsTeamIds || [draftedTeam.id]).includes(finalsPickId));
}

function timestampToLabel(value) {
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function formatPoints(points) {
  return points > 0 ? `+${points}` : `${points}`;
}

function toDateToken(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function getDateWindow() {
  const start = new Date(`${PLAYOFF_START_DATE}T00:00:00`);
  const endCap = new Date(`${PLAYOFF_END_DATE}T23:59:59`);
  const today = new Date();
  const end = today < endCap ? today : endCap;

  return {
    startToken: toDateToken(start),
    endToken: toDateToken(end)
  };
}

function enumerateDateTokens(startToken, endToken) {
  const tokens = [];
  const start = new Date(`${startToken.slice(0, 4)}-${startToken.slice(4, 6)}-${startToken.slice(6, 8)}T00:00:00`);
  const end = new Date(`${endToken.slice(0, 4)}-${endToken.slice(4, 6)}-${endToken.slice(6, 8)}T00:00:00`);

  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    tokens.push(toDateToken(cursor));
  }

  return tokens;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ESPN request failed with status ${response.status}`);
  }
  return response.json();
}

async function fetchScoreboardEvents() {
  const { startToken, endToken } = getDateWindow();

  try {
    const rangeUrl = `${ESPN_SCOREBOARD_ENDPOINT}?dates=${startToken}-${endToken}&limit=1000`;
    const payload = await fetchJson(rangeUrl);
    if (Array.isArray(payload.events) && payload.events.length > 0) {
      return {
        events: payload.events,
        sourceLabel: `Auto scoring from ESPN scoreboard range ${startToken}-${endToken}`
      };
    }
  } catch (error) {
    // Fall back to per-day fetches below.
  }

  const tokens = enumerateDateTokens(startToken, endToken);
  const dailyPayloads = await Promise.all(
    tokens.map(async (token) => {
      const payload = await fetchJson(`${ESPN_SCOREBOARD_ENDPOINT}?dates=${token}&limit=200`);
      return payload.events || [];
    })
  );

  const flattenedEvents = [];
  dailyPayloads.forEach((events) => {
    events.forEach((event) => {
      flattenedEvents.push(event);
    });
  });

  return {
    events: flattenedEvents,
    sourceLabel: `Auto scoring from ESPN daily scoreboards ${startToken}-${endToken}`
  };
}

function normalizeTeamName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function buildTeamAliasMap(game) {
  return Object.fromEntries(
    game.teams.map((team) => {
      const aliases = new Set([team.name, ...(team.aliases || [])]);

      if (team.name === "Los Angeles Lakers") {
        aliases.add("Lakers");
      }
      if (team.name === "Oklahoma City Thunder") {
        aliases.add("Thunder");
      }
      if (team.name === "San Antonio Spurs") {
        aliases.add("Spurs");
      }
      if (team.name === "Denver Nuggets") {
        aliases.add("Nuggets");
      }
      if (team.name === "Houston Rockets") {
        aliases.add("Rockets");
      }
      if (team.name === "Minnesota Timberwolves") {
        aliases.add("Timberwolves");
        aliases.add("Wolves");
      }
      if (team.name === "Phoenix Suns") {
        aliases.add("Suns");
      }
      if (team.name === "Portland Trail Blazers") {
        aliases.add("Trail Blazers");
        aliases.add("Blazers");
      }
      if (team.name === "Detroit Pistons") {
        aliases.add("Pistons");
      }
      if (team.name === "Boston Celtics") {
        aliases.add("Celtics");
      }
      if (team.name === "New York Knicks") {
        aliases.add("Knicks");
      }
      if (team.name === "Cleveland Cavaliers") {
        aliases.add("Cavaliers");
        aliases.add("Cavs");
      }
      if (team.name === "Toronto Raptors") {
        aliases.add("Raptors");
      }
      if (team.name === "Atlanta Hawks") {
        aliases.add("Hawks");
      }
      if (team.name === "Philadelphia 76ers") {
        aliases.add("76ers");
        aliases.add("Sixers");
      }
      if (team.name === "Orlando Magic") {
        aliases.add("Magic");
      }

      return [team.id, Array.from(aliases).map(normalizeTeamName)];
    })
  );
}

function findDraftTeamIdByEspnTeam(game, aliasMap, espnTeam) {
  const candidateNames = [
    espnTeam.displayName,
    espnTeam.shortDisplayName,
    espnTeam.name,
    espnTeam.abbreviation
  ]
    .filter(Boolean)
    .map(normalizeTeamName);

  return game.teams.find((team) =>
    aliasMap[team.id].some((alias) => candidateNames.includes(alias))
  )?.id || null;
}

function extractTeamStats(game, events) {
  const aliasMap = buildTeamAliasMap(game);
  const stats = Object.fromEntries(
    game.teams.map((team) => [team.id, { wins: 0, losses: 0 }])
  );

  events.forEach((event) => {
    const competition = event.competitions?.[0];
    const status = competition?.status?.type || event.status?.type;
    const competitors = competition?.competitors || [];

    if (!status?.completed || competitors.length !== 2) {
      return;
    }

    const winner = competitors.find((competitor) => competitor.winner);
    const loser = competitors.find((competitor) => competitor.winner === false);

    if (!winner || !loser) {
      return;
    }

    const winnerTeamId = findDraftTeamIdByEspnTeam(game, aliasMap, winner.team || {});
    const loserTeamId = findDraftTeamIdByEspnTeam(game, aliasMap, loser.team || {});

    if (winnerTeamId) {
      stats[winnerTeamId].wins += 1;
    }
    if (loserTeamId) {
      stats[loserTeamId].losses += 1;
    }
  });

  return stats;
}

function countCompletedEvents(events) {
  return events.filter((event) => {
    const competition = event.competitions?.[0];
    const status = competition?.status?.type || event.status?.type;
    return Boolean(status?.completed);
  }).length;
}

function buildLeaderboard(game, teamStats) {
  return game.players
    .map((player) => {
      const teamIds = game.derived.picksByPlayer[player.id];
      const teamScore = teamIds.reduce((total, teamId) => {
        const stats = teamStats[teamId] || { wins: 0, losses: 0 };
        return total + stats.wins - stats.losses;
      }, 0);

      const finalsPick = game.finalsPredictions[player.id] || null;
      const predictedChampion = finalsPick && finalsPick === game.championTeamId;
      const draftedChampion =
        predictedChampion && teamIds.some((teamId) => draftedTeamCoversFinalsPick(game, teamId, finalsPick));
      const finalsBonus = predictedChampion
        ? draftedChampion
          ? game.settings.finalsBonusWithTeam
          : game.settings.finalsBonusWithoutTeam
        : 0;

      return {
        playerId: player.id,
        playerName: player.name,
        teamIds,
        teamScore,
        finalsPick,
        finalsBonus,
        totalScore: teamScore + finalsBonus
      };
    })
    .sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore;
      }
      return left.playerName.localeCompare(right.playerName);
    });
}

function getTeamById(game, teamId) {
  return game.teams.find((team) => team.id === teamId);
}

function renderStandings(leaderboard) {
  elements.standingsStrip.innerHTML = "";

  leaderboard.forEach((entry, index) => {
    const card = document.createElement("article");
    card.className = "results-standing-card";
    if (entry.playerId === viewerId) {
      card.classList.add("is-viewer");
    }
    card.innerHTML = `
      <p class="placement">#${index + 1}</p>
      <h3>${entry.playerName}</h3>
      <p class="score-line">${formatPoints(entry.totalScore)} pts</p>
      <p class="meta-line">Teams: ${formatPoints(entry.teamScore)} | Finals bonus: ${formatPoints(entry.finalsBonus)}</p>
    `;
    elements.standingsStrip.appendChild(card);
  });
}

function renderSquads(game, leaderboard, teamStats) {
  elements.squadGrid.innerHTML = "";

  leaderboard.forEach((entry, index) => {
    const card = document.createElement("article");
    card.className = "results-squad-card";
    if (entry.playerId === viewerId) {
      card.classList.add("is-viewer");
    }
    const finalsPickLabel = entry.finalsPick ? getTeamDisplayName(game, entry.finalsPick) : "Not locked";

    card.innerHTML = `
      <div class="results-squad-header">
        <div>
          <p class="results-squad-rank">#${index + 1}</p>
          <h3>${entry.playerName}</h3>
          <p class="section-note">Finals pick: ${finalsPickLabel}</p>
        </div>
        <div class="results-total-pill">${formatPoints(entry.totalScore)} pts</div>
      </div>
      <div class="results-team-list"></div>
    `;

    const teamList = card.querySelector(".results-team-list");

    entry.teamIds.forEach((teamId) => {
      const team = getTeamById(game, teamId);
      const stats = teamStats[teamId] || { wins: 0, losses: 0 };
      const teamPoints = stats.wins - stats.losses;
      const teamCard = document.createElement("div");
      teamCard.className = "results-team-card";
      teamCard.innerHTML = `
        <div class="results-team-top">
          <p class="eyebrow">Team</p>
          <div class="results-team-points">${formatPoints(teamPoints)} pts</div>
        </div>
        <h4>${team.name}</h4>
        <p class="section-note">${team.conference} ${team.slot}</p>
        <div class="results-team-meta">
          <span>${stats.wins} wins</span>
          <span>${stats.losses} losses</span>
        </div>
      `;
      teamList.appendChild(teamCard);
    });

    elements.squadGrid.appendChild(card);
  });
}

async function render() {
  const game = loadGame();

  if (!game.derived.draftComplete || !game.derived.allFinalsPicksLocked) {
    window.location.href = "./index.html?control=1";
    return;
  }

  const viewerName = game.players.find((player) => player.id === viewerId)?.name;
  elements.viewerLabel.textContent = viewerName ? `Highlighted viewer: ${viewerName}` : "Viewing all players";
  elements.refreshButton.disabled = true;
  elements.lastUpdated.textContent = `Draft saved ${timestampToLabel(game.updatedAt)}`;
  elements.sourceStatus.textContent = "Refreshing ESPN playoff results...";

  try {
    const { events, sourceLabel } = await fetchScoreboardEvents();
    const teamStats = extractTeamStats(game, events);
    const leaderboard = buildLeaderboard(game, teamStats);
    const completedEvents = countCompletedEvents(events);

    renderStandings(leaderboard);
    renderSquads(game, leaderboard, teamStats);
    elements.sourceStatus.textContent = `${sourceLabel}. Completed games counted: ${completedEvents}.`;
  } catch (error) {
    elements.sourceStatus.textContent = `ESPN auto scoring failed: ${error.message}`;
    elements.standingsStrip.innerHTML = "";
    elements.squadGrid.innerHTML = "";
  } finally {
    elements.refreshButton.disabled = false;
  }
}

elements.refreshButton.addEventListener("click", () => {
  render();
});

window.addEventListener("storage", render);
setInterval(render, 30000);
render();
