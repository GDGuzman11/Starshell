import type { Metadata, Viewport } from 'next';
import { pressStart } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'STARSHELL',
  description:
    "STARSHELL — a '93-pixel first-person arena shooter by Gabe De Guzman. Out-gun the adaptive alien squads across a 20-level campaign.",
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={pressStart.variable}>
      <body>{children}</body>
    </html>
  );
}
