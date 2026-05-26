import React from 'react';
import { Modal, TouchableOpacity, View, FlatList, StyleSheet } from 'react-native';
import AppText from '../AppText';

interface DropdownSelectorProps {
  selectedLabel: string;
  visible: boolean;
  onSelect: (item: { label: string; value: string }) => void;
  onClose: () => void;
  options: { label: string; value: string }[];
}

const DropdownSelector = ({ selectedLabel, visible, onSelect, onClose, options }: DropdownSelectorProps) => {
  const renderItem = ({ item }: { item: { label: string; value: string } }) => (
    <TouchableOpacity
      style={styles.optionItem}
      onPress={() => onSelect(item)}
    >
      <AppText style={styles.optionText}>{item.label}</AppText>
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <AppText style={styles.title}>Select Role</AppText>
          <FlatList
            data={options}
            renderItem={renderItem}
            keyExtractor={(item) => item.value}
          />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <AppText style={styles.closeText}>Close</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default DropdownSelector;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  optionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#f2f2f2',
    borderRadius: 5,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  closeText: {
    fontSize: 16,
    color: '#555',
  },
});
