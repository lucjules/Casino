/* Royal Fortuna — machines à sous (UI). Le moteur est dans slots-engine.js */
(function () {
  'use strict';
  const C = window.Casino, E = window.SlotsEngine;
  const { h, fmt, sleep } = C;
  const S = () => C.S;

  let alive = false, busy = false, auto = false, turbo = false;
  let root, m, bc, reelsEl, stripEls = [], grid = null, bannerEl, spinBtn, autoBtn, fsEl, onKey, mid;

  function cellHTML(sym) {
    const cls = sym.wild ? ' wild' : sym.scatter ? ' scatter' : '';
    return `<div class="cell${cls}"><span>${sym.c}</span></div>`;
  }
  function randomGrid() {
    return Array.from({ length: m.reels }, () => Array.from({ length: 3 }, () => m.symbols[C.rand(m.symbols.length)]));
  }

  function machineUnlocked(id) { return S().level >= E.MACHINES[id].level; }

  function mount(el) {
    root = el; alive = true; busy = false; auto = false;
    const s = S();
    mid = s.settings.machine && machineUnlocked(s.settings.machine) ? s.settings.machine : 'fruits';
    build();
    onKey = e => {
      if (e.code === 'Space' && alive && !document.querySelector('.overlay') && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        e.preventDefault(); document.activeElement.blur(); if (auto) stopAuto(); else play();
      }
    };
    document.addEventListener('keydown', onKey);
  }
  function unmount() {
    alive = false; auto = false;
    document.removeEventListener('keydown', onKey);
  }

  function build() {
    m = E.MACHINES[mid];
    root.innerHTML = '';
    const page = h('div', 'page game slots');

    // sélecteur de machine
    const tabs = h('div', 'machine-tabs');
    E.ORDER.forEach(id => {
      const mm = E.MACHINES[id], ok = machineUnlocked(id);
      const t = h('button', 'mtab' + (id === mid ? ' active' : '') + (ok ? '' : ' locked'),
        `<span class="mi">${ok ? mm.icon : '🔒'}</span><b>${mm.name}</b><small>${ok ? mm.reels + ' rouleaux' : 'Niveau ' + mm.level}</small>`);
      t.addEventListener('click', () => {
        if (busy) { C.toast('Attends la fin du tour en cours.'); return; }
        if (!ok) { C.toast(`🔒 « ${mm.name} » se débloque au niveau ${mm.level}.`); return; }
        mid = id; S().settings.machine = id; C.save(); C.sfx('click'); build();
      });
      tabs.appendChild(t);
    });
    page.appendChild(tabs);

    // cabinet
    const cab = h('div', 'cabinet');
    cab.style.setProperty('--m1', m.colors[0]); cab.style.setProperty('--m2', m.colors[1]);
    cab.innerHTML = `<div class="cab-title">${m.icon} ${m.name} ${m.icon}</div><div class="cab-sub">${m.tagline}</div>`;
    fsEl = h('div', 'fs-info'); fsEl.hidden = true; cab.appendChild(fsEl);
    reelsEl = h('div', 'reels r' + m.reels);
    cab.appendChild(reelsEl);
    bannerEl = h('div', 'slot-banner', 'Fais tourner les rouleaux !');
    cab.appendChild(bannerEl);
    page.appendChild(cab);
    grid = randomGrid(); stripEls = [];
    for (let r = 0; r < m.reels; r++) {
      const reel = h('div', 'reel'), strip = h('div', 'strip');
      strip.innerHTML = grid[r].map(cellHTML).join('');
      reel.appendChild(strip); reelsEl.appendChild(reel); stripEls.push(strip);
    }

    // commandes
    const ctl = h('div', 'controls');
    bc = C.betControl({ game: 'slots' });
    ctl.appendChild(bc.el);
    const btns = h('div', 'ctl-btns');
    spinBtn = h('button', 'btn spin', 'TOURNER');
    autoBtn = h('button', 'btn', '⟳ Auto');
    const turboBtn = h('button', 'btn' + (turbo ? ' active' : ''), '⚡ Turbo');
    const payBtn = h('button', 'btn', '📋 Gains');
    spinBtn.addEventListener('click', () => { if (auto) { stopAuto(); return; } play(); });
    autoBtn.addEventListener('click', () => { if (auto) stopAuto(); else startAuto(); });
    turboBtn.addEventListener('click', () => { turbo = !turbo; turboBtn.classList.toggle('active', turbo); C.sfx('click'); });
    payBtn.addEventListener('click', showPaytable);
    btns.append(payBtn, turboBtn, autoBtn, spinBtn);
    ctl.appendChild(btns);
    page.appendChild(ctl);
    page.appendChild(h('p', 'hint', `Astuce : appuie sur <kbd>Espace</kbd> pour tourner. ${m.fs ? 'Trouve 3 symboles Scatter (' + m.symbols.find(x => x.scatter).c + ') pour déclencher des tours gratuits ×' + m.fsMult + ' !' : 'Le trèfle 🍀 est un Wild : il remplace tous les symboles.'}`));
    root.appendChild(page);
  }

  function showPaytable() {
    const trim = v => (Math.round(v * 100) / 100).toString().replace('.', ',');
    const rows = m.symbols.map(s => {
      if (s.scatter) {
        return `<tr><td class="sy">${s.c}</td><td colspan="3">Scatter — ${Object.keys(m.scatterPay).map(k => `${k}× : ×${trim(m.scatterPay[k])} + ${m.fs[k]} tours gratuits`).join(' · ')}</td></tr>`;
      }
      const ks = [3, 4, 5].filter(k => s.pay[k] != null && k <= m.reels);
      return `<tr><td class="sy">${s.c}${s.wild ? '<small>WILD</small>' : ''}</td>${[3, 4, 5].map(k => `<td>${ks.includes(k) ? '×' + trim(s.pay[k] / m.lines) : '—'}</td>`).join('')}</tr>`;
    }).join('');
    C.modal({
      title: `📋 ${m.name} — table des gains`,
      cls: 'wide',
      body: `<p class="muted">Gains par ligne gagnante, en multiple de ta mise totale (alignement de gauche à droite, ${m.lines} lignes). Le Wild remplace tous les symboles${m.fs ? ' sauf le Scatter' : ''}. ${m.fs ? 'Pendant les tours gratuits, tous les gains sont multipliés par ' + m.fsMult + '.' : ''}</p>
        <table class="paytable"><thead><tr><th></th><th>×3</th><th>×4</th><th>×5</th></tr></thead><tbody>${rows}</tbody></table>`,
      buttons: [{ label: 'Fermer', kind: 'primary' }], dismissable: true
    });
  }

  function startAuto() { auto = true; autoBtn.classList.add('active'); autoBtn.textContent = '■ Stop'; spinBtn.textContent = 'STOP'; if (!busy) play(); }
  function stopAuto() { auto = false; if (autoBtn) { autoBtn.classList.remove('active'); autoBtn.textContent = '⟳ Auto'; } if (spinBtn) spinBtn.textContent = 'TOURNER'; }

  const wait = ms => alive ? sleep(turbo ? ms * 0.35 : ms) : Promise.resolve();

  async function animateSpin(result) {
    const prev = grid;
    grid = result.grid;
    if (!alive) return;
    C.sfx('spin');
    const cellH = stripEls[0].querySelector('.cell').offsetHeight || 80;
    const anims = [];
    stripEls.forEach((strip, r) => {
      const n = 6 + r * 3;
      let html = result.grid[r].map(cellHTML).join('');
      for (let i = 0; i < n; i++) html += cellHTML(m.symbols[C.rand(m.symbols.length)]);
      html += prev[r].map(cellHTML).join('');
      strip.innerHTML = html;
      strip.classList.add('spinning');
      const total = n + 6;
      const dur = (700 + r * 280) * (turbo ? 0.4 : 1);
      const a = strip.animate(
        [{ transform: `translateY(-${(total - 3) * cellH}px)` }, { transform: 'translateY(0)' }],
        { duration: dur, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
      anims.push(a.finished.then(() => {
        a.cancel(); strip.classList.remove('spinning');
        strip.innerHTML = result.grid[r].map(cellHTML).join('');
        C.sfx('stop');
      }).catch(() => { strip.classList.remove('spinning'); strip.innerHTML = result.grid[r].map(cellHTML).join(''); }));
    });
    await Promise.all(anims);
  }

  function highlight(result, mult) {
    stripEls.forEach(s => s.querySelectorAll('.cell').forEach(c => c.classList.remove('win')));
    const mark = (r, y) => { const c = stripEls[r] && stripEls[r].children[y]; if (c) c.classList.add('win'); };
    result.wins.forEach(w => w.cells.forEach(([r, y]) => mark(r, y)));
    if (result.scatterCells.length >= 3) result.scatterCells.forEach(([r, y]) => mark(r, y));
  }
  function clearHighlight() { stripEls.forEach(s => s.querySelectorAll('.cell').forEach(c => c.classList.remove('win'))); }

  function setBanner(html, cls) { if (bannerEl) { bannerEl.className = 'slot-banner ' + (cls || ''); bannerEl.innerHTML = html; } }

  async function play() {
    if (busy || !alive) return;
    const bet = bc.get();
    if (!C.take(bet)) { stopAuto(); return; }
    busy = true; bc.lock(true); clearHighlight();
    spinBtn.disabled = !auto; spinBtn.textContent = auto ? 'STOP' : '…';
    setBanner('Les rouleaux tournent…');
    const machine = m;
    let extra = {}, total = 0;
    try {
      const res = E.spin(machine);
      await animateSpin(res);
      total = Math.round(bet * res.mult);
      if (alive) highlight(res);
      if (res.mult > 0) {
        setBanner(`Gain : <b>+${fmt(total)}</b>${res.wins.length ? ` <small>(${res.wins.length} ligne${res.wins.length > 1 ? 's' : ''})</small>` : ''}`, 'win');
        C.sfx(res.mult >= 3 ? 'win' : 'coin');
      } else setBanner('Pas de gain… tente encore !');
      await wait(res.mult > 0 ? 900 : 250);

      if (res.fs) {
        extra.freespins = true;
        let left = res.fs, done = 0, fsWin = 0;
        if (alive) { fsEl.hidden = false; }
        setBanner(`🎁 <b>${res.fs} TOURS GRATUITS</b> ×${machine.fsMult} !`, 'fs');
        C.sfx('big'); C.confetti(80);
        await wait(1500);
        while (left > 0 && done < 80) {
          left--; done++;
          if (alive) fsEl.innerHTML = `🎁 Tours gratuits : <b>${left}</b> restants — gains : <b>${fmt(fsWin)}</b>`;
          clearHighlight();
          const r2 = E.spin(machine);
          await animateSpin(r2);
          const w = Math.round(bet * r2.mult * machine.fsMult);
          fsWin += w;
          if (alive) highlight(r2);
          if (r2.fs) { left += r2.fs; setBanner(`➕ <b>${r2.fs}</b> tours gratuits supplémentaires !`, 'fs'); C.sfx('big'); }
          else if (w > 0) { setBanner(`+${fmt(w)}`, 'win'); C.sfx('coin'); }
          else setBanner('…');
          if (alive) fsEl.innerHTML = `🎁 Tours gratuits : <b>${left}</b> restants — gains : <b>${fmt(fsWin)}</b>`;
          await wait(w > 0 ? 800 : 350);
        }
        total += fsWin;
        if (alive) fsEl.hidden = true;
      }
    } catch (err) { console.error(err); }

    const r = C.settle({ game: 'slots', machine: machine.id, bet, payout: total, extra });
    if (alive) {
      if (total > 0) setBanner(`Total : <b>+${fmt(r.total)}</b>${r.bonus ? ` <small>(dont bonus ${fmt(r.bonus)})</small>` : ''}`, 'win');
      else setBanner(r.cashback ? `Perdu — cashback ${fmt(r.cashback)}` : 'Perdu… la prochaine sera la bonne !');
      busy = false; bc.lock(false); spinBtn.disabled = false;
      if (!auto) spinBtn.textContent = 'TOURNER';
    } else { busy = false; }
    if (auto && alive) {
      if (!C.canAfford(bc.get())) { stopAuto(); return; }
      await wait(r.mult >= 3 ? 1200 : 500);
      if (auto && alive) play();
    }
  }

  C.registerGame({
    id: 'slots', name: 'Machines à sous', icon: '🎰', unlock: 1,
    desc: '5 machines à débloquer, wilds et tours gratuits.', mount, unmount
  });
})();
