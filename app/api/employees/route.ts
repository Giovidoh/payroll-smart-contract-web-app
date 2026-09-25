import {
  identifier,
  NON_AUTHENTIFIE,
} from "@/lib/server/roles";
import { listerPersonnel, lireFiche } from "@/lib/server/employees";

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
  const appelant = await identifier();
  if (!appelant) return NON_AUTHENTIFIE();

  if (appelant.estProprietaire) {
    return Response.json({ fiches: await listerPersonnel(appelant.contrat) });
  }

  const sienne = await lireFiche(appelant.contrat, appelant.adresse);
  return Response.json({ fiches: sienne ? [sienne] : [] });
}
