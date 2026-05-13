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
      return total.toFixed(3);
    }

    // ≥ 60 s → "mm:ss.mmm"
    let minutes = Math.floor(total / 60);
    let secondsFloat = total - minutes * 60;
    let secInt = Math.floor(secondsFloat);
    let ms = Math.round((secondsFloat - secInt) * 1000);

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

// Convenience helper that resolves the display mode for a single entry,
// avoiding the operator-precedence pitfall of `e.timeHint || scoreMode === "lower"`.
export function entryDisplayMode(entry, scoreMode) {
  return (entry?.timeHint || scoreMode === "lower") ? "time" : null;
}

// Competition ranking ("1224"): tied entries share the same rank, the next
// entry skips ahead by the number of tied entries. Returned entries carry a
// `.rank` field for direct rendering.
export function computeRanking(entries, scoreMode) {
  const valid = entries.filter((e) => e.parsed != null);
  const sorted = [...valid].sort((a, b) =>
    scoreMode === "higher" ? (b.parsed - a.parsed) : (a.parsed - b.parsed)
  );

  let lastValue = null;
  let lastRank = 0;
  return sorted.map((e, i) => {
    const rank = (lastValue !== null && e.parsed === lastValue) ? lastRank : i + 1;
    lastValue = e.parsed;
    lastRank = rank;
    return { ...e, rank };
  });
}

// Dev self-tests — gated so they never run in production builds.
if (import.meta.env?.DEV) {
  try {
    const approxEq = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
    console.assert(parseScore("00:07.321") !== null, "parseScore time should parse");
    console.assert(approxEq(parseScore("00:07.321"), 7.321), "parseScore mm:ss.mmm to seconds");
    console.assert(parseScore("87.5") === 87.5, "parseScore numeric");
    console.assert(formatScore(7.321, "time").startsWith("0") || formatScore(7.321, "time").startsWith("7"),
      "formatScore time formats numerically");
    console.assert(formatScore(87.5).includes("87"), "formatScore number");

    const tied = computeRanking(
      [
        { id: "a", parsed: 90 },
        { id: "b", parsed: 85 },
        { id: "c", parsed: 85 },
        { id: "d", parsed: 80 },
      ],
      "higher"
    );
    console.assert(tied[0].rank === 1 && tied[1].rank === 2 && tied[2].rank === 2 && tied[3].rank === 4,
      "competition ranking with ties");
  } catch (e) {
    console.warn("Dev tests encountered an issue:", e);
  }
}
