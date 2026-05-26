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
import { requestPasswordReset } from '../api/userService';
import { AuthStackParamList } from '../navigation';
import { colors, fontSize, radius, shadow, spacing } from '../theme';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleReset = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    const res = await requestPasswordReset(email);
    setBusy(false);
    if (res.success) setSuccess('Password reset link sent to your email');
    else setError(res.message ?? 'Failed to send reset link');
  };

  return (
    <View style={styles.bg}>
      <View style={styles.hero}>
        <View style={styles.logoRow}>
          <Image source={require('../../assets/smart-life.png')} style={styles.logo} resizeMode="contain" />
          <AppText style={styles.cross}>×</AppText>
          <Image source={require('../../assets/tawal.png')} style={styles.logo} resizeMode="contain" />
        </View>
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
            <AppText style={styles.title}>Forgot password?</AppText>
            <AppText style={styles.subtitle}>
              Enter your email and we'll send you a link to reset your password.
            </AppText>

            {!!error && (
              <View style={[styles.box, styles.errorBox]}>
                <AppText style={styles.errorText}>{error}</AppText>
              </View>
            )}
            {!!success && (
              <View style={[styles.box, styles.successBox]}>
                <AppText style={styles.successText}>{success}</AppText>
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

            <Button title="Send reset link" onPress={handleReset} loading={busy} />

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={{ alignSelf: 'center', marginTop: spacing.md }}
            >
              <AppText style={styles.linkText}>Back to login</AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  hero: {
    backgroundColor: colors.navy,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 90, height: 50 },
  cross: { color: colors.textOnDarkMuted, fontSize: fontSize.h1, marginHorizontal: spacing.sm },
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
  box: { padding: spacing.sm, borderRadius: radius.md, marginBottom: spacing.md },
  errorBox: { backgroundColor: colors.dangerLight },
  errorText: { color: colors.danger, fontSize: fontSize.sm, textAlign: 'center' },
  successBox: { backgroundColor: colors.successLight },
  successText: { color: colors.success, fontSize: fontSize.sm, textAlign: 'center' },
});
