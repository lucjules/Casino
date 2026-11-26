// Simulation Monte-Carlo du taux de redistribution (RTP) des machines à sous.
// Usage : node tools/simulate.js [nombre_de_manches]
const E = require('../js/slots-engine.js');
const N = parseInt(process.argv[2] || '1000000', 10);

for (const id of E.ORDER) {
  const m = E.MACHINES[id];
  let sum = 0, hits = 0, max = 0, fsTrig = 0, big = 0, sq = 0;
  for (let i = 0; i < N; i++) {
    const r = E.playRound(m);
    sum += r.total; sq += r.total * r.total;
    if (r.total > 0) hits++;
    if (r.total > max) max = r.total;
    if (r.first.fs) fsTrig++;
    if (r.total >= 10) big++;
  }
  const mean = sum / N, sd = Math.sqrt(sq / N - mean * mean);
  console.log(
    id.padEnd(8),
    'RTP', (mean * 100).toFixed(2) + '%',
    '| hit', (hits / N * 100).toFixed(1) + '%',
    '| FS 1/' + (fsTrig ? Math.round(N / fsTrig) : '∞'),
    '| >=10x 1/' + (big ? Math.round(N / big) : '∞'),
    '| max', max.toFixed(0) + 'x',
    '| sd', sd.toFixed(1)
  );
}
