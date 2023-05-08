import { test } from "good-vibes";
import { calculateWinnerV2 } from "../src/TiciTacaToeyGameEngine";

test("Engine Tests", async (c) => {
  const output = calculateWinnerV2({
    lastTurnPlayerId: "x",
    positions: [
      ["o", "-", "-", "-", "-", "-", "x", "x"],
      ["o", "-", "-", "-", "-", "x", "-", "-"],
      ["o", "-", "-", "-", "x", "-", "-", "-"],
      ["-", "-", "-", "x", "-", "-", "-", "-"],
      ["-", "-", "-", "-", "-", "-", "-", "-"],
      ["-", "-", "o", "-", "-", "-", "-", "-"],
      ["-", "-", "o", "-", "-", "-", "-", "-"],
      ["-", "-", "o", "-", "-", "-", "-", "-"],
    ],
    winningSequenceLength: 3,
    winCountLength: 2,
    lastTurnPosition: { x: 1, y: 5 },
  });
  await c.snapshot("Result", output);
  c.done();
});
