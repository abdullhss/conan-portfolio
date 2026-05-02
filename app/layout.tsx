import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

import { ScrollBrand } from "@/components/layout/scroll-brand";
import { siteConfig } from "@/lib/constants";

import "./globals.css";

const orangeAvenue = localFont({
  src: "../fonts/orange-avenue/OrangeAvenueDemoRegular-Jp10K.otf",
  variable: "--font-orange-avenue",
  display: "swap",
});

const oldSchoolUnited = localFont({
  src: "../fonts/old-school-united/old_school_united_regular.ttf",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.title,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${orangeAvenue.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <ScrollBrand className={oldSchoolUnited.className} />
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
