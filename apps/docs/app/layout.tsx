import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://firsttx-docs.vercel.app'),
  title: {
    default: 'Firsttx',
    template: '%s | Firsttx',
  },
  description: 'Firsttx Docs',
  openGraph: {
    title: 'Firsttx',
    description: 'Firsttx Docs',
    url: 'https://firsttx-playground.vercel.app',
    siteName: 'Firsttx',
    type: 'website',
    images: [
      {
        url: 'https://firsttx-playground.vercel.app/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Firsttx',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Firsttx',
    description: 'Firsttx Docs',
    images: ['https://firsttx-playground.vercel.app/og-default.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
    languages: {
      'ko-KR': '/ko',
      'en-US': '/en',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
