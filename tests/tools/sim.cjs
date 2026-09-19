// Serveur de test avec chrono simulé (vrai parseur) : node tests/tools/sim.cjs [port]
// Cycle de 25 s : 0-3 prêt, 3-15 course, 15-25 arrêté. SIM_RESTART=1 ajoute un faux
// départ 2 s après l'arrêt (cheval qui repasse devant la cellule).
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const { createServer } = require(root + "/server/index.cjs");
const { TimerReader } = require(root + "/server/timer.cjs");
(async () => {
  const port = Number(process.argv[2]) || 5099;
  const srv = await createServer({ staticDir: root + "/dist", port, mediaDir: path.join(require("node:os").tmpdir(), "fwst-sim-media") });
  const t = new TimerReader();
  t.on("frame", (f) => srv.publishTimer("frame", f));
  srv.publishTimer("status", { connected: true, port: "/dev/cu.SIMULATION", error: null, config: t.config });
  t.status.connected = true;
  let start = 0, stopAt = 0, restart = 0;
  const fmt = (s) => s.toFixed(3).padStart(6, " ");
  setInterval(() => {
    const now = Date.now() / 1000;
    const cyc = now % 25;
    let frame;
    if (cyc < 3) { frame = " " + fmt(0); start = 0; restart = 0; }
    else if (cyc < 15) { if (!start) start = now; frame = " " + fmt(now - start); stopAt = now - start; }
    else if (process.env.SIM_RESTART === "1" && cyc >= 17) { if (!restart) restart = now; frame = " " + fmt(now - restart); }
    else frame = "1" + fmt(stopAt || 7.25);
    t.onFrame(frame);
  }, 43);
  console.log("sim on :" + port);
})();
