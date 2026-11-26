/* Royal Fortuna — Roulette européenne (un seul zéro), roue animée en canvas. */
(function () {
  'use strict';
  const C = window.Casino;
  const { h, fmt, sleep } = C;
  const S = () => C.S;

  const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const color = n => n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black';
  const STEP = Math.PI * 2 / 37;

  // renvoie le montant rendu (mise incluse) pour 1 jeton misé sur `key` si `n` sort
  function ret(key, n) {
    const [t, v] = key.split(':');
    if (t === 'n') return +v === n ? 36 : 0;
    if (n === 0) return 0;
    switch (t) {
      case 'red': return REDS.has(n) ? 2 : 0;
      case 'black': return !REDS.has(n) ? 2 : 0;
      case 'odd': return n % 2 === 1 ? 2 : 0;
      case 'even': return n % 2 === 0 ? 2 : 0;
      case 'low': return n <= 18 ? 2 : 0;
      case 'high': return n >= 19 ? 2 : 0;
      case 'dz': return Math.ceil(n / 12) === +v ? 3 : 0;
      case 'col': return (n - 1) % 3 === +v - 1 ? 3 : 0;
    }
    return 0;
  }

  let alive = false, spinning = false, bets = {}, order = [], lastBets = null, history = [];
  let root, bc, cv, ctx, wheelAngle = 0, ballAngle = 0, ballR = 0, ballShow = false, totalEl, msgEl, spinBtn, histEl, tableEl, undoBtn, clearBtn, rebetBtn, dblBtn;
  const wait = ms => alive ? sleep(ms) : Promise.resolve();
  const total = () => Object.values(bets).reduce((a, b) => a + b, 0);

  function mount(el) {
    root = el; alive = true; spinning = false; bets = {}; order = [];
    const page = h('div', 'page game roulette');
    page.innerHTML = `<div class="roul-top">
        <div class="wheel-box"><canvas id="rl-cv" width="340" height="340"></canvas><div class="rl-result" id="rl-res">?</div></div>
        <div class="roul-side">
          <div class="rl-hist" id="rl-hist"></div>
          <div class="bj-msg" id="rl-msg">Pose tes jetons sur le tapis.</div>
          <div class="rl-total">Mise totale : <b id="rl-total">0</b> <span class="chip-ico"></span></div>
        </div></div>
      <div class="rl-table-wrap"><div class="rl-table" id="rl-table"></div></div>
      <div class="controls"><div id="rl-bet"></div><div class="ctl-btns" id="rl-act"></div></div>
      <p class="hint">Clique sur le tapis pour poser un jeton (la valeur du jeton se règle avec la mise). Numéro plein ×36 · douzaines et colonnes ×3 · chances simples ×2.</p>`;
    root.appendChild(page);
    cv = page.querySelector('#rl-cv'); ctx = cv.getContext('2d');
    totalEl = page.querySelector('#rl-total'); msgEl = page.querySelector('#rl-msg'); histEl = page.querySelector('#rl-hist');
    tableEl = page.querySelector('#rl-table');
    bc = C.betControl({ game: 'roulette', label: 'Jeton' });
    page.querySelector('#rl-bet').appendChild(bc.el);
    const act = page.querySelector('#rl-act');
    undoBtn = h('button', 'btn', '↩ Annuler'); clearBtn = h('button', 'btn', '🗑 Effacer');
    rebetBtn = h('button', 'btn', '🔁 Refaire'); dblBtn = h('button', 'btn', '×2');
    spinBtn = h('button', 'btn spin', 'LANCER');
    undoBtn.addEventListener('click', undo); clearBtn.addEventListener('click', clear);
    rebetBtn.addEventListener('click', rebet); dblBtn.addEventListener('click', doubleAll);
    spinBtn.addEventListener('click', spin);
    act.append(undoBtn, clearBtn, rebetBtn, dblBtn, spinBtn);
    buildTable(); renderHist(); refresh(); drawWheel();
  }
  function unmount() { alive = false; }

  /* ---------------------------------------------------------- tapis */
  function buildTable() {
    const cells = [];
    const cell = (key, label, cls, style) => `<button class="rc ${cls || ''}" data-k="${key}" style="${style || ''}"><span>${label}</span><i class="chipmark" hidden></i></button>`;
    cells.push(cell('n:0', '0', 'green zero', 'grid-row:1/4;grid-column:1'));
    for (let c = 0; c < 12; c++) {
      for (let r = 0; r < 3; r++) {
        const n = c * 3 + (3 - r);
        cells.push(cell('n:' + n, n, color(n), `grid-row:${r + 1};grid-column:${c + 2}`));
      }
    }
    for (let r = 0; r < 3; r++) cells.push(cell('col:' + (3 - r), '2:1', 'out', `grid-row:${r + 1};grid-column:14`));
    [['dz:1', '1–12'], ['dz:2', '13–24'], ['dz:3', '25–36']].forEach(([k, l], i) => cells.push(cell(k, l, 'out', `grid-row:4;grid-column:${2 + i * 4}/${6 + i * 4}`)));
    [['low', '1–18'], ['even', 'PAIR'], ['red', '◆ ROUGE', 'red'], ['black', '◆ NOIR', 'black'], ['odd', 'IMPAIR'], ['high', '19–36']]
      .forEach(([k, l, cl], i) => cells.push(cell(k, l, 'out ' + (cl || ''), `grid-row:5;grid-column:${2 + i * 2}/${4 + i * 2}`)));
    tableEl.innerHTML = cells.join('');
    tableEl.addEventListener('click', e => {
      const b = e.target.closest('.rc'); if (b) place(b.dataset.k);
    });
  }

  function place(key) {
    if (spinning) return;
    const v = bc.get();
    if (S().money - total() < v) { C.toast('Pas assez de jetons pour ce jeton.', 'bad'); return; }
    const cur = bets[key] || 0;
    if (cur + v > C.maxBet()) { C.toast(`Limite par case : ${fmt(C.maxBet())} (augmente ton niveau).`, 'bad'); return; }
    bets[key] = cur + v; order.push({ key, v });
    C.sfx('tick'); refresh();
  }
  function undo() {
    if (spinning || !order.length) return;
    const { key, v } = order.pop(); bets[key] -= v; if (bets[key] <= 0) delete bets[key];
    C.sfx('click'); refresh();
  }
  function clear() { if (spinning) return; bets = {}; order = []; C.sfx('click'); refresh(); }
  function rebet() {
    if (spinning || !lastBets) return;
    const t = Object.values(lastBets).reduce((a, b) => a + b, 0);
    if (t > S().money) { C.toast('Pas assez de jetons pour refaire cette mise.', 'bad'); return; }
    bets = Object.assign({}, lastBets); order = Object.entries(bets).map(([key, v]) => ({ key, v }));
    C.sfx('coin'); refresh();
  }
  function doubleAll() {
    if (spinning || !order.length) return;
    if (total() * 2 > S().money) { C.toast('Pas assez de jetons pour doubler.', 'bad'); return; }
    for (const k of Object.keys(bets)) if (bets[k] * 2 > C.maxBet()) { C.toast('Une case dépasserait la mise maximale.', 'bad'); return; }
    order = order.concat(order.map(o => ({ key: o.key, v: o.v })));
    for (const k of Object.keys(bets)) bets[k] *= 2;
    C.sfx('coin'); refresh();
  }

  function refresh(keepHit) {
    if (!alive) return;
    totalEl.textContent = fmt(total());
    tableEl.querySelectorAll('.rc').forEach(b => {
      const v = bets[b.dataset.k], mk = b.querySelector('.chipmark');
      mk.hidden = !v; if (v) mk.textContent = C.fmtShort(v).replace(/\s/g, '');
      if (!keepHit) b.classList.remove('hit');
    });
    const none = !order.length;
    undoBtn.disabled = clearBtn.disabled = dblBtn.disabled = none || spinning;
    rebetBtn.disabled = !lastBets || spinning;
    spinBtn.disabled = none || spinning;
    bc.lock(spinning);
  }

  function renderHist() {
    histEl.innerHTML = history.slice(-14).reverse().map(n => `<span class="hn ${color(n)}">${n}</span>`).join('') || '<span class="muted">Aucun tirage</span>';
  }

  /* ---------------------------------------------------------- roue */
  function drawWheel() {
    if (!alive) return;
    const W = cv.width, cx = W / 2, cy = W / 2, R = W / 2 - 6, Rin = R * 0.62;
    ctx.clearRect(0, 0, W, W);
    // anneau extérieur
    const g = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R + 4);
    g.addColorStop(0, '#5a3b16'); g.addColorStop(1, '#2a1a08');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d9b25a'; ctx.lineWidth = 3; ctx.stroke();
    for (let i = 0; i < 37; i++) {
      const n = WHEEL[i], a0 = wheelAngle + i * STEP - Math.PI / 2, a1 = a0 + STEP;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
      ctx.fillStyle = n === 0 ? '#1a8a4a' : REDS.has(n) ? '#c0272d' : '#16161a';
      ctx.fill(); ctx.strokeStyle = '#d9b25a'; ctx.lineWidth = 1; ctx.stroke();
      // numéro
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a0 + STEP / 2 + Math.PI / 2);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(n, 0, -R * 0.86); ctx.restore();
    }
    // centre
    ctx.beginPath(); ctx.arc(cx, cy, Rin, 0, Math.PI * 2);
    const g2 = ctx.createRadialGradient(cx, cy, 5, cx, cy, Rin);
    g2.addColorStop(0, '#f1d58a'); g2.addColorStop(1, '#8a6322'); ctx.fillStyle = g2; ctx.fill();
    ctx.strokeStyle = '#3a2508'; ctx.lineWidth = 3; ctx.stroke();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(wheelAngle);
    ctx.strokeStyle = '#4a3010'; ctx.lineWidth = 6;
    for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -Rin * 0.9); ctx.stroke(); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fillStyle = '#ffd24a'; ctx.fill();
    // bille
    if (ballShow) {
      const bx = cx + ballR * R * Math.sin(ballAngle), by = cy - ballR * R * Math.cos(ballAngle);
      ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2);
      const bg = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, 7);
      bg.addColorStop(0, '#fff'); bg.addColorStop(1, '#bbb'); ctx.fillStyle = bg; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  async function animateSpin(n) {
    const idx = WHEEL.indexOf(n);
    const T = 5200, w0 = wheelAngle, wf = w0 + Math.PI * 2 * (4 + Math.random() * 2);
    const bf = wf + (idx + 0.5) * STEP, turns = 7;
    ballShow = true; const t0 = performance.now();
    C.sfx('spin');
    let lastTick = 0;
    await new Promise(res => {
      (function frame(t) {
        if (!alive) { wheelAngle = wf; res(); return; }
        const k = Math.min(1, (t - t0) / T);
        const ew = 1 - Math.pow(1 - k, 3);
        const eb = 1 - Math.pow(1 - k, 2.4);
        wheelAngle = w0 + (wf - w0) * ew;
        ballAngle = bf + (1 - eb) * turns * Math.PI * 2;
        // rayon : piste extérieure puis chute dans la case (avec petit rebond)
        const drop = Math.max(0, (k - 0.7) / 0.3);
        const bounce = k > 0.88 ? Math.sin((k - 0.88) * 60) * 0.03 * (1 - k) * 8 : 0;
        ballR = 0.92 - drop * 0.1 - bounce;
        if (t - lastTick > 90 && k < 0.9) { lastTick = t; C.sfx('tick'); }
        drawWheel();
        if (k < 1) requestAnimationFrame(frame); else res();
      })(t0);
    });
    wheelAngle = wheelAngle % (Math.PI * 2);
    ballAngle = bf; ballR = 0.82;
    drawWheel();
  }

  async function spin() {
    if (spinning || !order.length) return;
    const bet = total();
    if (!C.take(bet)) return;
    spinning = true; refresh();
    msgEl.className = 'bj-msg'; msgEl.textContent = 'Rien ne va plus…';
    const snapshot = Object.assign({}, bets);
    lastBets = snapshot;
    const n = C.rand(37);
    if (alive) { document.getElementById('rl-res').textContent = '?'; document.getElementById('rl-res').className = 'rl-result'; }
    await animateSpin(n);
    let pay = 0, straight = false;
    for (const [key, amt] of Object.entries(snapshot)) {
      const r = ret(key, n) * amt;
      pay += r; if (r && key.startsWith('n:')) straight = true;
    }
    history.push(n); if (history.length > 40) history.shift();
    if (alive) {
      const res = document.getElementById('rl-res');
      res.textContent = n; res.className = 'rl-result pop ' + color(n);
      renderHist();
      tableEl.querySelectorAll('.rc').forEach(b => { if (snapshot[b.dataset.k] && ret(b.dataset.k, n)) b.classList.add('hit'); });
    }
    const r = C.settle({ game: 'roulette', bet, payout: pay, extra: { straight } });
    if (alive) {
      const word = color(n) === 'green' ? 'Zéro' : (color(n) === 'red' ? 'Rouge' : 'Noir') + ' ' + n;
      if (pay > bet) { msgEl.className = 'bj-msg win'; msgEl.textContent = `${word} — tu gagnes ${fmt(r.net)} !`; }
      else if (pay > 0) { msgEl.className = 'bj-msg'; msgEl.textContent = `${word} — tu récupères ${fmt(pay)} (perte ${fmt(bet - pay)}).`; }
      else { msgEl.className = 'bj-msg'; msgEl.textContent = `${word} — perdu${r.cashback ? ' (cashback ' + fmt(r.cashback) + ')' : ''}.`; }
    }
    await wait(600);
    spinning = false;
    // les mises restent affichées pour pouvoir rejouer ; on vérifie qu'on peut les payer
    if (total() > S().money) { bets = {}; order = []; }
    if (alive) refresh(true);
  }

  C.registerGame({
    id: 'roulette', name: 'Roulette', icon: '🎡', unlock: 3,
    desc: 'Roulette européenne : numéros, couleurs, douzaines…', mount, unmount
  });
})();
