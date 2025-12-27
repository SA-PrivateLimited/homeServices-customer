/**
 * Country Code Picker Component
 * Displays a dropdown to select country code for phone number input
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {COUNTRY_CODES, DEFAULT_COUNTRY_CODE, CountryCode} from '../utils/countryCodes';

interface CountryCodePickerProps {
  selectedCountry: CountryCode;
  onSelect: (country: CountryCode) => void;
}

export default function CountryCodePicker({
  selectedCountry,
  onSelect,
}: CountryCodePickerProps) {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [showModal, setShowModal] = useState(false);

  const handleSelect = (country: CountryCode) => {
    onSelect(country);
    setShowModal(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.pickerButton,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
        onPress={() => setShowModal(true)}>
        <Text style={styles.flag}>{selectedCountry.flag}</Text>
        <Text style={[styles.dialCode, {color: theme.text}]}>
          {selectedCountry.dialCode}
        </Text>
        <Icon name="arrow-drop-down" size={20} color={theme.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: theme.text}]}>
                Select Country
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={item => item.code}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    {
                      backgroundColor:
                        selectedCountry.code === item.code
                          ? theme.primary + '20'
                          : 'transparent',
                    },
                  ]}
                  onPress={() => handleSelect(item)}>
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <View style={styles.countryInfo}>
                    <Text style={[styles.countryName, {color: theme.text}]}>
                      {item.name}
                    </Text>
                    <Text
                      style={[styles.countryDialCode, {color: theme.textSecondary}]}>
                      {item.dialCode}
                    </Text>
                  </View>
                  {selectedCountry.code === item.code && (
                    <Icon name="check" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.countryList}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 80,
  },
  flag: {
    fontSize: 20,
    marginRight: 6,
  },
  dialCode: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  countryList: {
    maxHeight: 400,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  countryDialCode: {
    fontSize: 14,
  },
});

