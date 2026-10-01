"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PAYROLL_ADDRESS } from "@/lib/contracts/config";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/hint";
import { useRecords, useWriteRecord, type EmployeeRecord } from "../../hooks/use-directory";

/**
 * Reprise des fiches restées dans le navigateur.
 *
 * Jusqu'ici le répertoire vivait dans le magasin local du poste de l'employeur.
 * Les identités y demeurent tant que personne ne décide de les transférer, et
 * ce transfert ne doit pas avoir lieu tout seul : envoyer des données
 * nominatives vers un serveur sans le dire serait exactement le reproche que le
 * chapitre 6 adresse aux dispositifs centralisés.
 *
 * L'encart n'apparaît donc que s'il reste quelque chose à reprendre, et rien ne
 * part sans un geste explicite.
 */
const STORE_KEY = "paie-blockchain.repertoire";

type LegacyRecord = {
  address: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  hireDate: string;
};

/** Lit le magasin local sans passer par zustand, qui n'a plus à exister ici. */
function readLocalStore(): LegacyRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const state = JSON.parse(raw) as {
      state?: { byContract?: Record<string, Record<string, LegacyRecord>> };
    };
    const forContract = state.state?.byContract?.[PAYROLL_ADDRESS.toLowerCase()];
    return forContract ? Object.values(forContract) : [];
  } catch {
    // Un magasin illisible n'est pas une erreur à remonter : il n'y a rien à reprendre.
    return [];
  }
}

export default function LocalImport() {
  const [locales] = useState<LegacyRecord[]>(readLocalStore);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const records = useRecords();
  const { save } = useWriteRecord();

  // Seules comptent les fiches que la base ne connaît pas encore.
  const missing = locales.filter((f) => !records[f.address.toLowerCase()]);

  if (done || missing.length === 0) return null;

  const importRecords = async () => {
    setBusy(true);
    for (const f of missing) {
      save({ ...f, address: f.address.toLowerCase() } as EmployeeRecord);
    }
    setBusy(false);
    setDone(true);
    toast.success(
      `${missing.length} fiche${missing.length > 1 ? "s" : ""} transférée${missing.length > 1 ? "s" : ""} vers la base.`
    );
  };

  const forget = () => {
    try {
      window.localStorage.removeItem(STORE_KEY);
    } catch {
      /* Un magasin inaccessible est déjà sans effet. */
    }
    setDone(true);
    toast.success("Les fiches locales ont été effacées de ce navigateur.");
  };

  return (
    <Panel title="Fiches restées dans ce navigateur">
      <p className="mb-3 text-ink-2">
        {missing.length} identité{missing.length > 1 ? "s" : ""} enregistrée
        {missing.length > 1 ? "s" : ""} sur ce poste ne figure
        {missing.length > 1 ? "nt" : ""} pas dans la base. Tant qu&apos;elle
        {missing.length > 1 ? "s n'y sont" : " n'y est"} pas, les bulletins
        correspondants seront émis sans nom, et aucun autre poste ne
        {missing.length > 1 ? " les" : " la"} verra.
      </p>

      <ul className="mb-4 grid gap-1 text-[11px] text-ink-3">
        {missing.map((f) => (
          <li key={f.address} className="font-mono">
            {`${f.firstName} ${f.lastName}`.trim() || "(sans nom)"} — {f.address.slice(0, 10)}…
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={importRecords}>
          {busy ? "Transfert…" : "Transférer vers la base"}
        </Button>
        <Button variant="secondary" onClick={forget}>
          Effacer de ce navigateur
        </Button>
      </div>

      <Hint className="mt-3">
        Le transfert envoie ces noms vers la base hors chaîne. Rien n&apos;est
        inscrit sur la chaîne : les rémunérations y resteraient publiquement
        lisibles.
      </Hint>
    </Panel>
  );
}
