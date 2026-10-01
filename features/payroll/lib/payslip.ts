import { jsPDF } from "jspdf";
import { formatToken, formatDateTime, shortHash } from "@/lib/format";
import {
  PAYROLL_ADDRESS,
  TOKEN_SYMBOL,
  CHAIN,
  explorerTx,
} from "@/lib/contracts/config";
import type { EmployeeRecord } from "../hooks/use-directory";

/**
 * Bulletin de paie, produit hors chaîne.
 *
 * L'article 166 du Code du travail togolais impose la remise d'un bulletin à
 * chaque paiement. Le document est donc engendré côté client à partir de deux
 * sources : l'événement `SalaryPaid` pour le montant, la date et la preuve de
 * paiement ; le répertoire hors chaîne pour l'identité du salarié, que la chaîne
 * ignore.
 *
 * Réserve assumée : la contexture exacte du bulletin est fixée par arrêté, et sa
 * conformité n'a pas été vérifiée. Le document ci-dessous porte les mentions que
 * le dispositif permet d'établir, pas davantage.
 */
export type PayslipData = {
  employee: EmployeeRecord | undefined;
  address: string;
  amount: bigint;
  /** Horodatage du bloc, en secondes. */
  date: bigint;
  hash: string;
};

const MARGIN = 18;

/**
 * jsPDF n'embarque pas de police : il s'appuie sur les polices standard du
 * format PDF, dont le répertoire s'arrête à CP1252. Un caractère hors de ce
 * répertoire fait basculer la chaîne entière dans un encodage sur deux octets
 * que la police ne sait pas rendre, et chaque caractère ressort séparé.
 *
 * `Intl.NumberFormat("fr-FR")` sépare les milliers par une espace fine
 * insécable (U+202F), qui est précisément dans ce cas : « 2 000,00 mUSDC »
 * s'imprimait « 2 / 0 0 0 , 0 0   m U S D C ». L'ellipsis des hachages, elle,
 * passe sans encombre, CP1252 la connaissant à 0x85.
 *
 * On ne touche pas à `formatToken` : à l'écran, l'espace fine est le bon
 * caractère. C'est l'impression qui a cette contrainte, pas le formatage.
 */
function sanitize(text: string): string {
  return text
    .replace(/[      ]/g, " ")
    .replace(/−/g, "-");
}

export function generatePayslip(d: PayslipData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  let y = MARGIN;

  const title = (t: string) => {
    doc.setFont("helvetica", "bold").setFontSize(13);
    doc.text(sanitize(t), MARGIN, y);
    y += 7;
  };

  const section = (t: string) => {
    y += 3;
    doc.setFont("helvetica", "bold").setFontSize(9.5);
    doc.text(sanitize(t).toUpperCase(), MARGIN, y);
    y += 1.5;
    doc.setDrawColor(190).line(MARGIN, y, width - MARGIN, y);
    y += 5;
  };

  const row = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(90);
    doc.text(sanitize(label), MARGIN, y);
    doc
      .setFont("helvetica", bold ? "bold" : "normal")
      .setTextColor(20);
    doc.text(sanitize(value), width - MARGIN, y, { align: "right" });
    y += 5.5;
  };

  const lastName = d.employee
    ? `${d.employee.firstName} ${d.employee.lastName}`.trim()
    : "Identité non renseignée";

  title("Bulletin de paie");
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(110);
  doc.text(
    sanitize(`Émis le ${formatDateTime(BigInt(Math.floor(Date.now() / 1000)))}`),
    MARGIN,
    y
  );
  y += 8;

  section("Salarié");
  row("Nom et prénoms", lastName);
  row("Poste", d.employee?.jobTitle || "—");
  row("Date d'embauche", d.employee?.hireDate || "—");
  row("Adresse de règlement", d.address);

  section("Période et versement");
  row("Date du versement", formatDateTime(d.date));
  row("Monnaie de règlement", `${TOKEN_SYMBOL} (jeton ERC-20)`);
  row("Montant net versé", formatToken(d.amount), true);

  section("Preuve du paiement");
  row("Réseau", `${CHAIN.name} (id ${CHAIN.id})`);
  row("Contrat émetteur", PAYROLL_ADDRESS);
  row("Transaction", shortHash(d.hash));

  y += 2;
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(110);
  const note = doc.splitTextToSize(
    sanitize("Le versement ci-dessus est attesté par la transaction référencée, inscrite de façon " +
      "horodatée et infalsifiable sur le registre public. Elle est vérifiable par tout tiers " +
      "à l'adresse suivante : " +
      explorerTx(d.hash)),
    width - 2 * MARGIN
  );
  doc.text(note, MARGIN, y);
  y += note.length * 4 + 4;

  const reserve = doc.splitTextToSize(
    sanitize("Réserve : ce document est produit hors chaîne à titre de justificatif de versement. " +
      "Il ne comporte ni retenues ni cotisations sociales, le dispositif n'en gérant aucune, " +
      "et sa contexture n'a pas été vérifiée au regard de l'arrêté pris en application de " +
      "l'article 166 du Code du travail."),
    width - 2 * MARGIN
  );
  doc.setTextColor(140);
  doc.text(reserve, MARGIN, y);

  return doc;
}

export function payslipFileName(d: PayslipData): string {
  const date = new Date(Number(d.date) * 1000);
  const yyyymmdd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const who = d.employee?.lastName
    ? d.employee.lastName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    : d.address.slice(2, 10).toLowerCase();
  return `bulletin-${yyyymmdd}-${who}.pdf`;
}
