import { CHAIN } from "@/lib/contracts/config";
import { Panel } from "@/components/panel";

/** Mise en page des écrans d'entrée : connexion, réseau, signature. */
export function GateLayout({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-5">
          <h1 className="text-lg font-semibold">Paie Blockchain</h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
            Contrat Payroll · réseau {CHAIN.name}
          </p>
        </div>

        <Panel title={title}>{children}</Panel>

        {footer}
      </div>
    </main>
  );
}
