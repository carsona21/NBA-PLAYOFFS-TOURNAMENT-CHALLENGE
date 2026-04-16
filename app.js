const GAME_STORAGE_KEY = "nba-playoffs-challenge-state";
const PLAYER_STORAGE_KEY = "nba-playoffs-selected-player";
const COMMISSIONER_STORAGE_KEY = "nba-playoffs-commissioner-unlocked";

const state = {
  game: null,
  selectedPlayerId: localStorage.getItem(PLAYER_STORAGE_KEY) || null,
  commissionerUnlocked: localStorage.getItem(COMMISSIONER_STORAGE_KEY) === "true"
};

const elements = {
  leaderboard: document.querySelector("#leaderboard"),
  playerLobby: document.querySelector("#player-lobby"),
  currentPlayerName: document.querySelector("#current-player-name"),
  authStatus: document.querySelector("#auth-status"),
  switchPlayerButton: document.querySelector("#switch-player-button"),
  commissionerButton: document.querySelector("#commissioner-button"),
  commissionerStatus: document.querySelector("#commissioner-status"),
  draftStatus: document.querySelector("#draft-status"),
  startDraftButton: document.querySelector("#start-draft-button"),
  turnStrip: document.querySelector("#turn-strip"),
  availableTeams: document.querySelector("#available-teams"),
  myTeamList: document.querySelector("#my-team-list"),
  playerBoards: document.querySelector("#player-boards"),
  finalsSelect: document.querySelector("#finals-select"),
  lockFinalsButton: document.querySelector("#lock-finals-button"),
  lastUpdated: document.querySelector("#last-updated"),
  sourceNote: document.querySelector("#source-note"),
  nameEditor: document.querySelector("#name-editor"),
  saveNamesButton: document.querySelector("#save-names-button"),
  championSelect: document.querySelector("#champion-select"),
  saveChampionButton: document.querySelector("#save-champion-button"),
  clearChampionButton: document.querySelector("#clear-champion-button"),
  scoreTableBody: document.querySelector("#score-table-body"),
  resetButton: document.querySelector("#reset-button"),
  playerDialog: document.querySelector("#player-dialog"),
  playerOptions: document.querySelector("#player-options"),
  leaderboardCardTemplate: document.querySelector("#leaderboard-card-template")
};

function createDefaultGameState() {
  return {
    meta: {
      seasonLabel: "2026 NBA Playoffs Challenge",
      sourceLabel: "Manual 2026 playoff field",
      sourceUrl: "https://www.nba.com/playoffs/2026/bracket",
      sourceUpdated: "2026-04-15",
      notes:
        "This version is a plain browser app. It saves the whole game in this browser only, so use one shared device or one shared browser profile."
    },
    settings: {
      playersCount: 4,
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
    teams: [
      { id: "det", name: "Detroit Pistons", conference: "East", slot: "1 seed", wins: 0, losses: 0 },
      { id: "bos", name: "Boston Celtics", conference: "East", slot: "2 seed", wins: 0, losses: 0 },
      { id: "nyk", name: "New York Knicks", conference: "East", slot: "3 seed", wins: 0, losses: 0 },
      { id: "cle", name: "Cleveland Cavaliers", conference: "East", slot: "4 seed", wins: 0, losses: 0 },
      { id: "tor", name: "Toronto Raptors", conference: "East", slot: "5 seed", wins: 0, losses: 0 },
      { id: "atl", name: "Atlanta Hawks", conference: "East", slot: "6 seed", wins: 0, losses: 0 },
      { id: "phi", name: "Philadelphia 76ers", conference: "East", slot: "7 seed", wins: 0, losses: 0 },
      { id: "orl", name: "Orlando Magic", conference: "East", slot: "8 seed", wins: 0, losses: 0 },
      { id: "okc", name: "Oklahoma City Thunder", conference: "West", slot: "1 seed", wins: 0, losses: 0 },
      { id: "sas", name: "San Antonio Spurs", conference: "West", slot: "2 seed", wins: 0, losses: 0 },
      { id: "den", name: "Denver Nuggets", conference: "West", slot: "3 seed", wins: 0, losses: 0 },
      { id: "lal", name: "Los Angeles Lakers", conference: "West", slot: "4 seed", wins: 0, losses: 0 },
      { id: "hou", name: "Houston Rockets", conference: "West", slot: "5 seed", wins: 0, losses: 0 },
      { id: "min", name: "Minnesota Timberwolves", conference: "West", slot: "6 seed", wins: 0, losses: 0 },
      { id: "phx", name: "Phoenix Suns", conference: "West", slot: "7 seed", wins: 0, losses: 0 },
      { id: "por", name: "Portland Trail Blazers", conference: "West", slot: "8 seed", wins: 0, losses: 0 }
    ],
    picks: [],
    draftStarted: false,
    finalsPredictions: {},
    championTeamId: null,
    updatedAt: new Date().toISOString()
  };
}

function saveGame() {
  state.game.updatedAt = new Date().toISOString();
  localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(state.game));
}

