const GAME_STORAGE_KEY = "nba-playoffs-challenge-state";
const COMMISSIONER_STORAGE_KEY = "nba-playoffs-commissioner-unlocked";
const COMMISSIONER_PLAYER_ID = "nosrac";

const TEAM_LIBRARY = {
  det: { id: "det", name: "Detroit Pistons", conference: "East", slot: "1 seed", logoCode: "det" },
  bos: { id: "bos", name: "Boston Celtics", conference: "East", slot: "2 seed", logoCode: "bos" },
  nyk: { id: "nyk", name: "New York Knicks", conference: "East", slot: "3 seed", logoCode: "ny" },
  cle: { id: "cle", name: "Cleveland Cavaliers", conference: "East", slot: "4 seed", logoCode: "cle" },
  tor: { id: "tor", name: "Toronto Raptors", conference: "East", slot: "5 seed", logoCode: "tor" },
  atl: { id: "atl", name: "Atlanta Hawks", conference: "East", slot: "6 seed", logoCode: "atl" },
  phi: { id: "phi", name: "Philadelphia 76ers", conference: "East", slot: "7 seed", logoCode: "phi" },
  orl: { id: "orl", name: "Orlando Magic", conference: "East", slot: "Play-In", logoCode: "orl" },
  cha: { id: "cha", name: "Charlotte Hornets", conference: "East", slot: "Play-In", logoCode: "cha" },
  okc: { id: "okc", name: "Oklahoma City Thunder", conference: "West", slot: "1 seed", logoCode: "okc" },
  sas: { id: "sas", name: "San Antonio Spurs", conference: "West", slot: "2 seed", logoCode: "sa" },
  den: { id: "den", name: "Denver Nuggets", conference: "West", slot: "3 seed", logoCode: "den" },
  lal: { id: "lal", name: "Los Angeles Lakers", conference: "West", slot: "4 seed", logoCode: "lal" },
  hou: { id: "hou", name: "Houston Rockets", conference: "West", slot: "5 seed", logoCode: "hou" },
  min: { id: "min", name: "Minnesota Timberwolves", conference: "West", slot: "6 seed", logoCode: "min" },
  por: { id: "por", name: "Portland Trail Blazers", conference: "West", slot: "7 seed", logoCode: "por" },
  phx: { id: "phx", name: "Phoenix Suns", conference: "West", slot: "Play-In", logoCode: "phx" },
  gsw: { id: "gsw", name: "Golden State Warriors", conference: "West", slot: "Play-In", logoCode: "gs" }
};

const DEFAULT_DRAFT_TEAMS = [
  { id: "det", name: "Detroit Pistons", conference: "East", slot: "1 seed", wins: 0, losses: 0, finalsTeamIds: ["det"] },
  { id: "bos", name: "Boston Celtics", conference: "East", slot: "2 seed", wins: 0, losses: 0, finalsTeamIds: ["bos"] },
  { id: "nyk", name: "New York Knicks", conference: "East", slot: "3 seed", wins: 0, losses: 0, finalsTeamIds: ["nyk"] },
  { id: "cle", name: "Cleveland Cavaliers", conference: "East", slot: "4 seed", wins: 0, losses: 0, finalsTeamIds: ["cle"] },
  { id: "tor", name: "Toronto Raptors", conference: "East", slot: "5 seed", wins: 0, losses: 0, finalsTeamIds: ["tor"] },
  { id: "atl", name: "Atlanta Hawks", conference: "East", slot: "6 seed", wins: 0, losses: 0, finalsTeamIds: ["atl"] },
  { id: "phi", name: "Philadelphia 76ers", conference: "East", slot: "7 seed", wins: 0, losses: 0, finalsTeamIds: ["phi"] },
  {
    id: "east-8-play-in",
    name: "Magic / Hornets",
    conference: "East",
    slot: "8 seed play-in",
    wins: 0,
    losses: 0,
    logoTeamIds: ["orl", "cha"],
    finalsTeamIds: ["orl", "cha"],
    aliases: ["Orlando Magic", "Magic", "Charlotte Hornets", "Hornets"]
  },
  { id: "okc", name: "Oklahoma City Thunder", conference: "West", slot: "1 seed", wins: 0, losses: 0, finalsTeamIds: ["okc"] },
  { id: "sas", name: "San Antonio Spurs", conference: "West", slot: "2 seed", wins: 0, losses: 0, finalsTeamIds: ["sas"] },
  { id: "den", name: "Denver Nuggets", conference: "West", slot: "3 seed", wins: 0, losses: 0, finalsTeamIds: ["den"] },
  { id: "lal", name: "Los Angeles Lakers", conference: "West", slot: "4 seed", wins: 0, losses: 0, finalsTeamIds: ["lal"] },
  { id: "hou", name: "Houston Rockets", conference: "West", slot: "5 seed", wins: 0, losses: 0, finalsTeamIds: ["hou"] },
  { id: "min", name: "Minnesota Timberwolves", conference: "West", slot: "6 seed", wins: 0, losses: 0, finalsTeamIds: ["min"] },
  { id: "por", name: "Portland Trail Blazers", conference: "West", slot: "7 seed", wins: 0, losses: 0, finalsTeamIds: ["por"] },
  {
    id: "west-8-play-in",
    name: "Suns / Warriors",
    conference: "West",
    slot: "8 seed play-in",
    wins: 0,
    losses: 0,
    logoTeamIds: ["phx", "gsw"],
    finalsTeamIds: ["phx", "gsw"],
    aliases: ["Phoenix Suns", "Suns", "Golden State Warriors", "Warriors"]
  }
];

