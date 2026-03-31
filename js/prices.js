// ════════════════════════════════════════════════════════
//  TOKEN CLASH — Price Service
//  Simulates "live" DEX price data.
//  Tries CoinGecko API first; falls back to simulation.
//  Updates every 30 s.
// ════════════════════════════════════════════════════════

const COINGECKO_IDS = {
  ETH:  'ethereum',
  BTC:  'bitcoin',
  USDC: 'usd-coin',
  SOL:  'solana',
  DOGE: 'dogecoin',
  PEPE: 'pepe',
  SHIB: 'shiba-inu',
  LINK: 'chainlink',
};

class PriceService {
  constructor() {
    // Internal state per token
    this._data = {};
    ACTIVE_TOKENS.forEach(tok => {
      this._data[tok.id] = {
        price: this._initialPrice(tok.id),
        change24h: 0,
        pumping: false,
        volatile: false,
        wild: false,
      };
    });
    this._fetchCount = 0;
    this._useSimulation = false;
  }

  _initialPrice(id) {
    const defaults = { ETH:3000, BTC:65000, USDC:1, SOL:150, DOGE:0.15, PEPE:0.000012, SHIB:0.000025, LINK:15 };
    return defaults[id] || 1;
  }

  async init() {
    await this._fetch();
    this._startSimulatedUpdates();
  }

  async _fetch() {
    // Try CoinGecko free API (no key needed, rate-limited)
    const ids = Object.values(COINGECKO_IDS).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!resp.ok) throw new Error('Non-200');
      const json = await resp.json();
      ACTIVE_TOKENS.forEach(tok => {
        const cgId = COINGECKO_IDS[tok.id];
        const d    = json[cgId];
        if (d) {
          const prev = this._data[tok.id].price;
          const next = d.usd || prev;
          this._data[tok.id].price     = next;
          this._data[tok.id].change24h = d.usd_24h_change || 0;
          this._data[tok.id].pumping   = (d.usd_24h_change || 0) > 5;
          this._data[tok.id].volatile  = Math.abs(d.usd_24h_change || 0) > 10;
          this._data[tok.id].wild      = Math.abs(d.usd_24h_change || 0) > 20;
          this._fetchCount++;
        }
      });
    } catch {
      // Fallback to simulation
      this._useSimulation = true;
      this._simulatePrices();
    }
  }

  _simulatePrices() {
    ACTIVE_TOKENS.forEach(tok => {
      const d = this._data[tok.id];
      // Random walk
      const drift   = (Math.random() - 0.48) * tok.volatility * 0.05;
      const shock   = Math.random() < 0.05 ? (Math.random() - 0.4) * tok.volatility * 0.3 : 0;
      const pctMove = drift + shock;
      d.price        = Math.max(0.000001, d.price * (1 + pctMove));
      d.change24h    = pctMove * 100;
      d.pumping      = pctMove > 0.03;
      d.volatile     = Math.abs(pctMove) > 0.08;
      d.wild         = Math.abs(pctMove) > 0.15;
    });
  }

  _startSimulatedUpdates() {
    // Refresh every 30s from API if we got data, else simulate every 3s
    const interval = this._useSimulation ? 3000 : 30000;
    setInterval(() => {
      if (this._useSimulation) {
        this._simulatePrices();
      } else {
        this._fetch();
        this._simulatePrices(); // also apply micro-movements
      }
      this._updateTicker();
    }, interval);
  }

  getData(tokenId) {
    return this._data[tokenId] || { price: 1, change24h: 0, pumping: false, volatile: false, wild: false };
  }

  getPumpingTokens() {
    return ACTIVE_TOKENS.filter(tok => this._data[tok.id]?.pumping);
  }

  getAllData() {
    return ACTIVE_TOKENS.map(tok => ({
      ...tok,
      ...this._data[tok.id],
    }));
  }

  _updateTicker() {
    // Update price bar in game screen
    const bar = document.getElementById('priceBar');
    if (bar) {
      bar.innerHTML = '';
      ACTIVE_TOKENS.forEach(tok => {
        const d    = this._data[tok.id];
        const pct  = d.change24h.toFixed(1);
        const cls  = d.wild ? 'wild' : d.pumping ? 'up' : d.change24h < -3 ? 'down' : '';
        const pill = document.createElement('div');
        pill.className = `price-pill ${cls}`;
        pill.textContent = `${tok.emoji} ${tok.symbol} ${pct > 0 ? '+' : ''}${pct}%`;
        bar.appendChild(pill);
      });
    }

    // Update title ticker
    const ticker = document.getElementById('priceTicker');
    if (ticker) {
      ticker.innerHTML = ACTIVE_TOKENS.map(tok => {
        const d   = this._data[tok.id];
        const pct = d.change24h.toFixed(2);
        const cls = d.pumping ? 'up' : d.change24h < 0 ? 'down' : 'flat';
        return `<span class="ticker-item ${cls}">${tok.emoji} ${tok.symbol} $${this._formatPrice(d.price)} (${pct > 0 ? '+' : ''}${pct}%)</span>`;
      }).join('');
    }
  }

  _formatPrice(p) {
    if (p >= 1000)    return p.toLocaleString('en', { maximumFractionDigits: 0 });
    if (p >= 1)       return p.toFixed(2);
    if (p >= 0.0001)  return p.toFixed(6);
    return p.toExponential(2);
  }

  initTicker() {
    this._updateTicker();
  }
}
