import type { Ecran } from "./components/AppShell";
import type { Role } from "./hooks/use-payroll";

/**
 * L'écran courant était jusqu'ici un état de composant : l'adresse ne bougeait
 * pas, le bouton « précédent » du navigateur sortait de l'application, et un
 * rechargement ramenait sur la vue d'ensemble. Chaque écran a donc désormais
 * son chemin, et l'état est déduit de l'adresse plutôt que l'inverse.
 *
 * Les chemins sont en anglais, comme le reste du code et comme le contrat
 * lui-même ; seuls les libellés affichés sont en français.
 *
 * Deux paires de chemins sont partagées entre les rôles — l'accueil, et le
 * déclenchement de la paie, que le contrat ouvre aux deux. Ce n'est pas une
 * ambiguïté : une adresse n'ouvre jamais qu'un seul des deux espaces, celui
 * que le contrat lui reconnaît.
 */
export const CHEMINS: Record<Ecran, string> = {
  B1: "/overview",
  B2: "/employees",
  B3: "/employees/add",
  B4: "/employees/edit-salary",
  B5: "/employees/remove",
  B6: "/treasury",
  B7: "/run-payroll",
  B8: "/history",
  B9: "/settings",
  C1: "/overview",
  C2: "/my-payments",
  C3: "/my-payslips",
  C4: "/my-profile",
  C5: "/run-payroll",
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
