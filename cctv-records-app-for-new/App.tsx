import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigation from './src/navigation';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  // Load custom fonts
  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          'Mulish-Regular': require('./assets/fonts/Mulish-Regular.ttf'),
          'Mulish-Bold': require('./assets/fonts/Mulish-Bold.ttf'),
          'Poppins-Bold': require('./assets/fonts/Poppins-Bold.ttf'),
        });
      } catch (e) {
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Hide splash screen once everything is ready
  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null; // keep splash screen until fonts are loaded
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View onLayout={onLayoutRootView} style={{ flex: 1 }}>
        <StatusBar style="light" />
        <AppNavigation />
      </View>
      </AuthProvider>
    </SafeAreaProvider>
  );

}
