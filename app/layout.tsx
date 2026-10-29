import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const lora = localFont({
  src: [
    { path: "../fonts/Lora.ttf", style: "normal" },
    { path: "../fonts/Lora-Italic.ttf", style: "italic" },
  ],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fablebound.me"),
  title: {
    default: "Fablebound — Your memories, bound into a storybook",
    template: "%s · Fablebound",
  },
  description:
    "Fablebound turns your photos and memories into a hand-illustrated hardcover storybook, printed and shipped to your door.",
  openGraph: {
    type: "website",
    url: "https://fablebound.me",
    siteName: "Fablebound",
    title: "Fablebound — Your memories, bound into a storybook",
    description:
      "Tell us about a trip, a year, or a person you love. We illustrate twelve original pages and send you a real hardcover book.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fablebound — Your memories, bound into a storybook",
    description:
      "Tell us about a trip, a year, or a person you love. We illustrate twelve original pages and send you a real hardcover book.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={lora.variable}>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
