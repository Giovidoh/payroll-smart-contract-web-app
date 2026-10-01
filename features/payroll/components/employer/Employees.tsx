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
import { useEmployees } from "../../hooks/use-payroll";
import {
  useRecords,
  useWriteRecord,
  displayName,
  type EmployeeRecord,
} from "../../hooks/use-directory";
import LocalImport from "./LocalImport";
import type { Operation } from "../../hooks/use-transaction";

type Panels =
  | null
  | { mode: "add" }
  | { mode: "salary" | "remove" | "identity"; address: Address };

export default function Employees({
  onRequest,
}: {
  onRequest: (o: Operation) => void;
}) {
  const { data: employees, isLoading } = useEmployees();
  const records = useRecords();
  const { save, remove } = useWriteRecord();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "salary" | "address">("salary");
  const [panel, setPanel] = useState<Panels>(null);

  const rows = useMemo(() => {
    const base = (employees ?? []).map((e) => {
      const record = records[e.employeeAddress.toLowerCase()];
      return {
        address: e.employeeAddress,
        salary: e.salary,
        record,
        lastName: displayName(record, e.employeeAddress),
        jobTitle: record?.jobTitle ?? "—",
      };
    });

    const q = search.trim().toLowerCase();
    const filter = q
      ? base.filter(
          (l) =>
            l.lastName.toLowerCase().includes(q) ||
            l.jobTitle.toLowerCase().includes(q) ||
            l.address.toLowerCase().includes(q)
        )
      : base;

    return [...filter].sort((a, b) =>
      sort === "salary"
        ? Number(b.salary - a.salary)
        : sort === "name"
          ? a.lastName.localeCompare(b.lastName, "fr")
          : a.address.localeCompare(b.address)
    );
  }, [employees, records, search, sort]);

  const total = rows.reduce((s, l) => s + l.salary, 0n);

  return (
    <>
      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un nom, un poste, une adresse"
            className="min-w-[220px] flex-1"
          />
          <NativeSelect value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="salary">Trier par salaire</option>
            <option value="name">Trier par nom</option>
            <option value="address">Trier par adresse</option>
          </NativeSelect>
          <Button onClick={() => setPanel({ mode: "add" })}>Ajouter un salarié</Button>
        </div>
      </Panel>

      <LocalImport />

      {panel?.mode === "add" && (
        <AddPanel
          onClose={() => setPanel(null)}
          onRequest={onRequest}
          onRecord={save}
          alreadyRegistered={new Set((employees ?? []).map((e) => e.employeeAddress.toLowerCase()))}
        />
      )}

      {panel?.mode === "salary" && (
        <SalaryPanel
          address={panel.address}
          current={rows.find((l) => l.address === panel.address)?.salary}
          lastName={rows.find((l) => l.address === panel.address)?.lastName ?? ""}
          onClose={() => setPanel(null)}
          onRequest={onRequest}
        />
      )}

      {panel?.mode === "identity" && (
        <IdentityPanel
          address={panel.address}
          record={records[panel.address.toLowerCase()]}
          onClose={() => setPanel(null)}
          onRecord={save}
        />
      )}

      {panel?.mode === "remove" && (
        <WithdrawPanel
          address={panel.address}
          lastName={rows.find((l) => l.address === panel.address)?.lastName ?? ""}
          onClose={() => setPanel(null)}
          onRequest={onRequest}
          onForget={remove}
        />
      )}

      <Panel title={`Salariés inscrits (${rows.length})`}>
        {isLoading ? (
          <SkeletonRows rows={6} />
        ) : rows.length === 0 ? (
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
              {rows.map((l) => (
                <TableRow key={l.address}>
                  <TableCell className="font-medium">{l.lastName}</TableCell>
                  <TableCell className="text-ink-2">{l.jobTitle}</TableCell>
                  <TableCell>
                    <AddressLink address={l.address} />
                  </TableCell>
                  <TableCell align="right" className="whitespace-nowrap font-mono">
                    {formatToken(l.salary)}
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => setPanel({ mode: "identity", address: l.address })}
                      >
                        Identité
                      </Button>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => setPanel({ mode: "salary", address: l.address })}
                      >
                        Salaire
                      </Button>
                      <Button
                        variant="secondary"
                        size="xs"
                        className="text-err"
                        onClick={() => setPanel({ mode: "remove", address: l.address })}
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
function FormActions({
  children,
  onCancel,
}: {
  children: React.ReactNode;
  onCancel: () => void;
}) {
  return (
    <div className="mt-4 flex gap-2">
      {children}
      <Button variant="secondary" className="px-3" onClick={onCancel}>
        Annuler
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ B3 */

function AddPanel({
  onClose,
  onRequest,
  onRecord,
  alreadyRegistered,
}: {
  onClose: () => void;
  onRequest: (o: Operation) => void;
  onRecord: (f: {
    address: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    email: string;
    hireDate: string;
  }) => Promise<boolean>;
  alreadyRegistered: Set<string>;
}) {
  const [address, setAddress] = useState("");
  const [salary, setSalary] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [hireDate, setHireDate] = useState("");

  const isValidAddress = isAddress(address);
  const alreadyPresent = isValidAddress && alreadyRegistered.has(address.toLowerCase());
  const amount = parseTokenOrNull(salary);

  const ready = isValidAddress && !alreadyPresent && amount !== null && amount > 0n;

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
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x…"
            className="font-mono"
          />
          {address && !isValidAddress && <FieldError>Adresse invalide.</FieldError>}
          {alreadyPresent && <FieldError>Cette adresse est déjà inscrite.</FieldError>}
        </FormField>

        <FormField label={`Salaire par cycle (${TOKEN_SYMBOL})`} required>
          <Input
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            inputMode="decimal"
            placeholder="1250,00"
            className="font-mono"
          />
        </FormField>

        <FormField label="Date d'embauche">
          <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
        </FormField>

        <FormField label="Prénom">
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </FormField>
        <FormField label="Nom">
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </FormField>
        <FormField label="Poste">
          <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </FormField>
        <FormField label="Adresse électronique">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
      </div>

      <FormActions onCancel={onClose}>
        <Button
          disabled={!ready}
          onClick={() => {
            onRequest({
              title: "Ajouter un salarié",
              message:
                "Le contrat inscrira cette adresse et son salaire. La masse salariale augmentera d'autant, et la réserve immobilisée avec elle.",
              rows: [
                { label: "Adresse", value: shortAddress(address) },
                { label: "Salaire par cycle", value: formatToken(amount!) },
              ],
              calls: [
                {
                  target: "payroll",
                  functionName: "addEmployee",
                  args: [address as Address, amount!],
                },
              ],
              after: async () => {
                await onRecord({ address: address, firstName, lastName, jobTitle, email, hireDate });
              },
            });
            onClose();
          }}
        >
          Inscrire le salarié
        </Button>
      </FormActions>
    </Panel>
  );
}

/* ------------------------------------------------------------------ B4 */

function SalaryPanel({
  address,
  current,
  lastName,
  onClose,
  onRequest,
}: {
  address: Address;
  current?: bigint;
  lastName: string;
  onClose: () => void;
  onRequest: (o: Operation) => void;
}) {
  const [input, setInput] = useState("");
  const amount = parseTokenOrNull(input);

  const unchanged = amount !== null && current !== undefined && amount === current;
  const ready = amount !== null && amount > 0n && !unchanged;

  return (
    <Panel title={`Modifier le salaire — ${lastName}`}>
      <DetailList className="mb-3">
        <DetailItem label="Salaire actuel">
          {current !== undefined ? formatToken(current) : "…"}
        </DetailItem>
      </DetailList>

      <FormField label={`Nouveau salaire (${TOKEN_SYMBOL})`} required>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          inputMode="decimal"
          className="font-mono"
        />
      </FormField>
      {unchanged && (
        <FieldError className="mt-1">
          Identique au salaire actuel : le contrat rejetterait l&apos;opération.
        </FieldError>
      )}

      <FormActions onCancel={onClose}>
        <Button
          disabled={!ready}
          onClick={() => {
            onRequest({
              title: "Modifier un salaire",
              message:
                "Le nouveau salaire s'appliquera dès le prochain cycle. Les versements déjà effectués ne sont pas rétroactivement modifiés — la chaîne ne réécrit pas le passé.",
              rows: [
                { label: "Salarié", value: shortAddress(address) },
                {
                  label: "Ancien salaire",
                  value: current !== undefined ? formatToken(current) : "—",
                },
                { label: "Nouveau salaire", value: formatToken(amount!) },
              ],
              calls: [
                { target: "payroll", functionName: "updateSalary", args: [address, amount!] },
              ],
            });
            onClose();
          }}
        >
          Enregistrer le nouveau salaire
        </Button>
      </FormActions>
    </Panel>
  );
}

/* ------------------------------------------------------------------ B5 */

function WithdrawPanel({
  address,
  lastName,
  onClose,
  onRequest,
  onForget,
}: {
  address: Address;
  lastName: string;
  onClose: () => void;
  onRequest: (o: Operation) => void;
  onForget: (a: string) => Promise<boolean>;
}) {
  const [confirmation, setConfirmation] = useState("");
  const ready = confirmation.trim().toUpperCase() === "RETIRER";

  return (
    <Panel title={`Retirer un salarié — ${lastName}`}>
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

      <FormActions onCancel={onClose}>
        <Button
          variant="destructive"
          disabled={!ready}
          onClick={() => {
            onRequest({
              title: "Retirer un salarié",
              message:
                "Cette adresse sera retirée de la liste des bénéficiaires. La masse salariale et la réserve immobilisée diminueront d'autant.",
              rows: [{ label: "Salarié", value: shortAddress(address) }],
              calls: [
                { target: "payroll", functionName: "removeEmployee", args: [address] },
              ],
              after: async () => {
                if (await onForget(address)) {
                  toast.info("Identité hors chaîne effacée de la base.");
                }
              },
            });
            onClose();
          }}
        >
          Retirer définitivement
        </Button>
      </FormActions>
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
function IdentityPanel({
  address,
  record,
  onClose,
  onRecord,
}: {
  address: Address;
  record: EmployeeRecord | undefined;
  onClose: () => void;
  onRecord: (f: EmployeeRecord) => Promise<boolean>;
}) {
  const [firstName, setFirstName] = useState(record?.firstName ?? "");
  const [lastName, setLastName] = useState(record?.lastName ?? "");
  const [jobTitle, setJobTitle] = useState(record?.jobTitle ?? "");
  const [email, setEmail] = useState(record?.email ?? "");
  const [hireDate, setHireDate] = useState(record?.hireDate ?? "");

  const ready = firstName.trim().length > 0 && lastName.trim().length > 0;

  return (
    <Panel title={record ? "Modifier une identité" : "Renseigner une identité"}>
      <p className="mb-1 text-ink-2">
        Ces informations ne sont pas inscrites sur la chaîne et ne demandent
        aucune transaction. Elles servent à nommer le salarié dans
        l&apos;interface et sur ses bulletins de paie.
      </p>
      <Hint className="mb-4 font-mono">{address}</Hint>

      <RequiredLegend />

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Prénom" required>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </FormField>
        <FormField label="Nom" required>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </FormField>
        <FormField label="Poste">
          <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </FormField>
        <FormField label="Date d'embauche">
          <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
        </FormField>
        <FormField label="Adresse électronique" className="sm:col-span-2">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
      </div>

      <FormActions onCancel={onClose}>
        <Button
          disabled={!ready}
          onClick={() => {
            onRecord({
              address: address.toLowerCase(),
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              jobTitle: jobTitle.trim(),
              email: email.trim(),
              hireDate,
            });
            onClose();
          }}
        >
          Enregistrer
        </Button>
      </FormActions>
    </Panel>
  );
}
