/* Royal Fortuna — boutique (améliorations, thèmes, Prestige) et profil. */
(function () {
  'use strict';
  const C = window.Casino;
  const { h, fmt, esc } = C;
  const S = () => C.S;

  const UPGRADES = [
    { id: 'xp', icon: '🎓', name: 'Mentor VIP', max: 10, base: 1000, growth: 1.8, desc: lv => `+8 % d'XP par niveau (actuel : +${lv * 8} %)` },
    { id: 'luck', icon: '🍀', name: "Trèfle d'or", max: 10, base: 2000, growth: 1.9, desc: lv => `+1 % sur tous tes gains par niveau (actuel : +${lv} %)` },
    { id: 'cash', icon: '🛟', name: 'Cashback VIP', max: 8, base: 3000, growth: 1.9, desc: lv => `Récupère 1 % de tes pertes par niveau (actuel : ${lv} %)` },
    { id: 'daily', icon: '📅', name: 'Carte de fidélité', max: 5, base: 1500, growth: 2, desc: lv => `+20 % sur quêtes, roue et bonus quotidien (actuel : +${lv * 20} %)` }
  ];
  const THEMES = [
    { id: 'vert', name: 'Tapis vert', price: 0, swatch: '#0f5a3a' },
    { id: 'bordeaux', name: 'Bordeaux', price: 3000, swatch: '#6b1426' },
    { id: 'nuit', name: 'Nuit bleue', price: 8000, swatch: '#13305c' },
    { id: 'noir', name: 'Noir & Or', price: 25000, swatch: '#1c1c22' }
  ];
  const cost = (u, lv) => Math.round(u.base * Math.pow(u.growth, lv));

  function buyUpgrade(u) {
    const s = S(), lv = s.upgrades[u.id];
    if (lv >= u.max) return;
    const c = cost(u, lv);
    if (!C.take(c)) return;
    s.upgrades[u.id]++;
    C.sfx('coin'); C.toast(`${u.name} niveau ${lv + 1} !`, 'good'); C.save(); C.updateHud(); C.emit('shop');
  }
  function buyTheme(t) {
    const s = S();
    if (!s.themesOwned.includes(t.id)) {
      if (!C.take(t.price)) return;
      s.themesOwned.push(t.id); C.sfx('coin'); C.toast(`Thème « ${t.name} » acheté !`, 'good');
      C.Quests.checkAchievements();
    }
    s.theme = t.id; C.applyTheme(); C.save(); C.emit('shop');
  }

  async function doPrestige() {
    const s = S();
    if (s.level < 25) return;
    const stars = s.prestige + 1;
    const ok = await C.confirmBox('👑 Prestige',
      `Tu repars de zéro (niveau 1, 1 000 jetons, améliorations remises à zéro) mais tu gagnes <b>une étoile</b> : <b>+5 % d'XP</b> et <b>+2 % de gains</b> en permanence (étoiles après : ${stars}). Tes succès, thèmes et statistiques sont conservés. Continuer ?`,
      'Passer au Prestige', 'Pas maintenant');
    if (!ok) return;
    s.prestige = stars; s.level = 1; s.xp = 0; s.money = 1000;
    s.upgrades = { xp: 0, luck: 0, cash: 0, daily: 0 };
    s.betIdx = {}; s.daily = { day: '', list: [] };
    C.Quests.ensureDaily();
    C.sfx('levelup'); C.confetti(200); C.updateHud(); C.save();
    C.Quests.checkAchievements();
    C.emit('levelup'); C.emit('money'); C.emit('quests'); C.emit('shop');
    C.modal({ title: '👑 Prestige !', body: `<p class="center">Tu as maintenant <b>${stars} étoile${stars > 1 ? 's' : ''}</b>. Un nouveau départ glorieux t'attend !</p>`, buttons: [{ label: 'C’est parti', kind: 'primary' }] });
  }

  function renderShop(root) {
    const s = S();
    root.innerHTML = '';
    const wrap = h('div', 'page shop');
    const up = h('section', 'panel');
    up.innerHTML = '<h2>🛍️ Améliorations permanentes</h2><p class="muted">Achète-les avec tes jetons. Elles restent actives jusqu’au Prestige.</p>';
    UPGRADES.forEach(u => {
      const lv = s.upgrades[u.id], maxed = lv >= u.max, c = cost(u, lv);
      const row = h('div', 'upg');
      const pips = Array.from({ length: u.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
      row.innerHTML = `<span class="upg-ico">${u.icon}</span><div class="upg-main"><b>${u.name}</b> <span class="muted">niv. ${lv}/${u.max}</span>
        <div class="muted">${u.desc(lv)}</div><div class="pips">${pips}</div></div>`;
      const b = h('button', 'btn ' + (maxed ? '' : 'primary'), maxed ? 'MAX' : `${fmt(c)} <span class="chip-ico"></span>`);
      b.disabled = maxed || s.money < c;
      b.addEventListener('click', () => buyUpgrade(u));
      row.appendChild(b); up.appendChild(row);
    });
    wrap.appendChild(up);

    const th = h('section', 'panel');
    th.innerHTML = '<h2>🎨 Thèmes du casino</h2>';
    const grid = h('div', 'themes');
    THEMES.forEach(t => {
      const own = s.themesOwned.includes(t.id), cur = s.theme === t.id;
      const card = h('div', 'theme' + (cur ? ' cur' : ''));
      card.innerHTML = `<div class="swatch" style="background:${t.swatch}"></div><b>${t.name}</b>`;
      const b = h('button', 'btn small ' + (own ? '' : 'primary'), cur ? 'Actif' : own ? 'Appliquer' : `${fmt(t.price)} <span class="chip-ico"></span>`);
      b.disabled = cur || (!own && s.money < t.price);
      b.addEventListener('click', () => buyTheme(t));
      card.appendChild(b); grid.appendChild(card);
    });
    th.appendChild(grid); wrap.appendChild(th);

    const pr = h('section', 'panel prestige');
    const can = s.level >= 25;
    pr.innerHTML = `<h2>👑 Prestige ${s.prestige ? '<span class="stars">' + '★'.repeat(Math.min(s.prestige, 10)) + '</span>' : ''}</h2>
      <p>Atteins le <b>niveau 25</b> puis recommence avec une étoile de gloire : <b>+5 % d'XP</b> et <b>+2 % de gains</b> permanents par étoile.</p>
      <p class="muted">${can ? 'Tu peux passer au Prestige !' : `Niveau actuel : ${s.level} / 25`}</p>`;
    const pb = h('button', 'btn gold', 'Passer au Prestige'); pb.disabled = !can;
    pb.addEventListener('click', doPrestige);
    pr.appendChild(pb); wrap.appendChild(pr);
    root.appendChild(wrap);
  }

  /* ------------------------------------------------------------ profil */
  function exportSave() {
    C.saveNow();
    return btoa(unescape(encodeURIComponent(JSON.stringify(S()))));
  }
  function importSave(txt) {
    try {
      const obj = JSON.parse(decodeURIComponent(escape(atob(txt.trim()))));
      if (typeof obj.money !== 'number' || typeof obj.level !== 'number') throw new Error('invalide');
      window.__noSave = true;
      localStorage.setItem('royal-fortuna-save-v1', JSON.stringify(obj));
      location.reload();
    } catch (e) { C.toast('Code de sauvegarde invalide.', 'bad'); }
  }

  function renderProfile(root) {
    const s = S(), st = s.stats;
    root.innerHTML = '';
    const wrap = h('div', 'page profile');
    const net = st.won - st.wagered;
    const p = h('section', 'panel');
    p.innerHTML = `<h2>👤 ${esc(s.name || 'Invité')}</h2>
      <div class="stat-grid">
        <div><span>Niveau</span><b>${s.level}</b></div>
        <div><span>Rang</span><b>${C.rankName(s.level)}${s.prestige ? ' ' + '★'.repeat(Math.min(s.prestige, 5)) : ''}</b></div>
        <div><span>Jetons</span><b>${fmt(s.money)}</b></div>
        <div><span>Record de fortune</span><b>${C.fmtShort(st.bank)}</b></div>
        <div><span>Manches jouées</span><b>${fmt(st.rounds)}</b></div>
        <div><span>Manches gagnées</span><b>${fmt(st.wins)} (${st.rounds ? Math.round(st.wins / st.rounds * 100) : 0} %)</b></div>
        <div><span>Total misé</span><b>${C.fmtShort(st.wagered)}</b></div>
        <div><span>Bilan net</span><b class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${C.fmtShort(net)}</b></div>
        <div><span>Plus gros gain</span><b>${C.fmtShort(st.biggest)}</b></div>
        <div><span>Meilleur multiplicateur</span><b>×${Math.round(st.biggestMult * 10) / 10}</b></div>
        <div><span>Meilleure série</span><b>${st.bestStreak}</b></div>
        <div><span>Mise maximale</span><b>${C.fmtShort(C.maxBet())}</b></div>
      </div>`;
    wrap.appendChild(p);

    const ach = h('section', 'panel'); C.Quests.renderAchievements(ach); wrap.appendChild(ach);

    const opt = h('section', 'panel');
    opt.innerHTML = `<h3>⚙️ Options & sauvegarde</h3>
      <p class="muted">La partie est sauvegardée automatiquement dans ton navigateur. Tout l'argent est fictif.</p>
      <div class="opt-row"><button class="btn" id="o-sound">${s.settings.sound ? '🔊 Sons activés' : '🔇 Sons coupés'}</button>
      <button class="btn" id="o-name">✏️ Changer de nom</button>
      <button class="btn" id="o-export">📤 Exporter la sauvegarde</button>
      <button class="btn" id="o-import">📥 Importer</button>
      <button class="btn danger" id="o-reset">🗑️ Tout effacer</button></div>
      <textarea id="o-box" class="savebox" rows="3" placeholder="Code de sauvegarde (export / import)" hidden></textarea>`;
    wrap.appendChild(opt);
    root.appendChild(wrap);

    const box = opt.querySelector('#o-box');
    opt.querySelector('#o-sound').addEventListener('click', e => { C.setSound(!s.settings.sound); e.target.textContent = s.settings.sound ? '🔊 Sons activés' : '🔇 Sons coupés'; });
    opt.querySelector('#o-name').addEventListener('click', async () => {
      const r = await C.modal({
        title: '✏️ Ton nom', body: `<label class="field">Nom du joueur<input id="in-name2" maxlength="16" value="${esc(s.name)}"></label>`,
        buttons: [{ label: 'Annuler', value: false }, { label: 'Enregistrer', kind: 'primary', value: true }], collect: b => b.querySelector('#in-name2').value.trim()
      });
      if (r.value && r.data) { s.name = r.data; C.save(); C.updateHud(); renderProfile(root); }
    });
    opt.querySelector('#o-export').addEventListener('click', () => {
      box.hidden = false; box.value = exportSave(); box.select();
      try { navigator.clipboard && navigator.clipboard.writeText(box.value); C.toast('Code copié dans le presse-papiers.', 'good'); } catch (e) { /* ignore */ }
    });
    opt.querySelector('#o-import').addEventListener('click', () => {
      if (box.hidden || !box.value.trim()) { box.hidden = false; box.value = ''; box.focus(); C.toast('Colle ton code puis re-clique sur « Importer ».'); return; }
      importSave(box.value);
    });
    opt.querySelector('#o-reset').addEventListener('click', async () => {
      if (await C.confirmBox('🗑️ Tout effacer ?', 'Cette action supprime définitivement ta progression (niveau, jetons, succès…).', 'Tout effacer', 'Annuler')) {
        window.__noSave = true; localStorage.removeItem('royal-fortuna-save-v1'); location.reload();
      }
    });
  }

  C.Shop = { renderShop, renderProfile, UPGRADES, THEMES };
})();