const state = {
  game: null,
  selectedPlayerId: null,
  commissionerUnlocked: localStorage.getItem(COMMISSIONER_STORAGE_KEY) === "true"
};

const publishedSnapshot = window.NBA_PUBLISHED_SNAPSHOT || null;

const queryParams = typeof URLSearchParams === "function"
  ? new URLSearchParams(window.location.search)
  : null;
const isControlOverride = queryParams ? queryParams.get("control") === "1" : window.location.search.indexOf("control=1") !== -1;
const supportsNativeDialog =
  typeof HTMLDialogElement !== "undefined" &&
  elementsSafeCheck("showModal") &&
  elementsSafeCheck("close");

function elementsSafeCheck(methodName) {
  const dialog = document.createElement("dialog");
  return typeof dialog[methodName] === "function";
}

const elements = {
  leaderboard: document.querySelector("#leaderboard"),
  playerLobbyPanel: document.querySelector("#player-lobby-panel"),
  draftBoardPanel: document.querySelector("#draft-board-panel"),
  playerSummaryPanel: document.querySelector("#player-summary-panel"),
  commissionerPanel: document.querySelector("#commissioner-panel"),
  notesPanel: document.querySelector("#notes-panel"),
  playerLobby: document.querySelector("#player-lobby"),
  currentPlayerName: document.querySelector("#current-player-name"),
  authStatus: document.querySelector("#auth-status"),
  switchPlayerButton: document.querySelector("#switch-player-button"),
  commissionerButton: document.querySelector("#commissioner-button"),
  liveBoardButton: document.querySelector("#live-board-button"),
  commissionerEyebrow: document.querySelector("#commissioner-eyebrow"),
  commissionerTitle: document.querySelector("#commissioner-title"),
  commissionerStatus: document.querySelector("#commissioner-status"),
  draftStatus: document.querySelector("#draft-status"),
  randomOrderButton: document.querySelector("#random-order-button"),
  startDraftButton: document.querySelector("#start-draft-button"),
  turnStrip: document.querySelector("#turn-strip"),
  availableTeams: document.querySelector("#available-teams"),
  myTeamList: document.querySelector("#my-team-list"),
  playerBoards: document.querySelector("#player-boards"),
  finalsSelect: document.querySelector("#finals-select"),
  lockFinalsButton: document.querySelector("#lock-finals-button"),
  finalsHelperText: document.querySelector("#finals-helper-text"),
  lastUpdated: document.querySelector("#last-updated"),
  sourceNote: document.querySelector("#source-note"),
  nameEditor: document.querySelector("#name-editor"),
  saveNamesButton: document.querySelector("#save-names-button"),
  championSelect: document.querySelector("#champion-select"),
  saveChampionButton: document.querySelector("#save-champion-button"),
  clearChampionButton: document.querySelector("#clear-champion-button"),
  scoreTableBody: document.querySelector("#score-table-body"),
  downloadSnapshotButton: document.querySelector("#download-snapshot-button"),
  resetButton: document.querySelector("#reset-button"),
  playerDialog: document.querySelector("#player-dialog"),
  closePlayerDialogButton: document.querySelector("#close-player-dialog-button"),
  playerOptions: document.querySelector("#player-options"),
  leaderboardCardTemplate: document.querySelector("#leaderboard-card-template")
};

