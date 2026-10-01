import {
  identifier,
  UNAUTHENTICATED,
} from "@/lib/server/roles";
import { listStaff, readRecord } from "@/lib/server/employees";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Le personnel pour l'employeur, la seule fiche de l'intéressé pour un salarié.
 *
 * C'est la transposition exacte de la garde de `getEmployee` dans le contrat,
 * qui n'accepte que le propriétaire ou la personne concernée. Une adresse ni
 * l'un ni l'autre reçoit une liste vide, et non un refus : lui opposer une
 * erreur distincte apprendrait à un tiers qu'une fiche existe.
 */
export async function GET(): Promise<Response> {
  const caller = await identifier();
  if (!caller) return UNAUTHENTICATED();

  if (caller.isOwner) {
    return Response.json({ records: await listStaff(caller.contract) });
  }

  const ownRecord = await readRecord(caller.contract, caller.address);
  return Response.json({ records: ownRecord ? [ownRecord] : [] });
}
