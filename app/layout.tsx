import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/providers";
import { APP_NAME, APP_DESCRIPTION } from "@/configs/app-config";
import "@/styles/globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${archivo.variable} ${plexMono.variable} font-sans antialiased tabular-nums`}
      >
        <Providers>{children}</Providers>
        <Toaster richColors position="bottom-left" />
      </body>
    </html>
  );
}
