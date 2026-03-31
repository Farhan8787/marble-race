// ════════════════════════════════════════════════════════
//  TOKEN CLASH — Game Manager
//  Main game loop, timer, win conditions, orchestration.
// ════════════════════════════════════════════════════════

const MATCH_DURATION = 3 * 60 * 1000; // 3 minutes in ms

const CONTROLS_P1 = {
  left:     'KeyA',
  right:    'KeyD',
  down:     'KeyS',
  rotCW:    'KeyW',
  rotCCW:   'KeyZ',
  hardDrop: 'Space',
  hold:     'KeyC',
};
const CONTROLS_P2 = {
  left:     'ArrowLeft',
  right:    'ArrowRight',
  down:     'ArrowDown',
  rotCW:    'ArrowUp',
  rotCCW:   'Slash',
  hardDrop: 'ShiftRight',
  hold:     'Period',
};

const GameManager = (() => {
  let _p1       = null;
  let _p2       = null;
  let _prices   = null;
  let _raf      = null;
  let _lastTime = 0;
  let _timeLeft = MATCH_DURATION;
  let _running  = false;
  let _paused   = false;
  let _mode     = 'pvp';

  function start(mode) {
    _mode = mode;
    UI.showGame();

    // Initialise price service
    if (!_prices) {
      _prices = new PriceService();
      _prices.init().then(() => _prices.initTicker());
    } else {
      _prices.initTicker();
    }

    // Destroy existing players
    _p1 = null; _p2 = null;

    // P1 is always human
    _p1 = new Player('p1', 'p1board', 'p1next', 'p1hold', CONTROLS_P1, _prices);
    document.getElementById('p1name').textContent = 'PLAYER 1';

    if (mode === 'pvp') {
      _p2 = new Player('p2', 'p2board', 'p2next', 'p2hold', CONTROLS_P2, _prices);
      document.getElementById('p2name').textContent = 'PLAYER 2';
    } else {
      _p2 = new Bot('p2', 'p2board', 'p2next', 'p2hold', _prices);
      document.getElementById('p2name').textContent = 'BOT';
    }

    // Cross-link attack callbacks
    _p1.setOpponent(_p2);
    _p1.setAttackCallback(rows => {
      _p2.receiveGarbage(rows);
      Effects.attackFlash('p2');
      Effects.dividerFlash('p1');
    });
    _p2.setOpponent(_p1);
    _p2.setAttackCallback(rows => {
      _p1.receiveGarbage(rows);
      Effects.attackFlash('p1');
      Effects.dividerFlash('p2');
    });

    _p1.start();
    _p2.start();

    _timeLeft = MATCH_DURATION;
    _running  = true;
    _paused   = false;

    Effects.timerNormal();

    if (_raf) cancelAnimationFrame(_raf);
    _lastTime = performance.now();
    _loop(performance.now());
  }

  function _loop(now) {
    if (!_running) return;
    _raf = requestAnimationFrame(_loop);

    const dt = Math.min(now - _lastTime, 100); // cap at 100ms
    _lastTime = now;

    if (_paused) return;

    // Update timer
    _timeLeft -= dt;
    _updateTimer();

    if (_timeLeft <= 0) {
      _timeOut();
      return;
    }

    // Update players
    if (_p1.alive) _p1.update(dt);
    if (_p2.alive) _p2.update(dt);

    // Render
    _p1.render();
    _p2.render();

    // Check game over
    if (!_p1.alive && !_p2.alive) { _endGame('draw'); return; }
    if (!_p1.alive) { _endGame('p2'); return; }
    if (!_p2.alive) { _endGame('p1'); return; }
  }

  function _updateTimer() {
    const secs  = Math.max(0, Math.ceil(_timeLeft / 1000));
    const m     = Math.floor(secs / 60);
    const s     = secs % 60;
    const el    = document.getElementById('gameTimer');
    if (el) el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    if (secs <= 30) Effects.timerWarning();
    else            Effects.timerNormal();
  }

  function _timeOut() {
    // Compare scores
    const p1 = _p1.score, p2 = _p2.score;
    let winner = p1 > p2 ? 'p1' : p2 > p1 ? 'p2' : 'draw';
    _endGame(winner, true);
  }

  function _endGame(winner, timeout = false) {
    _running = false;
    cancelAnimationFrame(_raf);
    // Final render
    if (_p1) _p1.render();
    if (_p2) _p2.render();
    setTimeout(() => {
      UI.showGameOver(
        timeout ? winner : winner,
        _p1 ? _p1.score : 0,
        _p2 ? _p2.score : 0,
        _p1 ? _p1.lines : 0,
        _p2 ? _p2.lines : 0,
      );
    }, 600);
  }

  function stop() {
    _running = false;
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    // Remove key listeners by destroying player objects
    _p1 = null; _p2 = null;
  }

  function restart() {
    stop();
    start(_mode);
  }

  function togglePause() {
    if (!_running && !_paused) return;
    _paused = !_paused;
    if (_paused) {
      UI.showPause();
    } else {
      UI.hidePause();
      _lastTime = performance.now(); // reset to avoid huge dt jump
    }
  }

  return { start, stop, restart, togglePause };
})();

// ── Bootstrap ───────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  UI.init();
  UI.showScreen('screen-title');

  // Init prices in background for ticker
  const priceBootstrap = new PriceService();
  priceBootstrap.init().then(() => priceBootstrap.initTicker());
});

// Prevent context menu on right-click (keeps game clean)
window.addEventListener('contextmenu', e => e.preventDefault());

// Prevent drag
window.addEventListener('dragstart', e => e.preventDefault());

// Handle visibility change — auto-pause
document.addEventListener('visibilitychange', () => {
  if (document.hidden && GameManager && !GameManager._paused) {
    // only pause if game is running
    const timerEl = document.getElementById('gameTimer');
    if (timerEl && document.getElementById('screen-game')?.classList.contains('active')) {
      GameManager.togglePause();
    }
  }
});
