import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://www.cuisinesbycountry.com";
const SITE_DESCRIPTION =
  "Explore authentic recipes from 10 world cuisines. Step-by-step cooking guides for Moroccan, Italian, Japanese, Indian, Mexican, Turkish, French, Thai, Chinese and Indonesian food.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s | Cuisines By Country",
    default: "Cuisines By Country - Authentic Recipes From Around The World",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Cuisines By Country",
    title: "Cuisines By Country - Authentic Recipes From Around The World",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Cuisines By Country - Authentic Recipes From Around The World",
    description: SITE_DESCRIPTION,
  },
  verification: {
    google: 'OCL4ssezcFrXry-Nv3hITnodiZvq4Lp8Dsx2EMG17Qk',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
