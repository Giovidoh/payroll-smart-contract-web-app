"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { CHAIN } from "@/lib/contracts/config";
import AppShell, { type Ecran } from "./AppShell";
import ConnexionEcran from "./ConnexionEcran";
import DialogueTransaction from "./DialogueTransaction";
import { Squelette } from "./ui-kit";
import { useRole } from "../hooks/use-payroll";
import { useMonte } from "../hooks/use-monte";
import { useTransaction } from "../hooks/use-transaction";

import VueEnsemble from "./employeur/VueEnsemble";
import Salaries from "./employeur/Salaries";
import Tresorerie from "./employeur/Tresorerie";
import ExecutionPaie from "./employeur/ExecutionPaie";
import Historique from "./employeur/Historique";
import Parametres from "./employeur/Parametres";

import { VueSalarie, MesVersements, MonProfil } from "./salarie/MonEspace";
import MesBulletins from "./salarie/MesBulletins";
import DeclencherPaie from "./salarie/DeclencherPaie";

export default function Application() {
  const { isConnected, chainId } = useAccount();
  const { role, enCours } = useRole();
  const monte = useMonte();
  const [choisi, setChoisi] = useState<Ecran | null>(null);

  const tx = useTransaction();

  if (!monte) return null;

  if (!isConnected || chainId !== CHAIN.id || role === "inconnu" || !role) {
    if (enCours) {
      return (
        <main className="mx-auto grid max-w-md gap-3 p-10">
          <Squelette lignes={4} />
        </main>
      );
    }
    return <ConnexionEcran />;
  }

  const demander = tx.demander;

  /*
   * L'écran courant se déduit du rôle plutôt que d'être poussé par un effet :
   * tant que l'utilisateur n'a rien choisi, ou s'il a choisi un écran qui
   * n'appartient pas à son rôle — cas d'un changement de compte dans le
   * portefeuille —, on retombe sur la vue d'ensemble correspondante.
   */
  const prefixe = role === "employeur" ? "B" : "C";
  const ecran: Ecran =
    choisi && choisi.startsWith(prefixe) ? choisi : role === "employeur" ? "B1" : "C1";

  return (
    <>
      <AppShell role={role} ecran={ecran} onNaviguer={setChoisi}>
        {role === "employeur" ? (
          <>
            {ecran === "B1" && <VueEnsemble onNaviguer={setChoisi} />}
            {(ecran === "B2" || ecran === "B3" || ecran === "B4" || ecran === "B5") && (
              <Salaries onDemander={demander} />
            )}
            {ecran === "B6" && <Tresorerie onDemander={demander} />}
            {ecran === "B7" && <ExecutionPaie onDemander={demander} />}
            {ecran === "B8" && <Historique />}
            {ecran === "B9" && <Parametres onDemander={demander} />}
          </>
        ) : (
          <>
            {ecran === "C1" && <VueSalarie onNaviguer={setChoisi} />}
            {ecran === "C2" && <MesVersements />}
            {ecran === "C3" && <MesBulletins />}
            {ecran === "C4" && <MonProfil />}
            {ecran === "C5" && <DeclencherPaie onDemander={demander} />}
          </>
        )}
      </AppShell>

      <DialogueTransaction
        operation={tx.operation}
        etat={tx.etat}
        etapes={tx.etapes}
        onFermer={tx.fermer}
        onConfirmer={async () => {
          const ok = await tx.executer();
          if (ok) toast.success("Opération confirmée par le réseau.");
        }}
      />
    </>
  );
}
