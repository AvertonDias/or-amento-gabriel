
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { UnifiedThemeProvider } from "@/contexts/unified-theme-provider";
import PwaRegistry from '@/app/pwa-registry';


const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Meu orçamento',
  description: 'Gere orçamentos de serviços de forma rápida, precisa e profissional.',
  manifest: '/manifest.json',
  icons: false, // Desabilita a geração automática de ícones
};

export const viewport: Viewport = {
  themeColor: '#64B5F6',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Meu orçamento" />
        <link rel="apple-touch-icon" href="/ico_v2.jpg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <PwaRegistry />
      </head>
      <body className={`${inter.variable} font-body antialiased`}>
        <UnifiedThemeProvider>
          {children}
          <Toaster />
        </UnifiedThemeProvider>
      </body>
    </html>
  );
}
