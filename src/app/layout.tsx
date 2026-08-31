import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono, Bebas_Neue } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Footer from "@/components/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "scuttle.gg — League of Legends Stats Tracker",
  description:
    "scuttle.gg is a League of Legends stats tracker — search any Riot ID for ranked progress, live profile info, and match history.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${bebasNeue.variable} bg-dot-grid font-sans min-h-screen text-text-primary antialiased flex flex-col`}
      >
        <Providers>
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
