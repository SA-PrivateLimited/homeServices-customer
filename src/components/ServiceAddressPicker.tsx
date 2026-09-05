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
  saveAddress,
  deleteAddress,
  setDefaultAddress,
  formatAddressLabel,
  findPersistedAddress,
  type SavedAddress,
} from '../services/addressService';
import ConfirmationModal from './ConfirmationModal';

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

function sortSavedAddresses(list: SavedAddress[]): SavedAddress[] {
  return [...list].sort(
    (a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)),
  );
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
  const [pendingDelete, setPendingDelete] = useState<SavedAddress | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isDark = String(theme.background || '').toLowerCase() === '#0b1220';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = sortSavedAddresses(await getSavedAddresses());
      setSavedAddresses(list);
      const hasFilledAddress = Boolean(value.address?.address?.trim());

      if (list.length > 0 && !value.selectedId && value.mode !== 'new') {
        if (hasFilledAddress) {
          // Edit existing request: highlight matching saved chip, keep address.
          const pin = String(value.address.pincode || '').trim();
          const street = String(value.address.address || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
          const match =
            list.find(a => {
              const aStreet = String(a.address || '')
                .replace(/\s+/g, ' ')
                .trim()
                .toLowerCase();
              const aPin = String(a.pincode || '').trim();
              return (
                aPin === pin &&
                (aStreet === street ||
                  aStreet.includes(street) ||
                  street.includes(aStreet))
              );
            }) || null;
          if (match?.id) {
            onChange({
              ...value,
              selectedId: match.id,
              label: (match.label as AddressLabel) || value.label,
              customLabel: match.customLabel || value.customLabel,
              mode: 'saved',
            });
          }
        } else {
          // Web: isDefault → legacy id "home" → first
          const preferred =
            list.find(a => a.isDefault) ||
            list.find(a => a.id === 'home') ||
            list[0];
          onChange({
            address: toFormAddress(preferred),
            label: (preferred.label as AddressLabel) || 'home',
            customLabel: preferred.customLabel || '',
            selectedId: preferred.id || null,
            mode: 'saved',
            saveForFuture: value.saveForFuture,
          });
        }
      } else if (
        list.length === 0 &&
        value.mode === 'saved' &&
        !hasFilledAddress
      ) {
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

  const startEditItem = (item: SavedAddress) => {
    setEditError(null);
    onChange({
      address: toFormAddress(item),
      label: (item.label as AddressLabel) || 'other',
      customLabel: item.customLabel || '',
      selectedId: item.id || null,
      mode: 'edit',
      saveForFuture: value.saveForFuture,
    });
  };

  const cancelEdit = () => {
    const item = savedAddresses.find(a => a.id === value.selectedId);
    if (item) selectSaved(item);
    else onChange({...value, mode: 'saved'});
  };

  const validateAddressForm = (): boolean => {
    if (
      !value.address.address?.trim() ||
      !/^\d{6}$/.test(value.address.pincode || '')
    ) {
      setEditError(
        String(
          t('request.validAddressRequired') ||
            t('services.validAddressWithPincode'),
        ),
      );
      return false;
    }
    if (value.label === 'other' && !value.customLabel.trim()) {
      setEditError(
        String(
          t('request.customLabelRequired') || t('services.customLabelRequired'),
        ),
      );
      return false;
    }
    return true;
  };

  const saveNew = async () => {
    if (!validateAddressForm()) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const saved = await saveAddress({
        ...value.address,
        label: value.label,
        customLabel:
          value.label === 'other' ? value.customLabel.trim() : undefined,
      });
      const list = sortSavedAddresses(await getSavedAddresses());
      setSavedAddresses(list);
      const updated =
        findPersistedAddress(list, {
          id: saved.id,
          before: saved,
          preferDefault: true,
        }) || saved;
      selectSaved(updated);
    } catch {
      setEditError(
        String(t('request.saveAddressFailed') || t('services.addressSaveError')),
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const saveEdit = async () => {
    if (!value.selectedId) return;
    if (!validateAddressForm()) return;
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
      const before = savedAddresses.find(a => a.id === value.selectedId);
      const saved = await updateAddress(value.selectedId, payload);
      const list = sortSavedAddresses(await getSavedAddresses());
      setSavedAddresses(list);
      const updated = findPersistedAddress(list, {
        id: saved.id,
        before: saved || before,
        preferDefault: Boolean(saved?.isDefault || before?.isDefault),
      });
      if (updated) {
        selectSaved(updated);
      } else {
        onChange({...value, mode: 'saved'});
      }
    } catch (e: any) {
      setEditError(
        e?.message ||
          String(t('request.saveAddressFailed') || t('services.addressSaveError')),
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    const id = pendingDelete?.id;
    if (!id) return;
    setDeleting(true);
    setEditError(null);
    try {
      await deleteAddress(id);
      const list = sortSavedAddresses(await getSavedAddresses());
      setSavedAddresses(list);
      if (value.selectedId === id) {
        const next =
          list.find(a => a.isDefault) ||
          list.find(a => a.id === 'home') ||
          list[0];
        if (next) selectSaved(next);
        else startAddNew();
      }
    } catch {
      setEditError(String(t('request.deleteAddressFailed') || 'Could not delete'));
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const makeDefault = async () => {
    if (!value.selectedId) return;
    const before = savedAddresses.find(a => a.id === value.selectedId);
    setSavingEdit(true);
    setEditError(null);
    try {
      const list = sortSavedAddresses(await setDefaultAddress(value.selectedId));
      setSavedAddresses(list);
      // Legacy home/office ids are remapped on first persist — rematch by key/default.
      const updated = findPersistedAddress(list, {
        id: value.selectedId,
        before,
        preferDefault: true,
      });
      if (updated) selectSaved(updated);
    } catch {
      setEditError(
        String(t('request.saveAddressFailed') || t('services.addressSaveError')),
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const labels: AddressLabel[] = ['home', 'office', 'other'];
  const showForm = value.mode === 'new' || value.mode === 'edit';
  const selectedIsDefault = Boolean(
    savedAddresses.find(a => a.id === value.selectedId)?.isDefault,
  );

  return (
    <View>
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
                        // Web `.addr-chip--card.is-selected`: soft primary ring
                        // (box-shadow 0 0 0 2px @14%), no hard border / elevation.
                        backgroundColor: selected
                          ? `${theme.primary}0F`
                          : isDark
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(255,255,255,0.82)',
                        borderWidth: 0,
                        elevation: 0,
                        shadowColor: theme.primary,
                        shadowOffset: {width: 0, height: 0},
                        shadowOpacity: selected ? 0.28 : 0,
                        shadowRadius: selected ? 2 : 0,
                        // Android: soft ring via outline-like double wash
                        ...(selected
                          ? {
                              borderWidth: 2,
                              borderColor: `${theme.primary}24`,
                            }
                          : {}),
                      },
                    ]}
                    onPress={() => selectSaved(item)}
                    activeOpacity={0.85}>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.cardEdit}
                        onPress={() => startEditItem(item)}
                        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                        <Icon
                          name="edit"
                          size={14}
                          color={
                            selected ? theme.primary : theme.textSecondary
                          }
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cardEdit}
                        onPress={() => setPendingDelete(item)}
                        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                        <Icon name="delete" size={14} color="#E53E3E" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.cardTop}>
                      <Icon
                        name={labelIcon(item.label)}
                        size={16}
                        color={theme.primary}
                      />
                      <Text
                        style={[styles.cardTitle, {color: theme.text}]}
                        numberOfLines={1}>
                        {formatAddressLabel(item, t as any)}
                      </Text>
                      {item.isDefault ? (
                        <Text
                          style={[
                            styles.defaultBadge,
                            {color: theme.textSecondary},
                          ]}
                          numberOfLines={1}>
                          {t('request.defaultAddress') || 'Usually used'}
                        </Text>
                      ) : null}
                    </View>
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
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[
                  styles.addressCard,
                  styles.addNewChip,
                  {
                    backgroundColor:
                      value.mode === 'new'
                        ? `${theme.primary}14`
                        : isDark
                          ? 'rgba(255,255,255,0.08)'
                          : 'rgba(255,255,255,0.82)',
                    borderWidth: value.mode === 'new' ? 2 : 0,
                    borderColor:
                      value.mode === 'new'
                        ? `${theme.primary}24`
                        : 'transparent',
                    elevation: 0,
                    shadowOpacity: 0,
                  },
                ]}
                onPress={startAddNew}
                activeOpacity={0.85}>
                <View style={styles.cardTop}>
                  <Icon name="add" size={16} color={theme.primary} />
                  <Text
                    style={[styles.cardTitle, {color: theme.primary}]}
                    numberOfLines={1}>
                    {t('request.addAddressChip') ||
                      t('services.addAddress') ||
                      'New'}
                  </Text>
                </View>
                <Text
                  style={[styles.cardAddress, {color: theme.textSecondary}]}
                  numberOfLines={2}>
                  {t('request.addAddressHint') || 'Add a place'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <TouchableOpacity
              style={[
                styles.addNewBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(255,255,255,0.82)',
                  elevation: 0,
                  shadowOpacity: 0,
                  borderWidth: 0,
                },
              ]}
              onPress={startAddNew}
              activeOpacity={0.85}>
              <Icon name="add-location-alt" size={20} color={theme.primary} />
              <Text
                style={{color: theme.primary, fontWeight: '600', fontSize: 14}}>
                {t('request.addAddressChip') ||
                  t('services.addAddress') ||
                  '+ Add Address'}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {showForm ? (
        <View style={styles.newForm}>
          <View style={styles.labelChips}>
            {labels.map(lab => {
              const active = value.label === lab;
              const title =
                lab === 'home'
                  ? t('request.home') || t('services.home')
                  : lab === 'office'
                    ? t('request.office') ||
                      t('services.work') ||
                      t('services.office')
                    : t('request.other') || t('services.other');
              return (
                <TouchableOpacity
                  key={lab}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? `${theme.primary}1A`
                        : theme.background,
                      borderColor: active ? `${theme.primary}40` : theme.border,
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
                    color={theme.primary}
                  />
                  <Text
                    style={{
                      color: theme.text,
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
                {t('request.customLabel') || t('services.customLabel') || 'Custom name'}
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
                  t('request.customLabelPlaceholder') ||
                  t('services.customLabelPlaceholder') ||
                  "E.g., Mom's House"
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

          {editError ? (
            <Text style={styles.errorText}>{editError}</Text>
          ) : null}

          {value.mode === 'edit' ? (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnSecondary, {borderColor: theme.border}]}
                onPress={cancelEdit}
                disabled={savingEdit}>
                <Text style={[styles.actionBtnText, {color: theme.text}]}>
                  {t('request.cancel') || t('common.cancel')}
                </Text>
              </TouchableOpacity>
              {!selectedIsDefault ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSecondary, {borderColor: theme.border}]}
                  onPress={() => void makeDefault()}
                  disabled={savingEdit}>
                  <Text style={[styles.actionBtnText, {color: theme.text}]}>
                    {t('request.setDefaultAddress') || 'Set as usual'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.actionBtnPrimary,
                  {backgroundColor: theme.primary, opacity: savingEdit ? 0.7 : 1},
                ]}
                onPress={() => void saveEdit()}
                disabled={savingEdit}>
                {savingEdit ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.actionBtnText, {color: '#fff'}]}>
                    {t('request.saveChanges') || t('services.saveAddress')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {value.mode === 'new' ? (
            <View style={styles.editActions}>
              {savedAddresses.length > 0 ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSecondary, {borderColor: theme.border}]}
                  onPress={() => {
                    const preferred =
                      savedAddresses.find(a => a.isDefault) || savedAddresses[0];
                    if (preferred) selectSaved(preferred);
                  }}
                  disabled={savingEdit}>
                  <Text style={[styles.actionBtnText, {color: theme.text}]}>
                    {t('request.cancel') || t('common.cancel')}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.actionBtnPrimary,
                  {backgroundColor: theme.primary, opacity: savingEdit ? 0.7 : 1},
                ]}
                onPress={() => void saveNew()}
                disabled={savingEdit}>
                {savingEdit ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.actionBtnText, {color: '#fff'}]}>
                    {t('request.saveAddress') || t('services.saveAddress')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}

      <ConfirmationModal
        visible={Boolean(pendingDelete)}
        type="danger"
        title={String(t('request.deleteAddressTitle') || 'Delete address?')}
        message={String(
          t('request.deleteAddressMessage') ||
            'This address will be removed from your saved places.',
        )}
        confirmText={String(
          t('request.deleteAddressConfirm') || t('common.delete') || 'Delete',
        )}
        cancelText={String(t('common.cancel') || 'Cancel')}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
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
    gap: 8,
    paddingBottom: 4,
    paddingRight: 8,
  },
  addressCard: {
    width: 168,
    minWidth: 168,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingRight: 52,
    minHeight: 72,
    position: 'relative',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  defaultBadge: {
    fontSize: 9,
    fontWeight: '500',
    marginLeft: 2,
    flexShrink: 0,
    opacity: 0.85,
    letterSpacing: 0,
  },
  cardAddress: {
    fontSize: 11,
    lineHeight: 15,
  },
  cardMeta: {
    fontSize: 10,
    marginTop: 4,
  },
  cardEdit: {
    padding: 4,
  },
  cardActions: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 1,
    flexDirection: 'row',
    gap: 2,
  },
  addNewChip: {
    justifyContent: 'center',
  },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    alignSelf: 'stretch',
    width: '100%',
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  newForm: {
    marginTop: 14,
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
  editActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  actionBtn: {
    flexGrow: 1,
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: {},
  actionBtnSecondary: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  actionBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  errorText: {
    color: '#E53E3E',
    marginTop: 8,
    fontSize: 13,
  },
});
