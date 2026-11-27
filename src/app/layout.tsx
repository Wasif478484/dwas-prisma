import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, Noto_Naskh_Arabic } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Display face for headlines (warm, slightly quirky — avoids the default-SaaS
// look), Inter for dense UI text, Naskh for Urdu script.
const display = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoUrdu = Noto_Naskh_Arabic({
  variable: "--font-noto-urdu",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "DWAS — Digital Work Appointment System",
  description:
    "Voice-first technician booking for Pakistan. Say the problem in Urdu, Roman Urdu or English — DWAS finds an admin-approved mistri near you and books it. Boliye, mistri aa jayega.",
  keywords: ["DWAS", "mistri", "plumber", "electrician", "Pakistan", "Urdu", "voice booking"],
  authors: [{ name: "DWAS Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#155A48",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${display.variable} ${inter.variable} ${notoUrdu.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
