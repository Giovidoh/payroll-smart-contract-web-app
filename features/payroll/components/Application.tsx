"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { CHAIN } from "@/lib/contracts/config";
import AppShell, { type ScreenCode } from "./AppShell";
import ConnectScreen from "./ConnectScreen";
import SignInScreen from "./SignInScreen";
import TransactionDialog from "./TransactionDialog";
import { SkeletonRows } from "@/components/skeleton-rows";
import { useRole } from "../hooks/use-payroll";
import { useSession } from "../hooks/use-session";
import { useMounted } from "../hooks/use-mounted";
import { useTransaction } from "../hooks/use-transaction";
import { PATHS, screenFromPath } from "../routes";

import Overview from "./employer/Overview";
import Employees from "./employer/Employees";
import Treasury from "./employer/Treasury";
import PayrollRun from "./employer/PayrollRun";
import PayrollHistory from "./employer/History";
import Settings from "./employer/Settings";

import { EmployeeView, MyPayments, MyProfile } from "./employee/MyOverview";
import MyPayslips from "./employee/MyPayslips";
import TriggerPayroll from "./employee/TriggerPayroll";

export default function Application() {
  const { isConnected, chainId, status } = useAccount();
  const { role, busy } = useRole();
  const session = useSession();
  const mounted = useMounted();
  const router = useRouter();
  const path = usePathname();

  const tx = useTransaction();

  /*
   * La racine n'est l'adresse d'aucun écran : dès que le rôle est connu, on la
   * remplace par le chemin canonique de l'accueil — sans empiler d'entrée dans
   * l'historique, pour que « précédent » ne ramène pas sur une adresse morte.
   */
  useEffect(() => {
    if (role && role !== "unknown" && path === "/") {
      router.replace(PATHS[role === "employer" ? "B1" : "C1"]);
    }
  }, [role, path, router]);

  if (!mounted) return null;

  /*
   * Au rechargement, wagmi rétablit la connexion au portefeuille de façon
   * asynchrone : pendant cet intervalle, `isConnected` est faux alors que le
   * compte est bel et bien autorisé. Afficher l'écran de connexion à ce
   * moment-là revient à demander de se connecter à quelqu'un qui l'est déjà —
   * c'est le clignotement observé entre le rechargement et le tableau de bord.
   */
  if (status === "reconnecting" || status === "connecting") return <Waiting />;

  /*
   * L'écran de connexion passe avant toute attente : tant que le portefeuille
   * n'est pas connecté au bon réseau, il n'y a rien à attendre de la chaîne, et
   * afficher un squelette reviendrait à faire patienter indéfiniment quelqu'un
   * qui doit d'abord agir — se connecter, ou basculer de réseau.
   */
  if (!isConnected || chainId !== CHAIN.id) return <ConnectScreen />;

  if (!role) {
    if (busy) return <Waiting />;
    return <ConnectScreen />;
  }

  if (role === "unknown") return <ConnectScreen />;

  /*
   * La session hors chaîne vient après le rôle, et non avant : le rôle se lit
   * sur la chaîne, gratuitement et sans rien demander à personne. Une adresse
   * que le contrat ne reconnaît pas n'a donc pas à signer quoi que ce soit —
   * ce serait lui faire payer une étape pour un espace auquel elle n'accède
   * pas.
   */
  if (session.busy) return <Waiting text="Vérification de la session…" />;
  if (!session.active) return <SignInScreen />;

  const requestOperation = tx.requestOperation;
  const navigate = (e: ScreenCode) => router.push(PATHS[e]);
  const currentScreen = screenFromPath(path, role);

  return (
    <>
      <AppShell role={role} screen={currentScreen} onNavigate={navigate}>
        {role === "employer" ? (
          <>
            {currentScreen === "B1" && <Overview onNavigate={navigate} />}
            {(currentScreen === "B2" ||
              currentScreen === "B3" ||
              currentScreen === "B4" ||
              currentScreen === "B5" ||
              currentScreen === "B10") && <Employees onRequest={requestOperation} />}
            {currentScreen === "B6" && <Treasury onRequest={requestOperation} />}
            {currentScreen === "B7" && <PayrollRun onRequest={requestOperation} />}
            {currentScreen === "B8" && <PayrollHistory />}
            {currentScreen === "B9" && <Settings onRequest={requestOperation} />}
          </>
        ) : (
          <>
            {currentScreen === "C1" && <EmployeeView onNavigate={navigate} />}
            {currentScreen === "C2" && <MyPayments />}
            {currentScreen === "C3" && <MyPayslips />}
            {currentScreen === "C4" && <MyProfile />}
            {currentScreen === "C5" && <TriggerPayroll onRequest={requestOperation} />}
          </>
        )}
      </AppShell>

      <TransactionDialog
        operation={tx.operation}
        state={tx.state}
        steps={tx.steps}
        onClose={tx.close}
        onConfirm={async () => {
          const ok = await tx.run();
          if (ok) toast.success("Opération confirmée par le réseau.");
        }}
      />
    </>
  );
}

function Waiting({ text = "Lecture du rôle sur la chaîne…" }: { text?: string }) {
  return (
    <main className="mx-auto grid max-w-md gap-3 p-10">
      <SkeletonRows rows={4} />
      <p className="text-ink-2">{text}</p>
    </main>
  );
}
