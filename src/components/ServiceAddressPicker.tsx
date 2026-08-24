/**
 * Saved-address cards + add/edit form (home / office / other).
 */

import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ServiceAddressFields, {
  type ServiceAddressValue,
} from './ServiceAddressFields';
import {
  getSavedAddresses,
  updateAddress,
  formatAddressLabel,
  type SavedAddress,
} from '../services/addressService';

export type AddressLabel = 'home' | 'office' | 'other';

export type ServiceAddressSelection = {
  address: ServiceAddressValue;
  label: AddressLabel;
  customLabel: string;
  selectedId: string | null;
  mode: 'saved' | 'new' | 'edit';
  saveForFuture: boolean;
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
  theme: ThemeColors;
  value: ServiceAddressSelection;
  onChange: (next: ServiceAddressSelection) => void;
  t: (key: string) => any;
  /** Reload trigger (e.g. when parent screen becomes focused) */
  refreshKey?: number | string | boolean;
};

function labelIcon(label?: string): string {
  if (label === 'home') return 'home';
  if (label === 'office') return 'work';
  return 'place';
}

export function toFormAddress(
  a: SavedAddress | Partial<SavedAddress> | ServiceAddressValue,
): ServiceAddressValue {
  return {
    address: a.address || '',
    landmark: (a as any).landmark || '',
    city: (a as any).district || a.city || '',
    district: (a as any).district || a.city || '',
    state: a.state || '',
    stateId: (a as any).stateId || '',
    districtId: (a as any).districtId || '',
    pincode: a.pincode || '',
    latitude: a.latitude,
    longitude: a.longitude,
  };
}

export function emptyAddressSelection(
  partial?: Partial<ServiceAddressSelection>,
): ServiceAddressSelection {
  return {
    address: {},
    label: 'home',
    customLabel: '',
    selectedId: null,
    mode: 'new',
    saveForFuture: true,
    ...partial,
  };
}

