// Shared, theme-aware UI primitives. Built on top of `theme.ts` so screens
// don't sprinkle hex codes or one-off styles.

import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import { colors, radius, shadow, spacing, fontSize } from '../theme';

// ── Layout ─────────────────────────────────────────────────────────────────

export const Card: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export const Section: React.FC<{
  title?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ title, children, style }) => (
  <View style={[{ marginBottom: spacing.md }, style]}>
    {!!title && <AppText style={styles.sectionTitle}>{title}</AppText>}
    {children}
  </View>
);

// ── Buttons ────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
  fullWidth = true,
}) => {
  const v = btnVariants[variant];
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.btn,
        v.container,
        !fullWidth && { alignSelf: 'flex-start' },
        isDisabled && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.spinner} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.btnText, v.text, icon ? { marginLeft: spacing.sm } : null]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const btnVariants: Record<
  ButtonVariant,
  { container: ViewStyle; text: TextStyle; spinner: string }
> = {
  primary: {
    container: { backgroundColor: colors.brand, ...shadow.brand },
    text: { color: '#fff' },
    spinner: '#fff',
  },
  secondary: {
    container: {
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: colors.brand,
    },
    text: { color: colors.brand },
    spinner: colors.brand,
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: colors.navy },
    spinner: colors.navy,
  },
  danger: {
    container: { backgroundColor: colors.danger },
    text: { color: '#fff' },
    spinner: '#fff',
  },
};

// ── Inputs ─────────────────────────────────────────────────────────────────

interface FieldProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  error,
  helper,
  style,
  ...rest
}) => (
  <View style={{ marginBottom: spacing.md }}>
    {!!label && <AppText style={styles.label}>{label}</AppText>}
    <TextInput
      placeholderTextColor={colors.textFaint}
      style={[styles.input, !!error && styles.inputError, style]}
      {...rest}
    />
    {error ? (
      <AppText style={styles.error}>{error}</AppText>
    ) : helper ? (
      <AppText style={styles.helper}>{helper}</AppText>
    ) : null}
  </View>
);

// ── PickerField ────────────────────────────────────────────────────────────
//
// A press-to-open dropdown styled like `Field`. Used for enum-shaped values
// (city, region) where a free-text input would let the user enter invalid
// data. Renders a bottom-sheet style modal of options.

interface PickerFieldProps {
  label?: string;
  value?: string;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  helper?: string;
  onChange: (v: string) => void;
}

export const PickerField: React.FC<PickerFieldProps> = ({
  label,
  value,
  options,
  placeholder = 'Select…',
  disabled,
  error,
  helper,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: spacing.md }}>
      {!!label && <AppText style={styles.label}>{label}</AppText>}
      <TouchableOpacity
        activeOpacity={disabled ? 1 : 0.7}
        onPress={() => !disabled && setOpen(true)}
        style={[
          styles.input,
          styles.pickerRow,
          !!error && styles.inputError,
          disabled && { backgroundColor: colors.bg, opacity: 0.7 },
        ]}
      >
        <Text
          style={{
            color: value ? colors.text : colors.textFaint,
            fontSize: fontSize.body,
          }}
        >
          {value || placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color={disabled ? colors.textFaint : colors.textMuted}
        />
      </TouchableOpacity>
      {error ? (
        <AppText style={styles.error}>{error}</AppText>
      ) : helper ? (
        <AppText style={styles.helper}>{helper}</AppText>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHead}>
              <AppText style={styles.pickerTitle}>{label ?? 'Select'}</AppText>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(opt) => opt}
              ListEmptyComponent={
                <View style={{ padding: spacing.lg }}>
                  <AppText style={{ color: colors.textMuted, textAlign: 'center' }}>
                    No options available.
                  </AppText>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = item === value;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                    style={[styles.pickerOption, isSelected && styles.pickerOptionActive]}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        isSelected && { color: colors.brand, fontWeight: '700' },
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color={colors.brand} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ── Chips / Badges ─────────────────────────────────────────────────────────

export const Chip: React.FC<{
  label: string;
  color?: string;
  filled?: boolean;
  small?: boolean;
}> = ({ label, color = colors.brand, filled = true, small = false }) => (
  <View
    style={[
      styles.chip,
      small && styles.chipSm,
      filled
        ? { backgroundColor: color }
        : { backgroundColor: '#fff', borderWidth: 1, borderColor: color },
    ]}
  >
    <Text
      style={[
        styles.chipText,
        small && styles.chipTextSm,
        { color: filled ? '#fff' : color },
      ]}
    >
      {label}
    </Text>
  </View>
);

// Selectable pill used in filter rows / multi-step pickers.
export const SelectablePill: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
}> = ({ label, active, onPress }) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.pill,
      active ? styles.pillActive : styles.pillIdle,
    ]}
  >
    <Text style={[styles.pillText, active && styles.pillTextActive]}>
      {label}
    </Text>
  </Pressable>
);

// ── Empty / error / loading states ─────────────────────────────────────────

export const EmptyState: React.FC<{
  icon?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}> = ({ icon = '○', title, subtitle, action }) => (
  <View style={styles.empty}>
    <Text style={styles.emptyIcon}>{icon}</Text>
    <AppText style={styles.emptyTitle}>{title}</AppText>
    {!!subtitle && <AppText style={styles.emptySub}>{subtitle}</AppText>}
    {action && (
      <View style={{ marginTop: spacing.md }}>
        <Button title={action.label} onPress={action.onPress} fullWidth={false} />
      </View>
    )}
  </View>
);

export const ErrorState: React.FC<{
  message: string;
  onRetry?: () => void;
}> = ({ message, onRetry }) => (
  <View style={styles.empty}>
    <Text style={[styles.emptyIcon, { color: colors.danger }]}>!</Text>
    <AppText style={styles.emptyTitle}>Something went wrong</AppText>
    <AppText style={styles.emptySub}>{message}</AppText>
    {onRetry && (
      <View style={{ marginTop: spacing.md }}>
        <Button title="Retry" onPress={onRetry} fullWidth={false} />
      </View>
    )}
  </View>
);

export const LoadingState: React.FC<{ label?: string }> = ({ label }) => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" color={colors.brand} />
    {!!label && <AppText style={styles.loadingLabel}>{label}</AppText>}
  </View>
);

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.brand,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },

  btn: {
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnText: {
    fontSize: fontSize.body,
    fontWeight: '700',
  },

  label: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.body,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.xs,
    marginTop: 4,
  },
  helper: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 4,
  },

  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,26,46,0.55)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '75%',
  },
  pickerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  pickerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pickerOptionActive: {
    backgroundColor: colors.brandLight,
  },
  pickerOptionText: { fontSize: fontSize.body, color: colors.text },

  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  chipSm: { paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { fontSize: fontSize.xs, fontWeight: '700' },
  chipTextSm: { fontSize: 9 },

  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginRight: 6,
    marginBottom: 6,
  },
  pillIdle: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  pillActive: { backgroundColor: colors.brand, borderWidth: 1, borderColor: colors.brand },
  pillText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  pillTextActive: { color: '#fff' },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    fontSize: 48,
    color: colors.textFaint,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },

  loading: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
