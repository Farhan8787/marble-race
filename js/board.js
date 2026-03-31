// ════════════════════════════════════════════════════════
//  TOKEN CLASH — Board
//  Manages a 10×20 grid, line clears, garbage injection,
//  cluster detection, and canvas rendering.
// ════════════════════════════════════════════════════════

const COLS = 10;
const ROWS = 20;

// Cell object: { tokenIdx: number, isGarbage: bool, isWild: bool } or null
// null = empty

class Board {
  constructor(canvasId, side) {
    this.canvas  = document.getElementById(canvasId);
    this.ctx     = this.canvas.getContext('2d');
    this.side    = side; // 'p1' | 'p2'
    this.grid    = this._emptyGrid();
    this.garbageQueue = 0; // pending garbage rows to inject
    this._flashRows = new Set();
    this._cellSize  = this.canvas.width / COLS; // 30px default
  }

  _emptyGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  reset() {
    this.grid = this._emptyGrid();
    this.garbageQueue = 0;
    this._flashRows.clear();
  }

  // ── Lock a piece into the grid ──────────────────────
  lockPiece(piece) {
    const cells = PIECE_SHAPES[piece.type][piece.rotation];
    for (const [c, r] of cells) {
      const gx = piece.x + c;
      const gy = piece.y + r;
      if (gy < 0 || gx < 0 || gx >= COLS || gy >= ROWS) continue;
      this.grid[gy][gx] = {
        tokenIdx: piece.tokenIdx,
        isGarbage: false,
        isWild: piece.isWild,
      };
    }
  }

  // ── Clear full lines, return array of cleared row indices ──
  clearLines() {
    const cleared = [];
    for (let r = 0; r < ROWS; r++) {
      if (this.grid[r].every(cell => cell !== null)) {
        cleared.push(r);
      }
    }
    if (cleared.length === 0) return [];

    // Flash effect
    cleared.forEach(r => this._flashRows.add(r));
    setTimeout(() => { this._flashRows.clear(); }, 250);

    // Remove cleared rows and add empty rows at top
    const newGrid = this.grid.filter((_, i) => !cleared.includes(i));
    while (newGrid.length < ROWS) newGrid.unshift(Array(COLS).fill(null));
    this.grid = newGrid;
    return cleared;
  }

