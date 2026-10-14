import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'co.com.cashgoapp.mobile',
  appName: 'CashGo',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  android: {
    backgroundColor: '#f8fafc',
  },
  ios: {
    backgroundColor: '#f8fafc',
    contentInset: 'automatic',
  },
}

export default config
