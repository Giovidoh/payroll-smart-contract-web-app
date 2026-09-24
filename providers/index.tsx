"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import TanstackProvider from "./TanstackProvider";
import Web3Provider from "./Web3Provider";

export const Providers = ({ children }: { children: ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TanstackProvider>
        <Web3Provider>{children}</Web3Provider>
      </TanstackProvider>
    </ThemeProvider>
  );
};
