import { identifier, UNAUTHENTICATED, OWNER_ONLY, reject } from "@/lib/server/roles";
import {
  ADDRESS,
  IncomingRecord,
  saveRecord,
  readRecord,
  deleteRecord,
} from "@/lib/server/employees";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ address: string }> };

export async function GET(_: Request, { params }: Context): Promise<Response> {
  const caller = await identifier();
  if (!caller) return UNAUTHENTICATED();

  const address = ADDRESS.safeParse((await params).address);
  if (!address.success) return reject("Adresse invalide.", 400);

  const target = address.data.toLowerCase();

  // La garde du contrat, à l'identique : le propriétaire, ou l'intéressé.
  if (!caller.isOwner && target !== caller.address) {
    return reject("Vous ne pouvez consulter que votre propre fiche.", 403);
  }

  const record = await readRecord(caller.contract, target);
  if (!record) return reject("Aucune fiche pour cette adresse.", 404);
  return Response.json({ record });
}

/**
 * L'employeur seul tient le répertoire. Laisser le salarié amender sa propre
 * fiche serait défendable, mais changerait la nature du document : le bulletin
 * cesserait d'être établi par l'employeur, qui en répond.
 */
export async function PUT(request: Request, { params }: Context): Promise<Response> {
  const caller = await identifier();
  if (!caller) return UNAUTHENTICATED();
  if (!caller.isOwner) return OWNER_ONLY();

  const address = ADDRESS.safeParse((await params).address);
  if (!address.success) return reject("Adresse invalide.", 400);

  const body = IncomingRecord.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json(
      { error: body.error.issues[0]?.message ?? "Fiche mal formée." },
      { status: 400 }
    );
  }

  await saveRecord(caller.contract, address.data, body.data);
  return Response.json({ record: await readRecord(caller.contract, address.data) });
}

export async function DELETE(_: Request, { params }: Context): Promise<Response> {
  const caller = await identifier();
  if (!caller) return UNAUTHENTICATED();
  if (!caller.isOwner) return OWNER_ONLY();

  const address = ADDRESS.safeParse((await params).address);
  if (!address.success) return reject("Adresse invalide.", 400);

  const removed = await deleteRecord(caller.contract, address.data);
  return Response.json({ removed });
}
