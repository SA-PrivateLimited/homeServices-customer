/**
 * Crystal filter menu — parity with customer-web CrystalFilterMenu
 * (compact options, uppercase title, selected primary wash + ✓).
 * RN uses a bottom sheet; web uses an anchored portal.
 */

import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export type CrystalFilterOptionItem = {
  value: string;
  label: string;
};

type ThemeColors = {
  text: string;
  textSecondary: string;
  primary: string;
  card: string;
  border: string;
  background: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  options: CrystalFilterOptionItem[];
  selected: string;
  onSelect: (value: string) => void;
  theme: ThemeColors;
  isDark?: boolean;
};

export function CrystalFilterMenu({
  open,
  onClose,
  title,
  options,
  selected,
  onSelect,
  theme,
  isDark,
}: Props) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.menu,
            {
              backgroundColor: isDark
                ? theme.card
                : 'rgba(255,255,255,0.98)',
              borderColor: `${theme.border}B3`,
              shadowColor: '#1e3c5a',
            },
          ]}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, {backgroundColor: theme.border}]} />
          </View>
          <Text style={[styles.title, {color: theme.textSecondary}]}>
            {title}
          </Text>
          <ScrollView
            style={styles.options}
            contentContainerStyle={styles.optionsContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {options.map(opt => {
              const isSelected = selected === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.option,
                    isSelected
                      ? {backgroundColor: `${theme.primary}24`}
                      : null,
                  ]}
                  onPress={() => {
                    onSelect(opt.value);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{selected: isSelected}}>
                  <Text
                    style={[
                      styles.optionText,
                      {color: isSelected ? theme.primary : theme.text},
                    ]}
                    numberOfLines={2}>
                    {opt.label}
                  </Text>
                  {isSelected ? (
                    <Text style={[styles.check, {color: theme.primary}]}>✓</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menu: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '52%',
    paddingHorizontal: 8,
    paddingBottom: 20,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: -4},
    elevation: 10,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  title: {
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingTop: 4,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  options: {
    maxHeight: 280,
  },
  optionsContent: {
    gap: 2,
    paddingBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    minHeight: 44,
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  check: {
    fontSize: 12,
    fontWeight: '800',
  },
});
