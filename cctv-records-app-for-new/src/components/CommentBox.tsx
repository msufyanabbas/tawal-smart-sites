import React from "react";
import { TextInput } from "react-native";
import { Card } from "./ui";
import AppText from "./AppText";

interface CommentBoxProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  styles: any;
  colors: any;
}

export function CommentBox({
  label,
  value,
  onChange,
  styles,
  colors,
}: CommentBoxProps) {
  return (
    <Card>
      <AppText style={styles.cardTitle}>{label}</AppText>
      <TextInput
        editable
        multiline
        maxLength={2000}
        value={value}
        onChangeText={onChange}
        placeholder="Enter comments"
        style={styles.remarksInput}
        placeholderTextColor={colors.textFaint}
      />
    </Card>
  );
}
