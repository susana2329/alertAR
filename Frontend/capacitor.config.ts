import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ar.alertar.app',
  appName: 'AlertAR',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  }
};

export default config;
