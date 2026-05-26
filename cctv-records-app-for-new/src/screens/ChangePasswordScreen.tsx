import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppText from '../components/AppText';
import { Button, Field } from '../components/ui';
import { changePassword } from '../api/userService';
import { AuthStackParamList } from '../navigation';
import { colors, fontSize, radius, shadow, spacing } from '../theme';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ChangePassword'>;

const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const params = route.params as { token?: string } | undefined;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [token, setToken] = useState(params?.token || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError('Invalid reset link. Please request a new one.');
  }, [token]);

  const handleSubmit = async () => {
    setError('');
    if (!password || !confirm) return setError('Please fill in all fields');
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (!token) return setError('Invalid reset token');

    setBusy(true);
    const res = await changePassword({ token, newPassword: password });
    setBusy(false);
    if (res.success) {
      Alert.alert('Success', 'Your password has been changed.', [
        { text: 'Login', onPress: () => navigation.navigate('Login') },
      ]);
    } else {
      setError(res.message ?? 'Failed to change password');
    }
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
            <AppText style={styles.title}>Change password</AppText>
            <AppText style={styles.subtitle}>Choose a new password for your account.</AppText>

            {!!error && (
              <View style={styles.errorBox}>
                <AppText style={styles.errorText}>{error}</AppText>
              </View>
            )}

            <Field
              label="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="8+ characters"
            />
            <Field
              label="Confirm new password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
            />

            <Button
              title="Change password"
              onPress={handleSubmit}
              loading={busy}
              disabled={!token}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={{ alignSelf: 'center', marginTop: spacing.md }}
            >
              <AppText style={styles.linkText}>Back to login</AppText>
            </TouchableOpacity>
          </View>

          {!params?.token && (
            <View style={styles.card}>
              <AppText style={styles.subtitle}>
                Tip: this screen is opened from the password-reset email. If you
                arrived here by mistake, head back to login.
              </AppText>
              <Field
                label="Reset token (advanced)"
                value={token}
                onChangeText={setToken}
                placeholder="Paste your token if needed"
                autoCapitalize="none"
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ChangePasswordScreen;

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
  errorBox: {
    backgroundColor: colors.dangerLight,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: fontSize.sm, textAlign: 'center' },
});
