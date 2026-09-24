"use client";

import { toast } from "sonner";
import {
  formatToken,
  formatCountdown,
  formatDateTime,
  shortAddress,
} from "@/lib/format";
import { PAYROLL_ADDRESS } from "@/lib/contracts/config";
import {
  Panneau,
  Kpi,
  Bandeau,
  Tableau,
  Th,
  Td,
  Vide,
  Squelette,
  LienAdresse,
  LienTransaction,
} from "../ui-kit";
import { useMonEspace } from "../../hooks/use-mon-espace";
import { useEcheance } from "../../hooks/use-echeance";
import { useFiches } from "../../store/directory-store";
import type { Ecran } from "../AppShell";

/* ------------------------------------------------------------------ C1 */

export function VueSalarie({ onNaviguer }: { onNaviguer: (e: Ecran) => void }) {
  const { salaire, versements, totalPercu, enCours } = useMonEspace();
  const { restant, echue, prochaine } = useEcheance();

  const recents = versements.slice(0, 5);

  return (
    <>
      {echue && (
        <Bandeau ton="warn" titre="La paie est exigible et n'a pas été exécutée.">
          Le contrat ne connaît pas le retard : passé l&apos;échéance, il attend
          simplement qu&apos;une adresse déclenche le versement. Vous pouvez le faire
          vous-même.
        </Bandeau>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi
          label="Mon salaire par cycle"
          valeur={salaire !== undefined ? formatToken(salaire, false) : "…"}
          indice="tel qu'inscrit en chaîne"
        />
        <Kpi
          label="Versements reçus"
          valeur={enCours ? "…" : versements.length}
          indice={enCours ? "lecture des journaux…" : "depuis mon inscription"}
        />
        <Kpi
          label="Total perçu"
          valeur={enCours ? "…" : formatToken(totalPercu, false)}
          indice="cumul des versements"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panneau titre="Prochain versement">
          <div className="font-mono text-[28px] font-medium tracking-[-0.02em]">
            {restant === undefined
              ? "…"
              : (formatCountdown(restant) ?? "exigible maintenant")}
          </div>
          <p className="mt-1.5 text-ink-2">
            {prochaine !== undefined && <>Éligible le {formatDateTime(prochaine)}</>}
          </p>
          <div className="mt-4 flex justify-between border-t border-line pt-3">
            <span className="text-ink-2">Montant attendu</span>
            <span className="font-mono">
              {salaire !== undefined ? formatToken(salaire) : "…"}
            </span>
          </div>
          <p className="mt-3 text-[11px] text-ink-3">
            Si la paie n&apos;est pas exécutée alors qu&apos;elle est due et que les
            fonds sont là, vous pouvez la{" "}
            <button
              onClick={() => onNaviguer("C5")}
              className="text-primary underline underline-offset-2"
            >
              déclencher vous-même
            </button>
            .
          </p>
        </Panneau>

        <Panneau
          titre="Derniers versements reçus"
          action={
            <button
              onClick={() => onNaviguer("C2")}
              className="rounded-sm border border-line-2 bg-card px-2 py-1 text-xs hover:bg-surface-2"
            >
              Tout voir
            </button>
          }
        >
          {enCours ? (
            <Squelette lignes={4} />
          ) : recents.length === 0 ? (
            <Vide titre="Aucun versement">
              Votre première paie apparaîtra ici dès qu&apos;elle sera exécutée.
            </Vide>
          ) : (
            <div className="grid gap-1.5">
              {recents.map((v) => (
                <div
                  key={`${v.hash}-${v.logIndex}`}
                  className="flex items-center justify-between gap-3 border-b border-line pb-1.5 last:border-0"
                >
                  <span className="font-mono text-ink-2">{formatDateTime(v.date)}</span>
                  <span className="font-mono">{formatToken(v.montant!)}</span>
                  <LienTransaction hash={v.hash} />
                </div>
              ))}
            </div>
          )}
        </Panneau>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ C2 */

export function MesVersements() {
  const { versements, totalPercu, enCours } = useMonEspace();

  return (
    <Panneau titre={`Mes versements (${versements.length})`}>
      {enCours ? (
        <Squelette lignes={6} />
      ) : versements.length === 0 ? (
        <Vide titre="Aucun versement pour l'instant">
          Votre première paie apparaîtra ici dès qu&apos;elle sera exécutée. Le compte à
          rebours est visible sur votre vue d&apos;ensemble.
        </Vide>
      ) : (
        <Tableau>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th align="right">Montant</Th>
              <Th align="right">Transaction</Th>
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
              </tr>
            ))}
            <tr>
              <Td className="font-semibold">Total perçu</Td>
              <Td align="right" className="font-mono font-semibold">
                {formatToken(totalPercu)}
              </Td>
              <Td>{null}</Td>
            </tr>
          </tbody>
        </Tableau>
      )}
    </Panneau>
  );
}

/* ------------------------------------------------------------------ C4 */

export function MonProfil() {
  const { adresse, salaire } = useMonEspace();
  const fiches = useFiches();
  const fiche = adresse ? fiches[adresse.toLowerCase()] : undefined;

  return (
    <>
      <Panneau titre="Identité — hors chaîne, lecture seule">
        <dl className="grid gap-1.5">
          <Ligne label="Prénom" valeur={fiche?.prenom || "non renseigné"} />
          <Ligne label="Nom" valeur={fiche?.nom || "non renseigné"} />
          <Ligne label="Poste" valeur={fiche?.poste || "non renseigné"} />
          <Ligne label="Adresse électronique" valeur={fiche?.email || "non renseignée"} />
          <Ligne label="Date d'embauche" valeur={fiche?.embauche || "non renseignée"} />
          <Ligne
            label="Salaire par cycle"
            valeur={salaire !== undefined ? formatToken(salaire) : "…"}
          />
        </dl>
        <p className="mt-3 text-[11px] text-ink-3">
          Pour toute correction d&apos;identité, adressez-vous à l&apos;employeur : ces
          champs vivent hors de la chaîne. Seul le salaire, lui, y est inscrit — et
          reste donc immuable une fois versé.
        </p>
      </Panneau>

      <Panneau titre="Confidentialité">
        <p className="text-ink-2">
          Votre fiche n&apos;est consultable que par deux adresses : celle de
          l&apos;employeur, propriétaire du contrat, et la vôtre. Toute autre adresse
          reçoit un refus du contrat lui-même, et non de cette interface.
        </p>
        <p className="mt-2 text-ink-2">
          La réserve n&apos;est cependant pas totale, et il faut le dire. Chaque
          versement émet un événement public portant l&apos;adresse du bénéficiaire et
          le montant : n&apos;importe qui peut lire, dans les journaux de la chaîne,
          ce que reçoit chaque adresse et à quelle date. Ce que la confidentialité
          protège, c&apos;est le lien entre cette adresse et votre <em>nom</em>, qui
          n&apos;a jamais été inscrit en chaîne.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-ink-2">Mon adresse enregistrée</span>
          <span className="font-mono">{adresse ? shortAddress(adresse) : "…"}</span>
          <button
            className="rounded-sm border border-line-2 bg-card px-2 py-1 text-[11px] hover:bg-surface-2"
            onClick={async () => {
              await navigator.clipboard.writeText(adresse!);
              toast.success("Adresse copiée");
            }}
          >
            Copier
          </button>
          {adresse && <LienAdresse adresse={adresse} />}
        </div>

        <p className="mt-3 text-[11px] text-ink-3">
          Contrat de paie : <LienAdresse adresse={PAYROLL_ADDRESS} />
        </p>
      </Panneau>
    </>
  );
}

function Ligne({ label, valeur }: { label: string; valeur: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-line pb-1.5 last:border-0">
      <dt className="text-ink-2">{label}</dt>
      <dd>{valeur}</dd>
    </div>
  );
}
