import { describe, expect, it } from "vitest";
import { createGame } from "./game";
import type { Game } from "./game";

function play(game: Game, moves: [string, string][]) {
  for (const [from, to] of moves) {
    expect(game.tryMove(from, to), `${from}${to} should be legal`).not.toBeNull();
  }
}

describe("basic play", () => {
  it("starts with white to move and 20 legal moves", () => {
    const game = createGame();
    expect(game.turn()).toBe("white");
    expect(game.legalMoves()).toHaveLength(20);
    expect(game.status().isGameOver).toBe(false);
  });

  it("lists legal destinations from a square", () => {
    const game = createGame();
    expect(game.legalMovesFrom("e2").sort()).toEqual(["e3", "e4"]);
    expect(game.legalMovesFrom("e7")).toEqual([]);
    expect(game.legalDests().get("g1")?.sort()).toEqual(["f3", "h3"]);
  });

  it("rejects illegal moves and leaves the position unchanged", () => {
    const game = createGame();
    const before = game.fen();
    expect(game.tryMove("e2", "e5")).toBeNull();
    expect(game.tryMove("e7", "e5")).toBeNull();
    expect(game.tryMove("zz", "e5")).toBeNull();
    expect(game.fen()).toBe(before);
    expect(game.history()).toHaveLength(0);
  });

  it("tracks history and undoes moves", () => {
    const game = createGame();
    const start = game.fen();
    play(game, [["e2", "e4"], ["e7", "e5"]]);
    expect(game.history().map((m) => m.san)).toEqual(["e4", "e5"]);
    expect(game.undo()?.san).toBe("e5");
    expect(game.undo()?.san).toBe("e4");
    expect(game.fen()).toBe(start);
    expect(game.undo()).toBeNull();
  });

  it("throws on an invalid FEN", () => {
    expect(() => createGame("not a fen")).toThrow();
  });
});

describe("checkmate", () => {
  it("detects scholar's mate", () => {
    const game = createGame();
    play(game, [
      ["e2", "e4"],
      ["e7", "e5"],
      ["d1", "h5"],
      ["b8", "c6"],
      ["f1", "c4"],
      ["g8", "f6"],
    ]);
    expect(game.status().isGameOver).toBe(false);
    const mate = game.tryMove("h5", "f7");
    expect(mate?.san).toBe("Qxf7#");
    expect(game.status()).toMatchObject({
      isGameOver: true,
      outcome: "checkmate",
      winner: "white",
      inCheck: true,
      turn: "black",
    });
    expect(game.legalMoves()).toHaveLength(0);
  });

  it("reports check without ending the game", () => {
    const game = createGame("4k3/8/8/8/8/8/4R3/4K3 b - - 0 1");
    expect(game.status()).toMatchObject({ inCheck: true, isGameOver: false });
  });
});

