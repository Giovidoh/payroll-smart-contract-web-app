"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { CHAIN } from "@/lib/contracts/config";
import AppShell, { type Ecran } from "./AppShell";
import ConnexionEcran from "./ConnexionEcran";
import SignatureEcran from "./SignatureEcran";
import DialogueTransaction from "./DialogueTransaction";
import { Squelette } from "./ui-kit";
import { useRole } from "../hooks/use-payroll";
import { useSession } from "../hooks/use-session";
import { useMonte } from "../hooks/use-monte";
import { useTransaction } from "../hooks/use-transaction";
import { CHEMINS, ecranDepuisChemin } from "../routes";

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
  const { isConnected, chainId, status } = useAccount();
  const { role, enCours } = useRole();
  const session = useSession();
  const monte = useMonte();
  const router = useRouter();
  const chemin = usePathname();

  const tx = useTransaction();

  /*
   * La racine n'est l'adresse d'aucun écran : dès que le rôle est connu, on la
   * remplace par le chemin canonique de l'accueil — sans empiler d'entrée dans
   * l'historique, pour que « précédent » ne ramène pas sur une adresse morte.
   */
  useEffect(() => {
    if (role && role !== "inconnu" && chemin === "/") {
      router.replace(CHEMINS[role === "employeur" ? "B1" : "C1"]);
    }
  }, [role, chemin, router]);

  if (!monte) return null;

  /*
   * Au rechargement, wagmi rétablit la connexion au portefeuille de façon
   * asynchrone : pendant cet intervalle, `isConnected` est faux alors que le
   * compte est bel et bien autorisé. Afficher l'écran de connexion à ce
   * moment-là revient à demander de se connecter à quelqu'un qui l'est déjà —
   * c'est le clignotement observé entre le rechargement et le tableau de bord.
   */
  if (status === "reconnecting" || status === "connecting") return <Attente />;

  /*
   * L'écran de connexion passe avant toute attente : tant que le portefeuille
   * n'est pas connecté au bon réseau, il n'y a rien à attendre de la chaîne, et
   * afficher un squelette reviendrait à faire patienter indéfiniment quelqu'un
   * qui doit d'abord agir — se connecter, ou basculer de réseau.
   */
  if (!isConnected || chainId !== CHAIN.id) return <ConnexionEcran />;

  if (!role) {
    if (enCours) return <Attente />;
    return <ConnexionEcran />;
  }

  if (role === "inconnu") return <ConnexionEcran />;

  /*
   * La session hors chaîne vient après le rôle, et non avant : le rôle se lit
   * sur la chaîne, gratuitement et sans rien demander à personne. Une adresse
   * que le contrat ne reconnaît pas n'a donc pas à signer quoi que ce soit —
   * ce serait lui faire payer une étape pour un espace auquel elle n'accède
   * pas.
   */
  if (session.enCours) return <Attente texte="Vérification de la session…" />;
  if (!session.active) return <SignatureEcran />;

  const demander = tx.demander;
  const naviguer = (e: Ecran) => router.push(CHEMINS[e]);
  const ecran = ecranDepuisChemin(chemin, role);

  return (
    <>
      <AppShell role={role} ecran={ecran} onNaviguer={naviguer}>
        {role === "employeur" ? (
          <>
            {ecran === "B1" && <VueEnsemble onNaviguer={naviguer} />}
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
            {ecran === "C1" && <VueSalarie onNaviguer={naviguer} />}
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

function Attente({ texte = "Lecture du rôle sur la chaîne…" }: { texte?: string }) {
  return (
    <main className="mx-auto grid max-w-md gap-3 p-10">
      <Squelette lignes={4} />
      <p className="text-ink-2">{texte}</p>
    </main>
  );
}
