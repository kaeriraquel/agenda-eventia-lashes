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
import { Colors } from '../constants/theme';

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
        <Text style={value ? styles.valueText : styles.placeholderText} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Text style={styles.caret}>▾</Text>
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
                  style={[styles.option, item === value && styles.optionActive]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={[styles.optionText, item === value && styles.optionTextActive]}>
                    {item}
                  </Text>
                  {item === value ? <Text style={styles.check}>✓</Text> : null}
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
  container: { marginTop: 14 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: Colors.cardBackground,
  },
  valueText: { flex: 1, fontSize: 15, color: Colors.text },
  placeholderText: { flex: 1, fontSize: 15, color: Colors.textSubtle },
  caret: { color: Colors.textSubtle, fontSize: 14, marginLeft: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(43,43,43,0.35)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    padding: 20,
    paddingBottom: 28,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  optionActive: { backgroundColor: Colors.primarySoft },
  optionText: { flex: 1, fontSize: 15, color: Colors.text },
  optionTextActive: { color: Colors.primaryDark, fontWeight: '600' },
  check: { color: Colors.primary, fontSize: 16, fontWeight: '700' },
  closeButton: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
  },
  closeButtonText: { color: Colors.textSecondary, fontWeight: '600' },
});
