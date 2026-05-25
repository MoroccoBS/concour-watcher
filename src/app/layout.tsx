import type { Metadata } from "next";
import { Cormorant_Garamond, Geist_Mono, Inter, Manrope } from "next/font/google";
import "./globals.css";
import { TrpcProvider } from "@/trpc/client";
import { cn } from "@/lib/utils";

const manropeHeading = Manrope({subsets:['latin'],variable:'--font-heading'});

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

export const metadata: Metadata = {
  title: "CNCR Watcher",
  description: "Radiology concours watcher with AI PDF verification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", inter.variable, cormorant.variable, geistMono.variable, manropeHeading.variable)}
    >
      <body className="min-h-full flex flex-col">
        <TrpcProvider>{children}</TrpcProvider>
      </body>
    </html>
  );
}
