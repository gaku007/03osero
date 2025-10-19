import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Player,
  createInitialBoard,
  computeLegalMoves,
  countDisks,
  keyFromCoords,
} from '../gameLogic.js';

test('黒の初手で白石が正しく返る', () => {
  const board = createInitialBoard();
  const legalMoves = computeLegalMoves(board, Player.black);
  const firstMoveKey = keyFromCoords(2, 3);
  assert.ok(
    legalMoves.has(firstMoveKey),
    'd3 (2,3) が黒の合法手として認識されること'
  );

  const flips = legalMoves.get(firstMoveKey);
  board[2][3] = Player.black;
  for (const [row, col] of flips) {
    board[row][col] = Player.black;
  }

  const counts = countDisks(board);
  assert.equal(counts.black, 4);
  assert.equal(counts.white, 1);
});

test('白の2手目で合法手が検出される', () => {
  const board = createInitialBoard();
  const firstMoveKey = keyFromCoords(2, 3);
  const firstFlips = computeLegalMoves(board, Player.black).get(firstMoveKey);
  board[2][3] = Player.black;
  for (const [row, col] of firstFlips) {
    board[row][col] = Player.black;
  }

  const whiteMoves = computeLegalMoves(board, Player.white);
  const expectedMoves = [
    keyFromCoords(2, 2),
    keyFromCoords(2, 4),
    keyFromCoords(4, 2),
  ];

  for (const moveKey of expectedMoves) {
    assert.ok(whiteMoves.has(moveKey), `${moveKey} が白の合法手として検出されること`);
  }
});
