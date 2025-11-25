import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "@/providers/theme.provider";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  metadataBase: new URL("https://firsttx.shop"),
  title: {
    default: "FirstTx Docs",
    template: "%s | FirstTx Docs",
  },
  description: "Documentation for FirstTx, a three-layer toolkit for React: Prepaint, Local-First and Tx.",
  openGraph: {
    title: "FirstTx Docs",
    description: "Documentation for FirstTx, a three-layer toolkit for React: Prepaint, Local-First and Tx.",
    url: "/",
    siteName: "FirstTx Docs",
    type: "website",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "FirstTx Docs - Prepaint, Local-First & Tx",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FirstTx Docs",
    description: "Documentation for FirstTx, a three-layer toolkit for React 19: Prepaint, Local-First and Tx.",
    images: ["/opengraph-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <AppShell>{children}</AppShell>
            <Analytics />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
