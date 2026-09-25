import { jsPDF } from "jspdf";
import { formatToken, formatDateTime, shortHash } from "@/lib/format";
import {
  PAYROLL_ADDRESS,
  TOKEN_SYMBOL,
  CHAIN,
  explorerTx,
} from "@/lib/contracts/config";
import type { Fiche } from "../hooks/use-directory";

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
export type DonneesBulletin = {
  salarie: Fiche | undefined;
  adresse: string;
  montant: bigint;
  /** Horodatage du bloc, en secondes. */
  date: bigint;
  hash: string;
};

const MARGE = 18;

export function engendrerBulletin(d: DonneesBulletin): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const largeur = doc.internal.pageSize.getWidth();
  let y = MARGE;

  const titre = (t: string) => {
    doc.setFont("helvetica", "bold").setFontSize(13);
    doc.text(t, MARGE, y);
    y += 7;
  };

  const section = (t: string) => {
    y += 3;
    doc.setFont("helvetica", "bold").setFontSize(9.5);
    doc.text(t.toUpperCase(), MARGE, y);
    y += 1.5;
    doc.setDrawColor(190).line(MARGE, y, largeur - MARGE, y);
    y += 5;
  };

  const ligne = (label: string, valeur: string, gras = false) => {
    doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(90);
    doc.text(label, MARGE, y);
    doc
      .setFont("helvetica", gras ? "bold" : "normal")
      .setTextColor(20);
    doc.text(valeur, largeur - MARGE, y, { align: "right" });
    y += 5.5;
  };

  const nom = d.salarie
    ? `${d.salarie.prenom} ${d.salarie.nom}`.trim()
    : "Identité non renseignée";

  titre("Bulletin de paie");
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(110);
  doc.text(
    `Émis le ${formatDateTime(BigInt(Math.floor(Date.now() / 1000)))}`,
    MARGE,
    y
  );
  y += 8;

  section("Salarié");
  ligne("Nom et prénoms", nom);
  ligne("Poste", d.salarie?.poste || "—");
  ligne("Date d'embauche", d.salarie?.embauche || "—");
  ligne("Adresse de règlement", d.adresse);

  section("Période et versement");
  ligne("Date du versement", formatDateTime(d.date));
  ligne("Monnaie de règlement", `${TOKEN_SYMBOL} (jeton ERC-20)`);
  ligne("Montant net versé", formatToken(d.montant), true);

  section("Preuve du paiement");
  ligne("Réseau", `${CHAIN.name} (id ${CHAIN.id})`);
  ligne("Contrat émetteur", PAYROLL_ADDRESS);
  ligne("Transaction", shortHash(d.hash));

  y += 2;
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(110);
  const note = doc.splitTextToSize(
    "Le versement ci-dessus est attesté par la transaction référencée, inscrite de façon " +
      "horodatée et infalsifiable sur le registre public. Elle est vérifiable par tout tiers " +
      "à l'adresse suivante : " +
      explorerTx(d.hash),
    largeur - 2 * MARGE
  );
  doc.text(note, MARGE, y);
  y += note.length * 4 + 4;

  const reserve = doc.splitTextToSize(
    "Réserve : ce document est produit hors chaîne à titre de justificatif de versement. " +
      "Il ne comporte ni retenues ni cotisations sociales, le dispositif n'en gérant aucune, " +
      "et sa contexture n'a pas été vérifiée au regard de l'arrêté pris en application de " +
      "l'article 166 du Code du travail.",
    largeur - 2 * MARGE
  );
  doc.setTextColor(140);
  doc.text(reserve, MARGE, y);

  return doc;
}

export function nomFichierBulletin(d: DonneesBulletin): string {
  const date = new Date(Number(d.date) * 1000);
  const aaaammjj = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const qui = d.salarie?.nom
    ? d.salarie.nom.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    : d.adresse.slice(2, 10).toLowerCase();
  return `bulletin-${aaaammjj}-${qui}.pdf`;
}
