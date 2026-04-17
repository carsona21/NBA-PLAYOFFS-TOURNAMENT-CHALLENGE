const GAME_STORAGE_KEY = "nba-playoffs-challenge-state";

const elements = {
  lastUpdated: document.querySelector("#live-last-updated"),
  leaderboard: document.querySelector("#live-leaderboard"),
  playerBoards: document.querySelector("#live-player-boards"),
  teamGrid: document.querySelector("#live-team-grid"),
  leaderboardCardTemplate: document.querySelector("#live-leaderboard-card-template")
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

function render() {
  const game = loadGame();

  if (!game.derived.draftComplete) {
    window.location.href = "./index.html?control=1";
    return;
  }

  elements.lastUpdated.textContent = `Updated ${timestampToLabel(game.updatedAt)}`;
  elements.leaderboard.innerHTML = "";
  elements.playerBoards.innerHTML = "";
  elements.teamGrid.innerHTML = "";

  game.derived.leaderboard.forEach((entry, index) => {
    const fragment = elements.leaderboardCardTemplate.content.cloneNode(true);
    fragment.querySelector(".placement").textContent = `#${index + 1}`;
    fragment.querySelector("h3").textContent = entry.playerName;
    fragment.querySelector(".score-line").textContent = `${entry.totalScore} pts total`;
    fragment.querySelector(".meta-line").textContent =
      `Team score: ${entry.teamScore} | Finals bonus: ${entry.finalsBonus} | Finals pick: ${entry.finalsPick ? getTeamById(game, entry.finalsPick).name : "Not locked"}`;
    elements.leaderboard.appendChild(fragment);
  });

  game.players.forEach((player) => {
    const board = document.createElement("article");
    board.className = "board-card";
    const teamIds = game.derived.picksByPlayer[player.id];
    board.innerHTML = `
      <h3>${player.name}</h3>
      ${teamIds.length
        ? `<ul>${teamIds.map((teamId) => `<li>${getTeamById(game, teamId).name} (${getTeamById(game, teamId).wins - getTeamById(game, teamId).losses})</li>`).join("")}</ul>`
        : "<p class='section-note'>No teams drafted.</p>"}
      <p class="section-note">Finals pick: ${game.finalsPredictions[player.id] ? getTeamById(game, game.finalsPredictions[player.id]).name : "Not locked"}</p>
    `;
    elements.playerBoards.appendChild(board);
  });

  game.teams
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .forEach((team) => {
      const card = document.createElement("article");
      card.className = "team-card";
      card.innerHTML = `
        <div>
          <h3>${team.name}</h3>
          <p class="seed-line">${team.conference} ${team.slot}</p>
        </div>
        <div>
          <p class="score-line">${team.wins - team.losses} pts</p>
          <p class="meta-line">${team.wins} wins, ${team.losses} losses</p>
        </div>
      `;
      elements.teamGrid.appendChild(card);
    });
}

render();
