"use client";

import { cn } from "@/lib/utils";
import { EXPLORER_BASE } from "@/lib/contracts/config";
import { shortAddress, shortHash } from "@/lib/format";

/** Bloc encadré, filet supérieur épais : la signature visuelle du système Modernist. */
export function Panneau({
  titre,
  action,
  className,
  children,
}: {
  titre?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("border border-line bg-card", className)}>
      {titre && (
        <header className="flex items-center justify-between gap-3 border-b-2 border-rule px-4 py-3">
          <h2 className="font-semibold">{titre}</h2>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Kpi({
  label,
  valeur,
  indice,
}: {
  label: string;
  valeur: React.ReactNode;
  indice?: string;
}) {
  return (
    <div className="border border-line bg-card p-3">
      <div className="mb-1.5 text-[11px] text-ink-2">{label}</div>
      <div className="font-mono text-[19px] font-medium tracking-[-0.01em]">
        {valeur}
      </div>
      {indice && <div className="mt-1 text-[11px] text-ink-3">{indice}</div>}
    </div>
  );
}

type Ton = "ok" | "warn" | "err" | "accent" | "neutre";

const TONS: Record<Ton, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  err: "bg-err-bg text-err",
  accent: "bg-tint text-primary",
  neutre: "bg-surface-3 text-ink-2",
};

export function Etiquette({
  ton = "neutre",
  children,
}: {
  ton?: Ton;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[11px] font-medium",
        TONS[ton]
      )}
    >
      {children}
    </span>
  );
}

/** Bandeau explicatif en tête d'écran : dit à l'utilisateur où il en est. */
export function Bandeau({
  ton = "neutre",
  titre,
  children,
}: {
  ton?: Ton;
  titre: string;
  children?: React.ReactNode;
}) {
  const bord: Record<Ton, string> = {
    ok: "border-ok/35 bg-ok-bg",
    warn: "border-warn/35 bg-warn-bg",
    err: "border-err/35 bg-err-bg",
    accent: "border-primary/25 bg-tint",
    neutre: "border-line bg-surface-2",
  };
  return (
    <div className={cn("border px-4 py-3", bord[ton])}>
      <span className="font-semibold">{titre}</span>
      {children && <span className="text-ink-2"> {children}</span>}
    </div>
  );
}

export function LienAdresse({ adresse }: { adresse: string }) {
  return (
    <a
      href={`${EXPLORER_BASE}/address/${adresse}`}
      target="_blank"
      rel="noreferrer"
      title={adresse}
      className="font-mono text-primary underline decoration-primary/40 underline-offset-2"
    >
      {shortAddress(adresse)}
    </a>
  );
}

export function LienTransaction({ hash }: { hash: string }) {
  return (
    <a
      href={`${EXPLORER_BASE}/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      title={hash}
      className="font-mono text-primary underline decoration-primary/40 underline-offset-2"
    >
      {shortHash(hash)}
    </a>
  );
}

/**
 * Une lecture de journaux qui échoue ne doit pas se lire comme une absence
 * d'événements. C'est ici la trace probatoire des versements : annoncer « aucun
 * événement » quand le point d'accès a refusé la requête serait affirmer qu'il
 * n'a jamais été payé, ce que rien ne permet de dire.
 */
export function Echec({ children }: { children?: React.ReactNode }) {
  return (
    <div className="grid place-items-center gap-1.5 px-4 py-12 text-center">
      <div className="font-semibold text-err">
        L&apos;historique n&apos;a pas pu être lu
      </div>
      <p className="max-w-md text-ink-2">
        {children ?? (
          <>
            Le point d&apos;accès au réseau a refusé la lecture des journaux. Ce
            n&apos;est pas une absence de versements : c&apos;est une absence de
            réponse. Rien ne peut être conclu de cet écran tant qu&apos;il
            affiche ce message.
          </>
        )}
      </p>
    </div>
  );
}

export function Vide({
  titre,
  children,
}: {
  titre: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid place-items-center gap-1.5 px-4 py-12 text-center">
      <div className="font-semibold">{titre}</div>
      {children && (
        <p className="max-w-md text-ink-2">{children}</p>
      )}
    </div>
  );
}

export function Squelette({ lignes = 5 }: { lignes?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: lignes }).map((_, i) => (
        <div
          key={i}
          className="h-8 animate-pulse bg-surface-2"
          style={{ animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}

/** Tableau dense, aligné sur la maquette : filet fin, en-tête discret. */
export function Tableau({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  );
}

export function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "border-b border-line bg-surface-2 px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3",
        align === "right" && "text-right"
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={cn(
        "border-b border-line px-3.5 py-2.5",
        align === "right" && "text-right",
        className
      )}
    >
      {children}
    </td>
  );
}

/**
 * Astérisque des champs obligatoires. Un champ marqué conditionne l'opération :
 * sans lui le bouton reste inactif, ou le contrat opposerait un refus. Les
 * champs non marqués — nom, poste, adresse électronique — sont les seules
 * informations hors chaîne, et elles sont facultatives par construction.
 *
 * L'astérisque est décorative ; la mention lisible par les lecteurs d'écran est
 * portée par le texte masqué qui l'accompagne.
 */
export function Requis() {
  return (
    <>
      <span aria-hidden="true" className="text-err">
        {" *"}
      </span>
      <span className="sr-only"> (obligatoire)</span>
    </>
  );
}
