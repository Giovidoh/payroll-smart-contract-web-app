"use client";

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
import { useEmettreBulletin, useRegistre, repere } from "../../hooks/use-bulletins";

export default function MesBulletins() {
  const { versements, adresse, enCours, echecJournaux } = useMonEspace();
  const emettre = useEmettreBulletin();
  const { emis } = useRegistre();

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
                    onClick={() =>
                      emettre({
                        adresse: adresse!,
                        montant: v.montant!,
                        date: v.date,
                        hash: v.hash,
                        logIndex: v.logIndex,
                      })
                    }
                    className="rounded-sm border border-line-2 bg-card px-2 py-1 text-[11px] hover:bg-surface-2"
                  >
                    Télécharger
                  </button>
                  {emis.has(repere(v.hash, v.logIndex)) && (
                    <span
                      className="ml-2 text-[11px] text-ink-3"
                      title="Ce bulletin est inscrit au registre de paie."
                    >
                      inscrit
                    </span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Tableau>
      )}
    </Panneau>
  );
}
