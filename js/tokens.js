// ════════════════════════════════════════════════════════
//  TOKEN CLASH — Token Definitions
//  Each token maps to a block color + symbol.
//  "volatility" drives wild-block probability.
// ════════════════════════════════════════════════════════

const TOKENS = [
  { id: 'ETH',   symbol: 'ETH',  emoji: '⟠', color: '#627eea', glow: '#8fa7ff', volatility: 0.5 },
  { id: 'BTC',   symbol: 'BTC',  emoji: '₿', color: '#f7931a', glow: '#ffb347', volatility: 0.4 },
  { id: 'USDC',  symbol: 'USDC', emoji: 'U', color: '#2775ca', glow: '#5599ee', volatility: 0.1 },
  { id: 'SOL',   symbol: 'SOL',  emoji: '◎', color: '#9945ff', glow: '#cc77ff', volatility: 0.7 },
  { id: 'DOGE',  symbol: 'DOGE', emoji: 'Ð', color: '#c2a633', glow: '#e8c844', volatility: 0.9 },
  { id: 'PEPE',  symbol: 'PEPE', emoji: '🐸', color: '#4caf50', glow: '#80e27e', volatility: 1.0 },
  { id: 'SHIB',  symbol: 'SHIB', emoji: '🐕', color: '#ff6d00', glow: '#ff9e40', volatility: 0.95 },
  { id: 'LINK',  symbol: 'LINK', emoji: '⬡', color: '#2a5ada', glow: '#5577ff', volatility: 0.6 },
];

// Number of distinct token types to use in gameplay (keep it manageable)
const ACTIVE_TOKENS = TOKENS.slice(0, 6);

// Returns a random token index
function randomTokenIdx() {
  return Math.floor(Math.random() * ACTIVE_TOKENS.length);
}

// Returns token object by index
function getToken(idx) {
  return ACTIVE_TOKENS[idx % ACTIVE_TOKENS.length];
}

// Garbage block color
const GARBAGE_COLOR   = '#2a3547';
const GARBAGE_GLOW    = '#3a4a5e';
const GARBAGE_BORDER  = '#1e3a5a';
const WILD_COLOR      = '#ffffff';
const WILD_GLOW       = '#b44bff';
