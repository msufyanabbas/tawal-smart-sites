// components/GradientText.tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

const GradientText = ({ text, style }: { text: string; style?: any }) => {
  return (
    <MaskedView maskElement={<Text style={[styles.text, style]}>{text}</Text>}>
      <LinearGradient
        colors={['#34BEEF', '#483C90', '#EC47DB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={[styles.text, style, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
};

const styles = StyleSheet.create({
  text: {
    fontWeight: 'bold',
    color: 'white'
  },
});

export default GradientText;
