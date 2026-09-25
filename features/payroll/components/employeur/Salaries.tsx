"use client";

import { useMemo, useState } from "react";
import { isAddress, type Address } from "viem";
import { toast } from "sonner";
import { formatToken, parseToken, shortAddress } from "@/lib/format";
import { TOKEN_SYMBOL } from "@/lib/contracts/config";
import {
  Panneau,
  Tableau,
  Th,
  Td,
  Vide,
  Squelette,
  LienAdresse,
  Requis,
} from "../ui-kit";
import { useSalaries } from "../../hooks/use-payroll";
import {
  useFiches,
  useEcrireFiche,
  nomAffiche,
  type Fiche,
} from "../../hooks/use-directory";
import RepriseLocale from "./RepriseLocale";
import type { Operation } from "../../hooks/use-transaction";

const champ =
  "w-full rounded-sm border border-line-2 bg-card px-2.5 py-2 outline-none focus:border-primary";
const principal =
  "rounded-sm border border-primary bg-primary px-3.5 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50";
const secondaire =
  "rounded-sm border border-line-2 bg-card px-3 py-2 hover:bg-surface-2";

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
      <Panneau>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un nom, un poste, une adresse"
            className={`${champ} min-w-[220px] flex-1`}
          />
          <select
            value={tri}
            onChange={(e) => setTri(e.target.value as typeof tri)}
            className="rounded-sm border border-line-2 bg-card px-2.5 py-2"
          >
            <option value="salaire">Trier par salaire</option>
            <option value="nom">Trier par nom</option>
            <option value="adresse">Trier par adresse</option>
          </select>
          <button className={principal} onClick={() => setPanneau({ mode: "ajout" })}>
            Ajouter un salarié
          </button>
        </div>
      </Panneau>

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

      <Panneau titre={`Salariés inscrits (${lignes.length})`}>
        {isLoading ? (
          <Squelette lignes={6} />
        ) : lignes.length === 0 ? (
          <Vide titre="Aucun salarié inscrit">
            Ajoutez une première adresse pour que la paie ait des bénéficiaires. Tant
            que la liste est vide, la masse salariale est nulle et une exécution ne
            verserait rien.
          </Vide>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <Th>Salarié</Th>
                <Th>Poste</Th>
                <Th>Adresse</Th>
                <Th align="right">Salaire</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.adresse}>
                  <Td className="font-medium">{l.nom}</Td>
                  <Td className="text-ink-2">{l.poste}</Td>
                  <Td>
                    <LienAdresse adresse={l.adresse} />
                  </Td>
                  <Td align="right" className="whitespace-nowrap font-mono">
                    {formatToken(l.salaire)}
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        className="rounded-sm border border-line-2 bg-card px-2 py-1 text-[11px] hover:bg-surface-2"
                        onClick={() => setPanneau({ mode: "identite", adresse: l.adresse })}
                      >
                        Identité
                      </button>
                      <button
                        className="rounded-sm border border-line-2 bg-card px-2 py-1 text-[11px] hover:bg-surface-2"
                        onClick={() => setPanneau({ mode: "salaire", adresse: l.adresse })}
                      >
                        Salaire
                      </button>
                      <button
                        className="rounded-sm border border-line-2 bg-card px-2 py-1 text-[11px] text-err hover:bg-surface-2"
                        onClick={() => setPanneau({ mode: "retrait", adresse: l.adresse })}
                      >
                        Retirer
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
              <tr>
                <Td className="font-semibold">Masse salariale</Td>
                <Td>{null}</Td>
                <Td>{null}</Td>
                <Td align="right" className="font-mono font-semibold">
                  {formatToken(total)}
                </Td>
                <Td>{null}</Td>
              </tr>
            </tbody>
          </Tableau>
        )}
      </Panneau>
    </>
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
  }) => void;
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

  let montant: bigint | null = null;
  try {
    montant = salaire ? parseToken(salaire) : null;
  } catch {
    montant = null;
  }

  const pret = adresseValide && !dejaLa && montant !== null && montant > 0n;

  return (
    <Panneau titre="Ajouter un salarié">
      <p className="mb-4 text-ink-2">
        Seuls l&apos;adresse et le salaire sont inscrits en chaîne. Le nom, le poste et
        l&apos;adresse électronique restent dans ce navigateur : les porter en chaîne
        rendrait publique la rémunération de personnes nommées.
      </p>
      <p className="mb-4 text-[11px] text-ink-3">
        Les champs suivis d&apos;un <span className="text-err">*</span> sont
        obligatoires ; les autres sont facultatifs.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 sm:col-span-2">
          <span className="text-ink-2">
            Adresse du portefeuille
            <Requis />
          </span>
          <input
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder="0x…"
            className={`${champ} font-mono`}
          />
          {adresse && !adresseValide && (
            <span className="text-err">Adresse invalide.</span>
          )}
          {dejaLa && (
            <span className="text-err">Cette adresse est déjà inscrite.</span>
          )}
        </label>

        <label className="grid gap-1">
          <span className="text-ink-2">
            Salaire par cycle ({TOKEN_SYMBOL})
            <Requis />
          </span>
          <input
            value={salaire}
            onChange={(e) => setSalaire(e.target.value)}
            inputMode="decimal"
            placeholder="1250,00"
            className={`${champ} font-mono`}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-ink-2">Date d&apos;embauche</span>
          <input
            type="date"
            value={embauche}
            onChange={(e) => setEmbauche(e.target.value)}
            className={champ}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-ink-2">Prénom</span>
          <input value={prenom} onChange={(e) => setPrenom(e.target.value)} className={champ} />
        </label>
        <label className="grid gap-1">
          <span className="text-ink-2">Nom</span>
          <input value={nom} onChange={(e) => setNom(e.target.value)} className={champ} />
        </label>
        <label className="grid gap-1">
          <span className="text-ink-2">Poste</span>
          <input value={poste} onChange={(e) => setPoste(e.target.value)} className={champ} />
        </label>
        <label className="grid gap-1">
          <span className="text-ink-2">Adresse électronique</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={champ}
          />
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          className={principal}
          disabled={!pret}
          onClick={() => {
            onFiche({ address: adresse, prenom, nom, poste, email, embauche });
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
            });
            onFermer();
          }}
        >
          Inscrire le salarié
        </button>
        <button className={secondaire} onClick={onFermer}>
          Annuler
        </button>
      </div>
    </Panneau>
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

  let montant: bigint | null = null;
  try {
    montant = saisie ? parseToken(saisie) : null;
  } catch {
    montant = null;
  }

  const inchange = montant !== null && actuel !== undefined && montant === actuel;
  const pret = montant !== null && montant > 0n && !inchange;

  return (
    <Panneau titre={`Modifier le salaire — ${nom}`}>
      <div className="mb-3 grid gap-1.5">
        <div className="flex justify-between">
          <span className="text-ink-2">Salaire actuel</span>
          <span className="font-mono">{actuel !== undefined ? formatToken(actuel) : "…"}</span>
        </div>
      </div>

      <label className="grid gap-1">
        <span className="text-ink-2">
          Nouveau salaire ({TOKEN_SYMBOL})
          <Requis />
        </span>
        <input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          inputMode="decimal"
          className={`${champ} font-mono`}
        />
      </label>
      {inchange && (
        <p className="mt-1 text-err">
          Identique au salaire actuel : le contrat rejetterait l&apos;opération.
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          className={principal}
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
        </button>
        <button className={secondaire} onClick={onFermer}>
          Annuler
        </button>
      </div>
    </Panneau>
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
  onOublier: (a: string) => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const pret = confirmation.trim().toUpperCase() === "RETIRER";

  return (
    <Panneau titre={`Retirer un salarié — ${nom}`}>
      <p className="mb-3 text-ink-2">
        Le retrait est définitif et prend effet immédiatement : dès la prochaine
        exécution, cette adresse ne recevra plus rien. Les versements passés restent
        inscrits en chaîne et demeurent consultables — c&apos;est ce qui fait leur
        valeur probatoire.
      </p>

      <label className="grid gap-1">
        <span className="text-ink-2">
          Saisissez <span className="font-mono">RETIRER</span> pour confirmer
          <Requis />
        </span>
        <input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className={champ}
        />
      </label>

      <div className="mt-4 flex gap-2">
        <button
          className="rounded-sm border border-err bg-err px-3.5 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
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
            });
            onOublier(adresse);
            toast.info("Fiche hors chaîne effacée de ce navigateur.");
            onFermer();
          }}
        >
          Retirer définitivement
        </button>
        <button className={secondaire} onClick={onFermer}>
          Annuler
        </button>
      </div>
    </Panneau>
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
  onFiche: (f: Fiche) => void;
}) {
  const [prenom, setPrenom] = useState(fiche?.prenom ?? "");
  const [nom, setNom] = useState(fiche?.nom ?? "");
  const [poste, setPoste] = useState(fiche?.poste ?? "");
  const [email, setEmail] = useState(fiche?.email ?? "");
  const [embauche, setEmbauche] = useState(fiche?.embauche ?? "");

  const pret = prenom.trim().length > 0 && nom.trim().length > 0;

  return (
    <Panneau titre={fiche ? "Modifier une identité" : "Renseigner une identité"}>
      <p className="mb-1 text-ink-2">
        Ces informations ne sont pas inscrites sur la chaîne et ne demandent
        aucune transaction. Elles servent à nommer le salarié dans
        l&apos;interface et sur ses bulletins de paie.
      </p>
      <p className="mb-4 font-mono text-[11px] text-ink-3">{adresse}</p>

      <p className="mb-4 text-[11px] text-ink-3">
        Les champs suivis d&apos;un <span className="text-err">*</span> sont
        obligatoires ; les autres sont facultatifs.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-ink-2">
            Prénom
            <Requis />
          </span>
          <input value={prenom} onChange={(e) => setPrenom(e.target.value)} className={champ} />
        </label>
        <label className="grid gap-1">
          <span className="text-ink-2">
            Nom
            <Requis />
          </span>
          <input value={nom} onChange={(e) => setNom(e.target.value)} className={champ} />
        </label>
        <label className="grid gap-1">
          <span className="text-ink-2">Poste</span>
          <input value={poste} onChange={(e) => setPoste(e.target.value)} className={champ} />
        </label>
        <label className="grid gap-1">
          <span className="text-ink-2">Date d&apos;embauche</span>
          <input
            type="date"
            value={embauche}
            onChange={(e) => setEmbauche(e.target.value)}
            className={champ}
          />
        </label>
        <label className="grid gap-1 sm:col-span-2">
          <span className="text-ink-2">Adresse électronique</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={champ}
          />
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          className={principal}
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
        </button>
        <button className={secondaire} onClick={onFermer}>
          Annuler
        </button>
      </div>
    </Panneau>
  );
}
