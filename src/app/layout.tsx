import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Geist_Mono,
  Inter,
  Manrope,
} from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TrpcProvider } from "@/trpc/client";

const manropeHeading = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://concour-watcher.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "CNCR Watcher",
    template: "%s | CNCR Watcher",
  },
  description:
    "Hosted concours tracker for Moroccan Ministry of Health recruitment notices, focused on radiology technologist opportunities.",
  applicationName: "CNCR Watcher",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  keywords: [
    "CNCR Watcher",
    "concours",
    "Morocco",
    "Moroccan Ministry of Health",
    "radiology",
    "radiology technologist",
    "recruitment notices",
    "PDF tracker",
    "AI PDF verification",
    "health jobs",
    "clinical opportunities",
  ],
  authors: [{ name: "CNCR Watcher" }],
  creator: "CNCR Watcher",
  publisher: "CNCR Watcher",
  category: "technology",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title: "CNCR Watcher",
    description:
      "A hosted concours tracker for Moroccan Ministry of Health recruitment notices, focused on radiology technologist opportunities.",
    url: siteUrl,
    siteName: "CNCR Watcher",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CNCR Watcher",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "CNCR Watcher",
    description:
      "Hosted concours tracker for Moroccan Ministry of Health recruitment notices, focused on radiology technologist opportunities.",
    images: ["/og-image.png"],
  },

  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png" }],
    shortcut: ["/favicon.ico"],
  },

  manifest: "/manifest.webmanifest",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  verification: {
    // Add these only if you have them:
    // google: "your-google-site-verification",
    // yandex: "your-yandex-verification",
    // other: {
    //   "msvalidate.01": "your-bing-verification",
    // },
  },

  // Optional extras:
  // themeColor: "#ffffff",
  // appleWebApp: {
  //   capable: true,
  //   title: "CNCR Watcher",
  //   statusBarStyle: "default",
  // },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        inter.variable,
        cormorant.variable,
        geistMono.variable,
        manropeHeading.variable,
      )}
    >
      <head>
        <meta name="apple-mobile-web-app-title" content="CNCR Watcher" />
      </head>
      <body className="min-h-full flex flex-col">
        <TrpcProvider>{children}</TrpcProvider>
      </body>
    </html>
  );
}
