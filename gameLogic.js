export const BOARD_SIZE = 8;
export const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

export const Player = {
  black: 1,
  white: -1,
};

export function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

export function createInitialBoard() {
  const board = createEmptyBoard();
  board[3][3] = Player.white;
  board[3][4] = Player.black;
  board[4][3] = Player.black;
  board[4][4] = Player.white;
  return board;
}

export function computeLegalMoves(board, player) {
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

export function collectLine(board, startRow, startCol, dRow, dCol, player) {
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

export function isInsideBoard(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function isBoardFull(board) {
  return board.every((row) => row.every((cell) => cell !== 0));
}

export function countDisks(board) {
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

export function keyFromCoords(row, col) {
  return `${row},${col}`;
}

export function formatCoordinate(row, col) {
  const letters = "abcdefgh";
  return `${letters[col]}${row + 1}`;
}

export function playerName(player) {
  return player === Player.black ? "黒" : "白";
}
