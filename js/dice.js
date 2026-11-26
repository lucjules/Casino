/* Royal Fortuna — Dés : choisis ta probabilité, plus elle est faible plus le gain est énorme (RTP 98 %). */
(function () {
  'use strict';
  const C = window.Casino;
  const { h, fmt, sleep } = C;

  let alive = false, rolling = false, mode = 'under', target = 50, history = [];
  let root, bc, rangeEl, bigEl, markEl, zoneEl, infoEl, msgEl, rollBtn, histEl;
  const wait = ms => alive ? sleep(ms) : Promise.resolve();

  const chance = () => mode === 'under' ? target : 100 - target;
  const mult = () => 98 / chance();

  function mount(el) {
    root = el; alive = true; rolling = false;
    const page = h('div', 'page game dice');
    page.innerHTML = `<div class="table felt dice-table">
        <div class="dice-big" id="dc-big">—</div>
        <div class="dice-track" id="dc-track"><div class="dice-zone" id="dc-zone"></div><div class="dice-mark" id="dc-mark" hidden></div>
          <div class="dice-scale"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div></div>
        <input type="range" id="dc-range" min="2" max="98" step="1" value="${target}">
        <div class="dice-mode"><button class="btn small" data-m="under">Moins que ${'<b id="dc-t1"></b>'}</button><button class="btn small" data-m="over">Plus que ${'<b id="dc-t2"></b>'}</button></div>
        <div class="dice-info" id="dc-info"></div>
        <div class="bj-msg" id="dc-msg">Règle la probabilité et lance les dés.</div>
        <div class="rl-hist" id="dc-hist"></div>
      </div>
      <div class="controls"><div id="dc-bet"></div><div class="ctl-btns" id="dc-act"></div></div>`;
    root.appendChild(page);
    rangeEl = page.querySelector('#dc-range'); bigEl = page.querySelector('#dc-big'); markEl = page.querySelector('#dc-mark');
    zoneEl = page.querySelector('#dc-zone'); infoEl = page.querySelector('#dc-info'); msgEl = page.querySelector('#dc-msg'); histEl = page.querySelector('#dc-hist');
    bc = C.betControl({ game: 'dice', onChange: update });
    page.querySelector('#dc-bet').appendChild(bc.el);
    rollBtn = h('button', 'btn spin', 'LANCER'); rollBtn.addEventListener('click', roll);
    page.querySelector('#dc-act').appendChild(rollBtn);
    rangeEl.addEventListener('input', () => { target = +rangeEl.value; update(); });
    page.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { if (rolling) return; mode = b.dataset.m; C.sfx('click'); update(); }));
    update(); renderHist();
  }
  function unmount() { alive = false; }

  function update() {
    if (!alive) return;
    root.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('active', b.dataset.m === mode));
    root.querySelector('#dc-t1').textContent = target; root.querySelector('#dc-t2').textContent = target;
    zoneEl.style.cssText = mode === 'under'
      ? `left:0;width:${target}%;` : `left:${target}%;width:${100 - target}%;`;
    const b = bc.get(), m = mult();
    infoEl.innerHTML = `<div><span>Chance de gagner</span><b>${chance()} %</b></div><div><span>Multiplicateur</span><b>×${m.toFixed(2).replace('.', ',')}</b></div><div><span>Gain si victoire</span><b>${fmt(Math.floor(b * m))}</b></div>`;
  }
  function renderHist() {
    histEl.innerHTML = history.slice(-12).reverse().map(x => `<span class="hn ${x.win ? 'green2' : 'red'}">${x.roll.toFixed(0)}</span>`).join('') || '<span class="muted">Aucun lancer</span>';
  }

  async function roll() {
    if (rolling) return;
    const bet = bc.get();
    if (!C.take(bet)) return;
    rolling = true; bc.lock(true); rollBtn.disabled = true; rangeEl.disabled = true;
    root.querySelectorAll('[data-m]').forEach(b => b.disabled = true);
    const T = target, M = mode, ch = chance(), mu = mult();
    const val = C.rand(10000) / 100;
    const win = M === 'under' ? val < T : val >= T;
    bigEl.className = 'dice-big'; msgEl.className = 'bj-msg'; msgEl.textContent = 'Les dés roulent…';
    if (alive) {
      markEl.hidden = false;
      const t0 = performance.now(), dur = 1300;
      C.sfx('spin');
      await new Promise(res => (function f(t) {
        if (!alive) return res();
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        const shown = k < 1 ? Math.random() * 100 : val;
        bigEl.textContent = shown.toFixed(2);
        markEl.style.left = (k < 1 ? (Math.random() * 0.08 + e) * val : val) + '%';
        if (k < 1) requestAnimationFrame(f); else res();
      })(t0));
      markEl.style.left = val + '%';
      bigEl.textContent = val.toFixed(2); bigEl.classList.add(win ? 'win' : 'lose');
    }
    const pay = win ? Math.floor(bet * mu) : 0;
    const r = C.settle({ game: 'dice', bet, payout: pay, extra: { chance: ch } });
    history.push({ roll: val, win }); if (history.length > 30) history.shift();
    if (alive) {
      renderHist();
      if (win) { msgEl.className = 'bj-msg win'; msgEl.textContent = `Gagné ! ${val.toFixed(2)} ${M === 'under' ? '<' : '≥'} ${T} — +${fmt(r.net)}`; }
      else { msgEl.className = 'bj-msg'; msgEl.textContent = `Perdu : ${val.toFixed(2)} n'est pas ${M === 'under' ? 'inférieur à' : 'supérieur ou égal à'} ${T}.` + (r.cashback ? ` (cashback ${fmt(r.cashback)})` : ''); }
      rolling = false; bc.lock(false); rollBtn.disabled = false; rangeEl.disabled = false;
      root.querySelectorAll('[data-m]').forEach(b => b.disabled = false);
      update();
    } else rolling = false;
  }

  C.registerGame({
    id: 'dice', name: 'Dés', icon: '🎲', unlock: 7,
    desc: 'Choisis ta chance de gagner : de 2 % (×49) à 98 %.', mount, unmount
  });
})();
