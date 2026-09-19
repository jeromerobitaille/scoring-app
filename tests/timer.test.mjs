import assert from "node:assert/strict";
const { resolveOutputTimer } = await import("../src/hooks/useLiveTimer.js");
const f = (runId, state, seconds) => ({ session: "s", runId, state, seconds });
const base = { enabled: true, pendingRun: null, holdMs: 2000 };
let mem = { seen: null, stop: null, ignored: null };
const step = (frame, extra = {}, now = 0) => resolveOutputTimer(mem, { ...base, frame, now, ...extra });

// 1. Course puis arrêt : aucun rendu vide entre les deux (scintillement), puis fin du maintien
assert.equal(step(f(1, "running", 3.2)).seconds, 3.2);
assert.equal(step(f(1, "stopped", 15.5), {}, 1000).seconds, 15.5, "arrêt affiché dès le premier rendu");
assert.equal(step(f(1, "stopped", 15.5), {}, 2900).seconds, 15.5);
assert.equal(step(f(1, "stopped", 15.5), {}, 3100), null, "maintien écoulé");

// 2. Temps arrêté dont on n'a pas vu la course (branchement)
mem = { seen: null, stop: null, ignored: null };
assert.equal(step(f(7, "stopped", 9.9)), null);

// 3. Arrivée en attente : gel ; faux départ ignoré, même après validation
mem = { seen: null, stop: null, ignored: null };
step(f(1, "running", 1));
step(f(1, "stopped", 15.5), {}, 100);
const pending = { seconds: 15.5, session: "s", runId: 1 };
assert.equal(step(f(1, "stopped", 15.5), { pendingRun: pending }, 200).seconds, 15.5);
const frozen = step(f(2, "running", 0.8), { pendingRun: pending }, 5000);
assert.equal(frozen.seconds, 15.5, "le temps à valider reste affiché pendant le faux départ");
assert.equal(frozen.state, "stopped");
assert.equal(step(f(2, "running", 4.1), {}, 8000), null, "validé : le faux départ ne revient pas à l'écran");
assert.equal(step(f(2, "stopped", 6.0), {}, 9000), null);
assert.equal(step(f(3, "running", 0.5), {}, 20000).seconds, 0.5, "la course suivante s'affiche");

// 4. Course légitime démarrée avant l'attente (même clé) : non ignorée
mem = { seen: null, stop: null, ignored: null };
step(f(5, "running", 1));
assert.equal(step(f(5, "running", 2), { pendingRun: pending }).seconds, 15.5);
assert.equal(step(f(5, "running", 3)).seconds, 3);

// 5. Désarmé
assert.equal(resolveOutputTimer(mem, { ...base, enabled: false, frame: f(9, "running", 1), now: 0 }), null);
console.log("timer OK");
