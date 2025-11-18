import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import LoginFab from "@/components/LoginFab";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HamroSewa",
  description: "Local services in Kathmandu Valley",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-b from-rose-50 via-amber-50 to-sky-50 min-h-screen`}>
        <AuthProvider>
          <Navbar />
          <LoginFab />
          <div className="pt-16">{children}</div>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
