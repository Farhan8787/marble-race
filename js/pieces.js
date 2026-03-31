// ════════════════════════════════════════════════════════
//  TOKEN CLASH — Piece (Tetromino) Definitions
//  Classic 7 tetrominoes with SRS-style rotation data.
//  Each cell stores a token index for color mapping.
// ════════════════════════════════════════════════════════

// Each piece: array of 4 rotations, each rotation is array of [col, row] offsets
const PIECE_SHAPES = {
  I: [
    [[0,1],[1,1],[2,1],[3,1]],
    [[2,0],[2,1],[2,2],[2,3]],
    [[0,2],[1,2],[2,2],[3,2]],
    [[1,0],[1,1],[1,2],[1,3]],
  ],
  O: [
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
  ],
  T: [
    [[1,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[2,1],[1,2]],
    [[1,0],[0,1],[1,1],[1,2]],
  ],
  S: [
    [[1,0],[2,0],[0,1],[1,1]],
    [[1,0],[1,1],[2,1],[2,2]],
    [[1,1],[2,1],[0,2],[1,2]],
    [[0,0],[0,1],[1,1],[1,2]],
  ],
  Z: [
    [[0,0],[1,0],[1,1],[2,1]],
    [[2,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[1,2],[2,2]],
    [[1,0],[0,1],[1,1],[0,2]],
  ],
  J: [
    [[0,0],[0,1],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[1,2]],
    [[0,1],[1,1],[2,1],[2,2]],
    [[1,0],[1,1],[0,2],[1,2]],
  ],
  L: [
    [[2,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,1],[0,2]],
    [[0,0],[1,0],[1,1],[1,2]],
  ],
};

const PIECE_KEYS = Object.keys(PIECE_SHAPES); // ['I','O','T','S','Z','J','L']

// SRS wall-kick offsets [from_rotation][kick_index] → [dx, dy]
const WALL_KICKS_JLSTZ = [
  [[ 0,0],[-1,0],[-1, 1],[0,-2],[-1,-2]], // 0→1
  [[ 0,0],[ 1,0],[ 1,-1],[0, 2],[ 1, 2]], // 1→2
  [[ 0,0],[ 1,0],[ 1, 1],[0,-2],[ 1,-2]], // 2→3
  [[ 0,0],[-1,0],[-1,-1],[0, 2],[-1, 2]], // 3→0
];
const WALL_KICKS_I = [
  [[ 0,0],[-2,0],[ 1,0],[-2,-1],[ 1, 2]], // 0→1
  [[ 0,0],[-1,0],[ 2,0],[-1, 2],[ 2,-1]], // 1→2
  [[ 0,0],[ 2,0],[-1,0],[ 2, 1],[-1,-2]], // 2→3
  [[ 0,0],[ 1,0],[-2,0],[ 1,-2],[-2, 1]], // 3→0
];

class Piece {
  constructor(type, tokenIdx) {
    this.type      = type;
    this.rotation  = 0;
    this.tokenIdx  = tokenIdx;
    this.isWild    = false;
    // spawn position: centre top
    this.x = 3;
    this.y = 0;
  }

  getCells() {
    return PIECE_SHAPES[this.type][this.rotation].map(([c, r]) => ({
      x: this.x + c,
      y: this.y + r,
    }));
  }

  clone() {
    const p = new Piece(this.type, this.tokenIdx);
    p.rotation = this.rotation;
    p.x = this.x; p.y = this.y;
    p.isWild = this.isWild;
    return p;
  }
}

// 7-bag randomiser — ensures all piece types appear before repeating
class PieceBag {
  constructor() {
    this._bag = [];
  }
  _refill() {
    this._bag = [...PIECE_KEYS].sort(() => Math.random() - .5);
  }
  next(tokenIdx) {
    if (this._bag.length === 0) this._refill();
    return new Piece(this._bag.pop(), tokenIdx);
  }
}

// Ghost piece helper — returns y offset for ghost
function getGhostY(piece, boardGrid) {
  let ghost = piece.clone();
  while (!collides(ghost, boardGrid, 0, 1)) {
    ghost.y++;
  }
  return ghost.y;
}

// Collision detection against a board grid
function collides(piece, grid, dx = 0, dy = 0) {
  const cells = PIECE_SHAPES[piece.type][piece.rotation];
  for (const [c, r] of cells) {
    const nx = piece.x + c + dx;
    const ny = piece.y + r + dy;
    if (nx < 0 || nx >= 10) return true;
    if (ny >= 20) return true;
    if (ny >= 0 && grid[ny] && grid[ny][nx]) return true;
  }
  return false;
}

// Rotate piece with SRS wall kicks. Returns true if successful.
function rotatePiece(piece, dir, grid) {
  const prevRot = piece.rotation;
  const newRot  = (prevRot + (dir === 1 ? 1 : 3)) % 4;
  piece.rotation = newRot;

  const kicks = piece.type === 'I'
    ? WALL_KICKS_I[prevRot]
    : WALL_KICKS_JLSTZ[prevRot];

  for (const [kx, ky] of kicks) {
    if (!collides(piece, grid, kx, -ky)) {
      piece.x += kx;
      piece.y -= ky;
      return true;
    }
  }
  // Revert if no kick works
  piece.rotation = prevRot;
  return false;
}
