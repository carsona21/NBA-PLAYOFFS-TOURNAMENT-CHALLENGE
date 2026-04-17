const GAME_STORAGE_KEY = "nba-playoffs-challenge-state";

const elements = {
  lastUpdated: document.querySelector("#live-last-updated"),
  standingsStrip: document.querySelector("#live-standings-strip"),
  squadGrid: document.querySelector("#live-squad-grid")
};

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
  const teamsById = Object.fromEntries(game.teams.map((team) => [team.id, team]));

  for (const pick of game.picks) {
    picksByPlayer[pick.playerId].push(pick.teamId);
  }

  const leaderboard = game.players
    .map((player) => {
      const teamIds = picksByPlayer[player.id];
      const teamScore = teamIds.reduce((total, teamId) => {
        const team = teamsById[teamId];
        return total + team.wins - team.losses;
      }, 0);
      const finalsPick = game.finalsPredictions[player.id] || null;
      const predictedChampion = finalsPick && finalsPick === game.championTeamId;
      const draftedChampion = predictedChampion && teamIds.includes(finalsPick);
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

  return {
    ...game,
    derived: {
      draftComplete: game.picks.length >= turns.length,
      picksByPlayer,
      leaderboard
    }
  };
}

function loadGame() {
  const saved = localStorage.getItem(GAME_STORAGE_KEY);
  return buildDerivedGame(saved ? JSON.parse(saved) : createDefaultGameState());
}

function getTeamById(game, teamId) {
  return game.teams.find((team) => team.id === teamId);
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

function renderStandings(game) {
  elements.standingsStrip.innerHTML = "";

  game.derived.leaderboard.forEach((entry, index) => {
    const card = document.createElement("article");
    card.className = "results-standing-card";
    card.innerHTML = `
      <p class="placement">#${index + 1}</p>
      <h3>${entry.playerName}</h3>
      <p class="score-line">${formatPoints(entry.totalScore)} pts</p>
      <p class="meta-line">Teams: ${formatPoints(entry.teamScore)} | Finals bonus: ${formatPoints(entry.finalsBonus)}</p>
    `;
    elements.standingsStrip.appendChild(card);
  });
}

function renderSquads(game) {
  elements.squadGrid.innerHTML = "";

  game.derived.leaderboard.forEach((entry, index) => {
    const card = document.createElement("article");
    card.className = "results-squad-card";
    const finalsPickLabel = entry.finalsPick ? getTeamById(game, entry.finalsPick).name : "Not locked";

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
      const teamPoints = team.wins - team.losses;
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
          <span>${team.wins} wins</span>
          <span>${team.losses} losses</span>
        </div>
      `;
      teamList.appendChild(teamCard);
    });

    elements.squadGrid.appendChild(card);
  });
}

function render() {
  const game = loadGame();

  if (!game.derived.draftComplete) {
    window.location.href = "./index.html?control=1";
    return;
  }

  elements.lastUpdated.textContent = `Updated ${timestampToLabel(game.updatedAt)}`;
  renderStandings(game);
  renderSquads(game);
}

window.addEventListener("storage", render);
setInterval(render, 10000);
render();
