"use client";

import { useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { shortAddress } from "@/lib/format";
import { CHAIN } from "@/lib/contracts/config";
import type { Role } from "../hooks/use-payroll";

export type ScreenCode =
  | "B1" | "B2" | "B3" | "B4" | "B5" | "B6" | "B7" | "B8" | "B9" | "B10"
  | "C1" | "C2" | "C3" | "C4" | "C5";

export const TITLES: Record<ScreenCode, string> = {
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

const EMPLOYER_NAV: ScreenCode[] = ["B1", "B2", "B6", "B7", "B8", "B9"];
const EMPLOYEE_NAV: ScreenCode[] = ["C1", "C2", "C3", "C4"];

/** Les sous-écrans B3/B4/B5 restent sous l'entrée « Salariés » dans la navigation. */
const GROUP: Partial<Record<ScreenCode, ScreenCode>> = {
  B3: "B2",
  B4: "B2",
  B5: "B2",
  B10: "B2",
};

export default function AppShell({
  role,
  screen,
  onNavigate,
  children,
}: {
  role: Role;
  screen: ScreenCode;
  onNavigate: (e: ScreenCode) => void;
  children: React.ReactNode;
}) {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = role === "employer" ? EMPLOYER_NAV : EMPLOYEE_NAV;
  const active = GROUP[screen] ?? screen;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex max-w-[1240px] flex-col md:flex-row">
        {/* Colonne de navigation */}
        <aside className="shrink-0 border-line md:w-[220px] md:border-r">
          <div className="flex items-center justify-between px-4 py-4 md:block">
            <div>
              <div className="font-semibold">Paie Blockchain</div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                {role === "employer" ? "Espace employeur" : "Espace salarié"}
              </div>
            </div>
            <Button
              variant="outline"
              size="none"
              className="px-2 py-1 md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
            >
              Menu
            </Button>
          </div>

          <nav
            className={cn(
              "grid gap-1 px-3 pb-4",
              menuOpen ? "grid" : "hidden md:grid"
            )}
          >
            {nav.map((e) => (
              <NavItem
                key={e}
                active={active === e}
                onClick={() => {
                  onNavigate(e);
                  setMenuOpen(false);
                }}
              >
                {TITLES[e]}
              </NavItem>
            ))}

            {role === "employee" && (
              <>
                <hr className="my-2 border-line" />
                <NavItem
                  active={screen === "C5"}
                  onClick={() => {
                    onNavigate("C5");
                    setMenuOpen(false);
                  }}
                >
                  {TITLES.C5}
                </NavItem>
              </>
            )}

            <hr className="my-2 border-line" />
            <CopyButton
              value={address}
              toastMessage="Adresse copiée"
              variant="secondary"
              size="none"
              title={address}
              className="border-line bg-surface-2 px-2 py-1.5 text-left font-mono text-xs"
            >
              {address ? shortAddress(address) : ""}
            </CopyButton>
            <Button
              variant="ghost"
              size="none"
              onClick={() => disconnect()}
              className="px-2 py-1.5 text-left text-xs text-ink-2"
            >
              Déconnecter
            </Button>
          </nav>
        </aside>

        {/* Colonne principale */}
        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 md:px-6">
            <div>
              <div className="font-semibold">{TITLES[screen]}</div>
              <div className="font-mono text-[11px] text-ink-3">
                {CHAIN.name}
              </div>
            </div>
            <ThemeToggle />
          </header>

          <main className="grid gap-4 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

function NavItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-sm border px-2.5 py-1.5 text-left",
        active
          ? "border-line bg-surface-2 font-semibold shadow-[inset_2px_0_0_var(--primary)]"
          : "border-transparent hover:bg-surface-2"
      )}
    >
      {children}
    </button>
  );
}
