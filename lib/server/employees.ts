import "server-only";

import { z } from "zod";
import { lire, ecrire } from "./db";

/**
 * Accès au répertoire hors chaîne. Aucune de ces fonctions ne décide d'un droit :
 * l'autorisation est tranchée dans la route, à partir du rôle lu sur la chaîne.
 */
export type LigneEmploye = {
  id: number;
  adresse_ethereum: string;
  nom: string;
  prenom: string;
  poste: string;
  email: string;
  date_embauche: string | null;
};

const COLONNES = `
  id, adresse_ethereum, nom, prenom, poste, email, date_embauche
`;

export const FicheEntrante = z.object({
  nom: z.string().trim().min(1, "Le nom est obligatoire.").max(80),
  prenom: z.string().trim().min(1, "Le prénom est obligatoire.").max(80),
  poste: z.string().trim().max(120).default(""),
  email: z.union([z.literal(""), z.email("Adresse électronique invalide.")]).default(""),
  /** Date ISO (AAAA-MM-JJ), ou vide. */
  embauche: z
    .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.")])
    .default(""),
});

export type FicheEntrante = z.infer<typeof FicheEntrante>;

export const ADRESSE = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Adresse invalide.");

export async function listerPersonnel(contrat: string): Promise<LigneEmploye[]> {
  return lire<LigneEmploye>(
    `SELECT ${COLONNES} FROM Employe
      WHERE adresse_contrat = :contrat
      ORDER BY nom, prenom`,
    { contrat }
  );
}

export async function lireFiche(
  contrat: string,
  adresse: string
): Promise<LigneEmploye | null> {
  const lignes = await lire<LigneEmploye>(
    `SELECT ${COLONNES} FROM Employe
      WHERE adresse_contrat = :contrat AND adresse_ethereum = :adresse`,
    { contrat, adresse: adresse.toLowerCase() }
  );
  return lignes[0] ?? null;
}

/**
 * Crée ou met à jour. La clef unique porte sur le couple (contrat, adresse) :
 * c'est elle, et non un identifiant fourni par l'appelant, qui détermine la
 * ligne touchée.
 */
export async function enregistrerFiche(
  contrat: string,
  adresse: string,
  fiche: FicheEntrante
): Promise<void> {
  await ecrire(
    `INSERT INTO Employe
       (adresse_contrat, adresse_ethereum, nom, prenom, poste, email, date_embauche)
     VALUES
       (:contrat, :adresse, :nom, :prenom, :poste, :email, :embauche)
     ON DUPLICATE KEY UPDATE
       nom = VALUES(nom),
       prenom = VALUES(prenom),
       poste = VALUES(poste),
       email = VALUES(email),
       date_embauche = VALUES(date_embauche)`,
    {
      contrat,
      adresse: adresse.toLowerCase(),
      nom: fiche.nom,
      prenom: fiche.prenom,
      poste: fiche.poste,
      email: fiche.email,
      embauche: fiche.embauche || null,
    }
  );
}

/**
 * Retire une fiche du répertoire. Sans effet sur la chaîne : le retrait d'un
 * salarié du contrat est une transaction distincte, et les versements passés
 * demeurent inscrits. Effacer l'identité n'efface donc pas l'historique, elle
 * le rend seulement anonyme — ce qui est précisément ce que le droit à
 * l'effacement peut obtenir d'un dispositif dont la chaîne est immuable.
 */
export async function supprimerFiche(
  contrat: string,
  adresse: string
): Promise<boolean> {
  const { touchees } = await ecrire(
    `DELETE FROM Employe
      WHERE adresse_contrat = :contrat AND adresse_ethereum = :adresse`,
    { contrat, adresse: adresse.toLowerCase() }
  );
  return touchees > 0;
}
