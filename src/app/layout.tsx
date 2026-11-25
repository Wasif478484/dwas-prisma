import type { Metadata, Viewport } from "next";
import { Inter, Noto_Naskh_Arabic } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoUrdu.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
