"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PAYROLL_ADDRESS } from "@/lib/contracts/config";

/**
 * Répertoire hors chaîne.
 *
 * Le contrat ne stocke que `{ address, salary }` : le nom, le poste, la date
 * d'embauche et l'adresse électronique d'un salarié n'existent nulle part en
 * chaîne. Ce n'est pas un manque à combler mais une propriété à préserver — la
 * publicité des rémunérations est l'un des griefs retenus contre l'inscription
 * en chaîne. Ces informations restent donc du côté de l'employeur, et seule la
 * correspondance adresse → salaire est publique.
 *
 * Le répertoire est cloisonné par contrat : changer d'adresse de contrat ne
 * fait pas fuiter le personnel d'un déploiement dans un autre.
 */
export type FicheSalarie = {
  /** Adresse en chaîne, en minuscules, qui sert de clef. */
  address: string;
  prenom: string;
  nom: string;
  poste: string;
  email: string;
  /** Date d'embauche au format ISO (AAAA-MM-JJ). */
  embauche: string;
};

type Repertoire = Record<string, FicheSalarie>;

type DirectoryState = {
  /** Clef : adresse du contrat en minuscules. */
  parContrat: Record<string, Repertoire>;
  enregistrer: (fiche: FicheSalarie) => void;
  supprimer: (address: string) => void;
  lire: (address: string) => FicheSalarie | undefined;
  toutes: () => Repertoire;
};

const clefContrat = () => PAYROLL_ADDRESS.toLowerCase();

export const useDirectoryStore = create<DirectoryState>()(
  persist(
    (set, get) => ({
      parContrat: {},

      enregistrer: (fiche) =>
        set((s) => {
          const c = clefContrat();
          const a = fiche.address.toLowerCase();
          return {
            parContrat: {
              ...s.parContrat,
              [c]: { ...(s.parContrat[c] ?? {}), [a]: { ...fiche, address: a } },
            },
          };
        }),

      supprimer: (address) =>
        set((s) => {
          const c = clefContrat();
          const courant = { ...(s.parContrat[c] ?? {}) };
          delete courant[address.toLowerCase()];
          return { parContrat: { ...s.parContrat, [c]: courant } };
        }),

      lire: (address) => get().parContrat[clefContrat()]?.[address.toLowerCase()],

      toutes: () => get().parContrat[clefContrat()] ?? {},
    }),
    { name: "paie-blockchain.repertoire" }
  )
);

/** Nom affichable d'une adresse : la fiche si elle existe, sinon l'adresse abrégée. */
export function nomAffiche(fiche: FicheSalarie | undefined, address: string) {
  if (fiche && (fiche.prenom || fiche.nom)) {
    return `${fiche.prenom} ${fiche.nom}`.trim();
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Répertoire du contrat courant, réactif. */
export function useFiches(): Repertoire {
  return useDirectoryStore((s) => s.parContrat[clefContrat()] ?? VIDE);
}

const VIDE: Repertoire = {};
