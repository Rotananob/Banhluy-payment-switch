import type { Metadata } from 'next';
import { ToastProvider } from '@/components/ToastProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bank B — Digital Amethyst Banking | BanhLuy Ecosystem',
  description:
    'Experience next-generation digital banking with Bank B. Secure intra-bank transfers, real-time ACID balance updates, and seamless KHQR interoperable payments across banks.',
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
