'use client';

import { useEffect } from 'react';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Prepreči hydration napake
    document.body.style.minWidth = '1920px';
  }, []);

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="min-w-[1920px]">
        <main className="container">
          {children}
        </main>
      </body>
    </html>
  )
}
