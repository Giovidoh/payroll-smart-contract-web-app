"use client";

import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";

export default function Web3Provider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}