function loadGame() {
  const saved = localStorage.getItem(GAME_STORAGE_KEY);
  state.game = saved ? JSON.parse(saved) : createDefaultGameState();
  if (!saved) {
    saveGame();
  }
}

function setCommissionerUnlocked(value) {
  state.commissionerUnlocked = value;
  localStorage.setItem(COMMISSIONER_STORAGE_KEY, value ? "true" : "false");
}

function setSelectedPlayer(playerId) {
  state.selectedPlayerId = playerId;
  localStorage.setItem(PLAYER_STORAGE_KEY, playerId);
}

function getSelectedPlayer() {
  return state.game.players.find((player) => player.id === state.selectedPlayerId) || null;
}

function getPlayerById(playerId) {
  return state.game.players.find((player) => player.id === playerId);
}

function getTeamById(teamId) {
  return state.game.teams.find((team) => team.id === teamId);
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

  const draftedTeamIds = new Set(game.picks.map((pick) => pick.teamId));
  const currentTurn = game.draftStarted ? turns[game.picks.length] || null : null;

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
        finalsPick,
        teamScore,
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
      turns,
      currentTurn,
      draftComplete: game.picks.length >= turns.length,
      draftedTeamIds: Array.from(draftedTeamIds),
      availableTeams: game.teams.filter((team) => !draftedTeamIds.has(team.id)),
      picksByPlayer,
      leaderboard
    }
  };
}

