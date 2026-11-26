/* Royal Fortuna — Tickets à gratter : 3 symboles identiques = gagné. */
(function () {
  'use strict';
  const C = window.Casino;
  const { h, fmt } = C;

  const PRIZES = [
    { c: '🍒', m: 1 }, { c: '🍋', m: 2 }, { c: '🍀', m: 5 }, { c: '🔔', m: 10 }, { c: '💎', m: 50 }, { c: '👑', m: 200 }
  ];
  const FILLERS = ['⭐', '🎲'];
  // probabilité d'obtenir chaque gain (RTP ≈ 90 %)
  const ODDS = [{ m: 0, p: 0.7366 }, { m: 1, p: 0.13 }, { m: 2, p: 0.07 }, { m: 5, p: 0.04 }, { m: 10, p: 0.02 }, { m: 50, p: 0.003 }, { m: 200, p: 0.0004 }];

  function makeCard() {
    let r = Math.random(), m = 0;
    for (const o of ODDS) { if (r < o.p) { m = o.m; break; } r -= o.p; }
    const all = PRIZES.map(p => p.c).concat(FILLERS);
    const counts = {}; const cells = [];
    const add = s => { counts[s] = (counts[s] || 0) + 1; cells.push(s); };
    if (m > 0) { const w = PRIZES.find(p => p.m === m).c; add(w); add(w); add(w); }
    while (cells.length < 9) {
      const s = all[C.rand(all.length)];
      if ((counts[s] || 0) >= 2) continue;
      add(s);
    }
    return { cells: C.shuffle(cells), m };
  }

  let alive = false, card = null, revealed = 0, bet = 0, settled = false;
  let root, bc, gridEl, msgEl, actEl;

  function mount(el) {
    root = el; alive = true; card = null; settled = true;
    const page = h('div', 'page game scratch');
    page.innerHTML = `<div class="table felt">
        <div class="scratch-card"><div class="sc-title">🎟️ TICKET ROYAL</div><div class="sc-grid" id="sc-grid"></div>
        <div class="sc-sub">Trouve 3 symboles identiques</div></div>
        <div class="bj-msg" id="sc-msg">Achète un ticket, puis gratte les cases.</div>
        <div class="sc-legend">${PRIZES.map(p => `<span>${p.c}×3 = <b>×${p.m}</b></span>`).join('')}</div>
      </div>
      <div class="controls"><div id="sc-bet"></div><div class="ctl-btns" id="sc-act"></div></div>`;
    root.appendChild(page);
    gridEl = page.querySelector('#sc-grid'); msgEl = page.querySelector('#sc-msg'); actEl = page.querySelector('#sc-act');
    bc = C.betControl({ game: 'scratch', label: 'Prix' });
    page.querySelector('#sc-bet').appendChild(bc.el);
    emptyGrid(); renderActions();
  }
  function unmount() {
    alive = false;
    if (card && !settled) finish();
  }

  function emptyGrid() {
    gridEl.innerHTML = Array.from({ length: 9 }, () => '<div class="sc-cell"><span></span><b class="sc-cover">?</b></div>').join('');
  }
  function renderActions() {
    actEl.innerHTML = '';
    if (!card || settled) {
      bc.lock(false);
      const b = h('button', 'btn spin', 'ACHETER UN TICKET'); b.addEventListener('click', buy); actEl.appendChild(b);
    } else {
      bc.lock(true);
      const b = h('button', 'btn spin', 'TOUT GRATTER'); b.addEventListener('click', revealAll); actEl.appendChild(b);
    }
  }

  function buy() {
    bet = bc.get();
    if (!C.take(bet)) return;
    card = makeCard(); revealed = 0; settled = false;
    gridEl.innerHTML = card.cells.map((s, i) => `<div class="sc-cell" data-i="${i}"><span>${s}</span><b class="sc-cover">?</b></div>`).join('');
    gridEl.querySelectorAll('.sc-cell').forEach(c => c.addEventListener('click', () => reveal(c)));
    msgEl.className = 'bj-msg'; msgEl.textContent = 'Gratte les cases !'; C.sfx('coin');
    renderActions();
  }
  function reveal(cell) {
    if (!card || settled || cell.classList.contains('open')) return;
    cell.classList.add('open'); revealed++; C.sfx('tick');
    if (revealed >= 9) finish();
  }
  function revealAll() {
    gridEl.querySelectorAll('.sc-cell:not(.open)').forEach((c, i) => setTimeout(() => { if (alive) reveal(c); }, i * 90));
  }

  function finish() {
    if (settled) return; settled = true;
    const pay = card.m * bet;
    const r = C.settle({ game: 'scratch', bet, payout: pay, extra: {} });
    if (!alive) return;
    if (card.m > 0) {
      const w = PRIZES.find(p => p.m === card.m).c;
      gridEl.querySelectorAll('.sc-cell').forEach((c, i) => { c.classList.add('open'); if (card.cells[i] === w) c.classList.add('win'); });
      msgEl.className = 'bj-msg win';
      msgEl.textContent = card.m === 1 ? 'Ticket remboursé !' : `3 × ${w} — tu gagnes ${fmt(r.net)} !`;
    } else {
      gridEl.querySelectorAll('.sc-cell').forEach(c => c.classList.add('open'));
      msgEl.className = 'bj-msg'; msgEl.textContent = 'Perdu… un autre ticket ?' + (r.cashback ? ` (cashback ${fmt(r.cashback)})` : '');
    }
    renderActions();
  }

  C.registerGame({
    id: 'scratch', name: 'Tickets à gratter', icon: '🎟️', unlock: 10,
    desc: 'Gratte 3 symboles identiques — jusqu’à ×200 !', mount, unmount
  });
})();
