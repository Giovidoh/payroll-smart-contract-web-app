import { identifier, NON_AUTHENTIFIE, RESERVE_EMPLOYEUR, refus } from "@/lib/server/roles";
import {
  ADRESSE,
  FicheEntrante,
  enregistrerFiche,
  lireFiche,
  supprimerFiche,
} from "@/lib/server/employees";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexte = { params: Promise<{ address: string }> };

export async function GET(_: Request, { params }: Contexte): Promise<Response> {
  const appelant = await identifier();
  if (!appelant) return NON_AUTHENTIFIE();

  const adresse = ADRESSE.safeParse((await params).address);
  if (!adresse.success) return refus("Adresse invalide.", 400);

  const voulue = adresse.data.toLowerCase();

  // La garde du contrat, à l'identique : le propriétaire, ou l'intéressé.
  if (!appelant.estProprietaire && voulue !== appelant.adresse) {
    return refus("Vous ne pouvez consulter que votre propre fiche.", 403);
  }

  const fiche = await lireFiche(appelant.contrat, voulue);
  if (!fiche) return refus("Aucune fiche pour cette adresse.", 404);
  return Response.json({ fiche });
}

/**
 * L'employeur seul tient le répertoire. Laisser le salarié amender sa propre
 * fiche serait défendable, mais changerait la nature du document : le bulletin
 * cesserait d'être établi par l'employeur, qui en répond.
 */
export async function PUT(requete: Request, { params }: Contexte): Promise<Response> {
  const appelant = await identifier();
  if (!appelant) return NON_AUTHENTIFIE();
  if (!appelant.estProprietaire) return RESERVE_EMPLOYEUR();

  const adresse = ADRESSE.safeParse((await params).address);
  if (!adresse.success) return refus("Adresse invalide.", 400);

  const corps = FicheEntrante.safeParse(await requete.json().catch(() => null));
  if (!corps.success) {
    return Response.json(
      { erreur: corps.error.issues[0]?.message ?? "Fiche mal formée." },
      { status: 400 }
    );
  }

  await enregistrerFiche(appelant.contrat, adresse.data, corps.data);
  return Response.json({ fiche: await lireFiche(appelant.contrat, adresse.data) });
}

export async function DELETE(_: Request, { params }: Contexte): Promise<Response> {
  const appelant = await identifier();
  if (!appelant) return NON_AUTHENTIFIE();
  if (!appelant.estProprietaire) return RESERVE_EMPLOYEUR();

  const adresse = ADRESSE.safeParse((await params).address);
  if (!adresse.success) return refus("Adresse invalide.", 400);

  const retiree = await supprimerFiche(appelant.contrat, adresse.data);
  return Response.json({ retiree });
}
