// Vérifie que l'application lit bien le contrat déployé : mêmes adresses,
// même ABI, même client que le navigateur. Sert de test de fumée réseau.
import { createPublicClient, http, erc20Abi, formatUnits } from "viem";
import { sepolia } from "viem/chains";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf-8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const PAYROLL = env.NEXT_PUBLIC_PAYROLL_ADDRESS;
const TOKEN = env.NEXT_PUBLIC_TOKEN_ADDRESS;

// Le fichier TS n'est pas importable depuis node : on relit le JSON d'origine.
const artifact = JSON.parse(
  readFileSync(
    process.env.CONTRACT_REPO ??
      "//wsl.localhost/Ubuntu/home/gidoh/projects/payroll-smart-contract/out/Payroll.sol/Payroll.json",
    "utf-8"
  )
);
const payrollAbi = artifact.abi;

const client = createPublicClient({
  chain: sepolia,
  transport: http(env.NEXT_PUBLIC_RPC_URL || undefined),
});

const read = (functionName, args = []) =>
  client.readContract({ address: PAYROLL, abi: payrollAbi, functionName, args });

const block = await client.getBlockNumber();
console.log(`Réseau      : ${sepolia.name}, bloc ${block}`);
console.log(`Contrat     : ${PAYROLL}`);

// Depuis une adresse quelconque, seuls les accesseurs non gardes repondent.
const [owner, interval, cycles, lastRun] = await Promise.all([
  read("owner"),
  read("getPayrollInterval"),
  read("getReservedPayrollCycles"),
  read("getLastPayrollTimestamp"),
]);

const [symbol, decimals, balance] = await Promise.all([
  client.readContract({ address: TOKEN, abi: erc20Abi, functionName: "symbol" }),
  client.readContract({ address: TOKEN, abi: erc20Abi, functionName: "decimals" }),
  client.readContract({
    address: TOKEN,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [PAYROLL],
  }),
]);

const surplus = await read("getAvailableAmountForWithdrawal").catch(() => null);

console.log(`Proprietaire: ${owner}`);
console.log(`Intervalle  : ${interval} s`);
console.log(`Cycles res. : ${cycles}`);
console.log(`Derniere paie: ${new Date(Number(lastRun) * 1000).toISOString()}`);
console.log(`Jeton       : ${symbol}, ${decimals} decimales`);
console.log(`Solde       : ${formatUnits(balance, decimals)} ${symbol}`);

if (surplus === null) {
  console.log("Surplus     : REFUS -- le solde ne couvre pas la reserve");
} else {
  const derivedPayroll = cycles === 0n ? null : (balance - surplus) / cycles;
  console.log(`Surplus     : ${formatUnits(surplus, decimals)} ${symbol}`);
  console.log(`Reserve     : ${formatUnits(balance - surplus, decimals)} ${symbol}`);
  console.log(
    `Masse deduite par (solde - surplus) / cycles : ` +
      `${derivedPayroll === null ? "?" : formatUnits(derivedPayroll, decimals)} ${symbol}`
  );
}

// Les accesseurs gardes, depuis une adresse quelconque.
for (const fn of ["getAllEmployees", "getEmployeeExistence", "getTotalSalaries"]) {
  const args = fn === "getEmployeeExistence" ? [owner] : [];
  const r = await read(fn, args).then(
    (v) => `OK (${Array.isArray(v) ? v.length + " entrees" : v})`,
    (e) => "REFUS -- " + (e.cause?.data?.errorName ?? e.shortMessage ?? "revert")
  );
  console.log(`${fn.padEnd(22)}: ${r}`);
}
