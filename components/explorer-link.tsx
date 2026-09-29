import { EXPLORER_BASE } from "@/lib/contracts/config";
import { shortAddress, shortHash } from "@/lib/format";

function ExplorerLink({ path, full, short }: { path: string; full: string; short: string }) {
  return (
    <a
      href={`${EXPLORER_BASE}/${path}/${full}`}
      target="_blank"
      rel="noreferrer"
      title={full}
      className="font-mono text-primary underline decoration-primary/40 underline-offset-2"
    >
      {short}
    </a>
  );
}

/** Adresse abrégée, ouvrant sa page sur l'explorateur de blocs. */
export function AddressLink({ address }: { address: string }) {
  return <ExplorerLink path="address" full={address} short={shortAddress(address)} />;
}

/** Hachage abrégé, ouvrant la transaction sur l'explorateur de blocs. */
export function TxLink({ hash }: { hash: string }) {
  return <ExplorerLink path="tx" full={hash} short={shortHash(hash)} />;
}
