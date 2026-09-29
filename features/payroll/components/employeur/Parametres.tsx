"use client";

import { useState } from "react";
import { isAddress, type Address } from "viem";
import { useReadContract } from "wagmi";
import { payrollAbi } from "@/lib/contracts/payroll-abi";
import {
  PAYROLL_ADDRESS,
  TOKEN_ADDRESS,
  TOKEN_SYMBOL,
  TOKEN_DECIMALS,
  CHAIN,
} from "@/lib/contracts/config";
import { formatInterval, formatDateTime, shortAddress } from "@/lib/format";
import { Panel } from "@/components/panel";
import { AddressLink } from "@/components/explorer-link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DetailList, DetailItem } from "@/components/detail-list";
import { FormField, FieldError } from "@/components/form-field";
import { Hint } from "@/components/hint";
import { useParametres, useOwner } from "../../hooks/use-payroll";
import type { Operation } from "../../hooks/use-transaction";

export default function Parametres({
  onDemander,
}: {
  onDemander: (o: Operation) => void;
}) {
  const { intervalle, cyclesReserves, dernierePaie } = useParametres();
  const { data: owner } = useOwner();
  const { data: enAttente } = useReadContract({
    abi: payrollAbi,
    address: PAYROLL_ADDRESS,
    functionName: "pendingOwner",
    query: { refetchInterval: 12_000 },
  });

  const [nouveau, setNouveau] = useState("");
  const valide = isAddress(nouveau);
  const memeQueActuel =
    valide && owner && nouveau.toLowerCase() === owner.toLowerCase();

  const transfertEnCours =
    enAttente && enAttente !== "0x0000000000000000000000000000000000000000";

  return (
    <>
      <Panel title="Déploiement — lecture seule">
        <DetailList>
          <DetailItem ruled label="Réseau">{`${CHAIN.name} (id ${CHAIN.id})`}</DetailItem>
          <DetailItem ruled label="Contrat Payroll">{<AddressLink address={PAYROLL_ADDRESS} />}</DetailItem>
          <DetailItem ruled label="Jeton de règlement">{<AddressLink address={TOKEN_ADDRESS} />}</DetailItem>
          <DetailItem ruled label="Symbole / décimales">{`${TOKEN_SYMBOL} · ${TOKEN_DECIMALS}`}</DetailItem>
          <DetailItem ruled label="Intervalle minimal entre deux paies">
            {intervalle !== undefined ? formatInterval(intervalle) : "…"}
            </DetailItem>
          <DetailItem ruled label="Cycles de paie réservés">
            {cyclesReserves !== undefined ? String(cyclesReserves) : "…"}
            </DetailItem>
          <DetailItem ruled label="Horodatage de la dernière paie">
            {dernierePaie ? formatDateTime(dernierePaie) : "…"}
            </DetailItem>
          <DetailItem ruled label="Propriétaire">
            {owner ? <AddressLink address={owner} /> : "…"}
            </DetailItem>
        </DetailList>

        <Hint className="mt-3">
          Ces paramètres sont fixés au déploiement et ne peuvent pas être modifiés
          depuis l&apos;interface : ils sont déclarés <code className="font-mono">immutable</code>{" "}
          dans le contrat. Les changer suppose de déployer un nouveau contrat.
        </Hint>
      </Panel>

      {transfertEnCours && (
        <Alert tone="warn" title="Transfert de propriété en attente.">
          {shortAddress(enAttente!)} a été proposé comme nouveau propriétaire et n&apos;a
          pas encore accepté. Vous restez propriétaire jusque-là.
        </Alert>
      )}

      <Panel title="Transfert de propriété — deux étapes">
        <p className="mb-3 text-ink-2">
          Le contrat impose un transfert en deux temps : vous proposez une adresse,
          puis son détenteur accepte depuis son propre portefeuille. Une adresse saisie
          par erreur ne peut donc pas emporter le contrat, puisqu&apos;elle ne pourra
          jamais accepter.
        </p>

        <FormField label="Adresse du nouveau propriétaire" required>
          <Input
            value={nouveau}
            onChange={(e) => setNouveau(e.target.value)}
            placeholder="0x…"
            className="font-mono"
          />
        </FormField>
        {nouveau && !valide && <FieldError className="mt-1">Adresse invalide.</FieldError>}
        {memeQueActuel && (
          <FieldError className="mt-1">C&apos;est déjà le propriétaire actuel.</FieldError>
        )}

        <Button
          className="mt-4"
          disabled={!valide || Boolean(memeQueActuel)}
          onClick={() =>
            onDemander({
              titre: "Proposer le transfert de propriété",
              code: "B9",
              message:
                "Vous proposez le transfert. Vous restez propriétaire tant que le destinataire n'a pas accepté depuis son portefeuille.",
              lignes: [{ label: "Destinataire", valeur: shortAddress(nouveau) }],
              appels: [
                {
                  cible: "payroll",
                  fonction: "transferOwnership",
                  args: [nouveau as Address],
                },
              ],
            })
          }
        >
          Proposer le transfert
        </Button>
      </Panel>
    </>
  );
}

