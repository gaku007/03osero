const BOARD_SIZE = 8;
const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

const Player = {
  black: 1,
  white: -1,
};

const state = {
  board: createEmptyBoard(),
  currentPlayer: Player.black,
  legalMoves: new Map(),
  gameOver: false,
  consecutivePasses: 0,
  animationEnabled: true,
  soundEnabled: true,
};

const elements = {
  board: document.getElementById("board"),
  turnIndicator: document.getElementById("turnIndicator"),
  blackCount: document.getElementById("blackCount"),
  whiteCount: document.getElementById("whiteCount"),
  passMessage: document.getElementById("passMessage"),
  historyLog: document.getElementById("historyLog"),
  boardText: document.getElementById("boardText"),
  gameResult: document.getElementById("gameResult"),
  newGame: document.getElementById("newGame"),
  openRules: document.getElementById("openRules"),
  openSettings: document.getElementById("openSettings"),
  rulesDialog: document.getElementById("rulesDialog"),
  settingsDialog: document.getElementById("settingsDialog"),
  animationToggle: document.getElementById("animationToggle"),
  soundToggle: document.getElementById("soundToggle"),
};

const cells = [];
let focusPosition = { row: 0, col: 0 };
let audioContext;

initialize();

function initialize() {
  createBoardUI();
  bindControls();
  startNewGame();
}

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

function createBoardUI() {
  elements.board.innerHTML = "";
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    const rowCells = [];
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-rowindex", String(row + 1));
      cell.setAttribute("aria-colindex", String(col + 1));
      cell.setAttribute("tabindex", row === 0 && col === 0 ? "0" : "-1");
      cell.addEventListener("click", () => handleMove(row, col));
      cell.addEventListener("keydown", (event) => handleCellKeydown(event, row, col));
      elements.board.appendChild(cell);
      rowCells.push(cell);
    }
    cells.push(rowCells);
  }
}

function bindControls() {
  elements.newGame.addEventListener("click", startNewGame);
  elements.openRules.addEventListener("click", () => safeShowDialog(elements.rulesDialog));
  elements.openSettings.addEventListener("click", () => safeShowDialog(elements.settingsDialog));
  elements.animationToggle.addEventListener("change", (event) => {
    state.animationEnabled = event.target.checked;
  });
  elements.soundToggle.addEventListener("change", (event) => {
    state.soundEnabled = event.target.checked;
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && audioContext) {
      audioContext.suspend().catch(() => {});
    }
  });
}

function startNewGame() {
  state.board = createEmptyBoard();
  state.board[3][3] = Player.white;
  state.board[3][4] = Player.black;
  state.board[4][3] = Player.black;
  state.board[4][4] = Player.white;
  state.currentPlayer = Player.black;
  state.legalMoves = new Map();
  state.gameOver = false;
  state.consecutivePasses = 0;
  focusPosition = { row: 3, col: 2 };
  elements.gameResult.classList.add("hidden");
  elements.passMessage.classList.add("hidden");
  clearHistory();
  appendHistory("新しい対局を開始しました。");
  prepareTurn();
  moveFocus(focusPosition.row, focusPosition.col);
}

function prepareTurn(animations = {}) {
  if (state.gameOver) {
    return;
  }
  state.legalMoves = computeLegalMoves(state.board, state.currentPlayer);
  renderBoard(animations);
  updateIndicators();

  if (state.legalMoves.size === 0) {
    handlePass();
  } else {
    elements.passMessage.classList.add("hidden");
  }
}

function computeLegalMoves(board, player) {
  const moves = new Map();

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col] !== 0) {
        continue;
      }

      const flips = [];

      for (const [dRow, dCol] of DIRECTIONS) {
        const captured = collectLine(board, row, col, dRow, dCol, player);
        if (captured.length > 0) {
          flips.push(...captured);
        }
      }

      if (flips.length > 0) {
        moves.set(keyFromCoords(row, col), flips);
      }
    }
  }

  return moves;
}

function collectLine(board, startRow, startCol, dRow, dCol, player) {
  const path = [];
  let row = startRow + dRow;
  let col = startCol + dCol;

  while (isInsideBoard(row, col)) {
    const cellValue = board[row][col];
    if (cellValue === -player) {
      path.push([row, col]);
    } else if (cellValue === player) {
      return path;
    } else {
      break;
    }

    row += dRow;
    col += dCol;
  }

  return [];
}

function renderBoard(animations = {}) {
  const legalKeys = new Set(state.legalMoves.keys());
  const placedKey = animations.placed ? keyFromCoords(...animations.placed) : null;
  const flippedKeys = new Set((animations.flipped || []).map(([r, c]) => keyFromCoords(r, c)));

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = cells[row][col];
      const occupant = state.board[row][col];
      const key = keyFromCoords(row, col);
      cell.classList.toggle("legal", legalKeys.has(key));
      cell.innerHTML = "";

      if (occupant !== 0) {
        const disk = document.createElement("div");
        disk.classList.add("disk", occupant === Player.black ? "black" : "white");
        if (state.animationEnabled) {
          if (placedKey === key) {
            disk.classList.add("spawn");
          }
          if (flippedKeys.has(key)) {
            disk.classList.add("flip");
          }
        }
        cell.appendChild(disk);
      }

      const statusText = occupantToLabel(occupant);
      const legalText = legalKeys.has(key) ? "。ここに置けます" : "";
      cell.setAttribute(
        "aria-label",
        `${row + 1} 行 ${col + 1} 列: ${statusText}${legalText}`
      );
    }
  }
}

function occupantToLabel(value) {
  if (value === Player.black) return "黒";
  if (value === Player.white) return "白";
  return "空き";
}

