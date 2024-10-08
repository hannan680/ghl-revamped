
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter } from 'next/font/google';
import { UserProvider } from './providers/userContext'; // Adjust the path accordingly
import { AiEmployeesProvider } from './providers/aiEmployeesProvider';

import TanstackProvider from "./providers/TanstackProvider"
import "./globals.css";

const inter = Inter({
  subsets: ['latin'], // Choose the subsets
  weight: ['400', '700'], // Optional: Choose weights (400 for normal, 700 for bold)
});

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased`}
      >
        <TanstackProvider>
        <UserProvider >
          <AiEmployeesProvider>
        <div>{children}</div>
        </AiEmployeesProvider>
        </UserProvider>
        </TanstackProvider>
      </body>
    </html>
  );
}
