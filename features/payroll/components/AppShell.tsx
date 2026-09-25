"use client";

import { useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/format";
import { CHAIN } from "@/lib/contracts/config";
import type { Role } from "../hooks/use-payroll";

export type Ecran =
  | "B1" | "B2" | "B3" | "B4" | "B5" | "B6" | "B7" | "B8" | "B9" | "B10"
  | "C1" | "C2" | "C3" | "C4" | "C5";

export const TITRES: Record<Ecran, string> = {
  B1: "Vue d'ensemble",
  B2: "Salariés",
  B3: "Ajouter un salarié",
  B4: "Modifier un salaire",
  B5: "Retirer un salarié",
  B6: "Trésorerie",
  B7: "Exécution de la paie",
  B8: "Historique",
  B9: "Paramètres",
  B10: "Modifier une identité",
  C1: "Vue d'ensemble",
  C2: "Mes versements",
  C3: "Mes bulletins",
  C4: "Mon profil",
  C5: "Déclencher la paie",
};

const NAV_EMPLOYEUR: Ecran[] = ["B1", "B2", "B6", "B7", "B8", "B9"];
const NAV_SALARIE: Ecran[] = ["C1", "C2", "C3", "C4"];

/** Les sous-écrans B3/B4/B5 restent sous l'entrée « Salariés » dans la navigation. */
const GROUPE: Partial<Record<Ecran, Ecran>> = {
  B3: "B2",
  B4: "B2",
  B5: "B2",
  B10: "B2",
};

export default function AppShell({
  role,
  ecran,
  onNaviguer,
  children,
}: {
  role: Role;
  ecran: Ecran;
  onNaviguer: (e: Ecran) => void;
  children: React.ReactNode;
}) {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { theme, setTheme } = useTheme();
  const [menuOuvert, setMenuOuvert] = useState(false);

  const nav = role === "employeur" ? NAV_EMPLOYEUR : NAV_SALARIE;
  const actif = GROUPE[ecran] ?? ecran;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex max-w-[1240px] flex-col md:flex-row">
        {/* Colonne de navigation */}
        <aside className="shrink-0 border-line md:w-[220px] md:border-r">
          <div className="flex items-center justify-between px-4 py-4 md:block">
            <div>
              <div className="font-semibold">Paie Blockchain</div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                {role === "employeur" ? "Espace employeur" : "Espace salarié"}
              </div>
            </div>
            <button
              className="rounded-sm border border-line-2 px-2 py-1 md:hidden"
              onClick={() => setMenuOuvert((v) => !v)}
              aria-expanded={menuOuvert}
            >
              Menu
            </button>
          </div>

          <nav
            className={cn(
              "grid gap-1 px-3 pb-4",
              menuOuvert ? "grid" : "hidden md:grid"
            )}
          >
            {nav.map((e) => (
              <button
                key={e}
                onClick={() => {
                  onNaviguer(e);
                  setMenuOuvert(false);
                }}
                className={cn(
                  "rounded-sm border px-2.5 py-1.5 text-left",
                  actif === e
                    ? "border-line bg-surface-2 font-semibold shadow-[inset_2px_0_0_var(--primary)]"
                    : "border-transparent hover:bg-surface-2"
                )}
              >
                {TITRES[e]}
              </button>
            ))}

            {role === "salarie" && (
              <>
                <hr className="my-2 border-line" />
                <button
                  onClick={() => {
                    onNaviguer("C5");
                    setMenuOuvert(false);
                  }}
                  className={cn(
                    "rounded-sm border px-2.5 py-1.5 text-left",
                    ecran === "C5"
                      ? "border-line bg-surface-2 font-semibold shadow-[inset_2px_0_0_var(--primary)]"
                      : "border-transparent hover:bg-surface-2"
                  )}
                >
                  {TITRES.C5}
                </button>
              </>
            )}

            <hr className="my-2 border-line" />
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(address!);
                toast.success("Adresse copiée");
              }}
              title={address}
              className="rounded-sm border border-line bg-surface-2 px-2 py-1.5 text-left font-mono text-xs"
            >
              {address ? shortAddress(address) : ""}
            </button>
            <button
              onClick={() => disconnect()}
              className="rounded-sm px-2 py-1.5 text-left text-xs text-ink-2 hover:bg-surface-2"
            >
              Déconnecter
            </button>
          </nav>
        </aside>

        {/* Colonne principale */}
        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 md:px-6">
            <div>
              <div className="font-semibold">{TITRES[ecran]}</div>
              <div className="font-mono text-[11px] text-ink-3">
                {ecran} · {CHAIN.name}
              </div>
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-sm border border-line-2 bg-card px-2.5 py-1 text-xs hover:bg-surface-2"
            >
              {theme === "dark" ? "Clair" : "Sombre"}
            </button>
          </header>

          <main className="grid gap-4 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
