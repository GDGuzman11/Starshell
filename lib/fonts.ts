import { Press_Start_2P } from 'next/font/google';

/**
 * Retro pixel face for STARSHELL. Self-hosted via next/font (downloaded at
 * build time, served from our origin) and exposed as the `--font-pixel` CSS
 * variable, mapped to Tailwind `font-pixel` in tailwind.config.ts.
 */
export const pressStart = Press_Start_2P({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-pixel',
  fallback: ['ui-monospace', 'monospace'],
});
