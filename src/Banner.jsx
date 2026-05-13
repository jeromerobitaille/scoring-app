import React, { useEffect, useMemo, useState } from "react";

export default function BannerLEDHorizontal({
  entries = [],
  pageSize = 3,
  pageDurationMs = 5000,
  minWidthPx = 1920,
}) {
  const [page, setPage] = useState(0);

  // Classement
  const ranked = useMemo(() => {
    return [...entries].sort(
      (a, b) =>
        (b.score ?? 0) - (a.score ?? 0) ||
        String(a.name).localeCompare(String(b.name))
    );
  }, [entries]);

  const pageCount = Math.max(1, Math.ceil(ranked.length / pageSize));

  useEffect(() => {
    if (pageCount <= 1) return;
    const t = setInterval(() => {
      setPage((p) => (p + 1) % pageCount);
    }, pageDurationMs);
    return () => clearInterval(t);
  }, [pageCount, pageDurationMs]);

  const start = page * pageSize;
  const visible = ranked.slice(start, start + pageSize);

  // Styles
  const styles = {
    container: {
      minWidth: `${minWidthPx}px`,
      width: "100%",
      overflow: "hidden",
      background: "black",
      padding: "10px",
    },
    slider: {
      display: "flex",
      flexDirection: "row",
      transition: "transform 0.8s ease",
      transform: `translateX(-${page * 100}%)`,
      width: `${pageCount * 100}%`,
    },
    page: {
      display: "flex",
      flex: "0 0 100%",
      justifyContent: "space-evenly",
    },
    card: {
      flex: "0 0 30%", // ~3 cartes par page
      margin: "0 10px",
      background: "#111",
      border: "2px solid #333",
      borderRadius: "12px",
      color: "white",
      textAlign: "center",
      padding: "20px",
      fontFamily: "'IBM Plex Mono', monospace",
      boxShadow: "0 0 10px rgba(0,255,127,0.4)",
    },
    pos: {
      fontSize: "32px",
      fontWeight: "bold",
      marginBottom: "10px",
    },
    name: {
      fontSize: "24px",
      lineHeight: "1.2",
      marginBottom: "10px",
      whiteSpace: "normal",
      wordBreak: "break-word",
    },
    score: {
      fontSize: "36px",
      fontWeight: "bold",
      color: "#00ffa3",
      textShadow: "0 0 10px rgba(0,255,163,0.7)",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.slider}>
        {Array.from({ length: pageCount }).map((_, i) => {
          const start = i * pageSize;
          const slice = ranked.slice(start, start + pageSize);
          return (
            <div key={i} style={styles.page}>
              {slice.map((item, idx) => (
                <div key={item.name} style={styles.card}>
                  <div style={styles.pos}>{start + idx + 1}</div>
                  <div style={styles.name}>{item.name}</div>
                  <div style={styles.score}>{item.score}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
