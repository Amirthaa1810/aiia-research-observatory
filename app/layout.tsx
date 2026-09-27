import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'AIIA | Research Observatory',
  description:
    'A connected workspace for Ayurveda clinical research, ethics and safety monitoring.',
  icons: { icon: '/favicon.svg' },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
