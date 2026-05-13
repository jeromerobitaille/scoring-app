import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Card from "./ui/Card";
import Button from "./ui/Button";

function buildJoinUrl(host, port, room) {
  const r = encodeURIComponent(room || "default");
  return `http://${host}:${port}/?net=1&room=${r}`;
}

export default function ShareConnection() {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);

  const room = (() => {
    if (typeof window === "undefined") return "default";
    return new URLSearchParams(window.location.search).get("room") || "default";
  })();

  useEffect(() => {
    let cancel = false;
    fetch("/api/server-info", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => { if (!cancel) setInfo(j); })
      .catch((e) => { if (!cancel) setError(e.message || String(e)); });
    return () => { cancel = true; };
  }, []);

  if (error) {
    return (
      <Card>
        <h2 className="text-lg font-semibold mb-2">Partage réseau local</h2>
        <p className="text-sm opacity-70">
          Disponible uniquement dans l'application FWST Scoring (le mode navigateur dev
          n'expose pas <code>/api/server-info</code>).
        </p>
      </Card>
    );
  }

  if (!info) {
    return (
      <Card>
        <h2 className="text-lg font-semibold mb-2">Partage réseau local</h2>
        <p className="text-sm opacity-70">Détection du réseau…</p>
      </Card>
    );
  }

  const addresses = info.addresses || [];

  async function copy(text, key) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-lg font-semibold">Partage réseau local</h2>
          <p className="text-sm opacity-70">
            Les juges et écrans secondaires se connectent en scannant le QR code,
            ou en ouvrant l'adresse dans leur navigateur. Aucun internet requis —
            tout passe par votre WiFi local. Room : <code>{room}</code>
          </p>
        </div>
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-2xl border border-amber-300/50 bg-amber-50/60 dark:bg-amber-950/30 p-4 text-sm">
          Aucune interface réseau locale détectée. Connectez ce poste au WiFi
          du site, puis rouvrez cette page.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {addresses.map((a) => {
            const url = buildJoinUrl(a.address, info.port, room);
            return (
              <div
                key={a.iface + a.address}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col items-center gap-3 bg-white/80 dark:bg-zinc-950/40"
              >
                <div className="bg-white p-2 rounded-xl">
                  <QRCodeSVG value={url} size={160} level="M" includeMargin={false} />
                </div>
                <div className="w-full text-center">
                  <div className="text-xs uppercase tracking-wide opacity-60">{a.iface}</div>
                  <div className="font-mono text-sm break-all">{url}</div>
                </div>
                <Button
                  onClick={() => copy(url, a.iface + a.address)}
                  className="text-xs"
                >
                  {copied === a.iface + a.address ? "Copié ✓" : "Copier le lien"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
