/* Royal Fortuna — Roue de la Fortune : un tour gratuit toutes les heures. */
(function () {
  'use strict';
  const C = window.Casino;
  const { h, fmt } = C;
  const S = () => C.S;
  const COOLDOWN = 60 * 60 * 1000;

  const SEGS = [
    { l: '×1', m: 1, w: 20, c: '#c0272d' }, { l: '×2', m: 2, w: 15, c: '#1f6f43' },
    { l: '×0,5', m: 0.5, w: 22, c: '#2a2a35' }, { l: '×5', m: 5, w: 3, c: '#c9a227' },
    { l: '×1,5', m: 1.5, w: 18, c: '#c0272d' }, { l: '+ XP', m: 1, xp: true, w: 10, c: '#3a4fb5' },
    { l: '×3', m: 3, w: 8, c: '#1f6f43' }, { l: '×10', m: 10, w: 1, c: '#c9a227' }
  ];
  let alive = false, spinning = false, rot = 0, timer = null, shown = false;
  let root, cv, btn, info;

  const ready = () => Date.now() >= S().wheelNext;
  function remaining() {
    const ms = Math.max(0, S().wheelNext - Date.now());
    const m = Math.floor(ms / 60000), s = Math.floor(ms % 60000 / 1000);
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  C.wheelReady = ready; C.wheelRemaining = remaining;

  function draw() {
    const W = cv.width, cx = W / 2, R = W / 2 - 8, ctx = cv.getContext('2d'), n = SEGS.length, st = Math.PI * 2 / n;
    ctx.clearRect(0, 0, W, W);
    SEGS.forEach((s, i) => {
      const a0 = i * st - Math.PI / 2, a1 = a0 + st;
      ctx.beginPath(); ctx.moveTo(cx, cx); ctx.arc(cx, cx, R, a0, a1); ctx.closePath();
      ctx.fillStyle = s.c; ctx.fill(); ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); ctx.translate(cx, cx); ctx.rotate(a0 + st / 2);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(s.l, R - 16, 0); ctx.restore();
    });
    ctx.beginPath(); ctx.arc(cx, cx, 26, 0, Math.PI * 2); ctx.fillStyle = '#ffd24a'; ctx.fill();
    ctx.strokeStyle = '#7a5a10'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#7a5a10'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', cx, cx + 1);
  }

  function mount(el) {
    root = el; alive = true; spinning = false; shown = false;
    const page = h('div', 'page game wheelpage');
    page.innerHTML = `<div class="table felt wheel-table"><h2>🎡 Roue de la Fortune</h2>
      <p class="muted">Un tour gratuit toutes les heures. Plus tu montes en niveau, plus les gains sont gros !</p>
      <div class="fortune"><div class="pointer">▼</div><canvas id="fw-cv" width="320" height="320"></canvas></div>
      <div class="bj-msg" id="fw-info"></div><div class="ctl-btns"><button class="btn spin" id="fw-btn">TOURNER</button></div></div>`;
    root.appendChild(page);
    cv = page.querySelector('#fw-cv'); btn = page.querySelector('#fw-btn'); info = page.querySelector('#fw-info');
    cv.style.transform = `rotate(${rot}deg)`;
    draw(); btn.addEventListener('click', spin);
    tick(); timer = setInterval(tick, 500);
  }
  function unmount() { alive = false; clearInterval(timer); }
  function tick() {
    if (!alive || spinning) return;
    if (ready()) { btn.disabled = false; btn.textContent = 'TOURNER'; if (!shown) info.textContent = 'La roue est prête !'; }
    else { btn.disabled = true; btn.textContent = remaining(); if (!shown) info.textContent = 'Prochain tour dans ' + remaining(); }
  }

  function spin() {
    if (spinning || !ready()) return;
    spinning = true; btn.disabled = true; info.className = 'bj-msg'; info.textContent = 'La roue tourne…';
    const total = SEGS.reduce((a, s) => a + s.w, 0);
    let r = Math.random() * total, idx = 0;
    for (let i = 0; i < SEGS.length; i++) { r -= SEGS[i].w; if (r < 0) { idx = i; break; } }
    const seg = SEGS[idx], n = SEGS.length, st = 360 / n;
    const cur = ((rot % 360) + 360) % 360;
    const target = 360 * 6 - (idx + 0.5) * st + (Math.random() - 0.5) * st * 0.7;
    rot = rot - cur + target + 360 * 0;     // angle absolu final
    cv.style.transition = 'transform 4.6s cubic-bezier(.12,.6,.1,1)';
    cv.style.transform = `rotate(${rot}deg)`;
    C.sfx('spin');
    let ticks = 0; const ti = setInterval(() => { if (++ticks > 22) clearInterval(ti); C.sfx('tick'); }, 190);
    S().wheelNext = Date.now() + COOLDOWN; C.save();
    setTimeout(() => {
      spinning = false;
      const base = C.rewardBase() * (1 + 0.2 * S().upgrades.daily);
      const amt = Math.round(base * seg.m / 10) * 10;
      C.giveMoney(amt, true); C.sfx('big'); C.confetti(seg.m >= 3 ? 150 : 60);
      let xpTxt = '';
      if (seg.xp) { const xp = 30 + S().level * 8; C.addXp(xp); xpTxt = ` et ${xp} XP`; }
      S().stats.wheelSpins++; C.Quests.checkAchievements(); C.save(); C.emit('quests');
      if (alive) { shown = true; info.className = 'bj-msg win'; info.innerHTML = `${seg.l} → <b>+${fmt(amt)}</b> jetons${xpTxt} !`; tick(); }
      else C.toast(`🎡 Roue : +${fmt(amt)} jetons${xpTxt}`, 'good');
    }, 4700);
  }

  C.registerGame({
    id: 'wheel', name: 'Roue de la Fortune', icon: '🎡', unlock: 1, free: true,
    desc: 'Un tour gratuit toutes les heures !', mount, unmount
  });
})();
