import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { Toaster } from '@/components/ui/toaster';
import { UnifiedThemeProvider } from '@/contexts/unified-theme-provider';
import { PermissionDialogProvider } from '@/hooks/use-permission-dialog';
import PwaRegistry from './pwa-registry';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Meu orçamento',
  description: 'Gere orçamentos de serviços de forma rápida, precisa e profissional.',
  manifest: '/manifest.json',
  icons: null, // Evita que o Next.js procure por um favicon.ico e cause erro no build
};

export const viewport: Viewport = {
  themeColor: '#64B5F6',
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Compatibilidade PWA / iOS */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Meu orçamento" />
        <meta name="display" content="standalone" />
      </head>

      <body className={`${inter.variable} font-body antialiased`}>
        <UnifiedThemeProvider>
          <PermissionDialogProvider>
            <PwaRegistry />
            {children}
          </PermissionDialogProvider>

          {/* Toast global */}
          <Toaster />
        </UnifiedThemeProvider>
      </body>
    </html>
  );
}
