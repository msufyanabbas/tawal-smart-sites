import React from 'react';
import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';
import AppText from '../AppText';

interface InputFieldProps extends TextInputProps {
  label: string;
}

const InputField = ({ label, ...props }: InputFieldProps) => {
  return (
    <View style={styles.container}>
      <AppText style={styles.label}>{label}</AppText>
      <TextInput style={styles.input} {...props} />
    </View>
  );
};

export default InputField;

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
});
