import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ChevronDownIcon, ClipboardDocumentIcon, ArrowTopRightOnSquareIcon, CheckIcon } from "@heroicons/react/24/outline";
import Card from "./ui/Card";

function buildJoinUrl(host, port, room) {
  const r = encodeURIComponent(room || "default");
  return `http://${host}:${port}/?net=1&room=${r}`;
}

// Most consumer routers issue 192.168.x.x, then 10.x.x.x, then 172.16-31.x.x.
function rankAddress(addr) {
  if (/^192\.168\./.test(addr)) return 0;
  if (/^10\./.test(addr)) return 1;
  return 2;
}

function InterfaceCard({ address, iface, port, room, large }) {
  const url = buildJoinUrl(address, port, room);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  const qrSize = large ? 220 : 140;

  return (
    <div className={`rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/40 p-4 ${large ? "flex flex-col sm:flex-row items-center gap-5" : "flex flex-col items-center gap-3"}`}>
      <div className="bg-white p-2 rounded-xl flex-shrink-0">
        <QRCodeSVG value={url} size={qrSize} level="M" includeMargin={false} />
      </div>
      <div className="flex-1 w-full min-w-0 text-center sm:text-left">
        <div className="text-xs uppercase tracking-wide opacity-60">{iface}</div>
        <div className={`font-mono break-all ${large ? "text-base font-semibold" : "text-sm"}`}>{url}</div>
        <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <ClipboardDocumentIcon className="w-3.5 h-3.5" />}
            {copied ? "Copié" : "Copier"}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
            Tester dans le navigateur
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ShareConnection() {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [showOthers, setShowOthers] = useState(false);

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
          Disponible uniquement dans l'application FWST Scoring (le mode dev navigateur n'expose pas <code>/api/server-info</code>).
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

  const addresses = [...(info.addresses || [])].sort(
    (a, b) => rankAddress(a.address) - rankAddress(b.address)
  );

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Partage réseau local</h2>
        <p className="text-sm opacity-70">
          Les juges et écrans secondaires scannent le QR code (ou ouvrent l'URL)
          depuis le même WiFi local. Room actuelle : <code>{room}</code>
        </p>
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-2xl border border-amber-300/50 bg-amber-50/60 dark:bg-amber-950/30 p-4 text-sm">
          Aucune interface réseau locale détectée. Connectez ce poste au WiFi du
          site, puis rouvrez cette page.
        </div>
      ) : addresses.length === 1 ? (
        <InterfaceCard {...addresses[0]} port={info.port} room={room} large />
      ) : (
        <div className="space-y-3">
          <InterfaceCard {...addresses[0]} port={info.port} room={room} large />

          <button
            type="button"
            onClick={() => setShowOthers((v) => !v)}
            className="w-full flex items-center justify-between text-sm px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer"
          >
            <span>Autres interfaces réseau ({addresses.length - 1})</span>
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${showOthers ? "rotate-180" : ""}`} />
          </button>

          {showOthers && (
            <div className="grid sm:grid-cols-2 gap-3">
              {addresses.slice(1).map((a) => (
                <InterfaceCard
                  key={a.iface + a.address}
                  {...a}
                  port={info.port}
                  room={room}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
