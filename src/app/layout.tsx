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
  icons: {
    icon: '/ico_v2.jpg',
    apple: '/ico_v2.jpg',
  },
};

export const viewport: Viewport = {
  themeColor: '#64B5F6',
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
