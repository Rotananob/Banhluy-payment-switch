'use client';

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
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
  );
}
