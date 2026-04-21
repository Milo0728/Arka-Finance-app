import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Arka Finance — Personal finance, Babylonian wisdom",
    template: "%s · Arka Finance",
  },
  description:
    "Arka Finance is a modern personal finance dashboard that helps you plan budgets, build savings, and track your financial health — inspired by The Richest Man in Babylon.",
  keywords: ["personal finance", "budget", "savings", "babylon", "mint alternative", "YNAB"],
  authors: [{ name: "Arka Finance" }],
  creator: "Arka Finance",
  openGraph: {
    title: "Arka Finance",
    description: "Plan budgets, grow savings, master your money — with Babylonian wisdom.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5fbf8" },
    { media: "(prefers-color-scheme: dark)", color: "#06110d" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${mono.variable} min-h-screen bg-background`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
