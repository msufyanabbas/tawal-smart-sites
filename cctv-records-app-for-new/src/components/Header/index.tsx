import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackHeaderProps } from '@react-navigation/native-stack';

import AppText from '../AppText';
import { useAuth } from '../../contexts/AuthContext';
import { colors, fontSize, spacing } from '../../theme';

// Single, branded header used by every native-stack screen. Shows the
// "Smart Life × Tawal" lockup, optional back arrow, and a logout button.
// Returns a React element rather than `ReactNode` so it matches Navigation v7
// expectations under React 19's stricter ReactNode typing.
const CustomHeader = (props: Partial<NativeStackHeaderProps>): React.ReactElement => {
  const { back, options } = props;
  const navigation = useNavigation();
  const { logout } = useAuth();

  const title = options?.title;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.row}>
        <View style={styles.side}>
          {back ? (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={12}
              style={styles.iconBtn}
            >
              <Ionicons name="chevron-back" size={26} color={colors.textOnDark} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.center}>
          <View style={styles.logoRow}>
            <Image
              source={require('../../../assets/smart-life.png')}
              style={styles.logoSmall}
              resizeMode="contain"
            />
            <AppText style={styles.cross}>×</AppText>
            <Image
              source={require('../../../assets/tawal.png')}
              style={styles.logoSmall}
              resizeMode="contain"
            />
          </View>
          {!!title && <AppText style={styles.title}>{title}</AppText>}
        </View>

        <View style={styles.side}>
          <TouchableOpacity onPress={logout} hitSlop={12} style={styles.iconBtn}>
            <Ionicons name="log-out-outline" size={24} color={colors.textOnDark} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default CustomHeader;

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.navy,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  side: { width: 44, alignItems: 'center' },
  iconBtn: { padding: 4 },
  center: { flex: 1, alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoSmall: { width: 60, height: 36 },
  cross: {
    color: colors.textOnDarkMuted,
    fontSize: fontSize.lg,
    marginHorizontal: 6,
  },
  title: {
    color: colors.textOnDark,
    fontSize: fontSize.sm,
    marginTop: 2,
    fontWeight: '500',
    opacity: 0.85,
  },
});
