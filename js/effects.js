// ════════════════════════════════════════════════════════
//  TOKEN CLASH — Effects
//  Screen shake, notifications, flash effects.
// ════════════════════════════════════════════════════════

const Effects = {
  _notifEl: null,

  init() {
    // Create notification container
    let el = document.getElementById('notifications');
    if (!el) {
      el = document.createElement('div');
      el.id = 'notifications';
      document.body.appendChild(el);
    }
    this._notifEl = el;
  },

  notify(text, type = 'clear') {
    if (!this._notifEl) this.init();
    const div = document.createElement('div');
    div.className = `notif ${type}`;
    div.textContent = text;
    this._notifEl.appendChild(div);
    // Auto-remove after animation
    setTimeout(() => div.remove(), 1800);
  },

  boardShake(wrapperId) {
    const el = document.getElementById(wrapperId);
    if (!el) return;
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = 'boardShakeAnim .3s ease';
    setTimeout(() => { el.style.animation = ''; }, 300);
  },

  attackFlash(side) {
    // Flash the receiving player's board
    const wrapperId = side === 'p1' ? 'boardwrap-p1' : 'boardwrap-p2';
    const el = document.getElementById(wrapperId);
    if (!el) return;
    const flash = document.createElement('div');
    flash.className = 'attack-flash';
    flash.style.cssText = `
      position:absolute;inset:0;
      background:rgba(255,77,109,0.3);
      z-index:6;pointer-events:none;
      animation:attackFlash .4s ease forwards;
    `;
    el.appendChild(flash);
    setTimeout(() => flash.remove(), 400);
  },

  dividerFlash(attackerSide) {
    const el = document.getElementById('dividerFx');
    if (!el) return;
    el.innerHTML = '';
    const div = document.createElement('div');
    div.style.cssText = `
      position:absolute;
      width:3px;height:100%;
      background:${attackerSide === 'p1' ? 'var(--p1)' : 'var(--p2)'};
      left:50%;transform:translateX(-50%);
      box-shadow:0 0 10px ${attackerSide === 'p1' ? 'var(--p1)' : 'var(--p2)'};
      animation:divFlash .3s ease forwards;
    `;
    el.appendChild(div);
    setTimeout(() => { el.innerHTML = ''; }, 300);
  },

  timerWarning() {
    const el = document.getElementById('gameTimer');
    if (el) el.classList.add('warning');
  },

  timerNormal() {
    const el = document.getElementById('gameTimer');
    if (el) el.classList.remove('warning');
  },
};

// Inject keyframes not in CSS
const styleEl = document.createElement('style');
styleEl.textContent = `
@keyframes boardShakeAnim {
  0%,100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
@keyframes attackFlash {
  0%   { opacity:1; }
  100% { opacity:0; }
}
@keyframes divFlash {
  0%   { opacity:1; transform: translateX(-50%) scaleY(1); }
  100% { opacity:0; transform: translateX(-50%) scaleY(1.5); }
}
`;
document.head.appendChild(styleEl);
