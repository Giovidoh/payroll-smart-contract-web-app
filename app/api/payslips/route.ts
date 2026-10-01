import { z } from "zod";
import { identifier, UNAUTHENTICATED, reject } from "@/lib/server/roles";
import { read, write } from "@/lib/server/db";
import { ADDRESS } from "@/lib/server/employees";

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
type RegistryRow = {
  address: string;
  txHash: string;
  logIndex: number;
  issuedAt: string;
};

const SELECTION = `
  SELECT e.adresse_ethereum AS address, b.hash_transaction AS txHash,
         b.numero_log AS logIndex, b.date_emission AS issuedAt
    FROM BulletinPaie b
    JOIN Employe e ON e.id = b.employe_id
   WHERE e.adresse_contrat = :contract
`;

export async function GET(): Promise<Response> {
  const caller = await identifier();
  if (!caller) return UNAUTHENTICATED();

  const rows = caller.isOwner
    ? await read<RegistryRow>(`${SELECTION} ORDER BY b.date_emission DESC`, {
        contract: caller.contract,
      })
    : await read<RegistryRow>(
        `${SELECTION} AND e.adresse_ethereum = :address ORDER BY b.date_emission DESC`,
        { contract: caller.contract, address: caller.address }
      );

  return Response.json({ payslips: rows });
}

const Issuance = z.object({
  address: ADDRESS,
  hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, "Hachage de transaction invalide."),
  logIndex: z.number().int().min(0),
});

/**
 * Consigne l'émission d'un bulletin. Idempotent : réémettre le même bulletin ne
 * crée pas une seconde entrée, puisque le registre atteste un versement, non un
 * téléchargement.
 */
export async function POST(request: Request): Promise<Response> {
  const caller = await identifier();
  if (!caller) return UNAUTHENTICATED();

  const body = Issuance.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json(
      { error: body.error.issues[0]?.message ?? "Requête mal formée." },
      { status: 400 }
    );
  }

  const recipient = body.data.address.toLowerCase();
  if (!caller.isOwner && recipient !== caller.address) {
    return reject("Vous ne pouvez consigner que vos propres bulletins.", 403);
  }

  const { affected } = await write(
    `INSERT INTO BulletinPaie (employe_id, hash_transaction, numero_log)
     SELECT e.id, :hash, :logIndex
       FROM Employe e
      WHERE e.adresse_contrat = :contract AND e.adresse_ethereum = :address
     ON DUPLICATE KEY UPDATE numero_log = BulletinPaie.numero_log`,
    {
      hash: body.data.hash.toLowerCase(),
      logIndex: body.data.logIndex,
      contract: caller.contract,
      address: recipient,
    }
  );

  /*
   * Aucune ligne touchée signifie qu'aucune fiche ne correspond : le bulletin
   * porte alors sur une adresse payée par le contrat mais dont l'employeur n'a
   * pas renseigné l'identité. Le cas est réel — la chaîne paie des adresses,
   * pas des personnes — et il faut le dire plutôt que l'ignorer.
   */
  if (affected === 0) {
    return reject(
      "Aucune identité n'est renseignée pour cette adresse : le bulletin ne peut pas être inscrit au registre.",
      409
    );
  }

  return Response.json({ registered: true });
}
