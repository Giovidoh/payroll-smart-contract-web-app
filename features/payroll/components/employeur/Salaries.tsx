"use client";

import { useMemo, useState } from "react";
import { isAddress, type Address } from "viem";
import { toast } from "sonner";
import { formatToken, parseTokenOrNull, shortAddress } from "@/lib/format";
import { TOKEN_SYMBOL } from "@/lib/contracts/config";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableHead,
  TableCell,
  TableHeader,
  TableBody,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { SkeletonRows } from "@/components/skeleton-rows";
import { AddressLink } from "@/components/explorer-link";
import { DetailList, DetailItem } from "@/components/detail-list";
import { FormField, FieldError, RequiredLegend } from "@/components/form-field";
import { Hint } from "@/components/hint";
import { useSalaries } from "../../hooks/use-payroll";
import {
  useFiches,
  useEcrireFiche,
  nomAffiche,
  type Fiche,
} from "../../hooks/use-directory";
import RepriseLocale from "./RepriseLocale";
import type { Operation } from "../../hooks/use-transaction";

type Panneaux =
  | null
  | { mode: "ajout" }
  | { mode: "salaire" | "retrait" | "identite"; adresse: Address };

export default function Salaries({
  onDemander,
}: {
  onDemander: (o: Operation) => void;
}) {
  const { data: salaries, isLoading } = useSalaries();
  const fiches = useFiches();
  const { enregistrer, supprimer } = useEcrireFiche();

  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<"nom" | "salaire" | "adresse">("salaire");
  const [panneau, setPanneau] = useState<Panneaux>(null);

  const lignes = useMemo(() => {
    const base = (salaries ?? []).map((e) => {
      const fiche = fiches[e.employeeAddress.toLowerCase()];
      return {
        adresse: e.employeeAddress,
        salaire: e.salary,
        fiche,
        nom: nomAffiche(fiche, e.employeeAddress),
        poste: fiche?.poste ?? "—",
      };
    });

    const q = recherche.trim().toLowerCase();
    const filtre = q
      ? base.filter(
          (l) =>
            l.nom.toLowerCase().includes(q) ||
            l.poste.toLowerCase().includes(q) ||
            l.adresse.toLowerCase().includes(q)
        )
      : base;

    return [...filtre].sort((a, b) =>
      tri === "salaire"
        ? Number(b.salaire - a.salaire)
        : tri === "nom"
          ? a.nom.localeCompare(b.nom, "fr")
          : a.adresse.localeCompare(b.adresse)
    );
  }, [salaries, fiches, recherche, tri]);

  const total = lignes.reduce((s, l) => s + l.salaire, 0n);

  return (
    <>
      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un nom, un poste, une adresse"
            className="min-w-[220px] flex-1"
          />
          <NativeSelect value={tri} onChange={(e) => setTri(e.target.value as typeof tri)}>
            <option value="salaire">Trier par salaire</option>
            <option value="nom">Trier par nom</option>
            <option value="adresse">Trier par adresse</option>
          </NativeSelect>
          <Button onClick={() => setPanneau({ mode: "ajout" })}>Ajouter un salarié</Button>
        </div>
      </Panel>

      <RepriseLocale />

      {panneau?.mode === "ajout" && (
        <PanneauAjout
          onFermer={() => setPanneau(null)}
          onDemander={onDemander}
          onFiche={enregistrer}
          dejaInscrites={new Set((salaries ?? []).map((e) => e.employeeAddress.toLowerCase()))}
        />
      )}

      {panneau?.mode === "salaire" && (
        <PanneauSalaire
          adresse={panneau.adresse}
          actuel={lignes.find((l) => l.adresse === panneau.adresse)?.salaire}
          nom={lignes.find((l) => l.adresse === panneau.adresse)?.nom ?? ""}
          onFermer={() => setPanneau(null)}
          onDemander={onDemander}
        />
      )}

      {panneau?.mode === "identite" && (
        <PanneauIdentite
          adresse={panneau.adresse}
          fiche={fiches[panneau.adresse.toLowerCase()]}
          onFermer={() => setPanneau(null)}
          onFiche={enregistrer}
        />
      )}

      {panneau?.mode === "retrait" && (
        <PanneauRetrait
          adresse={panneau.adresse}
          nom={lignes.find((l) => l.adresse === panneau.adresse)?.nom ?? ""}
          onFermer={() => setPanneau(null)}
          onDemander={onDemander}
          onOublier={supprimer}
        />
      )}

      <Panel title={`Salariés inscrits (${lignes.length})`}>
        {isLoading ? (
          <SkeletonRows rows={6} />
        ) : lignes.length === 0 ? (
          <EmptyState title="Aucun salarié inscrit">
            Ajoutez une première adresse pour que la paie ait des bénéficiaires. Tant
            que la liste est vide, la masse salariale est nulle et une exécution ne
            verserait rien.
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Salarié</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead align="right">Salaire</TableHead>
                <TableHead align="right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes.map((l) => (
                <TableRow key={l.adresse}>
                  <TableCell className="font-medium">{l.nom}</TableCell>
                  <TableCell className="text-ink-2">{l.poste}</TableCell>
                  <TableCell>
                    <AddressLink address={l.adresse} />
                  </TableCell>
                  <TableCell align="right" className="whitespace-nowrap font-mono">
                    {formatToken(l.salaire)}
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => setPanneau({ mode: "identite", adresse: l.adresse })}
                      >
                        Identité
                      </Button>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => setPanneau({ mode: "salaire", adresse: l.adresse })}
                      >
                        Salaire
                      </Button>
                      <Button
                        variant="secondary"
                        size="xs"
                        className="text-err"
                        onClick={() => setPanneau({ mode: "retrait", adresse: l.adresse })}
                      >
                        Retirer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-semibold">Masse salariale</TableCell>
                <TableCell>{null}</TableCell>
                <TableCell>{null}</TableCell>
                <TableCell align="right" className="font-mono font-semibold">
                  {formatToken(total)}
                </TableCell>
                <TableCell>{null}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}

/** Boutons de pied de formulaire : l'action, puis l'abandon. */
function ActionsFormulaire({
  children,
  onAnnuler,
}: {
  children: React.ReactNode;
  onAnnuler: () => void;
}) {
  return (
    <div className="mt-4 flex gap-2">
      {children}
      <Button variant="secondary" className="px-3" onClick={onAnnuler}>
        Annuler
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ B3 */

function PanneauAjout({
  onFermer,
  onDemander,
  onFiche,
  dejaInscrites,
}: {
  onFermer: () => void;
  onDemander: (o: Operation) => void;
  onFiche: (f: {
    address: string;
    prenom: string;
    nom: string;
    poste: string;
    email: string;
    embauche: string;
  }) => Promise<boolean>;
  dejaInscrites: Set<string>;
}) {
  const [adresse, setAdresse] = useState("");
  const [salaire, setSalaire] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [poste, setPoste] = useState("");
  const [email, setEmail] = useState("");
  const [embauche, setEmbauche] = useState("");

  const adresseValide = isAddress(adresse);
  const dejaLa = adresseValide && dejaInscrites.has(adresse.toLowerCase());
  const montant = parseTokenOrNull(salaire);

  const pret = adresseValide && !dejaLa && montant !== null && montant > 0n;

  return (
    <Panel title="Ajouter un salarié">
      <p className="mb-4 text-ink-2">
        Seuls l&apos;adresse et le salaire sont inscrits en chaîne. Le nom, le poste et
        l&apos;adresse électronique restent dans ce navigateur : les porter en chaîne
        rendrait publique la rémunération de personnes nommées.
      </p>
      <RequiredLegend />

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Adresse du portefeuille" required className="sm:col-span-2">
          <Input
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder="0x…"
            className="font-mono"
          />
          {adresse && !adresseValide && <FieldError>Adresse invalide.</FieldError>}
          {dejaLa && <FieldError>Cette adresse est déjà inscrite.</FieldError>}
        </FormField>

        <FormField label={`Salaire par cycle (${TOKEN_SYMBOL})`} required>
          <Input
            value={salaire}
            onChange={(e) => setSalaire(e.target.value)}
            inputMode="decimal"
            placeholder="1250,00"
            className="font-mono"
          />
        </FormField>

        <FormField label="Date d'embauche">
          <Input type="date" value={embauche} onChange={(e) => setEmbauche(e.target.value)} />
        </FormField>

        <FormField label="Prénom">
          <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} />
        </FormField>
        <FormField label="Nom">
          <Input value={nom} onChange={(e) => setNom(e.target.value)} />
        </FormField>
        <FormField label="Poste">
          <Input value={poste} onChange={(e) => setPoste(e.target.value)} />
        </FormField>
        <FormField label="Adresse électronique">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
      </div>

      <ActionsFormulaire onAnnuler={onFermer}>
        <Button
          disabled={!pret}
          onClick={() => {
            onDemander({
              titre: "Ajouter un salarié",
              code: "B3",
              message:
                "Le contrat inscrira cette adresse et son salaire. La masse salariale augmentera d'autant, et la réserve immobilisée avec elle.",
              lignes: [
                { label: "Adresse", valeur: shortAddress(adresse) },
                { label: "Salaire par cycle", valeur: formatToken(montant!) },
              ],
              appels: [
                {
                  cible: "payroll",
                  fonction: "addEmployee",
                  args: [adresse as Address, montant!],
                },
              ],
              apres: async () => {
                await onFiche({ address: adresse, prenom, nom, poste, email, embauche });
              },
            });
            onFermer();
          }}
        >
          Inscrire le salarié
        </Button>
      </ActionsFormulaire>
    </Panel>
  );
}

/* ------------------------------------------------------------------ B4 */

function PanneauSalaire({
  adresse,
  actuel,
  nom,
  onFermer,
  onDemander,
}: {
  adresse: Address;
  actuel?: bigint;
  nom: string;
  onFermer: () => void;
  onDemander: (o: Operation) => void;
}) {
  const [saisie, setSaisie] = useState("");
  const montant = parseTokenOrNull(saisie);

  const inchange = montant !== null && actuel !== undefined && montant === actuel;
  const pret = montant !== null && montant > 0n && !inchange;

  return (
    <Panel title={`Modifier le salaire — ${nom}`}>
      <DetailList className="mb-3">
        <DetailItem label="Salaire actuel">
          {actuel !== undefined ? formatToken(actuel) : "…"}
        </DetailItem>
      </DetailList>

      <FormField label={`Nouveau salaire (${TOKEN_SYMBOL})`} required>
        <Input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          inputMode="decimal"
          className="font-mono"
        />
      </FormField>
      {inchange && (
        <FieldError className="mt-1">
          Identique au salaire actuel : le contrat rejetterait l&apos;opération.
        </FieldError>
      )}

      <ActionsFormulaire onAnnuler={onFermer}>
        <Button
          disabled={!pret}
          onClick={() => {
            onDemander({
              titre: "Modifier un salaire",
              code: "B4",
              message:
                "Le nouveau salaire s'appliquera dès le prochain cycle. Les versements déjà effectués ne sont pas rétroactivement modifiés — la chaîne ne réécrit pas le passé.",
              lignes: [
                { label: "Salarié", valeur: shortAddress(adresse) },
                {
                  label: "Ancien salaire",
                  valeur: actuel !== undefined ? formatToken(actuel) : "—",
                },
                { label: "Nouveau salaire", valeur: formatToken(montant!) },
              ],
              appels: [
                { cible: "payroll", fonction: "updateSalary", args: [adresse, montant!] },
              ],
            });
            onFermer();
          }}
        >
          Enregistrer le nouveau salaire
        </Button>
      </ActionsFormulaire>
    </Panel>
  );
}

/* ------------------------------------------------------------------ B5 */

function PanneauRetrait({
  adresse,
  nom,
  onFermer,
  onDemander,
  onOublier,
}: {
  adresse: Address;
  nom: string;
  onFermer: () => void;
  onDemander: (o: Operation) => void;
  onOublier: (a: string) => Promise<boolean>;
}) {
  const [confirmation, setConfirmation] = useState("");
  const pret = confirmation.trim().toUpperCase() === "RETIRER";

  return (
    <Panel title={`Retirer un salarié — ${nom}`}>
      <p className="mb-3 text-ink-2">
        Le retrait est définitif et prend effet immédiatement : dès la prochaine
        exécution, cette adresse ne recevra plus rien. Les versements passés restent
        inscrits en chaîne et demeurent consultables — c&apos;est ce qui fait leur
        valeur probatoire.
      </p>
      <p className="mb-3 text-ink-2">
        L&apos;identité hors chaîne sera effacée de la base, mais seulement une fois
        le retrait acquis en chaîne : si vous n&apos;allez pas au bout de la
        signature, rien n&apos;est perdu.
      </p>

      <FormField
        label={
          <>
            Saisissez <span className="font-mono">RETIRER</span> pour confirmer
          </>
        }
        required
      >
        <Input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
      </FormField>

      <ActionsFormulaire onAnnuler={onFermer}>
        <Button
          variant="destructive"
          disabled={!pret}
          onClick={() => {
            onDemander({
              titre: "Retirer un salarié",
              code: "B5",
              message:
                "Cette adresse sera retirée de la liste des bénéficiaires. La masse salariale et la réserve immobilisée diminueront d'autant.",
              lignes: [{ label: "Salarié", valeur: shortAddress(adresse) }],
              appels: [
                { cible: "payroll", fonction: "removeEmployee", args: [adresse] },
              ],
              apres: async () => {
                if (await onOublier(adresse)) {
                  toast.info("Identité hors chaîne effacée de la base.");
                }
              },
            });
            onFermer();
          }}
        >
          Retirer définitivement
        </Button>
      </ActionsFormulaire>
    </Panel>
  );
}

/* ----------------------------------------------------------------- B10 */

/**
 * Modification de l'identité hors chaîne.
 *
 * Aucune transaction : ni le nom, ni le poste, ni l'adresse électronique
 * n'existent sur la chaîne, et c'est voulu — les y inscrire rendrait publique
 * la rémunération de personnes nommées. Il n'y a donc rien à signer, rien à
 * attendre du réseau, et aucun frais.
 *
 * L'écran illustre au passage ce que le chapitre 6 reproche à l'immutabilité :
 * une erreur de saisie sur un montant versé est définitive, tandis qu'une
 * erreur sur une identité se corrige ici en quelques secondes. La couche hors
 * chaîne ne fait pas que rendre le dispositif utilisable, elle lui rend une
 * faculté de rectification que la chaîne lui refuse.
 */
function PanneauIdentite({
  adresse,
  fiche,
  onFermer,
  onFiche,
}: {
  adresse: Address;
  fiche: Fiche | undefined;
  onFermer: () => void;
  onFiche: (f: Fiche) => Promise<boolean>;
}) {
  const [prenom, setPrenom] = useState(fiche?.prenom ?? "");
  const [nom, setNom] = useState(fiche?.nom ?? "");
  const [poste, setPoste] = useState(fiche?.poste ?? "");
  const [email, setEmail] = useState(fiche?.email ?? "");
  const [embauche, setEmbauche] = useState(fiche?.embauche ?? "");

  const pret = prenom.trim().length > 0 && nom.trim().length > 0;

  return (
    <Panel title={fiche ? "Modifier une identité" : "Renseigner une identité"}>
      <p className="mb-1 text-ink-2">
        Ces informations ne sont pas inscrites sur la chaîne et ne demandent
        aucune transaction. Elles servent à nommer le salarié dans
        l&apos;interface et sur ses bulletins de paie.
      </p>
      <Hint className="mb-4 font-mono">{adresse}</Hint>

      <RequiredLegend />

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Prénom" required>
          <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} />
        </FormField>
        <FormField label="Nom" required>
          <Input value={nom} onChange={(e) => setNom(e.target.value)} />
        </FormField>
        <FormField label="Poste">
          <Input value={poste} onChange={(e) => setPoste(e.target.value)} />
        </FormField>
        <FormField label="Date d'embauche">
          <Input type="date" value={embauche} onChange={(e) => setEmbauche(e.target.value)} />
        </FormField>
        <FormField label="Adresse électronique" className="sm:col-span-2">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
      </div>

      <ActionsFormulaire onAnnuler={onFermer}>
        <Button
          disabled={!pret}
          onClick={() => {
            onFiche({
              address: adresse.toLowerCase(),
              prenom: prenom.trim(),
              nom: nom.trim(),
              poste: poste.trim(),
              email: email.trim(),
              embauche,
            });
            onFermer();
          }}
        >
          Enregistrer
        </Button>
      </ActionsFormulaire>
    </Panel>
  );
}
