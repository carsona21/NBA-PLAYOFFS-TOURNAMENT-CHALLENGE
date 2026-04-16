import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const PLAYER_STORAGE_KEY = "nba-playoffs-selected-player";
const COMMISSIONER_STORAGE_KEY = "nba-playoffs-commissioner-unlocked";

const state = {
  authUser: null,
  db: null,
  gameRef: null,
  game: null,
  unsubscribeGame: null,
  selectedPlayerId: localStorage.getItem(PLAYER_STORAGE_KEY) || null,
  commissionerUnlocked: localStorage.getItem(COMMISSIONER_STORAGE_KEY) === "true"
};

const elements = {
  authStatus: document.querySelector("#auth-status"),
  setupPanel: document.querySelector("#setup-panel"),
  leaderboard: document.querySelector("#leaderboard"),
  playerLobby: document.querySelector("#player-lobby"),
  currentPlayerName: document.querySelector("#current-player-name"),
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

const appConfig = window.NBA_PLAYOFFS_CONFIG || {};

function isConfigReady() {
  return Boolean(
    appConfig.firebaseConfig &&
      appConfig.firebaseConfig.apiKey &&
      appConfig.firebaseConfig.projectId &&
      appConfig.gameId
  );
}

function createDefaultGameState() {
  return {
    meta: {
      seasonLabel: "2026 NBA Playoffs Challenge",
      sourceLabel: "NBA.com bracket snapshot",
      sourceUrl: "https://www.nba.com/news/2026-nba-playoffs-standings-and-bracket-updates?lctg=5ed4ccff7d228b4de559fa61&lid=trhtby3pjw3w",
      sourceUpdated: "2026-04-13",
      notes:
        "Seeded from NBA.com's April 13, 2026 postseason bracket update, which included the full 20-team field before play-in games were completed."
    },
    settings: {
      playersCount: 4,
      teamsPerPlayer: 4,
      finalsBonusWithTeam: 5,
      finalsBonusWithoutTeam: 3
    },
    players: [
      { id: "nosrac", name: "Nosrac", claimedBy: null },
      { id: "samuel", name: "Samuel", claimedBy: null },
      { id: "mason", name: "Mason", claimedBy: null },
      { id: "winston-lover", name: "Winston Lover", claimedBy: null }
    ],
    draftOrder: ["nosrac", "samuel", "mason", "winston-lover"],
    teams: [
      { id: "det", name: "Detroit Pistons", conference: "East", slot: "1 seed", wins: 0, losses: 0 },
      { id: "bos", name: "Boston Celtics", conference: "East", slot: "2 seed", wins: 0, losses: 0 },
      { id: "nyk", name: "New York Knicks", conference: "East", slot: "3 seed", wins: 0, losses: 0 },
      { id: "cle", name: "Cleveland Cavaliers", conference: "East", slot: "4 seed", wins: 0, losses: 0 },
      { id: "tor", name: "Toronto Raptors", conference: "East", slot: "5 seed", wins: 0, losses: 0 },
      { id: "atl", name: "Atlanta Hawks", conference: "East", slot: "6 seed", wins: 0, losses: 0 },
      { id: "phi", name: "Philadelphia 76ers", conference: "East", slot: "Play-In 7", wins: 0, losses: 0 },
      { id: "orl", name: "Orlando Magic", conference: "East", slot: "Play-In 8", wins: 0, losses: 0 },
      { id: "cha", name: "Charlotte Hornets", conference: "East", slot: "Play-In 9", wins: 0, losses: 0 },
      { id: "mia", name: "Miami Heat", conference: "East", slot: "Play-In 10", wins: 0, losses: 0 },
      { id: "okc", name: "Oklahoma City Thunder", conference: "West", slot: "1 seed", wins: 0, losses: 0 },
      { id: "sas", name: "San Antonio Spurs", conference: "West", slot: "2 seed", wins: 0, losses: 0 },
      { id: "den", name: "Denver Nuggets", conference: "West", slot: "3 seed", wins: 0, losses: 0 },
      { id: "lal", name: "Los Angeles Lakers", conference: "West", slot: "4 seed", wins: 0, losses: 0 },
      { id: "hou", name: "Houston Rockets", conference: "West", slot: "5 seed", wins: 0, losses: 0 },
      { id: "min", name: "Minnesota Timberwolves", conference: "West", slot: "6 seed", wins: 0, losses: 0 },
      { id: "phx", name: "Phoenix Suns", conference: "West", slot: "Play-In 7", wins: 0, losses: 0 },
      { id: "por", name: "Portland Trail Blazers", conference: "West", slot: "Play-In 8", wins: 0, losses: 0 },
      { id: "lac", name: "LA Clippers", conference: "West", slot: "Play-In 9", wins: 0, losses: 0 },
      { id: "gsw", name: "Golden State Warriors", conference: "West", slot: "Play-In 10", wins: 0, losses: 0 }
    ],
    picks: [],
    draftStarted: false,
    finalsPredictions: {},
    championTeamId: null,
    updatedAt: null
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function timestampToLabel(timestampValue) {
  if (!timestampValue) {
    return "Just now";
  }

  const dateValue =
    typeof timestampValue.toDate === "function"
      ? timestampValue.toDate()
      : new Date(timestampValue);

  return dateValue.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
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
    if (picksByPlayer[pick.playerId]) {
      picksByPlayer[pick.playerId].push(pick.teamId);
    }
  }

  const draftedTeamIds = new Set(game.picks.map((pick) => pick.teamId));
  const currentTurn = game.draftStarted ? turns[game.picks.length] || null : null;

  const leaderboard = game.players
    .map((player) => {
      const teamIds = picksByPlayer[player.id] || [];
      const teamScore = teamIds.reduce((total, teamId) => {
        const team = teamsById[teamId];
        return total + (team.wins - team.losses);
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
      claimedPlayers: game.players.filter((player) => player.claimedBy).length,
      draftComplete: game.picks.length >= turns.length,
      draftedTeamIds: Array.from(draftedTeamIds),
      availableTeams: game.teams.filter((team) => !draftedTeamIds.has(team.id)),
      picksByPlayer,
      leaderboard
    }
  };
}

function getSelectedPlayer() {
  return state.game?.players.find((player) => player.id === state.selectedPlayerId) || null;
}

function getPlayerById(playerId) {
  return state.game.players.find((player) => player.id === playerId);
}

function getTeamById(teamId) {
  return state.game.teams.find((team) => team.id === teamId);
}

function saveSelectedPlayer(playerId) {
  state.selectedPlayerId = playerId;
  localStorage.setItem(PLAYER_STORAGE_KEY, playerId);
}

function setCommissionerUnlocked(value) {
  state.commissionerUnlocked = value;
  localStorage.setItem(COMMISSIONER_STORAGE_KEY, value ? "true" : "false");
}

function syncSelectedPlayerFromClaims() {
  if (!state.authUser || !state.game) {
    return;
  }

  const claimedPlayer = state.game.players.find((player) => player.claimedBy === state.authUser.uid);
  if (claimedPlayer) {
    saveSelectedPlayer(claimedPlayer.id);
    return;
  }

  if (state.selectedPlayerId) {
    const selectedPlayer = getSelectedPlayer();
    if (!selectedPlayer || selectedPlayer.claimedBy) {
      localStorage.removeItem(PLAYER_STORAGE_KEY);
      state.selectedPlayerId = null;
    }
  }
}

async function ensureGameExists() {
  const snapshot = await getDoc(state.gameRef);
  if (snapshot.exists()) {
    return;
  }

  await runTransaction(state.db, async (transaction) => {
    const gameSnapshot = await transaction.get(state.gameRef);
    if (!gameSnapshot.exists()) {
      transaction.set(state.gameRef, {
        ...createDefaultGameState(),
        updatedAt: serverTimestamp()
      });
    }
  });
}

async function claimPlayer(playerId) {
  assert(state.authUser, "You need to be signed in first.");

  await runTransaction(state.db, async (transaction) => {
    const snapshot = await transaction.get(state.gameRef);
    assert(snapshot.exists(), "Game setup is missing.");

    const game = snapshot.data();
    const players = game.players.map((player) => ({ ...player }));
    const targetPlayer = players.find((player) => player.id === playerId);
    const existingClaim = players.find((player) => player.claimedBy === state.authUser.uid);

    assert(targetPlayer, "That player slot does not exist.");

    if (targetPlayer.claimedBy && targetPlayer.claimedBy !== state.authUser.uid) {
      throw new Error("That player slot is already claimed on another device.");
    }

    if (existingClaim && existingClaim.id !== playerId) {
      assert(game.picks.length === 0, "You cannot switch player slots after the draft starts.");
      existingClaim.claimedBy = null;
    }

    targetPlayer.claimedBy = state.authUser.uid;

    transaction.update(state.gameRef, {
      players,
      updatedAt: serverTimestamp()
    });
  });

  saveSelectedPlayer(playerId);
}

async function makePick(teamId) {
  const selectedPlayer = getSelectedPlayer();
  assert(selectedPlayer, "Choose your player name first.");

  await runTransaction(state.db, async (transaction) => {
    const snapshot = await transaction.get(state.gameRef);
    assert(snapshot.exists(), "Game setup is missing.");

    const game = buildDerivedGame(snapshot.data());
    const player = game.players.find((entry) => entry.id === selectedPlayer.id);
    assert(player?.claimedBy === state.authUser.uid, "This device does not own that player slot.");
    assert(game.draftStarted, "The draft has not been started yet.");
    assert(!game.derived.draftComplete, "The draft is already complete.");
    assert(game.derived.currentTurn.playerId === selectedPlayer.id, "It is not your turn.");
    assert(game.teams.some((team) => team.id === teamId), "Unknown team.");
    assert(!game.derived.draftedTeamIds.includes(teamId), "That team has already been drafted.");

    const picks = game.picks.concat({
      playerId: selectedPlayer.id,
      teamId,
      round: game.derived.currentTurn.round,
      pickNumber: game.picks.length + 1
    });

    transaction.update(state.gameRef, {
      picks,
      updatedAt: serverTimestamp()
    });
  });
}

async function startDraft() {
  requireCommissioner();

  await runTransaction(state.db, async (transaction) => {
    const snapshot = await transaction.get(state.gameRef);
    assert(snapshot.exists(), "Game setup is missing.");

    const game = snapshot.data();
    assert(!game.draftStarted, "The draft has already started.");
    assert(game.players.every((player) => player.claimedBy), "All four players need to claim their slot first.");

    transaction.update(state.gameRef, {
      draftStarted: true,
      updatedAt: serverTimestamp()
    });
  });
}

async function lockFinalsPick(teamId) {
  const selectedPlayer = getSelectedPlayer();
  assert(selectedPlayer, "Choose your player name first.");

  await runTransaction(state.db, async (transaction) => {
    const snapshot = await transaction.get(state.gameRef);
    assert(snapshot.exists(), "Game setup is missing.");

    const game = buildDerivedGame(snapshot.data());
    const player = game.players.find((entry) => entry.id === selectedPlayer.id);
    assert(player?.claimedBy === state.authUser.uid, "This device does not own that player slot.");
    assert(game.derived.draftComplete, "Finals picks unlock after the draft.");
    assert(!game.finalsPredictions[selectedPlayer.id], "Your Finals pick is already locked.");

    const finalsPredictions = {
      ...game.finalsPredictions,
      [selectedPlayer.id]: teamId
    };

    transaction.update(state.gameRef, {
      finalsPredictions,
      updatedAt: serverTimestamp()
    });
  });
}

function requireCommissioner() {
  if (!state.commissionerUnlocked) {
    throw new Error("Commissioner mode is locked on this device.");
  }
}

async function saveNames(names) {
  requireCommissioner();

  await runTransaction(state.db, async (transaction) => {
    const snapshot = await transaction.get(state.gameRef);
    assert(snapshot.exists(), "Game setup is missing.");

    const game = snapshot.data();
    assert(!game.draftStarted && game.picks.length === 0, "Names can only be changed before the draft starts.");
    assert(names.length === game.players.length, "Exactly four player names are required.");
    assert(names.every(Boolean), "Every player needs a name.");

    const players = game.players.map((player, index) => ({
      ...player,
      name: names[index]
    }));

    transaction.update(state.gameRef, {
      players,
      updatedAt: serverTimestamp()
    });
  });
}

async function saveChampion(teamId) {
  requireCommissioner();

  await runTransaction(state.db, async (transaction) => {
    const snapshot = await transaction.get(state.gameRef);
    assert(snapshot.exists(), "Game setup is missing.");

    const game = snapshot.data();
    if (teamId !== null) {
      assert(game.teams.some((team) => team.id === teamId), "Unknown champion team.");
    }

    transaction.update(state.gameRef, {
      championTeamId: teamId,
      updatedAt: serverTimestamp()
    });
  });
}

async function saveTeamScore(teamId, wins, losses) {
  requireCommissioner();

  await runTransaction(state.db, async (transaction) => {
    const snapshot = await transaction.get(state.gameRef);
    assert(snapshot.exists(), "Game setup is missing.");

    const game = snapshot.data();
    const team = game.teams.find((entry) => entry.id === teamId);
    assert(team, "Unknown team.");
    assert(Number.isInteger(wins) && wins >= 0, "Wins must be a whole number.");
    assert(Number.isInteger(losses) && losses >= 0, "Losses must be a whole number.");

    const teams = game.teams.map((entry) =>
      entry.id === teamId ? { ...entry, wins, losses } : entry
    );

    transaction.update(state.gameRef, {
      teams,
      updatedAt: serverTimestamp()
    });
  });
}

async function resetGame() {
  requireCommissioner();

  await runTransaction(state.db, async (transaction) => {
    const snapshot = await transaction.get(state.gameRef);
    const currentGame = snapshot.exists() ? snapshot.data() : createDefaultGameState();
    const resetState = createDefaultGameState();

    resetState.players = resetState.players.map((player, index) => ({
      ...player,
      name: currentGame.players?.[index]?.name || player.name
    }));

    transaction.set(state.gameRef, {
      ...resetState,
      updatedAt: serverTimestamp()
    });
  });

  localStorage.removeItem(PLAYER_STORAGE_KEY);
  state.selectedPlayerId = null;
}

function renderLeaderboard() {
  elements.leaderboard.innerHTML = "";

  state.game.derived.leaderboard.forEach((entry, index) => {
    const fragment = elements.leaderboardCardTemplate.content.cloneNode(true);
    const article = fragment.querySelector(".leader-card");
    const placement = fragment.querySelector(".placement");
    const title = fragment.querySelector("h3");
    const scoreLine = fragment.querySelector(".score-line");
    const metaLine = fragment.querySelector(".meta-line");
    const finalsTeam = entry.finalsPick ? getTeamById(entry.finalsPick)?.name : "Not locked";

    placement.textContent = `#${index + 1}`;
    title.textContent = entry.playerName;
    scoreLine.textContent = `${entry.totalScore} pts total`;
    metaLine.textContent = `Team score: ${entry.teamScore} | Finals bonus: ${entry.finalsBonus} | Finals pick: ${finalsTeam}`;

    if (state.selectedPlayerId === entry.playerId) {
      article.style.borderColor = "rgba(32, 97, 75, 0.5)";
    }

    elements.leaderboard.appendChild(fragment);
  });
}

function renderTurnStrip() {
  elements.turnStrip.innerHTML = "";

  state.game.derived.turns.forEach((turn, index) => {
    const player = getPlayerById(turn.playerId);
    const pill = document.createElement("div");
    pill.className = "turn-pill";

    if (state.game.derived.currentTurn && state.game.derived.currentTurn.playerId === turn.playerId && state.game.picks.length === index) {
      pill.classList.add("active");
    }

    if (turn.playerId === state.selectedPlayerId) {
      pill.classList.add("current-user");
    }

    pill.innerHTML = `
      <strong>Pick ${index + 1}</strong>
      <div>${player.name}</div>
      <div>Round ${turn.round}</div>
    `;

    elements.turnStrip.appendChild(pill);
  });
}

function renderDraftStatus() {
  const selectedPlayer = getSelectedPlayer();

  if (!state.game.draftStarted) {
    elements.draftStatus.textContent = `Waiting to start. ${state.game.derived.claimedPlayers}/4 players have claimed their slot.`;
    return;
  }

  if (state.game.derived.draftComplete) {
    elements.draftStatus.textContent = "Draft complete. Finals picks are open.";
    return;
  }

  const currentPlayer = getPlayerById(state.game.derived.currentTurn.playerId);
  elements.draftStatus.textContent =
    selectedPlayer && selectedPlayer.id === currentPlayer.id
      ? `You are on the clock for Round ${state.game.derived.currentTurn.round}.`
      : `${currentPlayer.name} is on the clock for Round ${state.game.derived.currentTurn.round}.`;
}

function renderPlayerLobby() {
  elements.playerLobby.innerHTML = "";

  state.game.players.forEach((player) => {
    const isMine = player.claimedBy === state.authUser?.uid;
    const isTaken = Boolean(player.claimedBy && !isMine);
    const card = document.createElement("article");
    card.className = "team-card";
    card.innerHTML = `
      <div>
        <h3>${player.name}</h3>
        <p class="seed-line">${isMine ? "Claimed on this device" : isTaken ? "Claimed on another device" : "Available to claim"}</p>
      </div>
    `;

    const button = document.createElement("button");
    button.type = "button";
    button.disabled = isTaken;
    button.textContent = isMine ? "You Are This Player" : "Claim This Player";
    button.addEventListener("click", async () => {
      try {
        await claimPlayer(player.id);
      } catch (error) {
        alert(error.message);
      }
    });

    card.appendChild(button);
    elements.playerLobby.appendChild(card);
  });
}

function renderTeams() {
  elements.availableTeams.innerHTML = "";
  const selectedPlayer = getSelectedPlayer();
  const currentTurn = state.game.derived.currentTurn;
  const canPick =
    selectedPlayer &&
    currentTurn &&
    currentTurn.playerId === selectedPlayer.id &&
    selectedPlayer.claimedBy === state.authUser?.uid &&
    state.game.draftStarted &&
    !state.game.derived.draftComplete;

  const teams = state.game.derived.availableTeams.slice().sort((left, right) => {
    if (left.conference !== right.conference) {
      return left.conference.localeCompare(right.conference);
    }
    return left.name.localeCompare(right.name);
  });

  teams.forEach((team) => {
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
    button.addEventListener("click", async () => {
      try {
        await makePick(team.id);
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
    const emptyChip = document.createElement("div");
    emptyChip.className = "chip empty";
    emptyChip.textContent = "Choose your player name first.";
    elements.myTeamList.appendChild(emptyChip);
    return;
  }

  const teamIds = state.game.derived.picksByPlayer[selectedPlayer.id] || [];
  if (teamIds.length === 0) {
    const emptyChip = document.createElement("div");
    emptyChip.className = "chip empty";
    emptyChip.textContent = "No teams drafted yet.";
    elements.myTeamList.appendChild(emptyChip);
    return;
  }

  teamIds.forEach((teamId) => {
    const team = getTeamById(teamId);
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = `${team.name} (${team.wins - team.losses})`;
    elements.myTeamList.appendChild(chip);
  });
}

function renderPlayerBoards() {
  elements.playerBoards.innerHTML = "";

  state.game.players.forEach((player) => {
    const teamIds = state.game.derived.picksByPlayer[player.id] || [];
    const finalsPick = state.game.finalsPredictions[player.id];
    const board = document.createElement("article");
    board.className = "board-card";

    const listMarkup =
      teamIds.length > 0
        ? `<ul>${teamIds
            .map((teamId) => {
              const team = getTeamById(teamId);
              return `<li>${team.name} (${team.wins - team.losses})</li>`;
            })
            .join("")}</ul>`
        : "<p class='section-note'>No teams yet.</p>";

    const claimLabel =
      player.claimedBy === state.authUser?.uid
        ? "Claimed on this device"
        : player.claimedBy
          ? "Claimed on another device"
          : "Available to claim";

    board.innerHTML = `
      <h3>${player.name}</h3>
      <p class="section-note">${claimLabel}</p>
      ${listMarkup}
      <p class="section-note">Finals pick: ${finalsPick ? getTeamById(finalsPick).name : "Not locked"}</p>
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

  const canLock =
    selectedPlayer &&
    selectedPlayer.claimedBy === state.authUser?.uid &&
    state.game.derived.draftComplete &&
    !lockedPick;

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
    input.disabled = !state.commissionerUnlocked || state.game.draftStarted || state.game.picks.length > 0;
    elements.nameEditor.appendChild(input);
  });

  elements.saveNamesButton.disabled = !state.commissionerUnlocked || state.game.draftStarted || state.game.picks.length > 0;
}

function renderChampionControls() {
  elements.championSelect.innerHTML = ['<option value="">No champion set</option>']
    .concat(
      state.game.teams
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((team) => `<option value="${team.id}">${team.name}</option>`)
    )
    .join("");

  elements.championSelect.value = state.game.championTeamId || "";
  elements.championSelect.disabled = !state.commissionerUnlocked;
  elements.saveChampionButton.disabled = !state.commissionerUnlocked;
  elements.clearChampionButton.disabled = !state.commissionerUnlocked;
}

function renderScoreTable() {
  elements.scoreTableBody.innerHTML = "";

  state.game.teams
    .slice()
    .sort((left, right) => {
      if (left.conference !== right.conference) {
        return left.conference.localeCompare(right.conference);
      }
      return left.name.localeCompare(right.name);
    })
    .forEach((team) => {
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

  if (!state.authUser) {
    elements.authStatus.textContent = "Connecting to Firebase...";
    return;
  }

  const authSuffix = state.authUser.uid.slice(-6);
  elements.authStatus.textContent = `Device ID ends in ${authSuffix}`;
}

function renderSourceNote() {
  const { meta } = state.game;
  elements.sourceNote.innerHTML = `${meta.notes} Source updated ${meta.sourceUpdated}. <a href="${meta.sourceUrl}" target="_blank" rel="noreferrer">Open NBA.com source</a>.`;
}

function renderCommissionerStatus() {
  elements.commissionerStatus.innerHTML = state.commissionerUnlocked
    ? "Unlocked on this device. This is a convenience lock for your friend group, not hardened security."
    : '<span class="locked-note">Locked.</span> Use the Commissioner button to unlock this device.';
}

function renderStartButton() {
  const readyToStart = state.game.players.every((player) => player.claimedBy);
  elements.startDraftButton.disabled =
    !state.commissionerUnlocked || state.game.draftStarted || !readyToStart;
  elements.startDraftButton.textContent = state.game.draftStarted ? "Snake Draft Started" : "Start Snake Draft";
}

function renderDialog() {
  elements.playerOptions.innerHTML = "";

  state.game.players.forEach((player) => {
    const isMine = player.claimedBy === state.authUser?.uid;
    const isTaken = Boolean(player.claimedBy && !isMine);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "player-option";
    button.disabled = isTaken;
    button.innerHTML = `
      <strong>${player.name}</strong>
      <span class="status-tag ${isTaken ? "locked" : ""}">
        ${isMine ? "Claimed here" : isTaken ? "Claimed elsewhere" : "Available"}
      </span>
    `;

    button.addEventListener("click", async () => {
      try {
        await claimPlayer(player.id);
        elements.playerDialog.close();
      } catch (error) {
        alert(error.message);
      }
    });

    elements.playerOptions.appendChild(button);
  });

  if (!state.selectedPlayerId && !elements.playerDialog.open) {
    elements.playerDialog.showModal();
  }
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

function subscribeToGame() {
  if (state.unsubscribeGame) {
    state.unsubscribeGame();
  }

  state.unsubscribeGame = onSnapshot(state.gameRef, (snapshot) => {
    if (!snapshot.exists()) {
      return;
    }

    state.game = buildDerivedGame(snapshot.data());
    syncSelectedPlayerFromClaims();
    render();
  });
}

async function unlockCommissionerMode() {
  const configuredPin = appConfig.commissionerPin || "";
  if (!configuredPin) {
    alert("Add a commissionerPin in firebase-config.js first.");
    return;
  }

  const enteredPin = window.prompt("Enter the commissioner PIN for this device:");
  if (!enteredPin) {
    return;
  }

  if (enteredPin !== configuredPin) {
    alert("That PIN did not match.");
    return;
  }

  setCommissionerUnlocked(true);
  render();
}

elements.switchPlayerButton.addEventListener("click", () => {
  elements.playerDialog.showModal();
});

elements.commissionerButton.addEventListener("click", async () => {
  if (state.commissionerUnlocked) {
    const shouldLock = window.confirm("Lock commissioner mode on this device?");
    if (shouldLock) {
      setCommissionerUnlocked(false);
      render();
    }
    return;
  }

  await unlockCommissionerMode();
});

elements.startDraftButton.addEventListener("click", async () => {
  try {
    await startDraft();
  } catch (error) {
    alert(error.message);
  }
});

elements.lockFinalsButton.addEventListener("click", async () => {
  try {
    assert(elements.finalsSelect.value, "Choose a Finals winner first.");
    await lockFinalsPick(elements.finalsSelect.value);
  } catch (error) {
    alert(error.message);
  }
});

elements.saveNamesButton.addEventListener("click", async () => {
  const names = Array.from(elements.nameEditor.querySelectorAll("input")).map((input) => input.value.trim());

  try {
    await saveNames(names);
  } catch (error) {
    alert(error.message);
  }
});

elements.saveChampionButton.addEventListener("click", async () => {
  try {
    await saveChampion(elements.championSelect.value || null);
  } catch (error) {
    alert(error.message);
  }
});

elements.clearChampionButton.addEventListener("click", async () => {
  try {
    await saveChampion(null);
  } catch (error) {
    alert(error.message);
  }
});

elements.scoreTableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-save-score]");
  if (!button) {
    return;
  }

  const teamId = button.dataset.saveScore;
  const winsInput = elements.scoreTableBody.querySelector(`[data-team-id="${teamId}"][data-field="wins"]`);
  const lossesInput = elements.scoreTableBody.querySelector(`[data-team-id="${teamId}"][data-field="losses"]`);

  try {
    await saveTeamScore(
      teamId,
      Number.parseInt(winsInput.value, 10),
      Number.parseInt(lossesInput.value, 10)
    );
  } catch (error) {
    alert(error.message);
  }
});

elements.resetButton.addEventListener("click", async () => {
  const confirmed = window.confirm("Reset the draft, scores, Finals picks, and player claims?");
  if (!confirmed) {
    return;
  }

  try {
    await resetGame();
  } catch (error) {
    alert(error.message);
  }
});

async function start() {
  if (!isConfigReady()) {
    elements.setupPanel.classList.remove("hidden");
    elements.currentPlayerName.textContent = "Setup required";
    elements.authStatus.textContent = "Open firebase-config.js and fill in your project values.";
    return;
  }

  const firebaseApp = initializeApp(appConfig.firebaseConfig);
  const auth = getAuth(firebaseApp);
  state.db = getFirestore(firebaseApp);
  state.gameRef = doc(state.db, "games", appConfig.gameId);

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      state.authUser = user;
      await ensureGameExists();
      subscribeToGame();
      return;
    }

    await signInAnonymously(auth);
  });
}

start().catch((error) => {
  document.body.innerHTML = `<main class="page-shell"><section class="panel"><h2>App failed to load</h2><p>${error.message}</p></section></main>`;
});
