/* Royal Fortuna — histoire (chapitres), quêtes quotidiennes, bonus de connexion, succès. */
(function () {
  'use strict';
  const C = window.Casino;
  const { h, fmt, esc } = C;
  const S = () => C.S;

  const WHO = {
    rossi: { name: 'Mme Rossi', icon: '👩‍💼' },
    gaston: { name: 'Gaston', icon: '🎩' },
    narrator: { name: 'Port-Fortuna', icon: '🌃' }
  };

  /* ------------------------------------------------------------ histoire */
  const on_ = (game, extraFn) => e => e.game === game && (!extraFn || extraFn(e));
  const CHAPTERS = [
    {
      title: 'Bienvenue au Royal Fortuna', minLevel: 1, who: 'rossi', reward: { money: 300, xp: 40 },
      intro: "Ah, te voilà, {name} ! Archibald parlait souvent de toi. Ici, tout commence par les machines à sous : fais tourner les rouleaux et montre-moi ce que tu as dans le ventre.",
      outro: "Pas mal du tout ! La chance sourit aux audacieux. Continue à jouer, monte en niveau : à partir du niveau 2, Gaston t'attend à la table de blackjack.",
      objs: [
        { t: 'Jouer 5 tours de machine à sous', n: 5, m: on_('slots') },
        { t: 'Gagner 2 fois (n’importe quel jeu)', n: 2, m: e => e.win }
      ]
    },
    {
      title: 'Les cartes de Gaston', minLevel: 2, who: 'gaston', reward: { money: 600, xp: 70 },
      intro: "Bonsoir, {name}. Au blackjack, il faut approcher 21 sans le dépasser. Un as vaut 1 ou 11, les figures valent 10. Bats-moi trois fois et je te respecterai.",
      outro: "Tu as du flair ! Mais ne te fie pas qu'à la chance : double ta mise quand tu as 10 ou 11, et sépare toujours les as.",
      objs: [
        { t: 'Jouer 8 mains de blackjack', n: 8, m: on_('blackjack') },
        { t: 'Gagner 3 mains de blackjack', n: 3, m: on_('blackjack', e => e.win) }
      ]
    },
    {
      title: 'Tout sur le rouge', minLevel: 3, who: 'rossi', reward: { money: 1000, xp: 100 },
      intro: "La roulette est le cœur battant du casino. Rouge ou noir, pair ou impair… ou un numéro plein si tu te sens l'âme d'un joueur. Pose tes jetons et fais confiance à la bille.",
      outro: "La bille t'aime bien ! Un petit conseil : les mises extérieures sont plus sûres, les numéros pleins paient 35 contre 1.",
      objs: [
        { t: 'Jouer 6 tours de roulette', n: 6, m: on_('roulette') },
        { t: 'Gagner 3 fois à la roulette', n: 3, m: on_('roulette', e => e.win) }
      ]
    },
    {
      title: 'Le secret du Pharaon', minLevel: 4, who: 'gaston', reward: { money: 1500, xp: 130 },
      intro: "Une nouvelle machine vient d'arriver : le Pharaon. On murmure qu'elle cache des tours gratuits sous ses hiéroglyphes. Va la tester, {name} !",
      outro: "Ha ! Tu as réveillé la momie ! Les scarabées te porteront chance, je le sens.",
      objs: [
        { t: 'Jouer 12 tours sur « Secret du Pharaon »', n: 12, m: e => e.machine === 'pharaon' },
        { t: 'Réaliser un gain ×5 ou plus', n: 1, m: e => e.win && e.mult >= 5 }
      ]
    },
    {
      title: 'Une main de maître', minLevel: 5, who: 'rossi', reward: { money: 2500, xp: 170 },
      intro: "Le vidéo poker récompense les joueurs malins : garde les bonnes cartes, jette les mauvaises. Une paire de valets ou mieux, et la machine paie.",
      outro: "Beau jeu ! Les vrais pros savent quand garder, et quand tout jeter.",
      objs: [
        { t: 'Obtenir 5 mains payantes au poker', n: 5, m: on_('poker', e => e.extra.paid) },
        { t: 'Obtenir une double paire ou mieux', n: 1, m: on_('poker', e => (e.extra.rank || 0) >= 2) }
      ]
    },
    {
      title: 'Les dés sont jetés', minLevel: 7, who: 'gaston', reward: { money: 4000, xp: 220 },
      intro: "Les dés : pur risque, pure adrénaline. Tu choisis ta probabilité, plus elle est faible, plus le gain est énorme. Ose, {name} !",
      outro: "Tu as le sang-froid d'un joueur de légende. Mme Rossi va finir par te confier ses meilleures machines…",
      objs: [
        { t: 'Gagner 6 fois aux dés', n: 6, m: on_('dice', e => e.win) },
        { t: 'Gagner avec une chance ≤ 30 %', n: 1, m: on_('dice', e => e.win && e.extra.chance <= 30) }
      ]
    },
    {
      title: 'Voyage dans la galaxie', minLevel: 8, who: 'rossi', reward: { money: 6000, xp: 280 },
      intro: "Notre nouvelle machine, Galaxie Néon, est une merveille. Déclenche ses tours gratuits et je te prête mon vaisseau.",
      outro: "Spectaculaire ! Les étoiles sont alignées pour toi.",
      objs: [
        { t: 'Jouer 15 tours sur « Galaxie Néon »', n: 15, m: e => e.machine === 'galaxie' },
        { t: 'Déclencher des tours gratuits', n: 1, m: e => e.extra.freespins }
      ]
    },
    {
      title: 'Fièvre du grattage', minLevel: 10, who: 'gaston', reward: { money: 10000, xp: 340 },
      intro: "Les tickets à gratter ! Une pièce, un peu de patience, et parfois une petite fortune. Trois symboles identiques, et c'est gagné.",
      outro: "Tes ongles sont en or ! Tu es désormais officiellement Flambeur du Royal Fortuna.",
      objs: [
        { t: 'Gratter 5 tickets', n: 5, m: on_('scratch') },
        { t: 'Gagner avec 2 tickets', n: 2, m: on_('scratch', e => e.win) }
      ]
    },
    {
      title: 'Le réveil du dragon', minLevel: 13, who: 'rossi', reward: { money: 25000, xp: 450 },
      intro: "Le Dragon d'Or ne s'éveille que pour les audacieux. Il crache beaucoup de feu, mais aussi beaucoup d'or. Prépare ton portefeuille.",
      outro: "Le dragon s'est incliné devant toi. Peu de joueurs peuvent en dire autant.",
      objs: [
        { t: "Jouer 20 tours sur « Dragon d'Or »", n: 20, m: e => e.machine === 'dragon' },
        { t: 'Gagner 100 000 jetons de gains nets (tous jeux)', n: 100000, m: e => e.net > 0, a: e => e.net }
      ]
    },
    {
      title: 'Diamant Royal', minLevel: 18, who: 'rossi', reward: { money: 100000, xp: 600 },
      intro: "Tu y es presque, {name}. Le Diamant Royal est réservé aux High Rollers : des tours gratuits ×3, des gains gigantesques. C'est ici que naissent les légendes.",
      outro: "Magnifique. Tu as dompté le Diamant. Plus qu'une marche pour devenir une Légende…",
      objs: [
        { t: 'Jouer 15 tours sur « Diamant Royal »', n: 15, m: e => e.machine === 'diamant' },
        { t: 'Réaliser un gain ×20 ou plus', n: 1, m: e => e.win && e.mult >= 20 }
      ]
    },
    {
      title: 'La Légende du Royal Fortuna', minLevel: 25, who: 'narrator', reward: { money: 500000, xp: 0 },
      intro: "Port-Fortuna retient son souffle. Le niveau 25 est atteint : la mise maximale n'a plus de secret pour toi. Il ne reste qu'une chose à accomplir : le Prestige, un nouveau départ avec des étoiles de gloire gravées à jamais.",
      outro: "Les néons du Royal Fortuna s'allument à ton nom. Tu es une Légende, {name}. Et la légende ne fait que commencer…",
      objs: [
        { t: 'Atteindre le niveau 25', n: 1, check: () => S().level >= 25 || S().prestige > 0 },
        { t: 'Réaliser un Prestige (boutique)', n: 1, check: () => S().prestige > 0 }
      ]
    }
  ];

  function chapterProg(ci) {
    const st = S().story;
    if (!st.prog[ci]) st.prog[ci] = CHAPTERS[ci].objs.map(() => 0);
    return st.prog[ci];
  }
  function objValue(ci, oi) {
    const o = CHAPTERS[ci].objs[oi];
    if (o.check) return o.check() ? 1 : 0;
    return Math.min(o.n, chapterProg(ci)[oi] || 0);
  }
  function chapterDone(ci) { return CHAPTERS[ci].objs.every((o, i) => objValue(ci, i) >= o.n); }
  function chapterActive() {
    const st = S().story;
    return st.cur < CHAPTERS.length && S().level >= CHAPTERS[st.cur].minLevel;
  }

  function speakerBody(who, text) {
    const w = WHO[who] || WHO.narrator;
    return `<div class="dialog"><div class="portrait">${w.icon}</div><div class="bubble"><div class="who">${w.name}</div><p>${esc(text).replace(/\{name\}/g, '<b>' + esc(S().name || 'toi') + '</b>')}</p></div></div>`;
  }

  async function prologue() {
    const st = S().story;
    if (st.started) return;
    st.started = true;
    const body = `<div class="dialog"><div class="portrait">🌃</div><div class="bubble"><div class="who">Port-Fortuna, minuit</div>
      <p>Les néons du <b>Royal Fortuna</b> illuminent la baie. Ton oncle Archibald, croupier légendaire, t'a laissé en héritage <b>1 000 jetons</b>, une invitation… et un défi : devenir une <b>Légende</b> du casino.</p>
      <p class="muted">Ici, tout est fictif : aucun argent réel n'est en jeu. Amuse-toi !</p></div></div>
      <label class="field">Comment dois-tu t'appeler ?<input id="in-name" maxlength="16" placeholder="Ton nom de joueur" autocomplete="off"></label>`;
    const r = await C.modal({
      title: '🎰 Royal Fortuna', body, buttons: [{ label: 'Entrer dans le casino', kind: 'primary' }],
      collect: box => (box.querySelector('#in-name').value || '').trim()
    });
    S().name = r.data || 'Invité';
    C.updateHud(); C.save();
  }

  function checkIntro() {
    const st = S().story;
    if (st.cur >= CHAPTERS.length || !st.started) return;
    const ch = CHAPTERS[st.cur];
    if (S().level >= ch.minLevel && !st.introSeen[st.cur]) {
      st.introSeen[st.cur] = true; C.save();
      C.modal({
        title: `📖 Chapitre ${st.cur + 1} — ${ch.title}`, body: speakerBody(ch.who, ch.intro),
        buttons: [{ label: 'Relever le défi', kind: 'primary' }]
      });
    }
  }

  async function claimChapter() {
    const st = S().story, ci = st.cur;
    if (ci >= CHAPTERS.length || !chapterActive() || !chapterDone(ci)) return;
    const ch = CHAPTERS[ci];
    st.cur++; st.claimedIdx = ci; C.save();
    C.giveMoney(ch.reward.money, true);
    if (ch.reward.xp) C.addXp(ch.reward.xp);
    C.sfx('levelup'); C.confetti(100);
    await C.modal({
      title: `✅ Chapitre ${ci + 1} terminé`,
      body: speakerBody(ch.who, ch.outro) + `<p class="center reward">+ ${fmt(ch.reward.money)} <span class="chip-ico"></span>${ch.reward.xp ? ` &nbsp; + ${ch.reward.xp} XP` : ''}</p>`,
      buttons: [{ label: ci + 1 < CHAPTERS.length ? 'Chapitre suivant' : 'Merci !', kind: 'primary' }]
    });
    checkIntro(); checkAchievements(); C.emit('quests');
  }

  /* ------------------------------------------------------------ quêtes quotidiennes */
  const scaleBet = () => C.BET_STEPS[Math.max(0, C.maxBetIdx() - 3)];
  const DAILY = {
    slots_rounds: { min: 1, mk: L => ({ n: Math.min(40, 10 + 3 * Math.floor(L / 3)) }), text: n => `Jouer ${n} tours de machine à sous`, m: e => e.game === 'slots' },
    slots_big: { min: 1, mk: () => ({ n: 2 }), text: n => `Obtenir ${n} gains ×3 ou plus aux machines`, m: e => e.game === 'slots' && e.win && e.mult >= 3 },
    bj_win: { min: 2, mk: () => ({ n: 3 }), text: n => `Gagner ${n} mains de blackjack`, m: e => e.game === 'blackjack' && e.win },
    bj_rounds: { min: 2, mk: () => ({ n: 8 }), text: n => `Jouer ${n} mains de blackjack`, m: e => e.game === 'blackjack' },
    roul_win: { min: 3, mk: () => ({ n: 3 }), text: n => `Gagner ${n} fois à la roulette`, m: e => e.game === 'roulette' && e.win },
    roul_rounds: { min: 3, mk: () => ({ n: 8 }), text: n => `Faire tourner la roulette ${n} fois`, m: e => e.game === 'roulette' },
    poker_paid: { min: 5, mk: () => ({ n: 5 }), text: n => `Obtenir ${n} mains payantes au poker`, m: e => e.game === 'poker' && e.extra.paid },
    dice_win: { min: 7, mk: () => ({ n: 4 }), text: n => `Gagner ${n} fois aux dés`, m: e => e.game === 'dice' && e.win },
    scratch: { min: 10, mk: () => ({ n: 4 }), text: n => `Gratter ${n} tickets`, m: e => e.game === 'scratch' },
    wager: { min: 1, mk: () => ({ n: scaleBet() * 40 }), text: n => `Miser un total de ${fmt(n)} jetons`, m: () => true, a: e => e.bet },
    netwin: { min: 1, mk: () => ({ n: scaleBet() * 15 }), text: n => `Gagner ${fmt(n)} jetons de gains nets`, m: e => e.net > 0, a: e => e.net },
    rounds_any: { min: 1, mk: () => ({ n: 20 }), text: n => `Jouer ${n} manches (tous jeux)`, m: () => true },
    bigwin: { min: 1, mk: () => ({ n: 1 }), text: () => 'Réaliser un gain ×10 ou plus', m: e => e.win && e.mult >= 10 },
    variety: { min: 3, mk: () => ({ n: 3 }), text: n => `Jouer à ${n} jeux différents`, custom: true }
  };

  function genDaily() {
    const d = S().daily, L = S().level;
    d.day = C.today(); d.chest = false;
    const pool = Object.keys(DAILY).filter(k => DAILY[k].min <= L);
    C.shuffle(pool);
    const chosen = pool.slice(0, 3);
    const mult = 1 + 0.2 * S().upgrades.daily;
    d.list = chosen.map(tid => ({
      tid, n: DAILY[tid].mk(L).n, p: 0, claimed: false, seen: [],
      reward: Math.round(C.rewardBase() * 1.5 * (0.9 + Math.random() * 0.3) * mult / 10) * 10,
      xp: 25 + L * 6
    }));
    C.save();
  }
  function ensureDaily() {
    const d = S().daily;
    if (d.day !== C.today() || !d.list || d.list.length === 0) genDaily();
  }
  const dailyDone = q => q.p >= q.n;
  function claimDaily(i) {
    ensureDaily();
    const q = S().daily.list[i];
    if (!q || q.claimed || !dailyDone(q)) return;
    q.claimed = true;
    C.giveMoney(q.reward, true); C.addXp(q.xp);
    S().stats.dailyDone = (S().stats.dailyDone || 0) + 1;
    C.sfx('win'); C.toast(`Quête récupérée : +${fmt(q.reward)} jetons`, 'good');
    C.save(); checkAchievements(); C.emit('quests');
  }
  function claimChest() {
    const d = S().daily;
    if (d.chest || !d.list.every(q => q.claimed)) return;
    d.chest = true;
    const amt = Math.round(C.rewardBase() * 4 * (1 + 0.2 * S().upgrades.daily) / 10) * 10;
    C.giveMoney(amt, true); C.addXp(60 + S().level * 10);
    C.sfx('big'); C.confetti(100);
    C.modal({ title: '🎁 Coffre du jour', body: `<p class="center">Toutes les quêtes du jour sont terminées !</p><p class="center reward">+ ${fmt(amt)} <span class="chip-ico"></span></p>`, buttons: [{ label: 'Génial', kind: 'primary' }] });
    C.save(); C.emit('quests');
  }

  /* ------------------------------------------------------------ suivi des manches */
  function track(e) {
    const s = S(), st = s.stats;
    // statistiques spéciales
    if (e.extra.blackjack) st.blackjacks++;
    if (e.extra.straight) st.straights++;
    if (e.extra.royal) st.royals++;
    if (e.extra.freespins) st.freespins++;

    // histoire
    if (chapterActive()) {
      const ci = s.story.cur, ch = CHAPTERS[ci], was = chapterDone(ci);
      const prog = chapterProg(ci);
      ch.objs.forEach((o, oi) => {
        if (o.check || prog[oi] >= o.n) return;
        if (o.m(e)) prog[oi] = Math.min(o.n, prog[oi] + (o.a ? o.a(e) : 1));
      });
      if (!was && chapterDone(ci)) {
        C.toast(`📖 Chapitre « ${ch.title} » : objectifs atteints !`, 'good', 4500);
        C.sfx('levelup');
      }
    }
    // quotidiennes
    ensureDaily();
    s.daily.list.forEach(q => {
      if (q.claimed || dailyDone(q)) return;
      const t = DAILY[q.tid];
      if (t.custom) {
        if (!q.seen.includes(e.game)) { q.seen.push(e.game); q.p = q.seen.length; }
      } else if (t.m(e)) q.p = Math.min(q.n, q.p + (t.a ? t.a(e) : 1));
      if (dailyDone(q)) { C.toast('✅ Quête du jour terminée ! Récupère ta récompense dans « Quêtes ».', 'good', 4500); }
    });
    checkAchievements(e);
    C.emit('quests');
  }

  function claimable() {
    ensureDaily();
    let n = S().daily.list.filter(q => dailyDone(q) && !q.claimed).length;
    if (chapterActive() && chapterDone(S().story.cur)) n++;
    if (!S().daily.chest && S().daily.list.every(q => q.claimed)) n++;
    return n;
  }

  /* ------------------------------------------------------------ succès */
  const ACH = [
    { id: 'first', icon: '🎲', name: 'Premier pas', desc: 'Jouer une manche', k: 1, test: s => s.stats.rounds >= 1 },
    { id: 'r100', icon: '🎰', name: 'Habitué', desc: 'Jouer 100 manches', k: 3, test: s => s.stats.rounds >= 100 },
    { id: 'r1000', icon: '🔥', name: 'Acharné', desc: 'Jouer 1 000 manches', k: 12, test: s => s.stats.rounds >= 1000 },
    { id: 'x10', icon: '🍀', name: 'Coup de chance', desc: 'Réaliser un gain ×10', k: 3, test: s => s.stats.biggestMult >= 10 },
    { id: 'x50', icon: '⚡', name: 'Coup de maître', desc: 'Réaliser un gain ×50', k: 10, test: s => s.stats.biggestMult >= 50 },
    { id: 'x200', icon: '💥', name: 'Jackpot !', desc: 'Réaliser un gain ×200', k: 40, test: s => s.stats.biggestMult >= 200 },
    { id: 'b100k', icon: '💰', name: 'Pactole', desc: 'Posséder 100 000 jetons', k: 4, test: s => s.stats.bank >= 1e5 },
    { id: 'b1m', icon: '🏦', name: 'Millionnaire', desc: 'Posséder 1 000 000 de jetons', k: 12, test: s => s.stats.bank >= 1e6 },
    { id: 'b1b', icon: '🏝️', name: 'Milliardaire', desc: 'Posséder 1 milliard de jetons', k: 40, test: s => s.stats.bank >= 1e9 },
    { id: 'bj', icon: '🃏', name: 'Blackjack !', desc: 'Obtenir un blackjack naturel', k: 3, test: s => s.stats.blackjacks >= 1 },
    { id: 'straight', icon: '🎯', name: 'Numéro plein', desc: 'Gagner sur un numéro à la roulette', k: 5, test: s => s.stats.straights >= 1 },
    { id: 'royal', icon: '👑', name: 'Quinte flush royale', desc: 'Obtenir une quinte flush royale', k: 50, test: s => s.stats.royals >= 1 },
    { id: 'fs', icon: '🎁', name: 'Tours gratuits', desc: 'Déclencher des tours gratuits', k: 4, test: s => s.stats.freespins >= 1 },
    { id: 'st5', icon: '📈', name: 'En série', desc: 'Gagner 5 manches de suite', k: 4, test: s => s.stats.bestStreak >= 5 },
    { id: 'st10', icon: '🚀', name: 'Intouchable', desc: 'Gagner 10 manches de suite', k: 15, test: s => s.stats.bestStreak >= 10 },
    { id: 'l10', icon: '⭐', name: 'Flambeur', desc: 'Atteindre le niveau 10', k: 5, test: s => s.stats.maxLevel >= 10 },
    { id: 'l25', icon: '🌟', name: 'Légende', desc: 'Atteindre le niveau 25', k: 25, test: s => s.stats.maxLevel >= 25 },
    { id: 'wheel', icon: '🎡', name: 'Roue de la Fortune', desc: 'Tourner la roue bonus', k: 1, test: s => s.stats.wheelSpins >= 1 },
    { id: 'dq10', icon: '📅', name: 'Employé du mois', desc: 'Terminer 10 quêtes quotidiennes', k: 6, test: s => (s.stats.dailyDone || 0) >= 10 },
    { id: 'story', icon: '📖', name: 'Conteur', desc: "Terminer 5 chapitres de l'histoire", k: 8, test: s => s.story.cur >= 5 },
    { id: 'themes', icon: '🎨', name: 'Décorateur', desc: 'Posséder tous les thèmes', k: 10, test: s => s.themesOwned.length >= 4 },
    { id: 'presti', icon: '👑', name: 'Prestige', desc: 'Réaliser un Prestige', k: 30, test: s => s.prestige >= 1 }
  ];
  function checkAchievements() {
    const s = S();
    ACH.forEach(a => {
      if (s.achievements[a.id] || !a.test(s)) return;
      s.achievements[a.id] = Date.now();
      const reward = Math.round(C.rewardBase() * a.k / 10) * 10;
      C.giveMoney(reward, true);
      C.toast(`🏆 Succès : ${a.name} — +${fmt(reward)} jetons`, 'good', 4500);
      C.sfx('win');
    });
  }

  /* ------------------------------------------------------------ bonus de connexion */
  const STREAK = [1, 1.5, 2, 2.5, 3, 4, 6];
  async function loginBonus() {
    const s = S(), l = s.login, t = C.today();
    if (l.last === t) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yd = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
    l.streak = l.last === yd ? l.streak + 1 : 1;
    l.last = t;
    const idx = (l.streak - 1) % 7;
    const base = Math.round((200 + 100 * s.level) * (1 + 0.2 * s.upgrades.daily));
    const amt = Math.round(base * STREAK[idx] / 10) * 10;
    const days = STREAK.map((m, i) => `<div class="day ${i < idx ? 'done' : i === idx ? 'today' : ''}"><div>Jour ${i + 1}</div><b>${fmt(Math.round(base * m / 10) * 10)}</b></div>`).join('');
    await C.modal({
      title: '🎁 Bonus de connexion',
      body: `<p class="center">Série : <b>${l.streak}</b> jour${l.streak > 1 ? 's' : ''} d'affilée.</p><div class="days">${days}</div><p class="center reward">+ ${fmt(amt)} <span class="chip-ico"></span></p>`,
      buttons: [{ label: 'Récupérer', kind: 'primary' }]
    });
    C.giveMoney(amt, true); C.sfx('coin'); C.save();
  }

  /* ------------------------------------------------------------ rendu de la page « Quêtes » */
  function bar(p, n, cls) {
    return `<div class="pbar ${cls || ''}"><div style="width:${Math.min(100, p / n * 100)}%"></div></div>`;
  }
  function render(root) {
    ensureDaily();
    root.innerHTML = '';
    const s = S(), st = s.story;
    const wrap = h('div', 'page quests');

    // --- histoire
    const secS = h('section', 'panel');
    secS.appendChild(h('h2', null, '📖 L’histoire du Royal Fortuna'));
    if (st.cur >= CHAPTERS.length) {
      secS.appendChild(h('p', 'center', '🏆 Tu as terminé tous les chapitres. Tu es une Légende de Port-Fortuna !'));
    } else {
      const ci = st.cur, ch = CHAPTERS[ci], unlocked = chapterActive();
      const card = h('div', 'story-card' + (unlocked ? '' : ' locked'));
      card.innerHTML = `<div class="story-head"><span class="portrait sm">${WHO[ch.who].icon}</span>
        <div><div class="muted">Chapitre ${ci + 1} / ${CHAPTERS.length}</div><h3>${ch.title}</h3></div></div>`;
      if (!unlocked) {
        card.appendChild(h('p', 'muted', `🔒 Niveau ${ch.minLevel} requis (tu es niveau ${s.level}).`));
      } else {
        const q = h('p', 'story-text', '« ' + esc(ch.intro).replace(/\{name\}/g, esc(s.name || 'toi')) + ' »');
        card.appendChild(q);
        ch.objs.forEach((o, oi) => {
          const v = objValue(ci, oi);
          const row = h('div', 'obj' + (v >= o.n ? ' ok' : ''));
          row.innerHTML = `<div class="obj-t">${v >= o.n ? '✅' : '⬜'} ${esc(o.t)}</div><div class="obj-p">${fmt(v)} / ${fmt(o.n)}</div>${bar(v, o.n)}`;
          card.appendChild(row);
        });
        const foot = h('div', 'story-foot');
        foot.innerHTML = `<span>Récompense : <b>${fmt(ch.reward.money)}</b> <span class="chip-ico"></span>${ch.reward.xp ? ` + ${ch.reward.xp} XP` : ''}</span>`;
        const b = h('button', 'btn primary', 'Terminer le chapitre');
        b.disabled = !chapterDone(ci);
        b.addEventListener('click', () => claimChapter());
        foot.appendChild(b); card.appendChild(foot);
      }
      secS.appendChild(card);
    }
    if (st.cur > 0) {
      const done = h('details', 'done-list');
      done.innerHTML = `<summary>Chapitres terminés (${Math.min(st.cur, CHAPTERS.length)})</summary>` +
        CHAPTERS.slice(0, st.cur).map((c, i) => `<div class="done-ch">✅ ${i + 1}. ${c.title}</div>`).join('');
      secS.appendChild(done);
    }
    wrap.appendChild(secS);

    // --- quotidiennes
    const secD = h('section', 'panel');
    secD.appendChild(h('h2', null, '📅 Quêtes du jour'));
    secD.appendChild(h('p', 'muted', 'Elles se renouvellent chaque jour. Termine-les toutes pour ouvrir le coffre du jour !'));
    s.daily.list.forEach((q, i) => {
      const t = DAILY[q.tid];
      const done = dailyDone(q);
      const row = h('div', 'daily' + (done ? ' ok' : '') + (q.claimed ? ' claimed' : ''));
      row.innerHTML = `<div class="daily-main"><div class="obj-t">${t.text(q.n)}</div>
        <div class="obj-p">${fmt(Math.min(q.p, q.n))} / ${fmt(q.n)}</div>${bar(q.p, q.n)}</div>
        <div class="daily-rew"><b>${fmt(q.reward)}</b> <span class="chip-ico"></span><small>+ ${q.xp} XP</small></div>`;
      const b = h('button', 'btn ' + (done && !q.claimed ? 'primary' : ''), q.claimed ? 'Récupéré' : 'Récupérer');
      b.disabled = !done || q.claimed;
      b.addEventListener('click', () => claimDaily(i));
      row.appendChild(b); secD.appendChild(row);
    });
    const allClaimed = s.daily.list.every(q => q.claimed);
    const chest = h('div', 'chest' + (s.daily.chest ? ' open' : ''));
    chest.innerHTML = `<span class="chest-ico">${s.daily.chest ? '📭' : '🎁'}</span><div><b>Coffre du jour</b><div class="muted">${s.daily.chest ? 'Déjà ouvert — reviens demain !' : 'Récupère les 3 quêtes pour l’ouvrir'}</div></div>`;
    const cb = h('button', 'btn gold', 'Ouvrir'); cb.disabled = s.daily.chest || !allClaimed;
    cb.addEventListener('click', claimChest);
    chest.appendChild(cb); secD.appendChild(chest);
    wrap.appendChild(secD);
    root.appendChild(wrap);
  }

  function renderAchievements(root) {
    const s = S();
    const n = ACH.filter(a => s.achievements[a.id]).length;
    root.innerHTML = `<h3>🏆 Succès (${n} / ${ACH.length})</h3>`;
    const grid = h('div', 'ach-grid');
    ACH.forEach(a => {
      const got = !!s.achievements[a.id];
      const reward = Math.round(C.rewardBase() * a.k / 10) * 10;
      grid.appendChild(h('div', 'ach' + (got ? ' got' : ''), `<span class="ach-ico">${got ? a.icon : '🔒'}</span><div><b>${a.name}</b><div class="muted">${a.desc}</div><small>${got ? 'Obtenu' : '+' + fmt(reward) + ' jetons'}</small></div>`));
    });
    root.appendChild(grid);
  }

  C.on('round', track);
  C.on('levelup', () => { checkIntro(); checkAchievements(); C.emit('quests'); });
  C.on('money', () => { checkAchievements(); });

  C.Quests = {
    CHAPTERS, prologue, checkIntro, loginBonus, ensureDaily, claimable, render, renderAchievements, checkAchievements,
    chapterCount: CHAPTERS.length
  };
})();