function createDefaultGameState() {
  return {
    meta: {
      seasonLabel: "2026 NBA Playoffs Challenge",
      sourceLabel: "2026 playoff field with play-in combo slots",
      sourceUrl: "https://www.nba.com/playoffs/2026/bracket",
      sourceUpdated: "2026-04-17",
      notes:
        "This version is a plain browser app. The two 8-seed play-in spots are draftable combo slots until Friday's play-in games are settled, and the live board scores whichever team wins through."
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
    teams: DEFAULT_DRAFT_TEAMS.map((team) => ({ ...team })),
    picks: [],
    draftStarted: false,
    finalsPredictions: {},
    championTeamId: null,
    updatedAt: new Date().toISOString()
  };
}

function getFinalsEligibleTeams(game) {
  const ids = new Set();
  game.teams.forEach((team) => {
    const finalsIds = team.finalsTeamIds || [team.id];
    finalsIds.forEach((teamId) => ids.add(teamId));
  });
  return Array.from(ids)
    .map((teamId) => TEAM_LIBRARY[teamId])
    .filter(Boolean);
}

function getFinalsTeamById(teamId) {
  return TEAM_LIBRARY[teamId] || null;
}

function draftedTeamCoversFinalsPick(draftedTeamId, finalsPickId) {
  const draftedTeam = getTeamById(draftedTeamId);
  return Boolean(draftedTeam && (draftedTeam.finalsTeamIds || [draftedTeam.id]).includes(finalsPickId));
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
}

function getSelectedPlayer() {
  return state.game.players.find((player) => player.id === state.selectedPlayerId) || null;
}

function isCommissionerPlayer() {
  return state.selectedPlayerId === COMMISSIONER_PLAYER_ID;
}

function getPlayerById(playerId) {
  return state.game.players.find((player) => player.id === playerId);
}

function getTeamById(teamId) {
  return state.game.teams.find((team) => team.id === teamId);
}

function getTeamLogoUrl(teamId) {
  const code = TEAM_LIBRARY[teamId]?.logoCode;
  return code ? `https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/${code}.png` : "";
}

function getTeamDisplayName(teamId) {
  return getTeamById(teamId)?.name || getFinalsTeamById(teamId)?.name || "Unknown team";
}

function getTeamTitleMarkup(team) {
  const logoTeamIds = team.logoTeamIds || [team.id];
  const logos = logoTeamIds
    .map((teamId) => getTeamLogoUrl(teamId))
    .filter(Boolean)
    .map((src) => `<img class="team-logo" src="${src}" alt="">`)
    .join("");

  return `<h3 class="team-title">${logos}<span>${team.name}</span></h3>`;
}

function getMiniTeamMarkup(team) {
  const logoTeamIds = team.logoTeamIds || [team.id];
  const logos = logoTeamIds
    .map((teamId) => getTeamLogoUrl(teamId))
    .filter(Boolean)
    .map((src) => `<img class="mini-team-logo" src="${src}" alt="">`)
    .join("");

  return `<span class="inline-team">${logos}<span>${team.name}</span></span>`;
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
      const draftedChampion =
        predictedChampion && teamIds.some((teamId) => draftedTeamCoversFinalsPick(teamId, finalsPick));
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
      allFinalsPicksLocked: game.players.every((player) => Boolean(game.finalsPredictions[player.id])),
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
  redirectToLiveTotalsIfNeeded();
  render();
}

function openPlayerDialog() {
  if (supportsNativeDialog) {
    elements.playerDialog.showModal();
    return;
  }

  elements.playerDialog.setAttribute("open", "open");
  elements.playerDialog.classList.add("dialog-fallback");
}

function closePlayerDialog() {
  if (supportsNativeDialog) {
    elements.playerDialog.close();
    return;
  }

  elements.playerDialog.removeAttribute("open");
  elements.playerDialog.classList.remove("dialog-fallback");
}

function redirectToLiveTotalsIfNeeded() {
  const onSnapshotPage = window.location.pathname.endsWith("/results_snapshot.html");
  if (!onSnapshotPage && !isControlOverride && publishedSnapshot && publishedSnapshot.game) {
    window.location.href = "./results_snapshot.html";
  }
}

function downloadPublishedSnapshot() {
  assert(state.game.derived.draftComplete, "Finish the draft before publishing a snapshot.");
  assert(state.game.derived.allFinalsPicksLocked, "Lock all champion picks before publishing a snapshot.");

  const snapshot = {
    publishedAt: new Date().toISOString(),
    game: state.game
  };
  const fileContents = `window.NBA_PUBLISHED_SNAPSHOT = ${JSON.stringify(snapshot, null, 2)};\n`;
  const blob = new Blob([fileContents], { type: "application/javascript;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "snapshot-data.js";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function claimPlayer(playerId) {
  setSelectedPlayer(playerId);
  if (state.game.derived?.draftComplete && state.game.derived?.allFinalsPicksLocked && !isControlOverride) {
    window.location.href = `./results_snapshot.html?viewer=${playerId}`;
    return;
  }

  render();
}

function startDraft() {
  assert(state.commissionerUnlocked, "Unlock commissioner mode first.");
  assert(isCommissionerPlayer(), "Only Nosrac can use commissioner controls.");
  assert(!state.game.draftStarted, "The draft has already started.");
  state.game.draftStarted = true;
  saveAndRender();
}

function randomizeDraftOrder() {
  assert(state.commissionerUnlocked, "Unlock commissioner mode first.");
  assert(isCommissionerPlayer(), "Only Nosrac can use commissioner controls.");
  assert(!state.game.draftStarted, "You can only randomize order before the draft starts.");

  const shuffled = [...state.game.draftOrder];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  state.game.draftOrder = shuffled;
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
  assert(isCommissionerPlayer(), "Only Nosrac can use commissioner controls.");
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
  assert(isCommissionerPlayer(), "Only Nosrac can use commissioner controls.");
  state.game.championTeamId = teamId;
  saveAndRender();
}

function saveTeamScore(teamId, wins, losses) {
  assert(state.commissionerUnlocked, "Unlock commissioner mode first.");
  assert(isCommissionerPlayer(), "Only Nosrac can use commissioner controls.");
  assert(Number.isInteger(wins) && wins >= 0, "Wins must be a whole number.");
  assert(Number.isInteger(losses) && losses >= 0, "Losses must be a whole number.");

  state.game.teams = state.game.teams.map((team) =>
    team.id === teamId ? { ...team, wins, losses } : team
  );

  saveAndRender();
}

function resetGame() {
  assert(state.commissionerUnlocked, "Unlock commissioner mode first.");
  assert(isCommissionerPlayer(), "Only Nosrac can use commissioner controls.");
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
      `Team score: ${entry.teamScore} | Finals bonus: ${entry.finalsBonus} | Finals pick: ${entry.finalsPick ? getTeamDisplayName(entry.finalsPick) : "Not locked"}`;
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
        <p class="seed-line">${state.selectedPlayerId === player.id ? "Currently selected" : "Available"}</p>
      </div>
    `;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = state.selectedPlayerId === player.id ? "Current Player" : "Choose This Player";
    button.addEventListener("click", () => {
      try {
        claimPlayer(player.id);
      } catch (error) {
        alert(error.message);
      }
    });
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

  if (state.game.derived.draftComplete && !state.game.derived.allFinalsPicksLocked) {
    const lockedCount = state.game.players.filter((player) => Boolean(state.game.finalsPredictions[player.id])).length;
    elements.draftStatus.textContent = `Draft complete. Champion picks locked: ${lockedCount} of ${state.game.players.length}.`;
    return;
  }

  if (state.game.derived.draftComplete && state.game.derived.allFinalsPicksLocked) {
    elements.draftStatus.textContent = "Draft and champion picks are complete. Redirecting to the live scoring board.";
    return;
  }

  const currentPlayer = getPlayerById(state.game.derived.currentTurn.playerId);
  elements.draftStatus.textContent =
    state.selectedPlayerId === currentPlayer.id
      ? `You are on the clock for Round ${state.game.derived.currentTurn.round}.`
      : `${currentPlayer.name} is on the clock for Round ${state.game.derived.currentTurn.round}.`;
}

function renderStartButton() {
  elements.randomOrderButton.disabled = !state.commissionerUnlocked || !isCommissionerPlayer() || state.game.draftStarted;
  elements.startDraftButton.disabled = !state.commissionerUnlocked || !isCommissionerPlayer() || state.game.draftStarted;
  elements.startDraftButton.textContent = state.game.draftStarted ? "Snake Draft Started" : "Start Snake Draft";
  if (elements.downloadSnapshotButton) {
    elements.downloadSnapshotButton.disabled = !state.game.derived.draftComplete || !state.game.derived.allFinalsPicksLocked;
  }
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
          ${getTeamTitleMarkup(team)}
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
        ? `<ul>${teamIds.map((teamId) => {
            const team = getTeamById(teamId);
            return `<li>${getMiniTeamMarkup(team)} <span>(${team.wins - team.losses})</span></li>`;
          }).join("")}</ul>`
        : "<p class='section-note'>No teams yet.</p>"}
      <p class="section-note">Finals pick: ${state.game.finalsPredictions[player.id] ? getTeamDisplayName(state.game.finalsPredictions[player.id]) : "Not locked"}</p>
    `;
    elements.playerBoards.appendChild(board);
  });
}

function renderFinalsPicker() {
  const selectedPlayer = getSelectedPlayer();
  const lockedPick = selectedPlayer ? state.game.finalsPredictions[selectedPlayer.id] : null;
  const finalsBox = elements.finalsSelect.closest(".finals-box");

  elements.finalsSelect.innerHTML = ['<option value="">Choose a team</option>']
    .concat(
      getFinalsEligibleTeams(state.game)
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((team) => `<option value="${team.id}">${team.name}</option>`)
    )
    .join("");

  if (lockedPick) {
    elements.finalsSelect.value = lockedPick;
  }

  if (finalsBox) {
    finalsBox.style.display = state.game.derived.draftComplete ? "" : "none";
  }

  const canLock = selectedPlayer && state.game.derived.draftComplete && !lockedPick;
  elements.finalsSelect.disabled = !canLock;
  elements.lockFinalsButton.disabled = !canLock;
  elements.lockFinalsButton.textContent = lockedPick ? "Finals Pick Locked" : "Lock Finals Pick";
  if (elements.finalsHelperText) {
    elements.finalsHelperText.textContent = state.game.derived.allFinalsPicksLocked
      ? "All champion picks are locked."
      : "Bonus: +5 if you drafted the champion, +3 if you called the winner without drafting them.";
  }
}

function renderNameEditor() {
  elements.nameEditor.innerHTML = "";
  state.game.players.forEach((player) => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = player.name;
    input.disabled = !state.commissionerUnlocked || !isCommissionerPlayer() || state.game.draftStarted;
    elements.nameEditor.appendChild(input);
  });
  elements.saveNamesButton.disabled = !state.commissionerUnlocked || !isCommissionerPlayer() || state.game.draftStarted;
}

