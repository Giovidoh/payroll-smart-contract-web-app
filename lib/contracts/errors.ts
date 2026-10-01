import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
} from "viem";
import { formatToken } from "@/lib/format";

/**
 * Traduction des quinze erreurs personnalisées de Payroll.sol, plus les deux
 * d'Ownable2Step, en phrases lisibles. Sans cette table l'utilisateur ne voit
 * qu'un sélecteur de quatre octets.
 *
 * Les arguments sont ceux déclarés dans le contrat ; leur ordre compte.
 */
type Translator = (args: readonly unknown[]) => string;

const MESSAGES: Record<string, string | Translator> = {
  // --- Ownable / Ownable2Step -------------------------------------------
  OwnableUnauthorizedAccount:
    "Cette action est réservée au propriétaire du contrat.",
  OwnableInvalidOwner: "Le propriétaire visé n'est pas une adresse valide.",

  // --- Gestion des salariés ---------------------------------------------
  Payroll__EmployeeAlreadyExists:
    "Cette adresse figure déjà parmi les salariés.",
  Payroll__EmployeeDoesNotExist: "Cette adresse ne figure pas parmi les salariés.",
  Payroll__InvalidAddress: "L'adresse fournie n'est pas valide.",
  Payroll__SalaryMustBeGreaterThanZero:
    "Le salaire doit être strictement supérieur à zéro.",
  Payroll__SalaryUnchanged:
    "Le nouveau salaire est identique à l'ancien : rien à enregistrer.",
  Payroll__OnlyOwnerAndConcernedEmployeeCanAccess:
    "Seuls le propriétaire et le salarié concerné peuvent consulter cette fiche.",

  // --- Trésorerie --------------------------------------------------------
  Payroll__DepositAmountMustBeGreaterThanZero:
    "Le montant déposé doit être strictement supérieur à zéro.",
  Payroll__TransferFromFailed:
    "Le transfert des fonds a échoué. Vérifiez votre solde et l'autorisation accordée au contrat.",
  Payroll__WithdrawalAmountMustBeGreaterThanZero:
    "Le montant retiré doit être strictement supérieur à zéro.",
  Payroll__WithdrawalAmountExceedsAvailableFunds: (args) =>
    `Retrait refusé : la réserve immobilisée protège les salaires à venir. ` +
    `Montant disponible au retrait : ${formatToken(args[0] as bigint)}.`,
  Payroll__WithdrawalFailed: "Le retrait a échoué.",

  // --- Exécution de la paie ---------------------------------------------
  Payroll__InsufficientBalanceForPayroll: (args) =>
    `Provision insuffisante : le contrat détient ${formatToken(args[0] as bigint)} ` +
    `pour une masse salariale de ${formatToken(args[1] as bigint)}.`,
  Payroll__SalaryTransferFailed: (args) =>
    `Le versement au salarié ${args[0]} a échoué.`,
  Payroll__TooEarlyForNextPayroll: (args) => {
    const when = new Date(Number(args[0] as bigint) * 1000);
    return (
      `Trop tôt : le garde-temps du contrat interdit un second versement ` +
      `avant le ${when.toLocaleString("fr-FR")}.`
    );
  },
  Payroll__PayrollIntervalMustBeGreaterThanZero:
    "L'intervalle de paie doit être strictement supérieur à zéro.",
};

/** Ramène n'importe quelle erreur remontée par viem à une phrase française. */
export function decodeContractError(error: unknown): string {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) {
      return "Transaction refusée dans le portefeuille.";
    }

    const reverted = error.walk(
      (e) => e instanceof ContractFunctionRevertedError
    ) as ContractFunctionRevertedError | null;

    if (reverted?.data?.errorName) {
      const entry = MESSAGES[reverted.data.errorName];
      if (typeof entry === "function") {
        return entry(reverted.data.args ?? []);
      }
      if (typeof entry === "string") {
        return entry;
      }
      return `Le contrat a rejeté l'opération (${reverted.data.errorName}).`;
    }

    return error.shortMessage || error.message;
  }

  if (error instanceof Error) return error.message;
  return "Une erreur inattendue est survenue.";
}
