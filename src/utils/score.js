export function parseScore(input) {
  if (input == null) return null;
  const s = String(input).trim();
  if (s === "") return null;
  if (/^\d{1,2}:\d{2}(\.\d{1,3})?$/.test(s)) {
    const [mm, rest] = s.split(":");
    const sec = parseFloat(rest);
    return parseFloat(mm) * 60 + sec;
  }
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function formatScore(raw, mode) {
  if (raw == null || raw === "") return "–";

  // Mode temps
  if (mode === "time") {
    const total = (typeof raw === "number" ? raw : parseScore(raw)) ?? 0;

    // < 60 s → "s.mmm" (sans "00:")
    if (total < 60) {
      return total.toFixed(3); // ex: "7.897" ou "0.532"
    }

    // ≥ 60 s → "mm:ss.mmm"
    let minutes = Math.floor(total / 60);
    let secondsFloat = total - minutes * 60;
    let secInt = Math.floor(secondsFloat);
    let ms = Math.round((secondsFloat - secInt) * 1000);

    // Gestion des reports (ex: 59.999 → 60.000)
    if (ms === 1000) {
      ms = 0;
      secInt += 1;
    }
    if (secInt === 60) {
      secInt = 0;
      minutes += 1;
    }

    const mm = String(minutes).padStart(2, "0");
    const ss = String(secInt).padStart(2, "0");
    const mmm = String(ms).padStart(3, "0");
    return `${mm}:${ss}.${mmm}`;
  }

  // Mode score (numérique)
  const n = typeof raw === "number" ? raw : parseScore(raw);
  if (n == null) return String(raw);
  return Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(n);
}


export function detectIsTimeString(s) {
  return typeof s === "string" && s.includes(":");
}

export function computeRanking(entries, scoreMode) {
  const valid = entries.filter((e) => e.parsed != null);
  valid.sort((a, b) => (scoreMode === "higher" ? (b.parsed - a.parsed) : (a.parsed - b.parsed)));
  return valid;
}

// Dev self-tests (non-bloquants)
(function devTests() {
  try {
    const approxEq = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
    console.assert(parseScore("00:07.321") !== null, "parseScore time should parse");
    console.assert(approxEq(parseScore("00:07.321"), 7.321), "parseScore mm:ss.mmm to seconds");
    console.assert(parseScore("87.5") === 87.5, "parseScore numeric");
    console.assert(formatScore(7.321, "time").startsWith("00:"), "formatScore time mm:ss.mmm");
    console.assert(formatScore(87.5).includes("87"), "formatScore number");
  } catch (e) {
    console.warn("Dev tests encountered an issue:", e);
  }
})();
