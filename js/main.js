/* Royal Fortuna — navigation, lobby, démarrage. */
(function () {
  'use strict';
  const C = window.Casino;
  const { $, $$, h, fmt, esc } = C;
  const S = () => C.S;

  const view = $('#view');
  let current = null;   // jeu actuellement monté

  const PAGES = ['lobby', 'quests', 'shop', 'profile'];

  function go(name) {
    if (location.hash !== '#/' + name) { location.hash = '#/' + name; return; }
    route();
  }

  function route() {
    const name = (location.hash.replace('#/', '') || 'lobby');
    if (current && current.unmount) { try { current.unmount(); } catch (e) { console.error(e); } }
    current = null;
    view.innerHTML = '';
    window.scrollTo(0, 0);
    const game = C.games.find(g => g.id === name);
    if (game) {
      if (!C.isUnlocked(game)) { C.toast(`🔒 « ${game.name} » se débloque au niveau ${game.unlock}.`); location.hash = '#/lobby'; return; }
      current = game; game.mount(view);
    } else if (name === 'quests') C.Quests.render(view);
    else if (name === 'shop') C.Shop.renderShop(view);
    else if (name === 'profile') C.Shop.renderProfile(view);
    else renderLobby();
    $$('#nav [data-go]').forEach(b => b.classList.toggle('active', b.dataset.go === name || (name === 'lobby' && b.dataset.go === 'lobby') || (game && b.dataset.go === 'lobby')));
    document.body.dataset.view = name;
    updateBadge();
  }

  function updateBadge() {
    const n = C.Quests.claimable();
    const b = $('#badge-quests');
    if (b) { b.textContent = n; b.hidden = n === 0; }
  }

  /* ------------------------------------------------------------ lobby */
  function renderLobby() {
    const s = S();
    const page = h('div', 'page lobby');
    const st = s.story, ch = C.Quests.CHAPTERS[st.cur];
    const hero = h('section', 'hero');
    hero.innerHTML = `<div><h1>Bienvenue, ${esc(s.name || 'Invité')} !</h1>
      <p>${C.rankName(s.level)} · Niveau ${s.level} · Mise maximale <b>${fmt(C.maxBet())}</b> <span class="chip-ico"></span></p></div>`;
    const next = h('div', 'hero-quest');
    if (ch) {
      const unlocked = s.level >= ch.minLevel;
      next.innerHTML = `<small>${unlocked ? '📖 Chapitre en cours' : '🔒 Prochain chapitre (niveau ' + ch.minLevel + ')'}</small><b>${st.cur + 1}. ${ch.title}</b>`;
    } else next.innerHTML = '<small>📖 Histoire</small><b>Terminée — tu es une Légende !</b>';
    next.addEventListener('click', () => go('quests'));
    hero.appendChild(next);
    page.appendChild(hero);

    const grid = h('div', 'game-grid');
    C.games.forEach(g => {
      const ok = C.isUnlocked(g);
      const card = h('button', 'gcard g-' + g.id + (ok ? '' : ' locked'));
      let extra = '';
      if (g.id === 'slots') {
        const E = window.SlotsEngine; const n = E.ORDER.filter(id => s.level >= E.MACHINES[id].level).length;
        extra = `<span class="tag">${n} / ${E.ORDER.length} machines</span>`;
      }
      if (g.id === 'wheel') extra = `<span class="tag wheel-tag">${C.wheelReady() ? '🎁 Prête !' : '⏳ ' + C.wheelRemaining()}</span>`;
      card.innerHTML = `<span class="gicon">${ok ? g.icon : '🔒'}</span><b>${g.name}</b><span class="gdesc">${g.desc}</span>${extra}${ok ? '' : `<span class="lock">Niveau ${g.unlock}</span>`}`;
      card.addEventListener('click', () => { if (ok) { C.sfx('click'); go(g.id); } else { C.sfx('lose'); C.toast(`🔒 Niveau ${g.unlock} requis (tu es niveau ${s.level}).`); } });
      grid.appendChild(card);
    });
    page.appendChild(grid);

    // prochains déblocages
    const upcoming = [];
    for (let l = s.level + 1; l <= Math.min(C.MAX_LEVEL, s.level + 12) && upcoming.length < 3; l++) {
      const u = C.unlocksAt(l).filter(x => !x.startsWith('💰'));
      if (u.length) upcoming.push({ l, u });
    }
    if (upcoming.length) {
      const up = h('section', 'panel upcoming');
      up.innerHTML = '<h3>🔓 À venir</h3>' + upcoming.map(x => `<div class="up-row"><b>Niveau ${x.l}</b><span>${x.u.join(' · ')}</span></div>`).join('');
      page.appendChild(up);
    }
    view.appendChild(page);
  }

  /* ------------------------------------------------------------ démarrage */
  async function init() {
    const had = C.load();
    C.applyTheme();
    // anciennes sauvegardes / sécurité
    if (!S().story.started && had && S().stats.rounds > 0) S().story.started = true;
    C.Quests.ensureDaily();
    C.setSound(S().settings.sound);
    C.updateHud();

    $$('#nav [data-go]').forEach(b => b.addEventListener('click', () => { C.ensureAudio(); C.sfx('click'); go(b.dataset.go); }));
    $('#brand').addEventListener('click', () => go('lobby'));
    $('#btn-sound').addEventListener('click', () => { C.ensureAudio(); C.setSound(!S().settings.sound); C.sfx('click'); });
    window.addEventListener('hashchange', route);
    document.addEventListener('visibilitychange', () => { if (document.hidden) C.saveNow(); });
    document.addEventListener('click', () => C.ensureAudio(), { once: true });
    C.on('quests', updateBadge);
    C.on('levelup', () => { if (document.body.dataset.view === 'lobby') route(); });
    C.on('shop', () => { if (document.body.dataset.view === 'shop') C.Shop.renderShop(view); });
    C.on('quests', () => { if (document.body.dataset.view === 'quests') C.Quests.render(view); });
    setInterval(() => {   // compte à rebours de la roue dans le lobby
      const t = $('.wheel-tag');
      if (t) t.textContent = C.wheelReady() ? '🎁 Prête !' : '⏳ ' + C.wheelRemaining();
    }, 1000);

    route();
    await C.Quests.prologue();
    if (document.body.dataset.view === 'lobby') route();   // affiche le nom choisi
    await C.Quests.loginBonus();
    C.Quests.checkIntro();
    C.checkRescue();
  }

  C.go = go;
  document.addEventListener('DOMContentLoaded', init);
})();
