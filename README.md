# 🎰 Royal Fortuna — casino 2D (100 % fictif)

Un casino en ligne **entièrement fictif** : aucun argent réel, aucun serveur, aucune inscription.
Tout tourne dans le navigateur (HTML + CSS + JavaScript pur, sans dépendance) et la progression est
sauvegardée automatiquement dans le `localStorage`.

## Lancer le jeu

Ouvre simplement `index.html` dans un navigateur, ou lance un petit serveur local :

```bash
python3 -m http.server 8000
```

puis va sur <http://localhost:8000>.

## Le contexte

Tu arrives à **Port-Fortuna**, la nuit. Ton oncle Archibald, croupier légendaire, t'a laissé
1 000 jetons et un défi : devenir une **Légende du Royal Fortuna**. Mme Rossi (la directrice) et
Gaston (le croupier en chef) te guident à travers **11 chapitres** d'histoire qui t'apprennent
chaque jeu au fil de ta montée en niveau.

## Les jeux

| Jeu | Niveau | Détails |
|---|---|---|
| 🎰 Machines à sous | 1 → 18 | **5 machines** (Fruits Classic, Secret du Pharaon, Galaxie Néon, Dragon d'Or, Diamant Royal) : lignes de paiement, Wild, Scatter, tours gratuits avec multiplicateur, Turbo, Auto-spin, table des gains |
| 🎡 Roue de la Fortune | 1 | Un tour gratuit par heure |
| 🃏 Blackjack | 2 | 6 jeux, blackjack 3:2, doubler, séparer, le croupier reste sur 17 |
| 🎡 Roulette européenne | 3 | Roue animée, numéros pleins, couleurs, pair/impair, manque/passe, douzaines, colonnes |
| ♠️ Vidéo Poker | 5 | Valet ou mieux (barème 8/5), bouton Conseil |
| 🎲 Dés | 7 | Tu choisis ta probabilité (2 % → 98 %), multiplicateur jusqu'à ×49 |
| 🎟️ Tickets à gratter | 10 | 3 symboles identiques, jusqu'à ×200 |

## Progression

- **XP & niveaux** : chaque manche rapporte de l'XP (plus avec les grosses mises et les gros gains). Chaque niveau offre des jetons et peut débloquer un jeu, une machine ou une **mise maximale plus élevée** (50 → 10 000 000).
- **Rangs** : Novice → Joueur → Habitué → Flambeur → High Roller → VIP → Légende.
- **Histoire** : 11 chapitres avec objectifs et récompenses.
- **Quêtes du jour** : 3 quêtes tirées au sort chaque jour (adaptées à ton niveau) + coffre bonus.
- **Bonus de connexion** : série de 7 jours.
- **Succès** : 22 succès avec récompenses.
- **Boutique** : améliorations permanentes (Mentor VIP, Trèfle d'or, Cashback VIP, Carte de fidélité) et 4 thèmes de tapis.
- **Prestige** (niveau 25) : on recommence avec une étoile → +5 % d'XP et +2 % de gains permanents.
- **Filet de sécurité** : si tu n'as plus de jetons, le casino t'offre une allocation de survie.

## Équilibrage des machines à sous

Le moteur (`js/slots-engine.js`) est indépendant du navigateur. Pour vérifier le taux de
redistribution (RTP, ≈ 95 % pour chaque machine) :

```bash
node tools/simulate.js 1000000
```

## Structure

```
index.html            page unique
css/style.css         styles, thèmes, responsive
js/core.js            état, sauvegarde, niveaux, mises, modales, sons, effets
js/quests.js          histoire, quêtes du jour, bonus de connexion, succès
js/shop.js            boutique, prestige, profil
js/slots-engine.js    moteur des machines (pur)  ·  js/slots.js interface
js/blackjack.js · roulette.js · poker.js · dice.js · scratch.js · wheel.js
js/main.js            navigation, lobby, démarrage
tools/simulate.js     simulation Monte-Carlo du RTP
```

Pour ajouter un jeu : créer un fichier qui appelle `Casino.registerGame({ id, name, icon, unlock, desc, mount, unmount })`,
utiliser `Casino.take(mise)` puis `Casino.settle({ game, bet, payout })` — l'XP, les quêtes et les succès sont gérés automatiquement.

> ⚠️ Jeu de divertissement. Les jetons n'ont aucune valeur réelle et ne peuvent pas être échangés.
