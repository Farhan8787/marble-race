// ════════════════════════════════════════════════════════
//  TOKEN CLASH — Player
//  Handles input, piece lifecycle, scoring, and attack logic.
// ════════════════════════════════════════════════════════

const SCORE_TABLE = {
  1: 100,
  2: 300,
  3: 500,
  4: 800, // CLASH!
};
const COMBO_BONUS   = 50;  // extra per combo chain
const CLUSTER_SCORE = 20;  // per cell exploded

// Attack garbage sent to opponent
const ATTACK_TABLE = {
  1: 0,
  2: 1,
  3: 2,
  4: 4, // CLASH!
};
const CLUSTER_ATTACK = 3; // garbage rows for a cluster explosion

class Player {
  constructor(id, boardCanvasId, nextCanvasId, holdCanvasId, controls, priceService) {
    this.id            = id; // 'p1' | 'p2'
    this.board         = new Board(boardCanvasId, id);
    this.nextCanvas    = document.getElementById(nextCanvasId);
    this.holdCanvas    = document.getElementById(holdCanvasId);
    this.controls      = controls; // { left, right, down, rotCW, rotCCW, hardDrop, hold }
    this.priceService  = priceService;

    this.bag           = new PieceBag();
    this.activePiece   = null;
    this.nextPiece     = null;
    this.holdPiece     = null;
    this.holdUsed      = false; // lock-out hold until next piece

    this.score         = 0;
    this.lines         = 0;
    this.level         = 1;
    this.combo         = 0;
    this.attackMeter   = 0; // 0–100
    this.alive         = true;

    // Drop timers
    this._dropInterval = 800; // ms between auto-drops
    this._dropTimer    = 0;
    this._lockDelay    = 500; // ms before locking after landing
    this._lockTimer    = 0;
    this._isOnGround   = false;

    // Input state
    this._keys         = {};
    this._dasDelay     = 150;  // ms before DAS kicks in
    this._dasRate      = 50;   // ms per DAS repeat
    this._dasTimerL    = 0;
    this._dasTimerR    = 0;
    this._dasActiveL   = false;
    this._dasActiveR   = false;

    this._opponent     = null; // set after construction
    this._onAttack     = null; // callback(garbageRows)

    this._setupKeys();
  }

  setOpponent(opponent) { this._opponent = opponent; }
  setAttackCallback(cb) { this._onAttack = cb; }