function refreshDerivedState() {
  state.game = buildDerivedGame(state.game);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function timestampToLabel(value) {
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function saveAndRender() {
  saveGame();
  refreshDerivedState();
  render();
}

function claimPlayer(playerId) {
  setSelectedPlayer(playerId);
  render();
}

function startDraft() {
  assert(state.commissionerUnlocked, "Unlock commissioner mode first.");
  assert(!state.game.draftStarted, "The draft has already started.");
  state.game.draftStarted = true;
  saveAndRender();
}

function makePick(teamId) {
  const selectedPlayer = getSelectedPlayer();
  assert(selectedPlayer, "Choose your player first.");
  assert(state.game.draftStarted, "Start the draft first.");
  assert(!state.game.derived.draftComplete, "The draft is already complete.");
  assert(state.game.derived.currentTurn.playerId === selectedPlayer.id, "It is not this player's turn.");
  assert(!state.game.derived.draftedTeamIds.includes(teamId), "That team has already been drafted.");

  state.game.picks.push({
    playerId: selectedPlayer.id,
    teamId,
    round: state.game.derived.currentTurn.round,
    pickNumber: state.game.picks.length + 1
  });

  saveAndRender();
}

function lockFinalsPick(teamId) {
  const selectedPlayer = getSelectedPlayer();
  assert(selectedPlayer, "Choose your player first.");
  assert(state.game.derived.draftComplete, "Finals picks unlock after the draft.");
  assert(!state.game.finalsPredictions[selectedPlayer.id], "This player already locked a Finals pick.");

  state.game.finalsPredictions[selectedPlayer.id] = teamId;
  saveAndRender();
}

function saveNames(names) {
  assert(state.commissionerUnlocked, "Unlock commissioner mode first.");
  assert(!state.game.draftStarted && state.game.picks.length === 0, "Names can only change before the draft starts.");
  assert(names.every(Boolean), "Every player needs a name.");

  state.game.players = state.game.players.map((player, index) => ({
    ...player,
    name: names[index]
  }));

  saveAndRender();
}

function saveChampion(teamId) {
  assert(state.commissionerUnlocked, "Unlock commissioner mode first.");
  state.game.championTeamId = teamId;
  saveAndRender();
}

function saveTeamScore(teamId, wins, losses) {
  assert(state.commissionerUnlocked, "Unlock commissioner mode first.");
  assert(Number.isInteger(wins) && wins >= 0, "Wins must be a whole number.");
  assert(Number.isInteger(losses) && losses >= 0, "Losses must be a whole number.");

  state.game.teams = state.game.teams.map((team) =>
    team.id === teamId ? { ...team, wins, losses } : team
  );

  saveAndRender();
}

function resetGame() {
  const names = state.game.players.map((player) => player.name);
  state.game = createDefaultGameState();
  state.game.players = state.game.players.map((player, index) => ({
    ...player,
    name: names[index]
  }));
  saveAndRender();
}

function renderLeaderboard() {
  elements.leaderboard.innerHTML = "";

  state.game.derived.leaderboard.forEach((entry, index) => {
    const fragment = elements.leaderboardCardTemplate.content.cloneNode(true);
    fragment.querySelector(".placement").textContent = `#${index + 1}`;
    fragment.querySelector("h3").textContent = entry.playerName;
    fragment.querySelector(".score-line").textContent = `${entry.totalScore} pts total`;
    fragment.querySelector(".meta-line").textContent =
      `Team score: ${entry.teamScore} | Finals bonus: ${entry.finalsBonus} | Finals pick: ${entry.finalsPick ? getTeamById(entry.finalsPick).name : "Not locked"}`;
    elements.leaderboard.appendChild(fragment);
  });
}

function renderPlayerLobby() {
  elements.playerLobby.innerHTML = "";

  state.game.players.forEach((player) => {
    const card = document.createElement("article");
    card.className = "team-card";
    card.innerHTML = `
      <div>
        <h3>${player.name}</h3>
        <p class="seed-line">${state.selectedPlayerId === player.id ? "Selected in this browser" : "Available"}</p>
      </div>
    `;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = state.selectedPlayerId === player.id ? "Current Player" : "Choose This Player";
    button.addEventListener("click", () => claimPlayer(player.id));
    card.appendChild(button);
    elements.playerLobby.appendChild(card);
  });
}

function renderTurnStrip() {
  elements.turnStrip.innerHTML = "";

  state.game.derived.turns.forEach((turn, index) => {
    const player = getPlayerById(turn.playerId);
    const pill = document.createElement("div");
    pill.className = "turn-pill";
    if (state.game.derived.currentTurn && state.game.picks.length === index) {
      pill.classList.add("active");
    }
    if (turn.playerId === state.selectedPlayerId) {
      pill.classList.add("current-user");
    }
    pill.innerHTML = `<strong>Pick ${index + 1}</strong><div>${player.name}</div><div>Round ${turn.round}</div>`;
    elements.turnStrip.appendChild(pill);
  });
}

function renderDraftStatus() {
  if (!state.game.draftStarted) {
    elements.draftStatus.textContent = "Waiting to start. Use Commissioner mode to start the snake draft.";
    return;
  }

  if (state.game.derived.draftComplete) {
    elements.draftStatus.textContent = "Draft complete. Finals picks are open.";
    return;
  }

  const currentPlayer = getPlayerById(state.game.derived.currentTurn.playerId);
  elements.draftStatus.textContent =
    state.selectedPlayerId === currentPlayer.id
      ? `You are on the clock for Round ${state.game.derived.currentTurn.round}.`
      : `${currentPlayer.name} is on the clock for Round ${state.game.derived.currentTurn.round}.`;
}

function renderStartButton() {
  elements.startDraftButton.disabled = !state.commissionerUnlocked || state.game.draftStarted;
  elements.startDraftButton.textContent = state.game.draftStarted ? "Snake Draft Started" : "Start Snake Draft";
}

function renderTeams() {
  elements.availableTeams.innerHTML = "";
  const selectedPlayer = getSelectedPlayer();
  const canPick =
    selectedPlayer &&
    state.game.draftStarted &&
    state.game.derived.currentTurn &&
    state.game.derived.currentTurn.playerId === selectedPlayer.id &&
    !state.game.derived.draftComplete;

  state.game.derived.availableTeams
    .slice()
    .sort((left, right) => {
      if (left.conference !== right.conference) {
        return left.conference.localeCompare(right.conference);
      }
      return left.name.localeCompare(right.name);
    })
    .forEach((team) => {
      const card = document.createElement("article");
      card.className = "team-card";
      card.innerHTML = `
        <div>
          <h3>${team.name}</h3>
          <p class="seed-line">${team.conference} ${team.slot}</p>
        </div>
        <div>
          <p class="score-line">Score so far: ${team.wins - team.losses} pts</p>
          <p class="meta-line">${team.wins} wins, ${team.losses} losses</p>
        </div>
      `;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = canPick ? "Draft this team" : "Waiting";
      button.disabled = !canPick;
      button.addEventListener("click", () => {
        try {
          makePick(team.id);
        } catch (error) {
          alert(error.message);
        }
      });
      card.appendChild(button);
      elements.availableTeams.appendChild(card);
    });
}

function renderMyTeams() {
  elements.myTeamList.innerHTML = "";
  const selectedPlayer = getSelectedPlayer();

  if (!selectedPlayer) {
    const chip = document.createElement("div");
    chip.className = "chip empty";
    chip.textContent = "Choose a player first.";
    elements.myTeamList.appendChild(chip);
    return;
  }

  const teamIds = state.game.derived.picksByPlayer[selectedPlayer.id];
  if (teamIds.length === 0) {
    const chip = document.createElement("div");
    chip.className = "chip empty";
    chip.textContent = "No teams drafted yet.";
    elements.myTeamList.appendChild(chip);
    return;
  }

  teamIds.forEach((teamId) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    const team = getTeamById(teamId);
    chip.textContent = `${team.name} (${team.wins - team.losses})`;
    elements.myTeamList.appendChild(chip);
  });
}

function renderPlayerBoards() {
  elements.playerBoards.innerHTML = "";

  state.game.players.forEach((player) => {
    const board = document.createElement("article");
    board.className = "board-card";
    const teamIds = state.game.derived.picksByPlayer[player.id];
    board.innerHTML = `
      <h3>${player.name}</h3>
      ${teamIds.length
        ? `<ul>${teamIds.map((teamId) => `<li>${getTeamById(teamId).name} (${getTeamById(teamId).wins - getTeamById(teamId).losses})</li>`).join("")}</ul>`
        : "<p class='section-note'>No teams yet.</p>"}
      <p class="section-note">Finals pick: ${state.game.finalsPredictions[player.id] ? getTeamById(state.game.finalsPredictions[player.id]).name : "Not locked"}</p>
    `;
    elements.playerBoards.appendChild(board);
  });
}

function renderFinalsPicker() {
  const selectedPlayer = getSelectedPlayer();
  const lockedPick = selectedPlayer ? state.game.finalsPredictions[selectedPlayer.id] : null;

  elements.finalsSelect.innerHTML = ['<option value="">Choose a team</option>']
    .concat(
      state.game.teams
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((team) => `<option value="${team.id}">${team.name}</option>`)
    )
    .join("");

  if (lockedPick) {
    elements.finalsSelect.value = lockedPick;
  }

  const canLock = selectedPlayer && state.game.derived.draftComplete && !lockedPick;
  elements.finalsSelect.disabled = !canLock;
  elements.lockFinalsButton.disabled = !canLock;
  elements.lockFinalsButton.textContent = lockedPick ? "Finals Pick Locked" : "Lock Finals Pick";
}

function renderNameEditor() {
  elements.nameEditor.innerHTML = "";
  state.game.players.forEach((player) => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = player.name;
    input.disabled = !state.commissionerUnlocked || state.game.draftStarted;
    elements.nameEditor.appendChild(input);
  });
  elements.saveNamesButton.disabled = !state.commissionerUnlocked || state.game.draftStarted;
}

