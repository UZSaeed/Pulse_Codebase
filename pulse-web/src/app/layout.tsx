import type { Metadata } from "next";
import { Inter, Outfit, Orbitron } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spike MCAT Prep",
  description: "UWorld's rigor meets Duolingo's engagement. Infinite, adaptive MCAT practice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} ${orbitron.variable} dark antialiased`}>
      <body className="min-h-screen flex flex-col bg-navy-900 text-slate-100 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