  // ── Detect and explode 4+ same-token clusters ──────
  // Returns number of cells exploded
  explodeClusters() {
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    let totalExploded = 0;
    const toExplode   = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (visited[r][c] || !this.grid[r][c]) continue;
        const cell = this.grid[r][c];
        if (cell.isGarbage) continue;

        const cluster = this._floodFill(r, c, cell.tokenIdx, visited);
        if (cluster.length >= 4) {
          toExplode.push(...cluster);
          totalExploded += cluster.length;
        }
      }
    }

    toExplode.forEach(([r, c]) => { this.grid[r][c] = null; });

    if (totalExploded > 0) {
      // Apply gravity after explosion
      this._applyGravity();
    }
    return totalExploded;
  }

  _floodFill(r, c, tokenIdx, visited) {
    const stack   = [[r, c]];
    const result  = [];
    const dirs    = [[0,1],[0,-1],[1,0],[-1,0]];
    while (stack.length) {
      const [cr, cc] = stack.pop();
      if (cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS) continue;
      if (visited[cr][cc]) continue;
      const cell = this.grid[cr][cc];
      if (!cell) continue;
      if (cell.isGarbage) continue;
      if (!cell.isWild && cell.tokenIdx !== tokenIdx) continue;
      visited[cr][cc] = true;
      result.push([cr, cc]);
      dirs.forEach(([dr, dc]) => stack.push([cr+dr, cc+dc]));
    }
    return result;
  }

  _applyGravity() {
    for (let c = 0; c < COLS; c++) {
      const col = [];
      for (let r = 0; r < ROWS; r++) {
        if (this.grid[r][c] !== null) col.push(this.grid[r][c]);
      }
      for (let r = ROWS - 1; r >= 0; r--) {
        this.grid[r][c] = col.length > 0 ? col.pop() : null;
      }
    }
  }

  // ── Queue garbage rows ──────────────────────────────
  addGarbage(rows) {
    this.garbageQueue = Math.min(this.garbageQueue + rows, 8);
  }

  // ── Inject queued garbage at the bottom ────────────
  flushGarbage() {
    if (this.garbageQueue <= 0) return 0;
    const n = Math.min(this.garbageQueue, 4); // max 4 at once
    this.garbageQueue -= n;

    for (let i = 0; i < n; i++) {
      this.grid.shift(); // remove top row (might overflow!)
      const gap = Math.floor(Math.random() * COLS);
      const row = Array.from({ length: COLS }, (_, c) =>
        c === gap ? null : { tokenIdx: -1, isGarbage: true, isWild: false }
      );
      this.grid.push(row);
    }
    return n;
  }

  // ── Check if stack overflowed (game over for this board) ──
  isOverflowed() {
    return this.grid[0].some(cell => cell !== null);
  }

  // ── Check if spawn zone blocked (softer overflow check) ──
  isSpawnBlocked(piece) {
    return collides(piece, this.grid);
  }

  // ── RENDERING ──────────────────────────────────────
  draw(activePiece, holdPiece, nextPiece, ghostEnabled = true) {
    const ctx  = this.ctx;
    const cs   = this._cellSize;
    const w    = this.canvas.width;
    const h    = this.canvas.height;

    // Background
    ctx.fillStyle = '#080c12';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(30,58,90,0.5)';
    ctx.lineWidth   = 0.5;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c*cs,0); ctx.lineTo(c*cs,h); ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0,r*cs); ctx.lineTo(w,r*cs); ctx.stroke();
    }

    // Locked cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.grid[r][c];
        if (!cell) continue;
        const isFlash = this._flashRows.has(r);
        this._drawCell(ctx, c, r, cs, cell, isFlash);
      }
    }

    // Ghost piece
    if (activePiece && ghostEnabled) {
      const ghostY = getGhostY(activePiece, this.grid);
      if (ghostY !== activePiece.y) {
        const cells = PIECE_SHAPES[activePiece.type][activePiece.rotation];
        ctx.globalAlpha = 0.25;
        cells.forEach(([cc, cr]) => {
          const gx = activePiece.x + cc;
          const gy = ghostY + cr;
          if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
            const tok = getToken(activePiece.tokenIdx);
            ctx.fillStyle = tok.color;
            ctx.fillRect(gx*cs+1, gy*cs+1, cs-2, cs-2);
          }
        });
        ctx.globalAlpha = 1;
      }
    }

    // Active piece
    if (activePiece) {
      const cells = PIECE_SHAPES[activePiece.type][activePiece.rotation];
      cells.forEach(([cc, cr]) => {
        const ax = activePiece.x + cc;
        const ay = activePiece.y + cr;
        if (ay >= 0 && ay < ROWS && ax >= 0 && ax < COLS) {
          this._drawCell(ctx, ax, ay, cs, {
            tokenIdx: activePiece.tokenIdx,
            isGarbage: false,
            isWild: activePiece.isWild,
          }, false, true);
        }
      });
    }

    // Garbage queue indicator (left edge bar)
    if (this.garbageQueue > 0) {
      const barH = (this.garbageQueue / 8) * h;
      const grad = ctx.createLinearGradient(0, h - barH, 0, h);
      grad.addColorStop(0, 'rgba(255,77,109,0)');
      grad.addColorStop(1, 'rgba(255,77,109,0.7)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, h - barH, 4, barH);
    }
  }

  _drawCell(ctx, c, r, cs, cell, flash = false, active = false) {
    const x = c * cs + 1;
    const y = r * cs + 1;
    const size = cs - 2;

    if (cell.isGarbage) {
      ctx.fillStyle = GARBAGE_COLOR;
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = GARBAGE_BORDER;
      ctx.lineWidth = 1;
      ctx.strokeRect(x+.5, y+.5, size-1, size-1);
      // Hatching
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y+size); ctx.lineTo(x+size, y);
      ctx.stroke();
      return;
    }

    const tok = cell.isWild ? null : getToken(cell.tokenIdx);
    const color = cell.isWild ? WILD_COLOR : tok.color;
    const glow  = cell.isWild ? WILD_GLOW  : tok.glow;

    if (flash) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x-1, y-1, size+2, size+2);
      return;
    }

    // Main fill
    const grad = ctx.createLinearGradient(x, y, x+size, y+size);
    grad.addColorStop(0, this._brighten(color, active ? 60 : 30));
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, size, size);

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x, y, size, 3);
    ctx.fillRect(x, y, 3, size);

    // Glow border on active
    if (active || cell.isWild) {
      ctx.strokeStyle = glow;
      ctx.lineWidth   = 1.5;
      ctx.strokeRect(x+.5, y+.5, size-1, size-1);
    }

    // Token symbol
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = `bold ${Math.floor(cs * 0.42)}px 'Share Tech Mono'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = cell.isWild ? '★' : (tok ? tok.symbol.slice(0,3) : '?');
    ctx.fillText(label, x + size/2, y + size/2 + 1);
  }

  _brighten(hex, amount) {
    const num = parseInt(hex.replace('#',''), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `rgb(${r},${g},${b})`;
  }

  // Draw next/hold mini canvas
  static drawMini(canvas, piece, label) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w   = canvas.width;
    const h   = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1420';
    ctx.fillRect(0, 0, w, h);
    if (!piece) return;

    const cells  = PIECE_SHAPES[piece.type][piece.rotation];
    const cs     = Math.floor(Math.min(w, h) / 5);
    // Bounding box
    const minC   = Math.min(...cells.map(c => c[0]));
    const maxC   = Math.max(...cells.map(c => c[0]));
    const minR   = Math.min(...cells.map(c => c[1]));
    const maxR   = Math.max(...cells.map(c => c[1]));
    const pw     = (maxC - minC + 1) * cs;
    const ph     = (maxR - minR + 1) * cs;
    const ox     = Math.floor((w - pw) / 2) - minC * cs;
    const oy     = Math.floor((h - ph) / 2) - minR * cs;

    const tok   = piece.isWild ? null : getToken(piece.tokenIdx);
    const color = piece.isWild ? WILD_COLOR : tok.color;

    cells.forEach(([cc, cr]) => {
      const x = ox + cc * cs + 1;
      const y = oy + cr * cs + 1;
      const s = cs - 2;
      if (s <= 0) return;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(x, y, s, 2);
      ctx.fillRect(x, y, 2, s);
    });
  }
}
