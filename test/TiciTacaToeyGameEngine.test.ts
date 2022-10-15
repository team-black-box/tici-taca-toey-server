import { test } from "good-vibes";
import { calculateWinnerV2 } from "../src/TiciTacaToeyGameEngine";

test("Engine Tests", async (c) => {
  const output = calculateWinnerV2({
    lastTurnPlayerId: "x",
    positions: [
      ["-", "-", "-", "-", "-", "-", "x", "x"],
      ["-", "-", "-", "-", "-", "x", "-", "-"],
      ["-", "-", "-", "-", "x", "-", "-", "-"],
      ["-", "-", "-", "x", "-", "-", "-", "-"],
      ["-", "-", "-", "-", "-", "-", "-", "-"],
      ["-", "-", "-", "-", "-", "-", "-", "-"],
      ["-", "-", "-", "-", "-", "-", "-", "-"],
      ["-", "-", "-", "-", "-", "-", "-", "-"],
    ],
    winningSequenceLength: 4,
    lastTurnPosition: { x: 1, y: 5 },
  });
  await c.snapshot("Simple Winner Calculation", output);
  c.done();
});
