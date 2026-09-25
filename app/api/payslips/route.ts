import { z } from "zod";
import { identifier, NON_AUTHENTIFIE, refus } from "@/lib/server/roles";
import { lire, ecrire } from "@/lib/server/db";
import { ADRESSE } from "@/lib/server/employees";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Registre de paie au sens de l'article 166 du Code du travail togolais, qui
 * impose non seulement la délivrance d'un bulletin individuel mais la tenue
 * d'un registre.
 *
 * Le registre ne conserve ni montant ni date de versement : ces données ne
 * viennent que des événements de la chaîne. Il consigne qu'un bulletin a été
 * émis, pour qui, et contre quelle inscription — le couple (hachage, index de
 * journal), puisqu'une exécution de la paie verse à tous les salariés dans une
 * transaction unique.
 */
type LigneRegistre = {
  adresse_ethereum: string;
  hash_transaction: string;
  numero_log: number;
  date_emission: string;
};

const SELECTION = `
  SELECT e.adresse_ethereum, b.hash_transaction, b.numero_log, b.date_emission
    FROM BulletinPaie b
    JOIN Employe e ON e.id = b.employe_id
   WHERE e.adresse_contrat = :contrat
`;

export async function GET(): Promise<Response> {
  const appelant = await identifier();
  if (!appelant) return NON_AUTHENTIFIE();

  const lignes = appelant.estProprietaire
    ? await lire<LigneRegistre>(`${SELECTION} ORDER BY b.date_emission DESC`, {
        contrat: appelant.contrat,
      })
    : await lire<LigneRegistre>(
        `${SELECTION} AND e.adresse_ethereum = :adresse ORDER BY b.date_emission DESC`,
        { contrat: appelant.contrat, adresse: appelant.adresse }
      );

  return Response.json({ bulletins: lignes });
}

const Emission = z.object({
  adresse: ADRESSE,
  hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, "Hachage de transaction invalide."),
  numeroLog: z.number().int().min(0),
});

/**
 * Consigne l'émission d'un bulletin. Idempotent : réémettre le même bulletin ne
 * crée pas une seconde entrée, puisque le registre atteste un versement, non un
 * téléchargement.
 */
export async function POST(requete: Request): Promise<Response> {
  const appelant = await identifier();
  if (!appelant) return NON_AUTHENTIFIE();

  const corps = Emission.safeParse(await requete.json().catch(() => null));
  if (!corps.success) {
    return Response.json(
      { erreur: corps.error.issues[0]?.message ?? "Requête mal formée." },
      { status: 400 }
    );
  }

  const beneficiaire = corps.data.adresse.toLowerCase();
  if (!appelant.estProprietaire && beneficiaire !== appelant.adresse) {
    return refus("Vous ne pouvez consigner que vos propres bulletins.", 403);
  }

  const { touchees } = await ecrire(
    `INSERT INTO BulletinPaie (employe_id, hash_transaction, numero_log)
     SELECT e.id, :hash, :numeroLog
       FROM Employe e
      WHERE e.adresse_contrat = :contrat AND e.adresse_ethereum = :adresse
     ON DUPLICATE KEY UPDATE numero_log = BulletinPaie.numero_log`,
    {
      hash: corps.data.hash.toLowerCase(),
      numeroLog: corps.data.numeroLog,
      contrat: appelant.contrat,
      adresse: beneficiaire,
    }
  );

  /*
   * Aucune ligne touchée signifie qu'aucune fiche ne correspond : le bulletin
   * porte alors sur une adresse payée par le contrat mais dont l'employeur n'a
   * pas renseigné l'identité. Le cas est réel — la chaîne paie des adresses,
   * pas des personnes — et il faut le dire plutôt que l'ignorer.
   */
  if (touchees === 0) {
    return refus(
      "Aucune identité n'est renseignée pour cette adresse : le bulletin ne peut pas être inscrit au registre.",
      409
    );
  }

  return Response.json({ inscrit: true });
}
