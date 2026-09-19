// Pousse un état d'exemple (compétiteurs + résultats) dans une room du serveur de test :
//   node tests/tools/pushstate.mjs <room> [port] [patch JSON de l'état]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
globalThis.WebSocket = require("ws");
const [room = "default", port = "5099", patch = "{}"] = process.argv.slice(2);
const LocalSocket = (await import("../../src/sync/LocalSocket.js")).default;
const m = await import("../../src/state/model.js");
const { SAMPLE_ROSTER, SAMPLE_ENTRIES } = await import("../../src/state/sample.js");
let s = m.normalizeState({});
s = m.normalizeState(m.updateActiveCompetition(s, { roster: SAMPLE_ROSTER, entries: SAMPLE_ENTRIES.higher, currentId: "p1" }));
s = m.normalizeState({ ...s, ...JSON.parse(patch) });
// PENDING=<secondes> : discipline au temps, chrono armé, arrivée en attente de validation.
if (process.env.PENDING) {
  const d = s.disciplines.find((x) => x.scoreMode === "lower");
  s = m.normalizeState({ ...s, currentDisciplineId: d.id });
  s = m.normalizeState(m.updateActiveCompetition(s, { roster: SAMPLE_ROSTER, entries: SAMPLE_ENTRIES.lower, currentId: "p1" }));
  s = m.normalizeState({ ...s, timerArmed: true, timerArmedFor: d.id, pendingRun: { seconds: Number(process.env.PENDING), eye: "1", session: "sim", runId: 1 } });
}
// CAROUSEL='{"badgeScale":1.5}' : options appliquées à tous les carrousels.
if (process.env.CAROUSEL) {
  const opts = JSON.parse(process.env.CAROUSEL);
  s = m.normalizeState({ ...s, outputs: s.outputs.map((o) => ({ ...o, elements: o.elements.map((e) => (e.kind === "carousel" ? { ...e, ...opts } : e)) })) });
}
const sock = new LocalSocket(`ws://127.0.0.1:${port}/live-score`, room);
sock.connect();
setTimeout(() => { sock.push(s); setTimeout(() => process.exit(0), 400); }, 1200);
