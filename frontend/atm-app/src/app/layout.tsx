import type { Metadata } from 'next';
import { ToastProvider } from '@/components/ToastProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'BanhLuy ATM System — Interactive Digital Kiosk',
  description:
    'Simulated ATM deposit service for the BanhLuy Dual-Bank Interoperability Ecosystem. Perform ACID cash deposits into Bank A and Bank B accounts instantly.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
