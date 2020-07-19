import { calculateWinnerV2 } from "../src/TiciTacaToeyGameEngine";

// Test 1

const output = calculateWinnerV2({
  lastTurnPlayerId: "x",
  positions: [
    ["-","-","-","-","-","-","x","x"],
    ["-","-","-","-","-","x","-","-"],
    ["-","-","-","-","x","-","-","-"],
    ["-","-","-","x","-","-","-","-"],
    ["-","-","-","-","-","-","-","-"],
    ["-","-","-","-","-","-","-","-"],
    ["-","-","-","-","-","-","-","-"],
    ["-","-","-","-","-","-","-","-"]
],
  winningSequenceLength: 4,
  lastTurnPosition: {x:1, y:5}
});
console.log(output);
;
