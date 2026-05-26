import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colors, fontSize, radius, shadow, spacing } from '../../theme';

type CustomButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    style={[
      styles.button,
      (disabled || loading) && styles.disabled,
      style,
    ]}
    activeOpacity={0.8}
  >
    {loading ? (
      <ActivityIndicator color="#fff" size="small" />
    ) : (
      <Text style={[styles.text, textStyle]}>{title}</Text>
    )}
  </TouchableOpacity>
);

export default CustomButton;

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
    ...shadow.brand,
  },
  text: {
    color: '#fff',
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  disabled: { opacity: 0.55 },
});
