import type { Metadata } from 'next';
import './globals.css';
import { SiteNav } from '@/components/SiteNav';

export const metadata: Metadata = {
  title: 'Monte Carlo Markets — Simulator & Climate Contests',
  description:
    'Run 10,000-path Monte Carlo portfolio simulations, play crisis scenarios, and compete in climate-finance investment challenges.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">
        <SiteNav />
        {children}
      </body>
    </html>
  );
}