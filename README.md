# 🎮 TOKEN CLASH — Competitive Block Battler

A real-time crypto-themed PvP puzzle battler. Two players battle side-by-side in split-screen, clearing token-colored blocks and sending garbage to opponents.

![Token Clash](https://img.shields.io/badge/Game-Token%20Clash-00e5ff?style=for-the-badge)
![Free](https://img.shields.io/badge/Deploy-GitHub%20Pages%20Free-39ff14?style=for-the-badge)

---

## 🕹️ Gameplay

| Feature | Detail |
|---|---|
| **Mode** | Local PvP (2 players, 1 keyboard) or Solo vs Bot |
| **Match Length** | 3 minutes or first stack overflow |
| **Pieces** | 7 classic tetrominoes with SRS wall kicks |
| **Tokens** | ETH, BTC, USDC, SOL, DOGE, PEPE (each has a color) |
| **Wild Blocks** | Triggered by volatile tokens — counts as any token for clusters |
| **Live Prices** | CoinGecko API (falls back to simulation offline) |

### Controls

| Action | Player 1 | Player 2 |
|---|---|---|
| Move Left | `A` | `←` |
| Move Right | `D` | `→` |
| Soft Drop | `S` | `↓` |
| Rotate CW | `W` | `↑` |
| Rotate CCW | `Z` | `/` |
| Hard Drop | `Space` | `Shift Right` |
| Hold | `C` | `.` |
| Pause | `Esc` or ⏸ button | — |

### Scoring & Attacks

| Clear | Score | Garbage Sent |
|---|---|---|
| 1 line | 100 × level | 0 |
| 2 lines | 300 × level | 1 row |
| 3 lines | 500 × level | 2 rows |
| 4 lines (CLASH!) | 800 × level | 4 rows |
| Cluster (4+ same token) | 20 × cells × level | 3 rows |

---

## 🚀 Deploy FREE on GitHub Pages (Step by Step)

### Step 1 — Create a GitHub account
Go to [github.com](https://github.com) → Sign Up (free forever).

### Step 2 — Create a new repository

1. Click the **+** icon → **New repository**
2. Name it: `token-clash` (or anything you like)
3. Set visibility: **Public** ✅ (required for free Pages)
4. Check **"Add a README file"** → **Create repository**

### Step 3 — Upload the game files

**Option A — GitHub Web UI (easiest, no Git needed):**

1. Open your new repository
2. Click **"Add file"** → **"Upload files"**
3. Drag and drop ALL these files/folders:
   ```
   index.html
   css/
     style.css
   js/
     tokens.js
     pieces.js
     board.js
     player.js
     bot.js
     prices.js
     effects.js
     ui.js
     game.js
   ```
4. Click **"Commit changes"**

**Option B — Git CLI:**
```bash
git clone https://github.com/YOUR_USERNAME/token-clash.git
# Copy all game files into the cloned folder
cd token-clash
git add .
git commit -m "Initial game deploy"
git push origin main
```

### Step 4 — Enable GitHub Pages

1. Go to your repo → **Settings** tab
2. Scroll to **Pages** (left sidebar)
3. Under **Source**: select **Deploy from a branch**
4. Branch: `main` | Folder: `/ (root)`
5. Click **Save**

### Step 5 — Your game is live! 🎉

After ~1–2 minutes, your game is at:
```
https://YOUR_USERNAME.github.io/token-clash/
```

Share this URL with anyone — works on desktop browsers, no install needed!

---

## 🌐 Other Free Hosting Options

| Platform | Link | Notes |
|---|---|---|
| **GitHub Pages** | github.com | ✅ Free, permanent, fast |
| **Netlify** | netlify.com | ✅ Free tier, drag & drop deploy folder |
| **Vercel** | vercel.com | ✅ Free tier, CLI deploy |
| **Itch.io** | itch.io | ✅ Free game hosting, great for browser games |

### Deploy to Netlify (drag & drop, 30 seconds):
1. Go to [app.netlify.com](https://app.netlify.com) → Sign up free
2. Drag your entire `token-clash/` folder onto the deploy zone
3. Done — live URL instantly!

### Deploy to Itch.io (best for game sharing):
1. Create account at [itch.io](https://itch.io)
2. New Project → HTML game
3. Zip your entire folder → upload as "HTML file"
4. Check "This file will be played in the browser"
5. Set frame size 1280×720

---

## 🏗️ Project Structure

```
token-clash/
├── index.html        # Main HTML, screen layout
├── css/
│   └── style.css     # All styling (neon crypto brutalism)
└── js/
    ├── tokens.js     # Token definitions & colors
    ├── pieces.js     # Tetromino shapes, SRS rotation, collision
    ├── board.js      # Grid logic, line clears, cluster detection, canvas rendering
    ├── player.js     # Human player input, scoring, attack logic
    ├── bot.js        # AI bot (heuristic Tetris AI)
    ├── prices.js     # CoinGecko price fetching + simulation fallback
    ├── effects.js    # Screen shake, notifications, flash effects
    ├── ui.js         # Screen management, particles, menus
    └── game.js       # Main game loop, timer, win conditions
```

No build tools, no npm, no dependencies — pure HTML/CSS/JS, works offline (with simulated prices).

---

## 🛠️ Customisation

**Change match length:** Edit `MATCH_DURATION` in `js/game.js`
```js
const MATCH_DURATION = 3 * 60 * 1000; // change 3 to desired minutes
```

**Add more tokens:** Edit `TOKENS` array in `js/tokens.js`

**Adjust bot difficulty:** Edit `_difficulty` in `js/bot.js` (0.0–1.0)

**Change attack values:** Edit `ATTACK_TABLE` in `js/player.js`
