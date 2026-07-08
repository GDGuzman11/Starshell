import type { Metadata, Viewport } from 'next';
import { pressStart } from '@/lib/fonts';
import { RegisterSW } from './RegisterSW';
import './globals.css';

export const metadata: Metadata = {
  title: 'STARSHELL',
  description:
    "STARSHELL — a '93-pixel first-person arena shooter by Gabe De Guzman. Out-gun the adaptive alien squads across a 20-level campaign.",
  applicationName: 'Starshell',
  manifest: '/manifest.webmanifest',
  // iOS home-screen app: fullscreen, no browser chrome, translucent status bar.
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Starshell' },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={pressStart.variable}>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
