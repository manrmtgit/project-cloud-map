import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'mg.cloudmap.mobile',
  appName: 'CloudMap',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Geolocation: {
      // Enable geolocation
    },
    Camera: {
      // Enable camera access
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#6B4FFF',
      showSpinner: true,
      spinnerColor: '#FFFFFF'
    }
  }
};

export default config;
