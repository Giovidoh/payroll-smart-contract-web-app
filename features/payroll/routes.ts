import type { Ecran } from "./components/AppShell";
import type { Role } from "./hooks/use-payroll";

/**
 * L'écran courant était jusqu'ici un état de composant : l'adresse ne bougeait
 * pas, le bouton « précédent » du navigateur sortait de l'application, et un
 * rechargement ramenait sur la vue d'ensemble. Chaque écran a donc désormais
 * son chemin, et l'état est déduit de l'adresse plutôt que l'inverse.
 *
 * Les deux vues d'ensemble partagent le même chemin : une adresse n'ouvre
 * jamais qu'un seul des deux espaces, celui que le contrat lui reconnaît, et
 * le rôle suffit à lever l'ambiguïté.
 */
export const CHEMINS: Record<Ecran, string> = {
  B1: "/vue-d-ensemble",
  B2: "/salaries",
  B3: "/salaries/ajouter",
  B4: "/salaries/modifier",
  B5: "/salaries/retirer",
  B6: "/tresorerie",
  B7: "/execution-de-la-paie",
  B8: "/historique",
  B9: "/parametres",
  C1: "/vue-d-ensemble",
  C2: "/mes-versements",
  C3: "/mes-bulletins",
  C4: "/mon-profil",
  C5: "/declencher-la-paie",
};

/**
 * Un chemin qui n'appartient pas au rôle — cas d'un changement de compte dans
 * le portefeuille, ou d'une adresse saisie à la main — retombe sur la vue
 * d'ensemble de ce rôle plutôt que d'afficher un écran interdit.
 */
export function ecranDepuisChemin(chemin: string, role: Role): Ecran {
  const prefixe = role === "employeur" ? "B" : "C";
  const entrees = Object.entries(CHEMINS) as Array<[Ecran, string]>;
  const trouve = entrees.find(([e, c]) => e.startsWith(prefixe) && c === chemin);
  return trouve ? trouve[0] : role === "employeur" ? "B1" : "C1";
}
