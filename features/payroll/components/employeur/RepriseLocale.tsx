"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PAYROLL_ADDRESS } from "@/lib/contracts/config";
import { Panneau } from "../ui-kit";
import { useFiches, useEcrireFiche, type Fiche } from "../../hooks/use-directory";

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
const CLEF_MAGASIN = "paie-blockchain.repertoire";

type AncienneFiche = {
  address: string;
  prenom: string;
  nom: string;
  poste: string;
  email: string;
  embauche: string;
};

/** Lit le magasin local sans passer par zustand, qui n'a plus à exister ici. */
function lireMagasinLocal(): AncienneFiche[] {
  if (typeof window === "undefined") return [];
  try {
    const brut = window.localStorage.getItem(CLEF_MAGASIN);
    if (!brut) return [];
    const etat = JSON.parse(brut) as {
      state?: { parContrat?: Record<string, Record<string, AncienneFiche>> };
    };
    const pour = etat.state?.parContrat?.[PAYROLL_ADDRESS.toLowerCase()];
    return pour ? Object.values(pour) : [];
  } catch {
    // Un magasin illisible n'est pas une erreur à remonter : il n'y a rien à reprendre.
    return [];
  }
}

export default function RepriseLocale() {
  const [locales] = useState<AncienneFiche[]>(lireMagasinLocal);
  const [termine, setTermine] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const fiches = useFiches();
  const { enregistrer } = useEcrireFiche();

  // Seules comptent les fiches que la base ne connaît pas encore.
  const manquantes = locales.filter((f) => !fiches[f.address.toLowerCase()]);

  if (termine || manquantes.length === 0) return null;

  const reprendre = async () => {
    setEnCours(true);
    for (const f of manquantes) {
      enregistrer({ ...f, address: f.address.toLowerCase() } as Fiche);
    }
    setEnCours(false);
    setTermine(true);
    toast.success(
      `${manquantes.length} fiche${manquantes.length > 1 ? "s" : ""} transférée${manquantes.length > 1 ? "s" : ""} vers la base.`
    );
  };

  const oublier = () => {
    try {
      window.localStorage.removeItem(CLEF_MAGASIN);
    } catch {
      /* Un magasin inaccessible est déjà sans effet. */
    }
    setTermine(true);
    toast.success("Les fiches locales ont été effacées de ce navigateur.");
  };

  return (
    <Panneau titre="Fiches restées dans ce navigateur">
      <p className="mb-3 text-ink-2">
        {manquantes.length} identité{manquantes.length > 1 ? "s" : ""} enregistrée
        {manquantes.length > 1 ? "s" : ""} sur ce poste ne figure
        {manquantes.length > 1 ? "nt" : ""} pas dans la base. Tant qu&apos;elle
        {manquantes.length > 1 ? "s n'y sont" : " n'y est"} pas, les bulletins
        correspondants seront émis sans nom, et aucun autre poste ne
        {manquantes.length > 1 ? " les" : " la"} verra.
      </p>

      <ul className="mb-4 grid gap-1 text-[11px] text-ink-3">
        {manquantes.map((f) => (
          <li key={f.address} className="font-mono">
            {`${f.prenom} ${f.nom}`.trim() || "(sans nom)"} — {f.address.slice(0, 10)}…
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-sm border border-primary bg-primary px-3.5 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          disabled={enCours}
          onClick={reprendre}
        >
          {enCours ? "Transfert…" : "Transférer vers la base"}
        </button>
        <button
          className="rounded-sm border border-line-2 bg-card px-3.5 py-2 hover:bg-surface-2"
          onClick={oublier}
        >
          Effacer de ce navigateur
        </button>
      </div>

      <p className="mt-3 text-[11px] text-ink-3">
        Le transfert envoie ces noms vers la base hors chaîne. Rien n&apos;est
        inscrit sur la chaîne : les rémunérations y resteraient publiquement
        lisibles.
      </p>
    </Panneau>
  );
}
