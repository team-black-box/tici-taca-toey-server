import { calculateWinnerV2 } from "../src/TiciTacaToeyGameEngine";

// Test 1

const output = calculateWinnerV2({
  lastTurnPlayerId: "test",
  positions: [[]],
  winningSequenceLength: 4,
});
