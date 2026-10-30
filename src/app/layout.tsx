import type { Metadata, Viewport } from 'next';
import './globals.css';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'DigiOH Timer',
  icons: {
    icon: '/brand/digioh-logomark.svg',
    apple: '/brand/digioh-logomark.svg',
  },
  description: 'Sederhana: kontrol, countdown, tampilan matador. Sinkron antar perangkat.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-page text-fg font-ui">
        {children}
      </body>
    </html>
  );
}

