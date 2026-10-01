"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CardHeader } from "@/components/ui/card";
import { TxLink } from "@/components/explorer-link";
import type { TxState, TxStep, Operation } from "../hooks/use-transaction";

const CODES: Record<TxState["phase"], string> = {
  idle: "",
  confirmation: "D1",
  signature: "D2",
  waiting: "D2",
  success: "D3",
  failure: "D4",
};

export default function TransactionDialog({
  operation,
  state,
  steps,
  onConfirm,
  onClose,
}: {
  operation: Operation | null;
  state: TxState;
  steps?: TxStep[];
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!operation || state.phase === "idle") return null;

  const busy = state.phase === "signature" || state.phase === "waiting";
  const done = state.phase === "success" || state.phase === "failure";

  const message =
    state.phase === "confirmation"
      ? operation.message
      : state.phase === "signature"
        ? "Confirmez l'opération dans votre portefeuille. Rien n'est envoyé au réseau tant que vous n'avez pas signé."
        : state.phase === "waiting"
          ? "Transaction diffusée. En attente de son inclusion dans un bloc."
          : state.phase === "success"
            ? "Opération confirmée par le réseau."
            : state.message;

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-[rgba(12,14,13,.5)] p-6"
      role="dialog"
      aria-modal="true"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-[468px] border border-line-2 bg-card shadow-[0_8px_28px_rgba(0,0,0,.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <span className="font-semibold">{operation.title}</span>
          <span className="font-mono text-[11px] text-ink-3">
            {operation.code} · {CODES[state.phase]}
          </span>
        </CardHeader>

        {steps && steps.length > 0 && (
          <div className="grid gap-2 border-b border-line px-4 py-3">
            {steps.map((e, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-medium",
                    e.state === "done"
                      ? "bg-ok text-white"
                      : e.state === "active"
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface-3 text-ink-3"
                  )}
                >
                  {i + 1}
                </span>
                <span className="flex-1">{e.label}</span>
                <span className="text-[11px] text-ink-3">
                  {e.state === "done"
                    ? "done"
                    : e.state === "active"
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
              state.phase === "failure" ? "text-err" : "text-ink-2"
            )}
          >
            {message}
          </p>

          {state.phase === "confirmation" && operation.rows && (
            <div className="grid gap-px border border-line bg-line">
              {operation.rows.map((l) => (
                <div
                  key={l.label}
                  className="flex justify-between gap-3 bg-surface-2 px-3 py-2"
                >
                  <span className="text-ink-2">{l.label}</span>
                  <span className="font-mono">{l.value}</span>
                </div>
              ))}
            </div>
          )}

          {"hash" in state && state.hash && (
            <div className="border border-line bg-surface-2 px-3 py-2.5">
              <div className="mb-1 text-[11px] text-ink-2">
                Hachage de transaction
              </div>
              <TxLink hash={state.hash} />
            </div>
          )}
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
          {state.phase === "confirmation" && (
            <>
              <Button onClick={onConfirm}>Signer et envoyer</Button>
              <Button variant="secondary" onClick={onClose}>
                Annuler
              </Button>
            </>
          )}
          {busy && (
            <span className="px-1 py-2 text-ink-3">
              {state.phase === "signature"
                ? "En attente de votre signature…"
                : "En attente du réseau…"}
            </span>
          )}
          {done && (
            <Button onClick={onClose}>Fermer</Button>
          )}
        </footer>
      </div>
    </div>
  );
}