  // ── Key setup ──────────────────────────────────────
  _setupKeys() {
    window.addEventListener('keydown', e => {
      if (!this.alive) return;
      if (this._keys[e.code]) return; // already held
      this._keys[e.code] = true;

      if (e.code === this.controls.rotCW)   this._tryRotate(1);
      if (e.code === this.controls.rotCCW)  this._tryRotate(-1);
      if (e.code === this.controls.hardDrop) { e.preventDefault(); this._hardDrop(); }
      if (e.code === this.controls.hold)    this._doHold();
      if (e.code === this.controls.left)    { this._move(-1); this._dasTimerL = 0; this._dasActiveL = false; }
      if (e.code === this.controls.right)   { this._move(1);  this._dasTimerR = 0; this._dasActiveR = false; }
      // Prevent page scroll
      if (['Space','ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      this._keys[e.code] = false;
      if (e.code === this.controls.left)  { this._dasTimerL = 0; this._dasActiveL = false; }
      if (e.code === this.controls.right) { this._dasTimerR = 0; this._dasActiveR = false; }
    });
  }

  // ── Init / Spawn ───────────────────────────────────
  start() {
    this.board.reset();
    this.score = this.lines = 0;
    this.level = 1;
    this.combo = 0;
    this.attackMeter = 0;
    this.alive = true;
    this.holdPiece = null;
    this.holdUsed  = false;
    this._keys = {};
    this.nextPiece = this._makePiece();
    this._spawn();
  }

  _makePiece() {
    const tokenIdx = this._pickToken();
    const p = this.bag.next(tokenIdx);
    // Wild block chance based on token volatility and price movement
    const tok = getToken(tokenIdx);
    const priceData = this.priceService.getData(tok.id);
    const wildChance = tok.volatility * 0.15 + (priceData.pumping ? 0.1 : 0);
    if (Math.random() < wildChance) p.isWild = true;
    return p;
  }

  _pickToken() {
    // Bias toward pumping tokens slightly
    const pumping = this.priceService.getPumpingTokens();
    if (pumping.length > 0 && Math.random() < 0.35) {
      return ACTIVE_TOKENS.indexOf(pumping[Math.floor(Math.random() * pumping.length)]);
    }
    return randomTokenIdx();
  }

  _spawn() {
    this.activePiece = this.nextPiece;
    this.nextPiece   = this._makePiece();
    this.holdUsed    = false;
    this._isOnGround = false;
    this._lockTimer  = 0;

    // Adjust speed based on price pumping
    this._updateDropSpeed();

    // Check immediate collision = game over
    if (collides(this.activePiece, this.board.grid)) {
      this.alive = false;
    }

    Board.drawMini(this.nextCanvas, this.nextPiece);
  }

  _updateDropSpeed() {
    const base  = Math.max(100, 800 - (this.level - 1) * 60);
    const tok   = getToken(this.activePiece ? this.activePiece.tokenIdx : 0);
    const pd    = this.priceService.getData(tok.id);
    // Pumping token = faster drops
    const boost = pd.pumping ? 0.7 : 1.0;
    this._dropInterval = Math.round(base * boost);
  }

  // ── Hold ──────────────────────────────────────────
  _doHold() {
    if (this.holdUsed || !this.activePiece) return;
    const cur = this.activePiece;
    cur.x = 3; cur.y = 0; cur.rotation = 0; // reset position

    if (this.holdPiece) {
      this.activePiece = this.holdPiece;
      this.holdPiece   = cur;
    } else {
      this.holdPiece   = cur;
      this._spawn();
      Board.drawMini(this.holdCanvas, this.holdPiece);
      return;
    }
    this.holdUsed = true;
    this._isOnGround = false;
    this._lockTimer  = 0;
    Board.drawMini(this.holdCanvas, this.holdPiece);
  }

  // ── Movement ──────────────────────────────────────
  _move(dx) {
    if (!this.activePiece || !this.alive) return false;
    if (!collides(this.activePiece, this.board.grid, dx, 0)) {
      this.activePiece.x += dx;
      if (this._isOnGround) this._lockTimer = 0; // reset lock delay on move
      return true;
    }
    return false;
  }

  _tryRotate(dir) {
    if (!this.activePiece || !this.alive) return;
    if (rotatePiece(this.activePiece, dir, this.board.grid)) {
      if (this._isOnGround) this._lockTimer = 0;
    }
  }

  _softDrop() {
    if (!this.activePiece || !this.alive) return;
    if (!collides(this.activePiece, this.board.grid, 0, 1)) {
      this.activePiece.y++;
      this.score += 1; // soft drop score
      this._dropTimer = 0;
    }
  }

  _hardDrop() {
    if (!this.activePiece || !this.alive) return;
    let dropped = 0;
    while (!collides(this.activePiece, this.board.grid, 0, 1)) {
      this.activePiece.y++;
      dropped++;
    }
    this.score += dropped * 2;
    this._lock();
  }

  _lock() {
    if (!this.activePiece) return;
    this.board.lockPiece(this.activePiece);
    this.activePiece = null;
    this._isOnGround = false;
    this._lockTimer  = 0;
    this._processClears();
  }

  // ── Line clear + cluster processing ───────────────
  _processClears() {
    // 1. Clear full lines
    const cleared = this.board.clearLines();

    // 2. Cluster explosions (after gravity from line clears)
    const exploded = this.board.explodeClusters();

    const linesCleared = cleared.length;
    let attack = 0;
    let scoreGain = 0;
    let notifText = null;
    let notifType = 'clear';

    if (linesCleared > 0) {
      // Score
      scoreGain += (SCORE_TABLE[linesCleared] || 800) * this.level;
      scoreGain += this.combo * COMBO_BONUS * this.level;
      this.combo++;
      this.lines += linesCleared;
      attack += ATTACK_TABLE[linesCleared] || 0;
      // Back-to-back bonus
      if (linesCleared === 4) {
        notifText = '💥 CLASH!';
        notifType = 'combo';
        Effects.boardShake(this.id === 'p1' ? 'boardwrap-p1' : 'boardwrap-p2');
      } else if (linesCleared === 3) {
        notifText = '⚡ TRIPLE!';
        notifType = 'combo';
      } else if (linesCleared === 2) {
        notifText = '✦ DOUBLE';
        notifType = 'clear';
      }
      if (this.combo > 2) {
        notifText = `🔥 COMBO ×${this.combo}`;
        notifType = 'combo';
      }
    } else {
      this.combo = 0;
    }

    if (exploded > 0) {
      scoreGain += exploded * CLUSTER_SCORE * this.level;
      attack     += CLUSTER_ATTACK;
      notifText  = `💣 CLUSTER ×${exploded}`;
      notifType  = 'wild';
    }

    // Level up every 10 lines
    const newLevel = Math.floor(this.lines / 10) + 1;
    if (newLevel > this.level) {
      this.level = Math.min(newLevel, 15);
      Effects.notify(`⬆ LEVEL ${this.level}`, 'clear');
    }

    this.score += scoreGain;

    // Update attack meter (visual)
    this.attackMeter = Math.min(100, this.attackMeter + attack * 12);

    // Send attack
    if (attack > 0 && this._onAttack) {
      this._onAttack(attack);
      if (notifText) Effects.notify(notifText + ` → SENT ${attack}`, notifType);
    } else if (notifText) {
      Effects.notify(notifText, notifType);
    }

    // Inject pending garbage
    this.board.flushGarbage();

    this._updateUI();
    this._spawn();
  }

  // ── Main update loop ─────────────────────────────
  update(dt) {
    if (!this.alive || !this.activePiece) return;

    // DAS — left
    if (this._keys[this.controls.left]) {
      this._dasTimerL += dt;
      if (!this._dasActiveL && this._dasTimerL > this._dasDelay) {
        this._dasActiveL = true; this._dasTimerL = 0;
      }
      if (this._dasActiveL) {
        this._dasTimerL += dt;
        if (this._dasTimerL > this._dasRate) { this._move(-1); this._dasTimerL = 0; }
      }
    }
    // DAS — right
    if (this._keys[this.controls.right]) {
      this._dasTimerR += dt;
      if (!this._dasActiveR && this._dasTimerR > this._dasDelay) {
        this._dasActiveR = true; this._dasTimerR = 0;
      }
      if (this._dasActiveR) {
        this._dasTimerR += dt;
        if (this._dasTimerR > this._dasRate) { this._move(1);  this._dasTimerR = 0; }
      }
    }

    // Soft drop
    if (this._keys[this.controls.down]) {
      this._dropTimer += dt * 5; // 5× faster
    } else {
      this._dropTimer += dt;
    }

    // Auto-drop
    if (this._dropTimer >= this._dropInterval) {
      this._dropTimer = 0;
      if (!collides(this.activePiece, this.board.grid, 0, 1)) {
        this.activePiece.y++;
        this._isOnGround = false;
      } else {
        this._isOnGround = true;
      }
    }

    // Lock delay
    if (this._isOnGround) {
      this._lockTimer += dt;
      if (this._lockTimer >= this._lockDelay) {
        this._lock();
      }
    } else if (collides(this.activePiece, this.board.grid, 0, 1)) {
      this._isOnGround = true;
    } else {
      this._isOnGround = false;
      this._lockTimer  = 0;
    }
  }

  render() {
    this.board.draw(this.activePiece, this.holdPiece, this.nextPiece);
  }

  _updateUI() {
    const el = id => document.getElementById(id);
    const prefix = this.id;
    el(`${prefix}score`).textContent = this.score.toLocaleString();
    el(`${prefix}level`).textContent = this.level;
    el(`${prefix}lines`).textContent = this.lines;
    // Attack meter
    const fill = el(`${prefix}meterFill`);
    if (fill) fill.style.width = `${this.attackMeter}%`;
    if (this.attackMeter > 0) {
      this.attackMeter = Math.max(0, this.attackMeter - 2); // decay
    }
  }

  receiveGarbage(rows) {
    this.board.addGarbage(rows);
    // Visual: update garbage dots
    const el = document.getElementById(`${this.id}garbage`);
    if (el) {
      el.innerHTML = '';
      for (let i = 0; i < this.board.garbageQueue; i++) {
        const dot = document.createElement('div');
        dot.className = 'garbage-dot';
        el.appendChild(dot);
      }
    }
  }
}
