/* Royal Fortuna — Blackjack : 6 jeux, croupier reste sur 17, blackjack 3:2, double, séparation. */
(function () {
  'use strict';
  const C = window.Casino;
  const { h, fmt, sleep } = C;

  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUITS = ['♠', '♥', '♦', '♣'];
  let alive = false, phase = 'bet', shoe = [], dealer = [], hands = [], cur = 0;
  let root, bc, dealerEl, handsEl, msgEl, actEl, dealerValEl, shoeEl;
  const wait = ms => alive ? sleep(ms) : Promise.resolve();

  function newShoe() {
    shoe = [];
    for (let d = 0; d < 6; d++) for (const r of RANKS) for (const s of SUITS) shoe.push({ r, s });
    C.shuffle(shoe);
  }
  const cardVal = c => c.r === 'A' ? 11 : ['J', 'Q', 'K'].includes(c.r) ? 10 : parseInt(c.r, 10);
  function total(cards) {
    let t = 0, aces = 0;
    cards.forEach(c => { t += cardVal(c); if (c.r === 'A') aces++; });
    while (t > 21 && aces > 0) { t -= 10; aces--; }
    return { t, soft: aces > 0 };
  }
  const isBJ = cards => cards.length === 2 && total(cards).t === 21;
  function draw() { if (shoe.length < 20) newShoe(); return shoe.pop(); }

  function cardEl(c, down) {
    const red = c.s === '♥' || c.s === '♦';
    const el = h('div', 'pcard deal ' + (down ? 'back' : red ? 'red' : 'black'));
    if (!down) el.innerHTML = `<span class="tl">${c.r}<br>${c.s}</span><span class="mid">${c.s}</span><span class="br">${c.r}<br>${c.s}</span>`;
    return el;
  }

  function mount(el) {
    root = el; alive = true; phase = 'bet'; hands = []; dealer = [];
    if (shoe.length < 40) newShoe();
    const page = h('div', 'page game bj');
    page.innerHTML = `<div class="table felt">
        <div class="seat dealer"><div class="seat-label">Croupier <b id="bj-dval"></b></div><div class="cards" id="bj-dealer"></div></div>
        <div class="bj-msg" id="bj-msg">Place ta mise et distribue !</div>
        <div class="seat player"><div class="hands" id="bj-hands"></div></div>
        <div class="rules">Blackjack paie 3:2 · Le croupier reste sur 17 · Double sur 2 cartes · Séparation possible</div>
      </div>
      <div class="controls"><div id="bj-bet"></div><div class="ctl-btns" id="bj-act"></div></div>`;
    root.appendChild(page);
    dealerEl = page.querySelector('#bj-dealer'); handsEl = page.querySelector('#bj-hands');
    msgEl = page.querySelector('#bj-msg'); actEl = page.querySelector('#bj-act'); dealerValEl = page.querySelector('#bj-dval');
    bc = C.betControl({ game: 'blackjack' });
    page.querySelector('#bj-bet').appendChild(bc.el);
    renderActions();
  }
  function unmount() {
    alive = false;
    if (phase === 'play') {   // manche en cours : on la termine automatiquement (le joueur reste)
      hands.forEach(hd => hd.done = true);
      phase = 'dealer'; finishRound();
    }
  }

  function btn(label, cls, fn, disabled) {
    const b = h('button', 'btn ' + (cls || ''), label);
    b.disabled = !!disabled; b.addEventListener('click', fn); return b;
  }
  function renderActions() {
    actEl.innerHTML = '';
    if (phase === 'bet') {
      bc.lock(false);
      actEl.appendChild(btn('DISTRIBUER', 'spin', deal));
      return;
    }
    bc.lock(true);
    if (phase !== 'play') return;
    const hd = hands[cur];
    const canDouble = hd.cards.length === 2 && C.canAfford(hd.bet) && !hd.fromAceSplit;
    const canSplit = hands.length === 1 && hd.cards.length === 2 && cardVal(hd.cards[0]) === cardVal(hd.cards[1]) && C.canAfford(hd.bet);
    actEl.append(
      btn('✂️ Séparer', '', split, !canSplit),
      btn('×2 Doubler', '', doubleDown, !canDouble),
      btn('✋ Rester', '', stand),
      btn('➕ Tirer', 'primary', hit)
    );
  }

  function handLabel(hd) {
    const t = total(hd.cards);
    return t.t > 21 ? 'Bust ' + t.t : (t.soft && t.t < 21 ? t.t + ' / ' + (t.t - 10) : String(t.t));
  }
  function buildHands() {
    handsEl.innerHTML = '';
    hands.forEach((hd, i) => {
      const box = h('div', 'hand' + (i === cur && phase === 'play' && hands.length > 1 ? ' active' : ''));
      box.innerHTML = `<div class="cards"></div><div class="hand-info"><span class="hv"></span><span class="hb"><span class="chip-ico"></span>${fmt(hd.bet)}</span></div>`;
      hd.el = box.querySelector('.cards'); hd.valEl = box.querySelector('.hv'); hd.betEl = box.querySelector('.hb');
      hd.cards.forEach(c => hd.el.appendChild(cardEl(c)));
      hd.valEl.textContent = handLabel(hd);
      handsEl.appendChild(box);
    });
  }
  function setActiveMarker() {
    Array.from(handsEl.children).forEach((b, i) => b.classList.toggle('active', phase === 'play' && hands.length > 1 && i === cur));
  }

  async function giveCard(hd, down) {
    const c = draw();
    hd.cards.push(c);
    if (alive) { hd.el.appendChild(cardEl(c, down)); C.sfx('card'); hd.valEl.textContent = handLabel(hd); }
    await wait(330);
    return c;
  }
  async function giveDealer(down) {
    const c = draw();
    dealer.push(c);
    if (alive) { dealerEl.appendChild(cardEl(c, down)); C.sfx('card'); }
    await wait(330);
    return c;
  }
  function updateDealerVal(hidden) {
    if (!alive) return;
    dealerValEl.textContent = hidden ? '' : '— ' + (total(dealer).t > 21 ? 'Bust ' + total(dealer).t : total(dealer).t);
  }

  async function deal() {
    if (phase !== 'bet') return;
    const bet = bc.get();
    if (!C.take(bet)) return;
    phase = 'dealing'; renderActions();
    dealer = []; hands = [{ cards: [], bet, done: false }]; cur = 0;
    dealerEl.innerHTML = ''; dealerValEl.textContent = ''; msgEl.textContent = '';
    buildHands();
    await giveCard(hands[0]); await giveDealer(false);
    await giveCard(hands[0]); await giveDealer(true);
    const pBJ = isBJ(hands[0].cards), dBJ = isBJ(dealer);
    if (pBJ || dBJ) {
      await reveal();
      const pay = pBJ && dBJ ? bet : pBJ ? Math.round(bet * 2.5) : 0;
      msg(pBJ && dBJ ? 'Égalité : deux blackjacks.' : pBJ ? '🃏 BLACKJACK ! Paie 3:2' : 'Le croupier a un blackjack…', pBJ ? 'win' : '');
      return conclude(pay, bet, { blackjack: pBJ && !dBJ });
    }
    if (!alive) { hands.forEach(x => x.done = true); phase = 'dealer'; return finishRound(); }
    phase = 'play'; msg('À toi de jouer.');
    renderActions(); setActiveMarker();
    if (total(hands[0].cards).t === 21) stand();
  }

  function msg(t, cls) { if (alive) { msgEl.textContent = t; msgEl.className = 'bj-msg ' + (cls || ''); } }

  async function reveal() {
    if (!alive) return;
    const hole = dealerEl.children[1];
    if (hole && hole.classList.contains('back')) {
      const c = dealer[1], nc = cardEl(c, false); nc.classList.remove('deal'); nc.classList.add('flip');
      hole.replaceWith(nc); C.sfx('card');
    }
    updateDealerVal(false);
    await wait(500);
  }

  async function hit() {
    if (phase !== 'play') return;
    const hd = hands[cur]; phase = 'busy'; renderActions();
    await giveCard(hd);
    const t = total(hd.cards).t;
    phase = 'play';
    if (t >= 21 || !alive) { hd.done = true; return nextHand(); }
    renderActions();
  }
  function stand() {
    if (phase !== 'play') return;
    hands[cur].done = true; nextHand();
  }
  async function doubleDown() {
    if (phase !== 'play') return;
    const hd = hands[cur];
    if (!C.take(hd.bet)) return;
    hd.bet *= 2; hd.doubled = true; if (hd.betEl) hd.betEl.innerHTML = `<span class="chip-ico"></span>${fmt(hd.bet)}`;
    phase = 'busy'; renderActions();
    await giveCard(hd);
    hd.done = true; phase = 'play'; nextHand();
  }
  async function split() {
    if (phase !== 'play') return;
    const hd = hands[0];
    if (!C.take(hd.bet)) return;
    phase = 'busy'; renderActions();
    const aces = hd.cards[0].r === 'A';
    const second = { cards: [hd.cards.pop()], bet: hd.bet, done: false, fromAceSplit: aces, split: true };
    hd.split = true; hd.fromAceSplit = aces;
    hands.push(second); cur = 0;
    buildHands(); C.sfx('card');
    await wait(250);
    await giveCard(hands[0]); await giveCard(hands[1]);
    if (aces || !alive) { hands.forEach(x => x.done = true); phase = 'play'; return nextHand(); }
    phase = 'play';
    hands.forEach(x => { if (total(x.cards).t === 21) x.done = true; });
    cur = hands.findIndex(x => !x.done);
    if (cur < 0) return nextHand();
    renderActions(); setActiveMarker();
  }

  function nextHand() {
    const nxt = hands.findIndex(x => !x.done);
    if (nxt >= 0) { cur = nxt; phase = 'play'; renderActions(); setActiveMarker(); return; }
    phase = 'dealer'; renderActions(); finishRound();
  }

  async function finishRound() {
    // le croupier joue si au moins une main n'a pas sauté
    const live = hands.some(x => total(x.cards).t <= 21);
    await reveal();
    if (live) {
      while (total(dealer).t < 17) { await giveDealer(false); updateDealerVal(false); }
    }
    const dt = total(dealer).t;
    let pay = 0, bet = 0, lines = [];
    hands.forEach(hd => {
      const pt = total(hd.cards).t; bet += hd.bet;
      let r;
      if (pt > 21) { r = 'bust'; }
      else if (dt > 21 || pt > dt) { r = 'win'; pay += hd.bet * 2; }
      else if (pt === dt) { r = 'push'; pay += hd.bet; }
      else r = 'lose';
      hd.result = r;
      if (alive && hd.valEl) hd.valEl.textContent = handLabel(hd) + (r === 'win' ? ' ✔ Gagné' : r === 'push' ? ' = Égalité' : ' ✘ Perdu');
      lines.push(r);
    });
    const net = pay - bet;
    msg(net > 0 ? `🎉 Tu gagnes ${fmt(net)} !` : net === 0 ? 'Égalité — ta mise est rendue.' : dt > 21 ? 'Perdu…' : 'Le croupier l’emporte.', net > 0 ? 'win' : '');
    conclude(pay, bet, {});
  }

  function conclude(pay, bet, extra) {
    phase = 'end';
    const r = C.settle({ game: 'blackjack', bet, payout: pay, extra });
    if (!alive) return;
    if (r.bonus || r.cashback) msg(msgEl.textContent + (r.bonus ? ` (bonus +${fmt(r.bonus)})` : ` (cashback +${fmt(r.cashback)})`), msgEl.className.replace('bj-msg ', ''));
    actEl.innerHTML = '';
    actEl.appendChild(btn('NOUVELLE MAIN', 'spin', () => { phase = 'bet'; hands = []; dealer = []; dealerEl.innerHTML = ''; handsEl.innerHTML = ''; dealerValEl.textContent = ''; msg('Place ta mise et distribue !'); renderActions(); }));
  }

  C.registerGame({
    id: 'blackjack', name: 'Blackjack', icon: '🃏', unlock: 2,
    desc: 'Bats le croupier à 21 — double, sépare, blackjack 3:2.', mount, unmount
  });
})();
