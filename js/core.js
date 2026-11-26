/* Royal Fortuna — noyau : état, sauvegarde, niveaux, mises, modales, sons, effets. Tout l'argent est fictif. */
(function (global) {
  'use strict';

  const SAVE_KEY = 'royal-fortuna-save-v1';
  const BET_STEPS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000,
    100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000];
  const RANKS = [[1, 'Novice'], [3, 'Joueur'], [6, 'Habitué'], [10, 'Flambeur'], [15, 'High Roller'], [20, 'VIP'], [25, 'Légende']];
  const MAX_LEVEL = 100;

  /* ------------------------------------------------------------ utilitaires */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  function h(tag, cls, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    return el;
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rand = n => Math.floor(Math.random() * n);
  const pick = arr => arr[rand(arr.length)];
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1);[a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function fmt(n) { return Math.round(n).toLocaleString('fr-FR'); }
  function fmtShort(n) {
    n = Math.round(n);
    if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2).replace('.', ',') + ' Bn';
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2).replace('.', ',') + ' Md';
    if (Math.abs(n) >= 1e7) return (n / 1e6).toFixed(1).replace('.', ',') + ' M';
    return fmt(n);
  }
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  /* ------------------------------------------------------------ état */
  function defaultState() {
    return {
      v: 1, name: '', money: 1000, xp: 0, level: 1, prestige: 0,
      upgrades: { xp: 0, luck: 0, cash: 0, daily: 0 },
      theme: 'vert', themesOwned: ['vert'],
      stats: {
        rounds: 0, wins: 0, wagered: 0, won: 0, biggest: 0, biggestMult: 0, streak: 0, bestStreak: 0,
        maxLevel: 1, blackjacks: 0, straights: 0, royals: 0, freespins: 0, wheelSpins: 0,
        byGame: {}, bank: 1000
      },
      betIdx: {},
      story: { cur: 0, prog: {}, introSeen: {}, claimedIdx: -1, started: false },
      daily: { day: '', list: [] },
      achievements: {},
      login: { last: '', streak: 0 },
      wheelNext: 0,
      settings: { sound: true },
      created: Date.now()
    };
  }
  function deepMerge(base, src) {
    if (!src || typeof src !== 'object') return base;
    for (const k of Object.keys(base)) {
      if (src[k] === undefined) continue;
      if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) deepMerge(base[k], src[k]);
      else base[k] = src[k];
    }
    // clés dynamiques (ex. stats.byGame, betIdx, achievements, story.prog)
    for (const k of ['byGame', 'betIdx', 'achievements', 'prog', 'introSeen']) {
      if (src[k] && typeof src[k] === 'object') base[k] = src[k];
    }
    return base;
  }
  let S = defaultState();
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const src = JSON.parse(raw);
        S = deepMerge(defaultState(), src);
        if (src.story) S.story = Object.assign(defaultState().story, src.story);
        if (src.daily) S.daily = src.daily;
        if (src.themesOwned) S.themesOwned = src.themesOwned;
        return true;
      }
    } catch (e) { console.warn('Sauvegarde illisible', e); }
    return false;
  }
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 150);
  }
  function saveNow() {
    if (global.__noSave) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* stockage plein ou bloqué */ }
  }
  global.addEventListener && global.addEventListener('beforeunload', saveNow);

  /* ------------------------------------------------------------ bus d'événements */
  const listeners = {};
  function on(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
    return () => { const a = listeners[evt]; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); };
  }
  function emit(evt, data) { (listeners[evt] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }

  /* ------------------------------------------------------------ niveaux & progression */
  const xpNeeded = lvl => Math.round(60 + 40 * lvl + 4 * lvl * lvl);
  const levelReward = lvl => Math.round(150 * Math.pow(1.22, lvl) / 10) * 10;
  function maxBetIdx(level) {
    level = level == null ? S.level : level;
    return Math.min(BET_STEPS.length - 1, 3 + Math.floor((level - 1) / 1.5));
  }
  const maxBet = level => BET_STEPS[maxBetIdx(level)];
  function rankName(level) {
    let name = RANKS[0][1];
    for (const [l, n] of RANKS) if (level >= l) name = n;
    return name;
  }
  const xpMultiplier = () => 1 + 0.08 * S.upgrades.xp + 0.05 * S.prestige;
  const gainBonusRate = () => 0.01 * S.upgrades.luck + 0.02 * S.prestige;
  const cashbackRate = () => 0.01 * S.upgrades.cash;
  /** Montant de référence qui grandit avec le niveau (récompenses, bonus quotidien…) */
  const rewardBase = () => Math.round(Math.max(100 * (1 + S.level * 0.8), 70 * Math.pow(1.22, S.level)));

  const gameRegistry = [];
  function registerGame(g) { gameRegistry.push(g); gameRegistry.sort((a, b) => a.unlock - b.unlock); }
  function unlocksAt(level) {
    const out = [];
    gameRegistry.forEach(g => { if (g.unlock === level && g.id !== 'slots') out.push(`${g.icon} ${g.name}`); });
    const E = global.SlotsEngine;
    if (E) E.ORDER.forEach(id => { const m = E.MACHINES[id]; if (m.level === level) out.push(`${m.icon} Machine « ${m.name} »`); });
    if (level === 1) out.push('🎰 Machine « Fruits Classic »');
    if (level === 25) out.push('👑 Le Prestige devient disponible');
    const prev = maxBet(level - 1), cur = maxBet(level);
    if (level > 1 && cur > prev) out.push(`💰 Mise maximale : ${fmt(cur)}`);
    return out;
  }

  function addXp(amount) {
    amount = Math.round(amount * xpMultiplier());
    if (amount <= 0) return 0;
    S.xp += amount;
    let levels = 0;
    while (S.level < MAX_LEVEL && S.xp >= xpNeeded(S.level)) {
      S.xp -= xpNeeded(S.level);
      S.level++;
      levels++;
      const reward = levelReward(S.level);
      S.money += reward;
      S.stats.maxLevel = Math.max(S.stats.maxLevel, S.level);
      onLevelUp(S.level, reward);
    }
    if (S.level >= MAX_LEVEL) S.xp = 0;
    if (levels) emit('levelup', S.level);
    return amount;
  }
  function onLevelUp(level, reward) {
    sfx('levelup');
    confetti(120);
    const un = unlocksAt(level);
    const body = `<div class="lvl-burst">${level}</div>
      <p class="center">Tu es désormais <b>${rankName(level)}</b>.</p>
      <p class="center reward">+ ${fmt(reward)} <span class="chip-ico"></span> offerts !</p>
      ${un.length ? `<div class="unlock-list"><h4>Débloqué</h4>${un.map(u => `<div>${u}</div>`).join('')}</div>` : ''}`;
    modal({ title: '⭐ Niveau supérieur !', body, buttons: [{ label: 'Super !', kind: 'primary' }] });
  }

  /* ------------------------------------------------------------ argent & manches */
  function canAfford(n) { return S.money >= n; }
  /** Débite la mise. Renvoie false (avec message) si pas assez de jetons. */
  function take(n) {
    if (S.money < n) { toast('Pas assez de jetons !', 'bad'); sfx('lose'); return false; }
    S.money -= n;
    updateHud();
    return true;
  }
  /**
   * Termine une manche.
   * bet = total misé pendant la manche (déjà débité via take), payout = total reversé (mise incluse).
   */
  function settle(r) {
    const bet = r.bet, base = Math.max(0, Math.round(r.payout));
    let bonus = 0, cashback = 0;
    if (base > bet) bonus = Math.floor((base - bet) * gainBonusRate());
    if (base < bet) cashback = Math.floor((bet - base) * cashbackRate());
    const total = base + bonus + cashback;
    const net = total - bet;
    const win = base > bet;
    S.money += total;

    const st = S.stats;
    st.rounds++; st.wagered += bet; st.won += total;
    if (win) { st.wins++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak); }
    else if (base < bet) st.streak = 0;
    const mult = bet > 0 ? total / bet : 0;
    if (win) {
      st.biggest = Math.max(st.biggest, net);
      st.biggestMult = Math.max(st.biggestMult, mult);
    }
    st.bank = Math.max(st.bank || 0, S.money);
    const gk = r.game + (r.machine ? ':' + r.machine : '');
    st.byGame[r.game] = (st.byGame[r.game] || 0) + 1;
    if (r.machine) st.byGame[gk] = (st.byGame[gk] || 0) + 1;

    const xpGain = addXp(4 + Math.floor(Math.log10(Math.max(bet, 1)) * 5) + (win ? 3 : 0) + (mult >= 10 ? 10 : 0));
    const evt = Object.assign({ game: r.game, machine: r.machine || null, bet, payout: total, net, win, mult, extra: r.extra || {} }, {});
    emit('round', evt);
    if (win && mult >= 10) bigWin(net, mult);
    else if (win && mult >= 3) sfx('win');
    else if (win) sfx('coin');

    updateHud(true);
    save();
    checkRescue();
    return { total, net, bonus, cashback, xpGain, win, mult };
  }

  let rescuing = false;
  function checkRescue() {
    if (S.money >= BET_STEPS[0] || rescuing) return;
    rescuing = true;
    const amount = 300 + S.level * 100;
    modal({
      title: '🆘 Le casino te vient en aide',
      body: `<p>Tu n'as plus assez de jetons pour jouer… Mme Rossi t'offre une <b>allocation de survie</b> : <b class="reward">${fmt(amount)}</b> <span class="chip-ico"></span>.</p><p class="muted">« Au Royal Fortuna, personne ne repart les mains vides. »</p>`,
      buttons: [{ label: 'Merci, Madame Rossi !', kind: 'primary' }]
    }).then(() => { S.money += amount; updateHud(); save(); rescuing = false; emit('money'); });
  }

  function giveMoney(n, silent) {
    S.money += n; S.stats.bank = Math.max(S.stats.bank || 0, S.money);
    updateHud(); save(); emit('money');
    if (!silent) sfx('coin');
  }

  /* ------------------------------------------------------------ HUD */
  let shownMoney = null;
  function updateHud(flash) {
    const elM = $('#hud-money');
    if (!elM) return;
    if (shownMoney == null) { shownMoney = S.money; elM.textContent = fmt(S.money); }
    else if (shownMoney !== S.money) animateNumber(elM, shownMoney, S.money);
    if (flash && elM.parentElement) {
      const cls = S.money >= (shownMoney || 0) ? 'flash-gain' : 'flash-loss';
      elM.parentElement.classList.remove('flash-gain', 'flash-loss');
      void elM.parentElement.offsetWidth;
      elM.parentElement.classList.add(cls);
    }
    const need = xpNeeded(S.level);
    const pct = S.level >= MAX_LEVEL ? 100 : Math.min(100, S.xp / need * 100);
    $('#hud-level').textContent = S.level;
    $('#hud-rank').textContent = rankName(S.level) + (S.prestige ? ' ' + '★'.repeat(Math.min(S.prestige, 5)) + (S.prestige > 5 ? '+' : '') : '');
    $('#hud-xpbar').style.width = pct + '%';
    $('#hud-xptext').textContent = S.level >= MAX_LEVEL ? 'MAX' : `${fmt(S.xp)} / ${fmt(need)} XP`;
    const nm = $('#hud-name'); if (nm) nm.textContent = S.name || 'Invité';
    emit('hud');
  }
  let animTok = 0;
  function animateNumber(el, from, to) {
    const tok = ++animTok, t0 = performance.now(), dur = 600;
    shownMoney = to;
    function step(t) {
      if (tok !== animTok) return;
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step); else el.textContent = fmt(to);
    }
    requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------ contrôle de mise */
  function betControl(opts) {
    const game = opts.game;
    const el = h('div', 'betbar');
    el.innerHTML = `<span class="bet-label">${opts.label || 'Mise'}</span>
      <button class="btn small" data-a="min" title="Mise minimale">MIN</button>
      <button class="btn small round" data-a="dec" title="Diminuer">−</button>
      <div class="bet-val"><span class="chip-ico"></span><b></b></div>
      <button class="btn small round" data-a="inc" title="Augmenter">+</button>
      <button class="btn small" data-a="max" title="Mise maximale">MAX</button>
      <span class="bet-limit"></span>`;
    let locked = false;
    function idx() { return S.betIdx[game] == null ? 1 : S.betIdx[game]; }
    function clamp() {
      let i = Math.min(idx(), maxBetIdx());
      while (i > 0 && BET_STEPS[i] > S.money) i--;
      S.betIdx[game] = Math.max(0, i);
    }
    function render() {
      clamp();
      $('b', el).textContent = fmt(BET_STEPS[idx()]);
      $('.bet-limit', el).textContent = 'max ' + fmtShort(maxBet());
      $$('button', el).forEach(b => b.disabled = locked);
      if (!locked) {
        $('[data-a=dec]', el).disabled = idx() <= 0;
        $('[data-a=min]', el).disabled = idx() <= 0;
        const next = idx() + 1;
        const cantUp = next > maxBetIdx() || BET_STEPS[next] > S.money;
        $('[data-a=inc]', el).disabled = cantUp;
        $('[data-a=max]', el).disabled = cantUp;
      }
    }
    function set(i) { S.betIdx[game] = i; render(); sfx('click'); if (opts.onChange) opts.onChange(BET_STEPS[idx()]); save(); }
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || locked) return;
      const a = b.dataset.a;
      if (a === 'min') set(0);
      if (a === 'dec') set(Math.max(0, idx() - 1));
      if (a === 'inc') set(Math.min(maxBetIdx(), idx() + 1));
      if (a === 'max') { let i = maxBetIdx(); while (i > 0 && BET_STEPS[i] > S.money) i--; set(i); }
    });
    let offM, offL;
    const refresh = () => { if (!el.isConnected) { offM(); offL(); return; } render(); };
    offM = on('money', refresh); offL = on('levelup', refresh);
    render();
    return { el, get: () => { clamp(); return BET_STEPS[idx()]; }, refresh, lock(v) { locked = !!v; render(); } };
  }

  /* ------------------------------------------------------------ toasts, modales */
  function toast(msg, kind, ms) {
    const root = $('#toasts'); if (!root) return;
    const t = h('div', 'toast ' + (kind || 'info'), msg);
    root.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, ms || 3200);
  }
  const mq = []; let mShowing = false;
  function modal(spec) {
    return new Promise(resolve => { mq.push({ spec, resolve }); if (!mShowing) nextModal(); });
  }
  function nextModal() {
    const item = mq.shift();
    if (!item) { mShowing = false; return; }
    mShowing = true;
    const { spec, resolve } = item;
    const root = $('#modal-root');
    const ov = h('div', 'overlay');
    const box = h('div', 'modal' + (spec.cls ? ' ' + spec.cls : ''));
    if (spec.title) box.appendChild(h('h2', null, spec.title));
    const body = h('div', 'modal-body');
    if (typeof spec.body === 'string') body.innerHTML = spec.body; else if (spec.body) body.appendChild(spec.body);
    box.appendChild(body);
    const btns = h('div', 'modal-btns');
    const buttons = spec.buttons || [{ label: 'OK', kind: 'primary' }];
    let closed = false;
    function close(value) {
      if (closed) return; closed = true;
      const data = spec.collect ? spec.collect(box) : undefined;
      ov.classList.remove('show');
      setTimeout(() => { ov.remove(); resolve({ value, data }); nextModal(); }, 180);
    }
    buttons.forEach(b => {
      const bt = h('button', 'btn ' + (b.kind || ''), b.label);
      bt.addEventListener('click', () => { sfx('click'); close(b.value != null ? b.value : b.label); });
      btns.appendChild(bt);
    });
    box.appendChild(btns);
    ov.appendChild(box); root.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('show'));
    const first = $('button', btns); if (first) first.focus();
    if (spec.dismissable) ov.addEventListener('click', e => { if (e.target === ov) close(null); });
  }
  function confirmBox(title, text, yes, no) {
    return modal({ title, body: `<p>${text}</p>`, buttons: [{ label: no || 'Annuler', value: false }, { label: yes || 'Confirmer', kind: 'primary', value: true }] })
      .then(r => r.value === true);
  }

  /* ------------------------------------------------------------ sons (WebAudio, tout est synthétisé) */
  let actx = null;
  function ensureAudio() {
    if (!actx) { try { actx = new (global.AudioContext || global.webkitAudioContext)(); } catch (e) { actx = false; } }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(freq, dur, type, vol, delay, endFreq) {
    const ctx = ensureAudio(); if (!ctx || !S.settings.sound) return;
    const t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.1, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function sfx(name) {
    if (!S.settings.sound) return;
    switch (name) {
      case 'click': tone(620, 0.05, 'square', 0.04); break;
      case 'card': tone(300, 0.07, 'triangle', 0.07, 0, 150); break;
      case 'tick': tone(900, 0.03, 'square', 0.03); break;
      case 'spin': tone(180, 0.25, 'sawtooth', 0.03, 0, 320); break;
      case 'stop': tone(220, 0.1, 'triangle', 0.08, 0, 110); break;
      case 'coin': tone(988, 0.08, 'square', 0.06); tone(1319, 0.18, 'square', 0.06, 0.08); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.09, i * 0.09)); break;
      case 'big': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'square', 0.07, i * 0.1)); break;
      case 'lose': tone(300, 0.25, 'sawtooth', 0.05, 0, 120); break;
      case 'levelup': [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.1, i * 0.12)); break;
    }
  }
  function setSound(v) { S.settings.sound = !!v; save(); const b = $('#btn-sound'); if (b) b.textContent = v ? '🔊' : '🔇'; }

  /* ------------------------------------------------------------ confettis & gros gains */
  let fxParts = [], fxRun = false;
  function confetti(n) {
    const cv = $('#fx'); if (!cv) return;
    const ctx = cv.getContext('2d');
    cv.width = global.innerWidth; cv.height = global.innerHeight;
    const cols = ['#ffd24a', '#ff4d6d', '#4dd2ff', '#7dff7a', '#c77dff', '#ffffff'];
    for (let i = 0; i < (n || 80); i++) {
      fxParts.push({
        x: cv.width / 2 + (Math.random() - 0.5) * cv.width * 0.5, y: cv.height * 0.35,
        vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 3, g: 0.35 + Math.random() * 0.2,
        s: 5 + Math.random() * 7, c: cols[rand(cols.length)], r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, life: 120 + rand(80)
      });
    }
    if (fxRun) return; fxRun = true;
    (function loop() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      fxParts = fxParts.filter(p => p.life > 0 && p.y < cv.height + 20);
      fxParts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.99; p.r += p.vr; p.life--;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.min(1, p.life / 40); ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6); ctx.restore();
      });
      if (fxParts.length) requestAnimationFrame(loop); else { fxRun = false; ctx.clearRect(0, 0, cv.width, cv.height); }
    })();
  }
  function bigWin(amount, mult) {
    const root = $('#bigwin'); if (!root) return;
    const label = mult >= 100 ? 'JACKPOT !!!' : mult >= 30 ? 'MÉGA GAIN !' : 'GROS GAIN !';
    root.innerHTML = `<div class="bw-box"><div class="bw-title">${label}</div><div class="bw-amt">+<span id="bw-n">0</span></div><div class="bw-mult">×${mult >= 10 ? Math.round(mult) : mult.toFixed(1)}</div></div>`;
    root.classList.add('show');
    sfx('big'); confetti(mult >= 30 ? 220 : 120);
    const n = $('#bw-n'), t0 = performance.now();
    (function step(t) { const k = Math.min(1, (t - t0) / 1200); n.textContent = fmt(amount * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); })(t0);
    clearTimeout(bigWin._t);
    bigWin._t = setTimeout(() => root.classList.remove('show'), 2800);
  }

  /* ------------------------------------------------------------ thèmes */
  function applyTheme() { document.body.dataset.theme = S.theme; }

  /* ------------------------------------------------------------ API publique */
  const Casino = {
    get S() { return S; }, set S(v) { S = v; },
    BET_STEPS, MAX_LEVEL, $, $$, h, esc, sleep, rand, pick, shuffle, fmt, fmtShort, today,
    load, save, saveNow, defaultState, on, emit,
    xpNeeded, levelReward, maxBet, maxBetIdx, rankName, rewardBase, gainBonusRate, cashbackRate, xpMultiplier,
    registerGame, games: gameRegistry, unlocksAt,
    addXp, take, settle, giveMoney, canAfford, updateHud, betControl,
    toast, modal, confirmBox, sfx, setSound, confetti, bigWin, applyTheme, ensureAudio, checkRescue,
    isUnlocked: g => S.level >= g.unlock
  };
  global.Casino = Casino;
})(window);
