import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
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
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#160f2a',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
          }}
        />
      </body>
    </html>
  );
}