function renderChampionControls() {
  elements.championSelect.innerHTML = ['<option value="">No champion set</option>']
    .concat(getFinalsEligibleTeams(state.game).map((team) => `<option value="${team.id}">${team.name}</option>`))
    .join("");
  elements.championSelect.value = state.game.championTeamId || "";
  elements.championSelect.disabled = !state.commissionerUnlocked || !isCommissionerPlayer();
  elements.saveChampionButton.disabled = !state.commissionerUnlocked || !isCommissionerPlayer();
  elements.clearChampionButton.disabled = !state.commissionerUnlocked || !isCommissionerPlayer();
}

function renderScoreTable() {
  if (!elements.scoreTableBody) {
    return;
  }

  elements.scoreTableBody.innerHTML = "";
  state.game.teams.forEach((team) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${team.name}<div class="section-note">${team.conference} ${team.slot}</div></td>
      <td><input class="score-input" type="number" min="0" value="${team.wins}" data-team-id="${team.id}" data-field="wins" ${state.commissionerUnlocked && isCommissionerPlayer() ? "" : "disabled"}></td>
      <td><input class="score-input" type="number" min="0" value="${team.losses}" data-team-id="${team.id}" data-field="losses" ${state.commissionerUnlocked && isCommissionerPlayer() ? "" : "disabled"}></td>
      <td class="score-actions"><button type="button" data-save-score="${team.id}" ${state.commissionerUnlocked && isCommissionerPlayer() ? "" : "disabled"}>Save</button></td>
    `;
    elements.scoreTableBody.appendChild(row);
  });
  elements.resetButton.disabled = !state.commissionerUnlocked || !isCommissionerPlayer();
}

function renderIdentity() {
  const selectedPlayer = getSelectedPlayer();
  elements.currentPlayerName.textContent = selectedPlayer ? selectedPlayer.name : "No player chosen";
  elements.authStatus.textContent = selectedPlayer
    ? "Current viewer"
    : "Pick a player";
  elements.switchPlayerButton.style.display = "";
  elements.commissionerButton.style.display = isCommissionerPlayer() ? "" : "none";
  elements.liveBoardButton.style.display =
    publishedSnapshot && publishedSnapshot.game ? "" : "none";
}

function renderPageMode() {
  const preDraftMode = !state.game.derived.draftComplete;
  const controlMode = isControlOverride;

  elements.commissionerEyebrow.textContent = preDraftMode ? "Draft Setup" : "Post-Draft";
  elements.commissionerTitle.textContent = preDraftMode ? "Draft Controls" : "Champion And Results Controls";

  if (elements.leaderboard?.closest(".panel")) {
    elements.leaderboard.closest(".panel").style.display = "none";
  }

  elements.playerLobbyPanel.style.display = "";
  elements.playerSummaryPanel.style.display = preDraftMode ? "none" : "";
  elements.notesPanel.style.display = preDraftMode ? "none" : "";

  if (preDraftMode) {
    elements.commissionerPanel.style.display = "";
    return;
  }

  elements.commissionerPanel.style.display = controlMode && isCommissionerPlayer() ? "" : "none";
}

function renderSourceNote() {
  elements.sourceNote.innerHTML =
    `${state.game.meta.notes} <a href="${state.game.meta.sourceUrl}" target="_blank" rel="noreferrer">Open bracket source</a>.`;
}

function renderCommissionerStatus() {
  if (!isCommissionerPlayer()) {
    elements.commissionerStatus.innerHTML = "Only the browser locked to Nosrac can use commissioner controls.";
    return;
  }

  elements.commissionerStatus.innerHTML = state.commissionerUnlocked
    ? "Unlocked on this browser for Nosrac."
    : '<span class="locked-note">Locked.</span> Use the Commissioner button to unlock commissioner controls.';
}

function renderDialog() {
  elements.playerOptions.innerHTML = "";
  state.game.players.forEach((player) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "player-option";
    button.innerHTML = `<strong>${player.name}</strong><span class="status-tag">${state.selectedPlayerId === player.id ? "Current" : "Choose"}</span>`;
    button.addEventListener("click", () => {
      try {
        claimPlayer(player.id);
        closePlayerDialog();
      } catch (error) {
        alert(error.message);
      }
    });
    elements.playerOptions.appendChild(button);
  });
}

function render() {
  renderPageMode();
  renderIdentity();
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
  openPlayerDialog();
});

elements.closePlayerDialogButton.addEventListener("click", () => {
  closePlayerDialog();
});

elements.commissionerButton.addEventListener("click", () => {
  if (!isCommissionerPlayer()) {
    alert("Only the browser locked to Nosrac can use commissioner controls.");
    return;
  }

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

elements.liveBoardButton.addEventListener("click", () => {
  const playerId = state.selectedPlayerId ? `?viewer=${state.selectedPlayerId}` : "";
  window.location.href = `./results_snapshot.html${playerId}`;
});

elements.downloadSnapshotButton.addEventListener("click", () => {
  try {
    downloadPublishedSnapshot();
    alert("Downloaded a new snapshot-data.js file. Replace the repo file with it, then commit and push so every device sees the published live board.");
  } catch (error) {
    alert(error.message);
  }
});

elements.startDraftButton.addEventListener("click", () => {
  try {
    startDraft();
  } catch (error) {
    alert(error.message);
  }
});

elements.randomOrderButton.addEventListener("click", () => {
  try {
    randomizeDraftOrder();
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

if (elements.scoreTableBody) {
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
}

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
localStorage.removeItem("nba-playoffs-selected-player");
refreshDerivedState();
redirectToLiveTotalsIfNeeded();
render();