export default function ServiceAddressPicker({
  theme,
  value,
  onChange,
  t,
  refreshKey,
}: Props) {
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getSavedAddresses();
      setSavedAddresses(list);
      // Auto-select preferred if nothing chosen yet
      if (
        list.length > 0 &&
        !value.selectedId &&
        value.mode !== 'new' &&
        !value.address?.address
      ) {
        const preferred =
          list.find(a => a.isDefault) ||
          list.find(a => a.label === 'home') ||
          list[0];
        onChange({
          address: toFormAddress(preferred),
          label: (preferred.label as AddressLabel) || 'home',
          customLabel: preferred.customLabel || '',
          selectedId: preferred.id || null,
          mode: 'saved',
          saveForFuture: value.saveForFuture,
        });
      } else if (list.length === 0 && value.mode === 'saved') {
        onChange({
          ...value,
          mode: 'new',
          selectedId: null,
        });
      }
    } catch {
      setSavedAddresses([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional on mount/refresh
  }, [refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectSaved = (item: SavedAddress) => {
    setEditError(null);
    onChange({
      address: toFormAddress(item),
      label: (item.label as AddressLabel) || 'other',
      customLabel: item.customLabel || '',
      selectedId: item.id || null,
      mode: 'saved',
      saveForFuture: value.saveForFuture,
    });
  };

  const startAddNew = () => {
    setEditError(null);
    onChange({
      address: {},
      label: 'home',
      customLabel: '',
      selectedId: null,
      mode: 'new',
      saveForFuture: true,
    });
  };

  const startEdit = () => {
    if (!value.selectedId) return;
    setEditError(null);
    onChange({...value, mode: 'edit'});
  };

  const cancelEdit = () => {
    const item = savedAddresses.find(a => a.id === value.selectedId);
    if (item) selectSaved(item);
    else onChange({...value, mode: 'saved'});
  };

  const saveEdit = async () => {
    if (!value.selectedId) return;
    if (!value.address.address || !value.address.pincode) {
      setEditError(String(t('services.validAddressWithPincode')));
      return;
    }
    if (value.label === 'other' && !value.customLabel.trim()) {
      setEditError(String(t('services.customLabelRequired')));
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      const payload: any = {
        ...value.address,
        label: value.label,
      };
      if (value.label === 'other') {
        payload.customLabel = value.customLabel.trim();
      }
      await updateAddress(value.selectedId, payload);
      const list = await getSavedAddresses();
      setSavedAddresses(list);
      const updated =
        list.find(a => a.id === value.selectedId) ||
        list.find(
          a =>
            a.label === value.label &&
            (value.label !== 'other' ||
              a.customLabel === value.customLabel.trim()),
        );
      if (updated) {
        selectSaved(updated);
      } else {
        onChange({...value, mode: 'saved'});
      }
    } catch (e: any) {
      setEditError(e?.message || String(t('services.addressSaveError')));
    } finally {
      setSavingEdit(false);
    }
  };

  const labels: AddressLabel[] = ['home', 'office', 'other'];
  const showForm = value.mode === 'new' || value.mode === 'edit';

  return (
    <View>
      <Text style={[styles.label, {color: theme.text}]}>
        {t('services.selectAddress') || 'Select Address'}
      </Text>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{marginVertical: 16}} />
      ) : (
        <>
          {savedAddresses.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsRow}>
              {savedAddresses.map(item => {
                const selected =
                  value.mode !== 'new' && value.selectedId === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.addressCard,
                      {
                        backgroundColor: selected
                          ? theme.primary + '18'
                          : theme.background,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => selectSaved(item)}
                    activeOpacity={0.85}>
                    <View
                      style={[
                        styles.cardIcon,
                        {backgroundColor: theme.primary + '20'},
                      ]}>
                      <Icon
                        name={labelIcon(item.label)}
                        size={22}
                        color={theme.primary}
                      />
                    </View>
                    <Text
                      style={[styles.cardTitle, {color: theme.text}]}
                      numberOfLines={1}>
                      {formatAddressLabel(item, t as any)}
                    </Text>
                    <Text
                      style={[styles.cardAddress, {color: theme.textSecondary}]}
                      numberOfLines={2}>
                      {item.address}
                    </Text>
                    <Text
                      style={[styles.cardMeta, {color: theme.textSecondary}]}
                      numberOfLines={1}>
                      {[item.pincode, item.district || item.city]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    {selected ? (
                      <Icon
                        name="check-circle"
                        size={18}
                        color={theme.primary}
                        style={styles.cardCheck}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.addNewBtn,
                {
                  borderColor:
                    value.mode === 'new' ? theme.primary : theme.border,
                  backgroundColor:
                    value.mode === 'new' ? theme.primary + '12' : 'transparent',
                  flex: 1,
                },
              ]}
              onPress={startAddNew}
              activeOpacity={0.85}>
              <Icon name="add-location-alt" size={20} color={theme.primary} />
              <Text style={{color: theme.primary, fontWeight: '600'}}>
                {t('services.addAddress') || 'Add new address'}
              </Text>
            </TouchableOpacity>

            {value.mode === 'saved' && value.selectedId ? (
              <TouchableOpacity
                style={[
                  styles.editBtn,
                  {borderColor: theme.border, backgroundColor: theme.background},
                ]}
                onPress={startEdit}
                accessibilityLabel={String(t('services.editAddress') || 'Edit')}>
                <Icon name="edit" size={20} color={theme.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </>
      )}

      {showForm ? (
        <View style={styles.newForm}>
          {value.mode === 'edit' ? (
            <View style={styles.editHeader}>
              <Text style={[styles.label, {color: theme.text, marginBottom: 0}]}>
                {t('services.editAddress') || 'Edit address'}
              </Text>
              <TouchableOpacity onPress={cancelEdit}>
                <Text style={{color: theme.primary, fontWeight: '600'}}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={[styles.label, {color: theme.text}]}>
            {t('services.addressType') || 'Address type'}
          </Text>
          <View style={styles.labelChips}>
            {labels.map(lab => {
              const active = value.label === lab;
              const title =
                lab === 'home'
                  ? t('services.home')
                  : lab === 'office'
                    ? t('services.work') || t('services.office')
                    : t('services.other');
              return (
                <TouchableOpacity
                  key={lab}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? theme.primary
                        : theme.background,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() =>
                    onChange({
                      ...value,
                      label: lab,
                      customLabel: lab !== 'other' ? '' : value.customLabel,
                    })
                  }>
                  <Icon
                    name={labelIcon(lab)}
                    size={16}
                    color={active ? '#fff' : theme.primary}
                  />
                  <Text
                    style={{
                      color: active ? '#fff' : theme.text,
                      fontWeight: '600',
                      fontSize: 13,
                    }}>
                    {title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {value.label === 'other' ? (
            <>
              <Text style={[styles.label, {color: theme.text}]}>
                {t('services.customLabel') || 'Custom name'} *
              </Text>
              <TextInput
                style={[
                  styles.customInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
                value={value.customLabel}
                onChangeText={text =>
                  onChange({...value, customLabel: text})
                }
                placeholder={
                  t('services.customLabelPlaceholder') || "E.g., Mom's House"
                }
                placeholderTextColor={theme.textSecondary}
              />
            </>
          ) : null}

          <ServiceAddressFields
            value={value.address}
            onChange={address => onChange({...value, address})}
            theme={theme}
            showUseCurrentLocation
            showSaveForFuture={value.mode === 'new'}
            saveForFuture={value.saveForFuture}
            onSaveForFutureChange={saveForFuture =>
              onChange({...value, saveForFuture})
            }
          />

          {value.mode === 'edit' ? (
            <TouchableOpacity
              style={[
                styles.saveEditBtn,
                {backgroundColor: theme.primary, opacity: savingEdit ? 0.7 : 1},
              ]}
              onPress={() => void saveEdit()}
              disabled={savingEdit}>
              {savingEdit ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveEditText}>
                  {t('services.saveAddress') || 'Save address'}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}

          {editError ? (
            <Text style={styles.errorText}>{editError}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardsRow: {
    gap: 10,
    paddingBottom: 4,
    paddingRight: 8,
  },
  addressCard: {
    width: 168,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardAddress: {
    fontSize: 12,
    lineHeight: 16,
  },
  cardMeta: {
    fontSize: 11,
    marginTop: 6,
  },
  cardCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'stretch',
  },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    borderStyle: 'dashed',
  },
  editBtn: {
    width: 48,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newForm: {
    marginTop: 14,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  labelChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  customInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 12,
  },
  saveEditBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveEditText: {
    color: '#fff',
    fontWeight: '700',
  },
  errorText: {
    color: '#E53E3E',
    marginTop: 8,
    fontSize: 13,
  },
});
