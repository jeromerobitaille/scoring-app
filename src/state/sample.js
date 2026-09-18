/** Données d'exemple pour les aperçus de l'éditeur et de l'onglet Apparence. */
export const SAMPLE_ROSTER = [
  { id: "p1", name: "Jayden Roy", hometown: "Mascouche, QC", animal: "Tickle My Fancy", contractor: "Championship Pro" },
  { id: "p2", name: "Keenan Hayes", hometown: "Hayden, CO", animal: "Night Train", contractor: "Frontier Rodeo" },
  { id: "p3", name: "Jess Pope", hometown: "Waverly, KS", animal: "Wild Card", contractor: "Frontier Rodeo" },
  { id: "p4", name: "R.C. Landingham", hometown: "Hat Creek, CA", animal: "Big Iron", contractor: "Sankey Pro" },
  { id: "p5", name: "Leighton Berry", hometown: "Weatherford, TX", animal: "Chuckulator", contractor: "Sankey Pro" },
  { id: "p6", name: "Wacey Schalla", hometown: "Arapaho, OK", animal: "Rocket Man", contractor: "Powder River" },
];

export const SAMPLE_ENTRIES = {
  higher: [
    { id: "e2", competitorId: "p2", name: "Keenan Hayes", raw: "86.5", parsed: 86.5 },
    { id: "e3", competitorId: "p3", name: "Jess Pope", raw: "85.5", parsed: 85.5 },
    { id: "e4", competitorId: "p4", name: "R.C. Landingham", raw: "84.25", parsed: 84.25 },
    { id: "e5", competitorId: "p5", name: "Leighton Berry", raw: "84", parsed: 84 },
    { id: "e6", competitorId: "p6", name: "Wacey Schalla", raw: "83", parsed: 83 },
  ],
  lower: [
    { id: "e2", competitorId: "p2", name: "Keenan Hayes", raw: "15.842", parsed: 15.842 },
    { id: "e3", competitorId: "p3", name: "Jess Pope", raw: "16.105", parsed: 16.105 },
    { id: "e4", competitorId: "p4", name: "R.C. Landingham", raw: "16.377", parsed: 16.377 },
    { id: "e5", competitorId: "p5", name: "Leighton Berry", raw: "17.02", parsed: 17.02 },
    { id: "e6", competitorId: "p6", name: "Wacey Schalla", raw: "21.9", parsed: 21.9 },
  ],
};

export const SAMPLE_TIMER = { seconds: 6.42, state: "running", runId: 1, session: "preview" };
