// ════════════════════════════════════════════════════════
//  TOKEN CLASH — Bot AI
//  Simple heuristic Tetris bot that simulates placements
//  and picks the best position based on weighted scoring.
// ════════════════════════════════════════════════════════

const BOT_WEIGHTS = {
  aggregateHeight: -0.51,
  completeLines:   0.76,
  holes:          -0.36,
  bumpiness:      -0.18,
  wellDepth:       0.10,
};

const BOT_THINK_INTERVAL = 600; // ms between decisions (adjust for difficulty)

class Bot extends Player {
  constructor(id, boardCanvasId, nextCanvasId, holdCanvasId, priceService) {
    // Bot uses dummy controls that nobody will press
    const controls = {
      left: '__bot_left__', right: '__bot_right__',
      down: '__bot_down__', rotCW: '__bot_rotCW__',
      rotCCW: '__bot_rotCCW__', hardDrop: '__bot_hard__',
      hold: '__bot_hold__',
    };
    super(id, boardCanvasId, nextCanvasId, holdCanvasId, controls, priceService);
    this._botTimer    = 0;
    this._targetX     = null;
    this._targetRot   = null;
    this._botMoving   = false;
    this._moveTimer   = 0;
    this._moveRate    = 80; // ms per step
    this._difficulty  = 0.85; // 0–1, higher = smarter
  }

  // Override update to run bot logic
  update(dt) {
    if (!this.alive || !this.activePiece) return;

    this._dropTimer += dt;
    this._botTimer  += dt;
    this._moveTimer += dt;

    // Think: compute best placement
    if (this._botTimer >= BOT_THINK_INTERVAL && this._targetX === null) {
      this._botTimer = 0;
      this._computeBestMove();
    }

    // Execute move step by step
    if (this._targetX !== null && this._moveTimer >= this._moveRate) {
      this._moveTimer = 0;
      this._executeMove();
    }

    // Auto-drop
    if (this._dropTimer >= this._dropInterval * 0.8) {
      this._dropTimer = 0;
      if (!collides(this.activePiece, this.board.grid, 0, 1)) {
        this.activePiece.y++;
      } else {
        this._isOnGround = true;
      }
    }

    // Lock
    if (this._isOnGround) {
      this._lockTimer += dt;
      if (this._lockTimer >= this._lockDelay * 0.5) {
        this._lock();
        this._targetX   = null;
        this._targetRot = null;
        this._botMoving = false;
      }
    } else if (collides(this.activePiece, this.board.grid, 0, 1)) {
      this._isOnGround = true;
    } else {
      this._isOnGround = false;
      this._lockTimer  = 0;
    }
  }

  _computeBestMove() {
    if (!this.activePiece) return;
    const piece = this.activePiece;
    let bestScore = -Infinity;
    let bestX = piece.x, bestRot = piece.rotation;

    const rotCount = PIECE_SHAPES[piece.type].length;

    for (let rot = 0; rot < rotCount; rot++) {
      for (let x = -2; x < COLS + 2; x++) {
        const sim = piece.clone();
        sim.rotation = rot;
        sim.x = x;
        sim.y = 0;
        if (collides(sim, this.board.grid)) continue;

        // Drop to floor
        while (!collides(sim, this.board.grid, 0, 1)) sim.y++;

        // Copy grid
        const grid = this.board.grid.map(r => [...r]);
        const cells = PIECE_SHAPES[sim.type][sim.rotation];
        cells.forEach(([cc, cr]) => {
          const gx = sim.x + cc, gy = sim.y + cr;
          if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
            grid[gy][gx] = { tokenIdx: sim.tokenIdx, isGarbage: false, isWild: false };
          }
        });

        // Clear lines in sim
        let linesCleared = 0;
        const newGrid = grid.filter(row => {
          if (row.every(c => c !== null)) { linesCleared++; return false; }
          return true;
        });
        while (newGrid.length < ROWS) newGrid.unshift(Array(COLS).fill(null));

        const score = this._evaluate(newGrid, linesCleared);

        // Add randomness for non-perfect difficulty
        const noise = (1 - this._difficulty) * (Math.random() - 0.5) * 200;
        if (score + noise > bestScore) {
          bestScore = score + noise;
          bestX     = x;
          bestRot   = rot;
        }
      }
    }
    this._targetX   = bestX;
    this._targetRot = bestRot;
  }

  _executeMove() {
    if (!this.activePiece) return;
    const p = this.activePiece;

    // Rotate first
    if (p.rotation !== this._targetRot) {
      rotatePiece(p, 1, this.board.grid);
      return;
    }
    // Then slide
    if (p.x < this._targetX) { this._move(1); return; }
    if (p.x > this._targetX) { this._move(-1); return; }
    // Arrived — hard drop
    this._hardDrop();
    this._targetX   = null;
    this._targetRot = null;
  }

  _evaluate(grid, linesCleared) {
    let aggregateHeight = 0;
    let holes = 0;
    let bumpiness = 0;
    let wellDepth = 0;
    const heights = [];

    for (let c = 0; c < COLS; c++) {
      let h = 0;
      let foundTop = false;
      let colHoles = 0;
      for (let r = 0; r < ROWS; r++) {
        if (grid[r][c] !== null) {
          if (!foundTop) { h = ROWS - r; foundTop = true; }
        } else if (foundTop) {
          colHoles++;
        }
      }
      aggregateHeight += h;
      holes += colHoles;
      heights.push(h);
    }

    for (let c = 0; c < COLS - 1; c++) {
      bumpiness += Math.abs(heights[c] - heights[c+1]);
    }

    // Well depth (deep single-column wells are useful for I pieces)
    for (let c = 0; c < COLS; c++) {
      const left  = c > 0           ? heights[c-1] : 999;
      const right = c < COLS - 1    ? heights[c+1] : 999;
      wellDepth += Math.max(0, Math.min(left, right) - heights[c]);
    }

    return (
      BOT_WEIGHTS.aggregateHeight * aggregateHeight +
      BOT_WEIGHTS.completeLines   * linesCleared +
      BOT_WEIGHTS.holes           * holes +
      BOT_WEIGHTS.bumpiness       * bumpiness +
      BOT_WEIGHTS.wellDepth       * wellDepth
    );
  }
}
