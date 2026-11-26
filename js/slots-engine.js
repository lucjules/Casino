/* Moteur des machines à sous (pur, sans DOM) — utilisable dans le navigateur et dans Node. */
(function (root) {
  'use strict';

  // Lignes de paiement : pour chaque rouleau, l'index de la rangée (0 haut, 1 milieu, 2 bas)
  const LINES = [
    [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2],
    [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2],
    [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1]
  ];

  const MACHINES = {
    fruits: {
      id: 'fruits', name: 'Fruits Classic', icon: '🍒', level: 1, reels: 3, lines: 5,
      tagline: '3 rouleaux · 5 lignes · la machine des débutants',
      colors: ['#7a1020', '#d94a3b'],
      fsMult: 1,
      symbols: [
        { k: 'cherry', c: '🍒', w: 30, pay: { 3: 6 } },
        { k: 'lemon', c: '🍋', w: 26, pay: { 3: 8.5 } },
        { k: 'orange', c: '🍊', w: 22, pay: { 3: 14 } },
        { k: 'grape', c: '🍇', w: 16, pay: { 3: 29 } },
        { k: 'bell', c: '🔔', w: 10, pay: { 3: 58 } },
        { k: 'seven', c: '7️⃣', w: 6, pay: { 3: 145 } },
        { k: 'wild', c: '🍀', w: 5, wild: true, pay: { 3: 290 } }
      ]
    },
    pharaon: {
      id: 'pharaon', name: 'Secret du Pharaon', icon: '🏺', level: 4, reels: 5, lines: 9,
      tagline: '5 rouleaux · 9 lignes · wild & tours gratuits',
      colors: ['#6b4a0f', '#e0b04a'],
      fsMult: 2, fs: { 3: 8, 4: 12, 5: 20 }, scatterPay: { 3: 2.5, 4: 13, 5: 64 },
      symbols: [
        { k: 'scarab', c: '🪲', w: 26, pay: { 3: 2.5, 4: 7.5, 5: 25 } },
        { k: 'snake', c: '🐍', w: 22, pay: { 3: 4, 4: 10, 5: 38 } },
        { k: 'urn', c: '🏺', w: 18, pay: { 3: 5, 4: 15, 5: 64 } },
        { k: 'eye', c: '👁️', w: 14, pay: { 3: 7.5, 4: 25, 5: 100 } },
        { k: 'trident', c: '🔱', w: 10, pay: { 3: 13, 4: 51, 5: 190 } },
        { k: 'crown', c: '👑', w: 6, pay: { 3: 25, 4: 125, 5: 635 } },
        { k: 'wild', c: '🌞', w: 6, wild: true, pay: { 3: 38, 4: 190, 5: 1270 } },
        { k: 'scatter', c: '📜', w: 4, scatter: true, pay: {} }
      ]
    },
    galaxie: {
      id: 'galaxie', name: 'Galaxie Néon', icon: '🚀', level: 8, reels: 5, lines: 9,
      tagline: '5 rouleaux · 9 lignes · multiplicateurs spatiaux',
      colors: ['#1a1550', '#7b3fe4'],
      fsMult: 2, fs: { 3: 10, 4: 15, 5: 25 }, scatterPay: { 3: 2.5, 4: 13, 5: 66 },
      symbols: [
        { k: 'moon', c: '🌙', w: 26, pay: { 3: 2, 4: 5.5, 5: 22 } },
        { k: 'comet', c: '☄️', w: 22, pay: { 3: 2.5, 4: 8, 5: 31 } },
        { k: 'planet', c: '🪐', w: 18, pay: { 3: 4.5, 4: 13, 5: 53 } },
        { k: 'ufo', c: '🛸', w: 14, pay: { 3: 7, 4: 26, 5: 105 } },
        { k: 'rocket', c: '🚀', w: 9, pay: { 3: 13, 4: 53, 5: 265 } },
        { k: 'alien', c: '👽', w: 5, pay: { 3: 26, 4: 130, 5: 705 } },
        { k: 'wild', c: '⭐', w: 6, wild: true, pay: { 3: 35, 4: 175, 5: 1320 } },
        { k: 'scatter', c: '🌌', w: 4, scatter: true, pay: {} }
      ]
    },
    dragon: {
      id: 'dragon', name: "Dragon d'Or", icon: '🐲', level: 13, reels: 5, lines: 9,
      tagline: '5 rouleaux · 9 lignes · haute volatilité',
      colors: ['#5a0b0b', '#e8a317'],
      fsMult: 3, fs: { 3: 10, 4: 15, 5: 25 }, scatterPay: { 3: 2.5, 4: 18, 5: 91 },
      symbols: [
        { k: 'bamboo', c: '🎋', w: 27, pay: { 3: 2, 4: 4.5, 5: 18 } },
        { k: 'lantern', c: '🏮', w: 23, pay: { 3: 2.5, 4: 7.5, 5: 27 } },
        { k: 'fish', c: '🐟', w: 18, pay: { 3: 3.5, 4: 11, 5: 55 } },
        { k: 'bell', c: '🔔', w: 13, pay: { 3: 7.5, 4: 27, 5: 135 } },
        { k: 'coin', c: '💰', w: 8, pay: { 3: 14, 4: 73, 5: 365 } },
        { k: 'dragon', c: '🐲', w: 5, pay: { 3: 36, 4: 230, 5: 1365 } },
        { k: 'wild', c: '🧧', w: 6, wild: true, pay: { 3: 46, 4: 275, 5: 1820 } },
        { k: 'scatter', c: '🀄', w: 3.5, scatter: true, pay: {} }
      ]
    },
    diamant: {
      id: 'diamant', name: 'Diamant Royal', icon: '💎', level: 18, reels: 5, lines: 9,
      tagline: '5 rouleaux · 9 lignes · la machine des High Rollers',
      colors: ['#0e2a47', '#5ad1ff'],
      fsMult: 3, fs: { 3: 12, 4: 18, 5: 30 }, scatterPay: { 3: 3.5, 4: 18, 5: 140 },
      symbols: [
        { k: 'glass', c: '🥂', w: 30, pay: { 3: 2, 4: 4.5, 5: 23 } },
        { k: 'ring', c: '💍', w: 24, pay: { 3: 3, 4: 7.5, 5: 37 } },
        { k: 'watch', c: '⌚', w: 18, pay: { 3: 4.5, 4: 14, 5: 74 } },
        { k: 'trophy', c: '🏆', w: 10, pay: { 3: 9, 4: 37, 5: 185 } },
        { k: 'crown', c: '👑', w: 5, pay: { 3: 23, 4: 110, 5: 555 } },
        { k: 'diamond', c: '💎', w: 3, pay: { 3: 56, 4: 370, 5: 2775 } },
        { k: 'wild', c: '🎰', w: 4, wild: true, pay: { 3: 74, 4: 460, 5: 3700 } },
        { k: 'scatter', c: '🃏', w: 3, scatter: true, pay: {} }
      ]
    }
  };

  const ORDER = ['fruits', 'pharaon', 'galaxie', 'dragon', 'diamant'];

  // Prépare les poids cumulés
  Object.values(MACHINES).forEach(m => {
    m.total = m.symbols.reduce((a, s) => a + s.w, 0);
  });

  function pickSymbol(m, rng) {
    let r = rng() * m.total;
    for (const s of m.symbols) {
      r -= s.w;
      if (r < 0) return s;
    }
    return m.symbols[0];
  }

  /** Un tour : renvoie la grille, les lignes gagnantes et le gain en multiple de la mise totale. */
  function spin(m, rng) {
    rng = rng || Math.random;
    const grid = [];
    for (let r = 0; r < m.reels; r++) {
      const col = [];
      for (let y = 0; y < 3; y++) col.push(pickSymbol(m, rng));
      grid.push(col);
    }
    return evaluate(m, grid);
  }

  function evaluate(m, grid) {
    const wins = [];
    let lineSum = 0;
    const wildSym = m.symbols.find(s => s.wild);
    for (let li = 0; li < m.lines; li++) {
      const path = LINES[li].slice(0, m.reels);
      const syms = path.map((row, r) => grid[r][row]);
      // symbole de base = premier symbole non wild (si scatter en tête → rien)
      let base = null;
      for (let i = 0; i < syms.length; i++) {
        if (syms[i].scatter) break;
        if (syms[i].wild) continue;
        base = syms[i];
        break;
      }
      let best = null;
      if (base) {
        let count = 0;
        for (let i = 0; i < syms.length; i++) {
          if (syms[i] === base || syms[i].wild) count++; else break;
        }
        const p = base.pay[count];
        if (p) best = { sym: base, count, mult: p };
      }
      if (wildSym) {
        let wc = 0;
        for (let i = 0; i < syms.length; i++) { if (syms[i].wild) wc++; else break; }
        const wp = wildSym.pay[wc];
        if (wp && (!best || wp > best.mult)) best = { sym: wildSym, count: wc, mult: wp };
      }
      if (best) {
        const cells = [];
        for (let i = 0; i < best.count; i++) cells.push([i, path[i]]);
        wins.push({ line: li, sym: best.sym, count: best.count, mult: best.mult, cells });
        lineSum += best.mult;
      }
    }
    // Scatters
    let scatters = 0; const scatterCells = [];
    for (let r = 0; r < m.reels; r++) for (let y = 0; y < 3; y++) {
      if (grid[r][y].scatter) { scatters++; scatterCells.push([r, y]); }
    }
    let scatterMult = 0, fs = 0;
    if (m.scatterPay && scatters >= 3) {
      const k = Math.min(scatters, m.reels);
      scatterMult = m.scatterPay[k] || 0;
      fs = (m.fs && m.fs[k]) || 0;
    }
    return {
      grid, wins, scatters, scatterCells, fs,
      mult: lineSum / m.lines + scatterMult,   // en multiple de la mise totale
      lineMult: lineSum / m.lines, scatterMult
    };
  }

  /** Une manche complète (tour + éventuels tours gratuits) — pour les simulations. */
  function playRound(m, rng) {
    const first = spin(m, rng);
    let total = first.mult, spins = 1, fsLeft = first.fs, fsTotal = 0;
    while (fsLeft > 0 && spins < 80) {
      fsLeft--; spins++;
      const r = spin(m, rng);
      total += r.mult * m.fsMult; fsTotal += r.mult * m.fsMult;
      fsLeft += r.fs;
    }
    return { total, first, fsTotal };
  }

  const api = { LINES, MACHINES, ORDER, spin, evaluate, playRound };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SlotsEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
