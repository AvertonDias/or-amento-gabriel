
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.meuorcamento.app',
  appName: 'Meu Orçamento',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Contacts: {
      useLegacyIntent: false
    }
  }
};

export default config;
