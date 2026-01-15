import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "LoL Stats Tracker",
  description: "Search up your Riot account and find your recent League of Legends match information!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-animated-grid min-h-screen text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
