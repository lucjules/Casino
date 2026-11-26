/* Royal Fortuna — Vidéo poker « Valet ou mieux » (barème 8/5). */
(function () {
  'use strict';
  const C = window.Casino;
  const { h, fmt, sleep } = C;

  const RK = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const SU = ['♠', '♥', '♦', '♣'];
  const PAYS = [
    { rank: 9, name: 'Quinte flush royale', mult: 800 },
    { rank: 8, name: 'Quinte flush', mult: 50 },
    { rank: 7, name: 'Carré', mult: 25 },
    { rank: 6, name: 'Full', mult: 8 },
    { rank: 5, name: 'Couleur', mult: 5 },
    { rank: 4, name: 'Suite', mult: 4 },
    { rank: 3, name: 'Brelan', mult: 3 },
    { rank: 2, name: 'Double paire', mult: 2 },
    { rank: 1, name: 'Valets ou mieux', mult: 1 }
  ];

  function evaluate(cards) {
    const vals = cards.map(c => c.v).sort((a, b) => a - b);
    const flush = cards.every(c => c.s === cards[0].s);
    const uniq = new Set(vals).size === 5;
    const straight = uniq && (vals[4] - vals[0] === 4 || (vals.join() === '0,1,2,3,12'));
    const counts = {};
    vals.forEach(v => counts[v] = (counts[v] || 0) + 1);
    const grp = Object.entries(counts).map(([v, n]) => ({ v: +v, n })).sort((a, b) => b.n - a.n || b.v - a.v);
    let rank = 0;
    if (straight && flush) rank = vals[0] === 8 ? 9 : 8;           // 10-J-Q-K-A : v = 8..12
    else if (grp[0].n === 4) rank = 7;
    else if (grp[0].n === 3 && grp[1].n === 2) rank = 6;
    else if (flush) rank = 5;
    else if (straight) rank = 4;
    else if (grp[0].n === 3) rank = 3;
    else if (grp[0].n === 2 && grp[1].n === 2) rank = 2;
    else if (grp[0].n === 2 && grp[0].v >= 9) rank = 1;           // J = 9
    const p = PAYS.find(x => x.rank === rank);
    return { rank, name: p ? p.name : 'Rien', mult: p ? p.mult : 0 };
  }

  /** Conseil simple : quelles cartes garder */
  function advise(cards) {
    const ev = evaluate(cards);
    const hold = [false, false, false, false, false];
    if (ev.rank >= 4 && ev.rank !== 3) return hold.map(() => true);
    const byVal = {};
    cards.forEach((c, i) => (byVal[c.v] = byVal[c.v] || []).push(i));
    const groups = Object.values(byVal).sort((a, b) => b.length - a.length);
    if (groups[0].length >= 2) {
      if (groups[0].length >= 3 || ev.rank === 2) { groups.filter(g => g.length >= 2).forEach(g => g.forEach(i => hold[i] = true)); return hold; }
      groups[0].forEach(i => hold[i] = true); return hold;
    }
    for (const s of SU) {
      const idx = cards.map((c, i) => c.s === s ? i : -1).filter(i => i >= 0);
      if (idx.length === 4) { idx.forEach(i => hold[i] = true); return hold; }
    }
    const high = cards.map((c, i) => c.v >= 9 ? i : -1).filter(i => i >= 0).sort((a, b) => cards[b].v - cards[a].v).slice(0, 2);
    high.forEach(i => hold[i] = true);
    return hold;
  }

  let alive = false, phase = 'idle', deck = [], hand = [], holds = [], bet = 0;
  let root, bc, cardsEl, msgEl, actEl, payEl;
  const wait = ms => alive ? sleep(ms) : Promise.resolve();

  function newDeck() {
    deck = [];
    for (let v = 0; v < 13; v++) for (const s of SU) deck.push({ v, s, r: RK[v] });
    C.shuffle(deck);
  }

  function cardEl(c, i) {
    const red = c.s === '♥' || c.s === '♦';
    const el = h('div', 'pcard deal ' + (red ? 'red' : 'black') + (holds[i] ? ' held' : ''));
    el.innerHTML = `<span class="tl">${c.r}<br>${c.s}</span><span class="mid">${c.s}</span><span class="br">${c.r}<br>${c.s}</span><em class="holdtag">GARDÉE</em>`;
    el.addEventListener('click', () => { if (phase !== 'hold') return; holds[i] = !holds[i]; el.classList.toggle('held', holds[i]); C.sfx('click'); });
    return el;
  }
  function backEl() { return h('div', 'pcard back'); }

  function mount(el) {
    root = el; alive = true; phase = 'idle'; hand = []; holds = [false, false, false, false, false];
    const page = h('div', 'page game poker');
    page.innerHTML = `<div class="table felt">
        <div class="paytable-mini" id="pk-pay"></div>
        <div class="cards poker-cards" id="pk-cards"></div>
        <div class="bj-msg" id="pk-msg">Distribue pour commencer.</div>
      </div>
      <div class="controls"><div id="pk-bet"></div><div class="ctl-btns" id="pk-act"></div></div>
      <p class="hint">Touche les cartes pour les garder, puis « Tirer » remplace les autres. Valet ou mieux pour être payé.</p>`;
    root.appendChild(page);
    cardsEl = page.querySelector('#pk-cards'); msgEl = page.querySelector('#pk-msg');
    actEl = page.querySelector('#pk-act'); payEl = page.querySelector('#pk-pay');
    bc = C.betControl({ game: 'poker' });
    page.querySelector('#pk-bet').appendChild(bc.el);
    for (let i = 0; i < 5; i++) cardsEl.appendChild(backEl());
    renderPay(-1); renderActions();
  }
  function unmount() {
    alive = false;
    if (phase === 'hold') drawCards();
  }

  function renderPay(hit) {
    const b = bc ? bc.get() : 10;
    payEl.innerHTML = PAYS.map(p => `<div class="prow${p.rank === hit ? ' hit' : ''}"><span>${p.name}</span><b>×${p.mult}</b></div>`).join('');
  }
  function renderActions() {
    actEl.innerHTML = '';
    if (phase === 'idle' || phase === 'done') {
      bc.lock(false);
      const b = h('button', 'btn spin', phase === 'done' ? 'NOUVELLE MAIN' : 'DISTRIBUER'); b.addEventListener('click', deal); actEl.appendChild(b);
    } else if (phase === 'hold') {
      bc.lock(true);
      const hint = h('button', 'btn', '💡 Conseil'); hint.addEventListener('click', () => {
        const a = advise(hand); holds = a; Array.from(cardsEl.children).forEach((el, i) => el.classList.toggle('held', holds[i])); C.sfx('click');
      });
      const d = h('button', 'btn spin', 'TIRER'); d.addEventListener('click', drawCards);
      actEl.append(hint, d);
    } else bc.lock(true);
  }

  async function deal() {
    if (phase !== 'idle' && phase !== 'done') return;
    bet = bc.get();
    if (!C.take(bet)) return;
    phase = 'busy'; renderActions(); renderPay(-1);
    newDeck(); hand = []; holds = [false, false, false, false, false];
    cardsEl.innerHTML = ''; msgEl.className = 'bj-msg'; msgEl.textContent = '';
    for (let i = 0; i < 5; i++) {
      hand.push(deck.pop());
      if (alive) { cardsEl.appendChild(cardEl(hand[i], i)); C.sfx('card'); }
      await wait(160);
    }
    const ev = evaluate(hand);
    phase = 'hold';
    if (alive) { msgEl.textContent = ev.mult ? `Main de départ : ${ev.name} !` : 'Choisis les cartes à garder.'; renderActions(); }
  }

  async function drawCards() {
    if (phase !== 'hold') return;
    phase = 'busy';
    if (alive) renderActions();
    for (let i = 0; i < 5; i++) {
      if (holds[i]) continue;
      hand[i] = deck.pop();
      if (alive) {
        const el = cardEl(hand[i], i); el.classList.add('flip');
        cardsEl.replaceChild(el, cardsEl.children[i]); C.sfx('card');
      }
      await wait(170);
    }
    const ev = evaluate(hand), pay = bet * ev.mult;
    phase = 'done';
    const r = C.settle({ game: 'poker', bet, payout: pay, extra: { paid: ev.mult > 0, rank: ev.rank, royal: ev.rank === 9, name: ev.name } });
    if (!alive) return;
    holds = holds.map(() => false);
    renderPay(ev.rank);
    if (ev.mult > 1) { msgEl.className = 'bj-msg win'; msgEl.textContent = `${ev.name} ! +${fmt(r.net)}`; }
    else if (ev.mult === 1) { msgEl.className = 'bj-msg'; msgEl.textContent = 'Valets ou mieux : ta mise est rendue.'; }
    else { msgEl.className = 'bj-msg'; msgEl.textContent = 'Rien cette fois…' + (r.cashback ? ` (cashback ${fmt(r.cashback)})` : ''); }
    renderActions();
  }

  C.registerGame({
    id: 'poker', name: 'Vidéo Poker', icon: '♠️', unlock: 5,
    desc: 'Valet ou mieux : garde les bonnes cartes, vise la quinte royale.', mount, unmount
  });
})();
