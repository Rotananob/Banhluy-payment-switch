'use client';

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#121824',
          color: '#fff',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      }}
    />
  );
}
