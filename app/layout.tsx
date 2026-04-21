// ============================================================
// MealStack · Root Layout
// ============================================================

import type { Metadata } from 'next';
import { DM_Serif_Display, Syne, DM_Mono } from 'next/font/google';
import Providers from './providers';
import './globals.css';

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'MealStack — Zero-Waste Kitchen Engine',
  description: 'Manage your kitchen inventory, match recipes to what you have, and eliminate food waste.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${dmSerif.variable} ${syne.variable} ${dmMono.variable} font-sans bg-background text-foreground antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
