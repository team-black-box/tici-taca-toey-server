import { test } from "good-vibes";
import { calculateWinnerV2 } from "../src/TiciTacaToeyGameEngine";

// test("Right Diagonal size 3 match", async (c) => {
//   const output = calculateWinnerV2({
//     lastTurnPlayerId: "x",
//     positions: [
//       ["x", "o", "x"],
//       ["o", "x", "o"],
//       ["o", "x", "x"],
//     ],
//     winningSequenceLength: 3,
//     lastTurnPosition: { x: 2, y: 2 },
//   });
//   await c.snapshot("Result", output);
//   c.done();
// });

// test("Right Diagonal size 4 match", async (c) => {
//   const output = calculateWinnerV2({
//     lastTurnPlayerId: "x",
//     positions: [
//       ["x", "o", "x", "o"],
//       ["o", "x", "o", "x"],
//       ["o", "x", "x", "o"],
//       ["o", "x", "x", "x"],
//     ],
//     winningSequenceLength: 4,
//     lastTurnPosition: { x: 2, y: 2 },
//   });
//   await c.snapshot("Result", output);
//   c.done();
// });

// test("Horizontal size 3", async (c) => {
//   const output = calculateWinnerV2({
//     lastTurnPlayerId: "x",
//     positions: [
//       ["x", "x", "x"],
//       ["o", "-", "-"],
//       ["o", "-", "-"],
//     ],
//     winningSequenceLength: 3,
//     lastTurnPosition: { x: 0, y: 2 },
//   });
//   await c.snapshot("Result", output);
//   c.done();
// });

test("Vertical size 3 match", async (c) => {
  const output = calculateWinnerV2({
    lastTurnPlayerId: "x",
    positions: [
      ["x", "o", "-"],
      ["x", "o", "-"],
      ["x", "-", "-"],
    ],
    winningSequenceLength: 3,
    winCountLength: 2,
    lastTurnPosition: { x: 2, y: 0 },
  });
  await c.snapshot("Result", output);
  c.done();
});

// test("Left Diagonal size 4 match", async (c) => {
//   const output = calculateWinnerV2({
//     lastTurnPlayerId: "x",
//     positions: [
//       ["o", "o", "-", "x"],
//       ["o", "-", "x", "-"],
//       ["o", "x", "-", "-"],
//       ["x", "-", "-", "-"],
//     ],
//     winningSequenceLength: 4,
//     lastTurnPosition: { x: 0, y: 3 },
//   });
//   await c.snapshot("Result", output);
//   c.done();
// });

// test("Left Diagonal size 3 match", async (c) => {
//   const output = calculateWinnerV2({
//     lastTurnPlayerId: "x",
//     positions: [
//       ["o", "-", "x"],
//       ["o", "x", "-"],
//       ["x", "-", "-"],
//     ],
//     winningSequenceLength: 3,
//     lastTurnPosition: { x: 0, y: 2 },
//   });
//   await c.snapshot("Result", output);
//   c.done();
// });

// test("No Winner ", async (c) => {
//   const output = calculateWinnerV2({
//     lastTurnPlayerId: "x",
//     positions: [
//       ["-", "o", "x"],
//       ["o", "x", "-"],
//       ["-", "x", "-"],
//     ],
//     winningSequenceLength: 3,
//     lastTurnPosition: { x: 2, y: 1 },
//   });
//   await c.snapshot("Result", output);
//   c.done();
// });

// test("Left Diagonal size 3 no match", async (c) => {
//   const output = calculateWinnerV2({
//     lastTurnPlayerId: "x",
//     positions: [
//       ["x", "o", "-"],
//       ["o", "x", "-"],
//       ["o", "-", "-"],
//     ],
//     winningSequenceLength: 3,
//     lastTurnPosition: { x: 1, y: 1 },
//   });
//   await c.snapshot("Result", output);
//   c.done();
// });
