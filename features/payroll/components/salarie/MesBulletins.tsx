"use client";

import { toast } from "sonner";
import { formatToken, formatDateTime } from "@/lib/format";
import {
  Panneau,
  Tableau,
  Th,
  Td,
  Vide,
  Echec,
  Squelette,
  LienTransaction,
} from "../ui-kit";
import { useMonEspace } from "../../hooks/use-mon-espace";
import { useFiches } from "../../hooks/use-directory";
import { engendrerBulletin, nomFichierBulletin } from "../../lib/bulletin";

export default function MesBulletins() {
  const { versements, adresse, enCours, echecJournaux } = useMonEspace();
  const fiches = useFiches();
  const fiche = adresse ? fiches[adresse.toLowerCase()] : undefined;

  const telecharger = (montant: bigint, date: bigint, hash: string) => {
    try {
      const donnees = { salarie: fiche, adresse: adresse!, montant, date, hash };
      engendrerBulletin(donnees).save(nomFichierBulletin(donnees));
    } catch {
      toast.error("La génération du bulletin a échoué.");
    }
  };

  return (
    <Panneau titre={`Mes bulletins (${versements.length})`}>
      <p className="mb-3 text-ink-2">
        Un bulletin est produit pour chaque versement. Il est engendré hors chaîne, à
        la demande, et rattaché à la transaction qui l&apos;atteste : le document n&apos;est
        pas la preuve, il en est le reflet lisible.
      </p>

      {enCours ? (
        <Squelette lignes={5} />
      ) : echecJournaux ? (
        <Echec>
          Les journaux n&apos;ont pas pu être lus. Aucun bulletin ne peut être
          produit tant que les versements qu&apos;ils attestent restent
          inaccessibles.
        </Echec>
      ) : versements.length === 0 ? (
        <Vide titre="Aucun bulletin disponible">
          Un bulletin est produit après chaque paie exécutée. Le premier sera
          disponible dès votre premier versement.
        </Vide>
      ) : (
        <Tableau>
          <thead>
            <tr>
              <Th>Date du versement</Th>
              <Th align="right">Montant</Th>
              <Th align="right">Transaction</Th>
              <Th align="right">Document</Th>
            </tr>
          </thead>
          <tbody>
            {versements.map((v) => (
              <tr key={`${v.hash}-${v.logIndex}`}>
                <Td className="whitespace-nowrap font-mono text-ink-2">
                  {formatDateTime(v.date)}
                </Td>
                <Td align="right" className="font-mono">
                  {formatToken(v.montant!)}
                </Td>
                <Td align="right">
                  <LienTransaction hash={v.hash} />
                </Td>
                <Td align="right">
                  <button
                    onClick={() => telecharger(v.montant!, v.date, v.hash)}
                    className="rounded-sm border border-line-2 bg-card px-2 py-1 text-[11px] hover:bg-surface-2"
                  >
                    Télécharger
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Tableau>
      )}
    </Panneau>
  );
}
