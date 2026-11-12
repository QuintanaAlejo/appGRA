import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GRA - Caja Diaria',
  description:
    'Panel interno de control de caja diaria e indicadores mensuales de GRA Capacitaciones.',
  icons: {
    icon: [
      { url: '/images/brand/gra-cube.png', type: 'image/png' },
    ],
    shortcut: '/images/brand/gra-cube.png',
    apple: [
      { url: '/images/brand/gra-cube.png', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Raleway:wght@700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
