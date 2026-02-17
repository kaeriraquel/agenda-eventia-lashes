// components/SelectField.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';

interface SelectFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  options: string[];
  onChange: (value: string) => void;
}

export function SelectField({
  label,
  value,
  placeholder = 'Selecciona una opción',
  options,
  onChange,
}: SelectFieldProps) {
  const [visible, setVisible] = useState(false);

  const handleSelect = (option: string) => {
    onChange(option);
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={styles.selector}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value || placeholder}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{label}</Text>

            <FlatList
              data={options}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.optionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  selector: {
    borderWidth: 1,
    borderColor: '#FFD1E8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  valueText: {
    fontSize: 15,
    color: '#333',
  },
  placeholderText: {
    fontSize: 15,
    color: '#999',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  option: {
    paddingVertical: 10,
  },
  optionText: {
    fontSize: 15,
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#FF6FB5',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
