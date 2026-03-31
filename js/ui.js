// ════════════════════════════════════════════════════════
//  TOKEN CLASH — UI Manager
//  Screen transitions, particles, menu actions.
// ════════════════════════════════════════════════════════

const UI = {
  _activeScreen: null,
  _gameMode: 'pvp', // 'pvp' | 'solo'

  init() {
    this._spawnTitleParticles();
    Effects.init();
  },

  showScreen(id) {
    // Hide all screens immediately
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
    });
    // Show target screen
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('active');
      void el.offsetHeight; // force reflow for transition
    }
    this._activeScreen = id;
  },

  showTitle() {
    GameManager.stop();
    this.showScreen('screen-title');
  },

  showHelp() {
    this.showScreen('screen-help');
  },

  startLocalPvP() {
    this._gameMode = 'pvp';
    GameManager.start('pvp');
  },

  startSolo() {
    this._gameMode = 'solo';
    GameManager.start('solo');
  },

  showGameOver(winner, p1Score, p2Score, p1Lines, p2Lines) {
    const badge = document.getElementById('goBadge');
    const title = document.getElementById('goTitle');
    const winEl = document.getElementById('goWinner');
    const stats = document.getElementById('goStats');

    if (!winner) {
      badge.textContent = '⏱';
      title.textContent = 'TIME\'S UP';
    } else {
      badge.textContent = '🏆';
      title.textContent = 'GAME OVER';
    }

    if (winner === 'draw') {
      winEl.textContent = '🤝 DRAW — PERFECTLY MATCHED';
      winEl.style.color = 'var(--gold)';
    } else if (winner === 'p1') {
      winEl.textContent = '⚡ PLAYER 1 WINS!';
      winEl.style.color = 'var(--p1)';
    } else if (winner === 'p2') {
      winEl.textContent = this._gameMode === 'solo' ? '🤖 BOT WINS!' : '⚡ PLAYER 2 WINS!';
      winEl.style.color = 'var(--p2)';
    }

    stats.innerHTML = `
      <div class="stat-col">
        <span style="color:var(--p1)">P1</span>
        <span class="stat-val">${p1Score.toLocaleString()}</span>
        <span>${p1Lines} lines</span>
      </div>
      <div class="stat-col">
        <span style="color:var(--p2)">${this._gameMode === 'solo' ? 'BOT' : 'P2'}</span>
        <span class="stat-val">${p2Score.toLocaleString()}</span>
        <span>${p2Lines} lines</span>
      </div>
    `;

    this.showScreen('screen-gameover');
  },

  showPause() {
    this.showScreen('screen-pause');
  },

  hidePause() {
    this.showScreen('screen-game');
  },

  showGame() {
    this.showScreen('screen-game');
  },

  getGameMode() { return this._gameMode; },

  // ── Title screen particles ──────────────────────────
  _spawnTitleParticles() {
    const container = document.getElementById('titleParticles');
    if (!container) return;
    const COLORS = ['#00e5ff','#ff4d6d','#ffd60a','#b44bff','#39ff14','#f7931a'];
    for (let i = 0; i < 40; i++) {
      const p    = document.createElement('div');
      p.className = 'particle';
      const x    = Math.random() * 100;
      const size = 2 + Math.random() * 4;
      const dur  = 4 + Math.random() * 8;
      const del  = Math.random() * 8;
      const clr  = COLORS[Math.floor(Math.random() * COLORS.length)];
      p.style.cssText = `
        left:${x}vw; bottom:-10px;
        width:${size}px; height:${size}px;
        background:${clr};
        animation-duration:${dur}s;
        animation-delay:${del}s;
        box-shadow:0 0 6px ${clr};
      `;
      container.appendChild(p);
    }
  },
};
