import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppText from '../components/AppText';
import { Button, Field } from '../components/ui';
import { loginUser } from '../api/userService';
import { useAuth } from '../contexts/AuthContext';
import { AuthStackParamList } from '../navigation';
import { colors, fontSize, radius, shadow, spacing } from '../theme';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    setBusy(true);
    setError('');
    const res = await loginUser({ email, password });
    setBusy(false);
    console.log('[Login Response]', res);
    if (res.success && res.data?.access_token) {
      await login(res.data.access_token, res.data.refresh_token, res.data.user);
    } else {
      console.error('[Login Error]', res.message, res);
      setError(res.message ?? 'Login failed');
    }
  };

  return (
    <View style={styles.bg}>
      {/* Hero brand band */}
      <View style={styles.hero}>
        <View style={styles.logoRow}>
          <Image
            source={require('../../assets/smart-life.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <AppText style={styles.cross}>×</AppText>
          <Image
            source={require('../../assets/tawal.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <AppText style={styles.heroSub}>Smart Sites Platform</AppText>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <AppText style={styles.title}>Welcome back</AppText>
            <AppText style={styles.subtitle}>Sign in to continue</AppText>

            {!!error && (
              <View style={styles.errorBox}>
                <AppText style={styles.errorText}>{error}</AppText>
              </View>
            )}

            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Your password"
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={{ alignSelf: 'flex-end', marginBottom: spacing.md }}
            >
              <AppText style={styles.linkText}>Forgot password?</AppText>
            </TouchableOpacity>

            <Button title="Login" onPress={handleLogin} loading={busy} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  hero: {
    backgroundColor: colors.navy,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 90, height: 50 },
  cross: { color: colors.textOnDarkMuted, fontSize: fontSize.h1, marginHorizontal: spacing.sm },
  heroSub: {
    color: colors.textOnDarkMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: spacing.lg,
    ...shadow.card,
  },
  title: { fontSize: fontSize.h1, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4, marginBottom: spacing.lg },

  linkText: { color: colors.brand, fontSize: fontSize.sm, fontWeight: '600' },

  errorBox: {
    backgroundColor: colors.dangerLight,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: fontSize.sm, textAlign: 'center' },
});
