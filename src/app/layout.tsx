import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Matador Timer',
  description: 'Sederhana: kontrol, countdown, tampilan matador. Sinkron antartab.',
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
    <html lang="id" className="antialiased">
      <body className="bg-black text-white font-inter">
        {children}
      </body>
    </html>
  );
}
