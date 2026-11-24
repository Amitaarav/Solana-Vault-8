import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solana Personal Vault | Anchor 0.30",
  description:
    "Non-custodial personal asset vault on Solana with per-transaction limits and emergency pause circuit breaker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full dark antialiased">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-full flex flex-col bg-[#090a0f] text-[#f4f4f6]">
        {children}
      </body>
    </html>
  );
}