describe("draws", () => {
  it("detects stalemate", () => {
    const game = createGame("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
    expect(game.status()).toMatchObject({
      isGameOver: true,
      outcome: "stalemate",
      inCheck: false,
    });
    expect(game.status().winner).toBeUndefined();
  });

  it("detects insufficient material", () => {
    const game = createGame("4k3/8/8/8/8/8/8/4K3 w - - 0 1");
    expect(game.status()).toMatchObject({
      outcome: "draw",
      drawReason: "insufficient-material",
    });
  });

  it("detects the fifty-move rule", () => {
    const game = createGame("4k3/8/8/8/8/8/8/4K2R w - - 100 80");
    expect(game.status()).toMatchObject({
      outcome: "draw",
      drawReason: "fifty-move-rule",
    });
  });

  it("detects threefold repetition", () => {
    const game = createGame();
    const shuffle: [string, string][] = [
      ["g1", "f3"],
      ["g8", "f6"],
      ["f3", "g1"],
      ["f6", "g8"],
    ];
    play(game, shuffle);
    expect(game.status().isGameOver).toBe(false);
    play(game, shuffle);
    expect(game.status()).toMatchObject({
      outcome: "draw",
      drawReason: "threefold-repetition",
    });
  });
});

describe("castling", () => {
  it("allows both castles when the path is clear", () => {
    const game = createGame("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    expect(game.legalMovesFrom("e1")).toEqual(expect.arrayContaining(["g1", "c1"]));
    const move = game.tryMove("e1", "g1");
    expect(move?.kind).toBe("castle-kingside");
    expect(move?.san).toBe("O-O");
    expect(game.fen().split(" ")[0]).toBe("r3k2r/8/8/8/8/8/8/R4RK1");
  });

  it("allows queenside castling", () => {
    const game = createGame("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    expect(game.tryMove("e1", "c1")?.kind).toBe("castle-queenside");
  });

  it("forbids castling through an attacked square", () => {
    const game = createGame("5r1k/8/8/8/8/8/8/4K2R w K - 0 1");
    expect(game.tryMove("e1", "g1")).toBeNull();
  });

  it("forbids castling out of check", () => {
    const game = createGame("4r2k/8/8/8/8/8/8/4K2R w K - 0 1");
    expect(game.tryMove("e1", "g1")).toBeNull();
  });

  it("forbids castling after the king has moved", () => {
    const game = createGame("4k3/8/8/8/8/8/8/4K2R w K - 0 1");
    play(game, [["e1", "e2"], ["e8", "e7"], ["e2", "e1"], ["e7", "e8"]]);
    expect(game.tryMove("e1", "g1")).toBeNull();
  });

  it("forbids castling with a piece in the way", () => {
    const game = createGame("4k3/8/8/8/8/8/8/4KN1R w K - 0 1");
    expect(game.tryMove("e1", "g1")).toBeNull();
  });
});

describe("en passant", () => {
  it("captures the pawn that just moved two squares", () => {
    const game = createGame("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");
    const move = game.tryMove("e5", "d6");
    expect(move).toMatchObject({ kind: "en-passant", captured: "pawn", san: "exd6" });
    expect(game.fen().split(" ")[0]).toBe("4k3/8/3P4/8/8/8/8/4K3");
  });

  it("arises naturally and only for one move", () => {
    const game = createGame("4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1");
    play(game, [["d7", "d5"]]);
    expect(game.legalMovesFrom("e5")).toContain("d6");
  });

  it("is not available if the chance was not taken immediately", () => {
    const game = createGame("4k3/8/8/3pP3/8/8/8/4K3 w - - 0 1");
    expect(game.tryMove("e5", "d6")).toBeNull();
  });
});

describe("promotion", () => {
  const fen = "8/P6k/8/8/8/8/8/K7 w - - 0 1";

  it("needs a piece to be chosen", () => {
    const game = createGame(fen);
    expect(game.needsPromotion("a7", "a8")).toBe(true);
    expect(game.needsPromotion("a1", "a2")).toBe(false);
    expect(game.tryMove("a7", "a8")).toBeNull();
    expect(game.history()).toHaveLength(0);
  });

  it("promotes to the chosen piece", () => {
    const queen = createGame(fen);
    expect(queen.tryMove("a7", "a8", "queen")).toMatchObject({
      kind: "promotion",
      promotion: "queen",
    });
    expect(queen.fen().split(" ")[0]).toBe("Q7/7k/8/8/8/8/8/K7");

    const knight = createGame(fen);
    expect(knight.tryMove("a7", "a8", "knight")?.promotion).toBe("knight");
    expect(knight.fen().split(" ")[0]).toBe("N7/7k/8/8/8/8/8/K7");
  });

  it("lists each promotion choice as its own legal move", () => {
    const game = createGame(fen);
    const promos = game.legalMoves().filter((m) => m.from === "a7");
    expect(promos).toHaveLength(4);
  });

  it("can be undone", () => {
    const game = createGame(fen);
    game.tryMove("a7", "a8", "rook");
    game.undo();
    expect(game.fen()).toBe(fen);
  });
});
