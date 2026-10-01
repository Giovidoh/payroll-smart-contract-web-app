import "server-only";

import { z } from "zod";
import { read, write } from "./db";

/**
 * Accès au répertoire hors chaîne. Aucune de ces fonctions ne décide d'un droit :
 * l'autorisation est tranchée dans la route, à partir du rôle lu sur la chaîne.
 */
export type EmployeeRow = {
  id: number;
  address: string;
  lastName: string;
  firstName: string;
  jobTitle: string;
  email: string;
  hireDate: string | null;
};

/**
 * Le schéma garde ses noms de colonnes, ceux que décrit le mémoire ; le code
 * les lit sous des noms anglais.
 */
const COLUMNS = `
  id,
  adresse_ethereum AS address,
  nom AS lastName,
  prenom AS firstName,
  poste AS jobTitle,
  email,
  date_embauche AS hireDate
`;

export const IncomingRecord = z.object({
  lastName: z.string().trim().min(1, "Le nom est obligatoire.").max(80),
  firstName: z.string().trim().min(1, "Le prénom est obligatoire.").max(80),
  jobTitle: z.string().trim().max(120).default(""),
  email: z.union([z.literal(""), z.email("Adresse électronique invalide.")]).default(""),
  /** Date ISO (AAAA-MM-JJ), ou vide. */
  hireDate: z
    .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.")])
    .default(""),
});

export type EmployeeInput = z.infer<typeof IncomingRecord>;

export const ADDRESS = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Adresse invalide.");

export async function listStaff(contract: string): Promise<EmployeeRow[]> {
  return read<EmployeeRow>(
    `SELECT ${COLUMNS} FROM Employe
      WHERE adresse_contrat = :contract
      ORDER BY nom, prenom`,
    { contract }
  );
}

export async function readRecord(
  contract: string,
  address: string
): Promise<EmployeeRow | null> {
  const rows = await read<EmployeeRow>(
    `SELECT ${COLUMNS} FROM Employe
      WHERE adresse_contrat = :contract AND adresse_ethereum = :address`,
    { contract, address: address.toLowerCase() }
  );
  return rows[0] ?? null;
}

/**
 * Crée ou met à jour. La clef unique porte sur le couple (contrat, adresse) :
 * c'est elle, et non un identifiant fourni par l'appelant, qui détermine la
 * ligne touchée.
 */
export async function saveRecord(
  contract: string,
  address: string,
  record: EmployeeInput
): Promise<void> {
  await write(
    `INSERT INTO Employe
       (adresse_contrat, adresse_ethereum, nom, prenom, poste, email, date_embauche)
     VALUES
       (:contract, :address, :lastName, :firstName, :jobTitle, :email, :hireDate)
     ON DUPLICATE KEY UPDATE
       nom = VALUES(nom),
       prenom = VALUES(prenom),
       poste = VALUES(poste),
       email = VALUES(email),
       date_embauche = VALUES(date_embauche)`,
    {
      contract,
      address: address.toLowerCase(),
      lastName: record.lastName,
      firstName: record.firstName,
      jobTitle: record.jobTitle,
      email: record.email,
      hireDate: record.hireDate || null,
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
export async function deleteRecord(
  contract: string,
  address: string
): Promise<boolean> {
  const { affected } = await write(
    `DELETE FROM Employe
      WHERE adresse_contrat = :contract AND adresse_ethereum = :address`,
    { contract, address: address.toLowerCase() }
  );
  return affected > 0;
}
