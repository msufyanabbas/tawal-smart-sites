import React from 'react';
import { Text, TextProps, I18nManager } from 'react-native';

interface AppTextProps extends TextProps {
  arabic?: boolean;
}

export default function AppText({ arabic, style, ...props }: AppTextProps) {
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: arabic ? 'Mulish-Bold' : 'Mulish-Bold',
          textAlign: arabic ? 'right' : 'left',
          writingDirection: arabic ? 'rtl' : 'ltr',
        },
        style,
      ]}
    />
  );
}