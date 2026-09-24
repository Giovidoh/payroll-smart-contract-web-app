"use client";

import { cn } from "@/lib/utils";
import { LienTransaction } from "./ui-kit";
import type { EtatTx, EtapeTx, Operation } from "../hooks/use-transaction";

const bouton = "rounded-sm border px-3.5 py-2 text-left transition-colors disabled:opacity-50";
const principal = `${bouton} border-primary bg-primary font-medium text-primary-foreground hover:bg-primary/90`;
const secondaire = `${bouton} border-line-2 bg-card hover:bg-surface-2`;

const CODES: Record<EtatTx["phase"], string> = {
  repos: "",
  confirmation: "D1",
  signature: "D2",
  attente: "D2",
  succes: "D3",
  echec: "D4",
};

export default function DialogueTransaction({
  operation,
  etat,
  etapes,
  onConfirmer,
  onFermer,
}: {
  operation: Operation | null;
  etat: EtatTx;
  etapes?: EtapeTx[];
  onConfirmer: () => void;
  onFermer: () => void;
}) {
  if (!operation || etat.phase === "repos") return null;

  const enCours = etat.phase === "signature" || etat.phase === "attente";
  const termine = etat.phase === "succes" || etat.phase === "echec";

  const message =
    etat.phase === "confirmation"
      ? operation.message
      : etat.phase === "signature"
        ? "Confirmez l'opération dans votre portefeuille. Rien n'est envoyé au réseau tant que vous n'avez pas signé."
        : etat.phase === "attente"
          ? "Transaction diffusée. En attente de son inclusion dans un bloc."
          : etat.phase === "succes"
            ? "Opération confirmée par le réseau."
            : etat.message;

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-[rgba(12,14,13,.5)] p-6"
      role="dialog"
      aria-modal="true"
      onClick={() => !enCours && onFermer()}
    >
      <div
        className="w-full max-w-[468px] border border-line-2 bg-card shadow-[0_8px_28px_rgba(0,0,0,.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b-2 border-rule px-4 py-3">
          <span className="font-semibold">{operation.titre}</span>
          <span className="font-mono text-[11px] text-ink-3">
            {operation.code} · {CODES[etat.phase]}
          </span>
        </header>

        {etapes && etapes.length > 0 && (
          <div className="grid gap-2 border-b border-line px-4 py-3">
            {etapes.map((e, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-medium",
                    e.etat === "faite"
                      ? "bg-ok text-white"
                      : e.etat === "encours"
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface-3 text-ink-3"
                  )}
                >
                  {i + 1}
                </span>
                <span className="flex-1">{e.libelle}</span>
                <span className="text-[11px] text-ink-3">
                  {e.etat === "faite"
                    ? "faite"
                    : e.etat === "encours"
                      ? "en cours"
                      : "en attente"}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-3 px-4 py-3.5">
          <p
            className={cn(
              "text-pretty",
              etat.phase === "echec" ? "text-err" : "text-ink-2"
            )}
          >
            {message}
          </p>

          {etat.phase === "confirmation" && operation.lignes && (
            <div className="grid gap-px border border-line bg-line">
              {operation.lignes.map((l) => (
                <div
                  key={l.label}
                  className="flex justify-between gap-3 bg-surface-2 px-3 py-2"
                >
                  <span className="text-ink-2">{l.label}</span>
                  <span className="font-mono">{l.valeur}</span>
                </div>
              ))}
            </div>
          )}

          {"hash" in etat && etat.hash && (
            <div className="border border-line bg-surface-2 px-3 py-2.5">
              <div className="mb-1 text-[11px] text-ink-2">
                Hachage de transaction
              </div>
              <LienTransaction hash={etat.hash} />
            </div>
          )}
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
          {etat.phase === "confirmation" && (
            <>
              <button className={principal} onClick={onConfirmer}>
                Signer et envoyer
              </button>
              <button className={secondaire} onClick={onFermer}>
                Annuler
              </button>
            </>
          )}
          {enCours && (
            <span className="px-1 py-2 text-ink-3">
              {etat.phase === "signature"
                ? "En attente de votre signature…"
                : "En attente du réseau…"}
            </span>
          )}
          {termine && (
            <button className={principal} onClick={onFermer}>
              Fermer
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
