import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "SpikePrep — SAT Prep That Adapts to You",
  description: "Fun, adaptive SAT prep that finds your weak spots and gets you ready for test day.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} antialiased`}>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