function renderChampionControls() {
  elements.championSelect.innerHTML = ['<option value="">No champion set</option>']
    .concat(state.game.teams.map((team) => `<option value="${team.id}">${team.name}</option>`))
    .join("");
  elements.championSelect.value = state.game.championTeamId || "";
  elements.championSelect.disabled = !state.commissionerUnlocked;
  elements.saveChampionButton.disabled = !state.commissionerUnlocked;
  elements.clearChampionButton.disabled = !state.commissionerUnlocked;
}

function renderScoreTable() {
  elements.scoreTableBody.innerHTML = "";
  state.game.teams.forEach((team) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${team.name}<div class="section-note">${team.conference} ${team.slot}</div></td>
      <td><input class="score-input" type="number" min="0" value="${team.wins}" data-team-id="${team.id}" data-field="wins" ${state.commissionerUnlocked ? "" : "disabled"}></td>
      <td><input class="score-input" type="number" min="0" value="${team.losses}" data-team-id="${team.id}" data-field="losses" ${state.commissionerUnlocked ? "" : "disabled"}></td>
      <td class="score-actions"><button type="button" data-save-score="${team.id}" ${state.commissionerUnlocked ? "" : "disabled"}>Save</button></td>
    `;
    elements.scoreTableBody.appendChild(row);
  });
  elements.resetButton.disabled = !state.commissionerUnlocked;
}

function renderIdentity() {
  const selectedPlayer = getSelectedPlayer();
  elements.currentPlayerName.textContent = selectedPlayer ? selectedPlayer.name : "No player chosen";
  elements.authStatus.textContent = "Saved in this browser only";
}

function renderSourceNote() {
  elements.sourceNote.innerHTML =
    `${state.game.meta.notes} <a href="${state.game.meta.sourceUrl}" target="_blank" rel="noreferrer">Open bracket source</a>.`;
}

function renderCommissionerStatus() {
  elements.commissionerStatus.innerHTML = state.commissionerUnlocked
    ? "Unlocked on this browser."
    : '<span class="locked-note">Locked.</span> Use the Commissioner button to unlock commissioner controls.';
}

function renderDialog() {
  elements.playerOptions.innerHTML = "";
  state.game.players.forEach((player) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "player-option";
    button.innerHTML = `<strong>${player.name}</strong><span class="status-tag">${state.selectedPlayerId === player.id ? "Current" : "Available"}</span>`;
    button.addEventListener("click", () => {
      claimPlayer(player.id);
      elements.playerDialog.close();
    });
    elements.playerOptions.appendChild(button);
  });
}

function render() {
  renderIdentity();
  renderLeaderboard();
  renderPlayerLobby();
  renderTurnStrip();
  renderDraftStatus();
  renderStartButton();
  renderTeams();
  renderMyTeams();
  renderPlayerBoards();
  renderFinalsPicker();
  renderNameEditor();
  renderChampionControls();
  renderScoreTable();
  renderSourceNote();
  renderCommissionerStatus();
  renderDialog();
  elements.lastUpdated.textContent = `Updated ${timestampToLabel(state.game.updatedAt)}`;
}

elements.switchPlayerButton.addEventListener("click", () => {
  elements.playerDialog.showModal();
});

elements.commissionerButton.addEventListener("click", () => {
  if (state.commissionerUnlocked) {
    setCommissionerUnlocked(false);
    render();
    return;
  }

  const enteredPin = window.prompt("Set or enter a commissioner PIN for this browser:");
  if (!enteredPin) {
    return;
  }

  const savedPin = localStorage.getItem("nba-playoffs-commissioner-pin");
  if (savedPin && savedPin !== enteredPin) {
    alert("That PIN does not match the one already saved in this browser.");
    return;
  }

  if (!savedPin) {
    localStorage.setItem("nba-playoffs-commissioner-pin", enteredPin);
  }

  setCommissionerUnlocked(true);
  render();
});

elements.startDraftButton.addEventListener("click", () => {
  try {
    startDraft();
  } catch (error) {
    alert(error.message);
  }
});

elements.lockFinalsButton.addEventListener("click", () => {
  try {
    assert(elements.finalsSelect.value, "Choose a Finals winner first.");
    lockFinalsPick(elements.finalsSelect.value);
  } catch (error) {
    alert(error.message);
  }
});

elements.saveNamesButton.addEventListener("click", () => {
  try {
    saveNames(Array.from(elements.nameEditor.querySelectorAll("input")).map((input) => input.value.trim()));
  } catch (error) {
    alert(error.message);
  }
});

elements.saveChampionButton.addEventListener("click", () => {
  try {
    saveChampion(elements.championSelect.value || null);
  } catch (error) {
    alert(error.message);
  }
});

elements.clearChampionButton.addEventListener("click", () => {
  try {
    saveChampion(null);
  } catch (error) {
    alert(error.message);
  }
});

elements.scoreTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-save-score]");
  if (!button) {
    return;
  }

  const teamId = button.dataset.saveScore;
  const wins = Number.parseInt(elements.scoreTableBody.querySelector(`[data-team-id="${teamId}"][data-field="wins"]`).value, 10);
  const losses = Number.parseInt(elements.scoreTableBody.querySelector(`[data-team-id="${teamId}"][data-field="losses"]`).value, 10);

  try {
    saveTeamScore(teamId, wins, losses);
  } catch (error) {
    alert(error.message);
  }
});

elements.resetButton.addEventListener("click", () => {
  if (!window.confirm("Reset the entire draft, scores, and Finals picks?")) {
    return;
  }

  try {
    resetGame();
  } catch (error) {
    alert(error.message);
  }
});

loadGame();
refreshDerivedState();
render();