function updateIndicators() {
  const counts = countDisks(state.board);
  elements.blackCount.textContent = counts.black;
  elements.whiteCount.textContent = counts.white;
  elements.turnIndicator.textContent = `${playerName(state.currentPlayer)}の番です`;
  updateBoardText(counts, `現在の手番: ${playerName(state.currentPlayer)}`);
}

function updateBoardText(counts, statusLine) {
  const rows = state.board.map((row) =>
    row
      .map((cell) => {
        if (cell === Player.black) return "●";
        if (cell === Player.white) return "○";
        return "・";
      })
      .join("")
  );
  const text = [
    `黒: ${counts.black} / 白: ${counts.white}`,
    statusLine,
    ...rows,
  ].join("\n");
  elements.boardText.textContent = text;
}

function handleMove(row, col) {
  if (state.gameOver) {
    return;
  }

  const key = keyFromCoords(row, col);
  const flips = state.legalMoves.get(key);

  if (!flips) {
    return;
  }

  ensureAudioContext();
  playTone("place");

  state.board[row][col] = state.currentPlayer;
  flips.forEach(([fRow, fCol]) => {
    state.board[fRow][fCol] = state.currentPlayer;
  });

  if (flips.length > 0) {
    playTone("flip");
  }

  appendHistory(
    `${playerName(state.currentPlayer)}が${formatCoordinate(row, col)}に置き、${
      flips.length
    }枚裏返しました。`
  );

  const animations = { placed: [row, col], flipped: flips };

  if (isBoardFull(state.board)) {
    updateIndicators();
    finishGame(animations);
    moveFocus(row, col);
    return;
  }

  state.currentPlayer *= -1;
  state.consecutivePasses = 0;
  prepareTurn(animations);
  moveFocus(row, col);
}

function handleCellKeydown(event, row, col) {
  switch (event.key) {
    case "ArrowUp":
      event.preventDefault();
      moveFocus(Math.max(0, row - 1), col);
      break;
    case "ArrowDown":
      event.preventDefault();
      moveFocus(Math.min(BOARD_SIZE - 1, row + 1), col);
      break;
    case "ArrowLeft":
      event.preventDefault();
      moveFocus(row, Math.max(0, col - 1));
      break;
    case "ArrowRight":
      event.preventDefault();
      moveFocus(row, Math.min(BOARD_SIZE - 1, col + 1));
      break;
    case "Enter":
    case " ":
      event.preventDefault();
      handleMove(row, col);
      break;
    default:
      break;
  }
}

function moveFocus(row, col) {
  const previousRow = cells[focusPosition.row];
  const previous = previousRow ? previousRow[focusPosition.col] : null;
  if (previous) {
    previous.setAttribute("tabindex", "-1");
  }

  const targetRow = cells[row];
  const target = targetRow ? targetRow[col] : null;
  if (!target) {
    focusPosition = { row, col };
    return;
  }

  target.setAttribute("tabindex", "0");
  try {
    target.focus({ preventScroll: true });
  } catch (error) {
    target.focus();
  }
  focusPosition = { row, col };
}

function handlePass() {
  state.consecutivePasses += 1;
  const player = playerName(state.currentPlayer);
  const message = `${player}は打てる場所が無いためパスしました。`;
  elements.passMessage.textContent = message;
  elements.passMessage.classList.remove("hidden");
  appendHistory(message);

  if (state.consecutivePasses >= 2 || isBoardFull(state.board)) {
    finishGame();
    return;
  }

  state.currentPlayer *= -1;
  updateIndicators();
  prepareTurn();
}

function finishGame(animations = {}) {
  state.gameOver = true;
  state.legalMoves = new Map();
  state.consecutivePasses = 0;
  renderBoard(animations);
  elements.passMessage.classList.add("hidden");

  const counts = countDisks(state.board);
  let resultText;
  if (counts.black > counts.white) {
    resultText = `黒の勝ち (${counts.black} - ${counts.white})`;
  } else if (counts.white > counts.black) {
    resultText = `白の勝ち (${counts.white} - ${counts.black})`;
  } else {
    resultText = `引き分け (${counts.black} - ${counts.white})`;
  }

  elements.gameResult.textContent = resultText;
  elements.gameResult.classList.remove("hidden");
  elements.turnIndicator.textContent = "ゲーム終了";
  updateBoardText(counts, "ゲーム終了");
  appendHistory(`ゲーム終了: ${resultText}`);
}

function isInsideBoard(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function isBoardFull(board) {
  return board.every((row) => row.every((cell) => cell !== 0));
}

function countDisks(board) {
  let black = 0;
  let white = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === Player.black) black += 1;
      if (cell === Player.white) white += 1;
    }
  }
  return { black, white };
}

function keyFromCoords(row, col) {
  return `${row},${col}`;
}

function formatCoordinate(row, col) {
  const letters = "abcdefgh";
  return `${letters[col]}${row + 1}`;
}

function playerName(player) {
  return player === Player.black ? "黒" : "白";
}

function appendHistory(message) {
  const item = document.createElement("li");
  const timestamp = new Date().toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  item.textContent = `[${timestamp}] ${message}`;
  elements.historyLog.prepend(item);
}

function clearHistory() {
  elements.historyLog.innerHTML = "";
}

function safeShowDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.classList.remove("hidden");
  }
}

function ensureAudioContext() {
  if (!state.soundEnabled) {
    return;
  }
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      state.soundEnabled = false;
      return;
    }
    audioContext = new AudioContextClass();
  } else if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
}

function playTone(type) {
  if (!state.soundEnabled || !audioContext) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  const frequency = type === "flip" ? 720 : 540;
  const duration = type === "flip" ? 0.18 : 0.12;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + duration);
}

