import React, {useEffect, useMemo, useState} from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type {
  GeographyBlock,
  GeographyDistrict,
  GeographyState,
} from '../../services/api/geographyApi';
import type {Theme} from '../../utils/theme';
import useTranslation from '../../hooks/useTranslation';
import {
  GEOGRAPHY_SEARCH_DEBOUNCE_MS,
  filterLabeledOptions,
} from '../../utils/geographySearch';

export type BrowseLocationPickerProps = {
  theme: Theme;
  visible: boolean;
  onClose: () => void;
  states: GeographyState[];
  districts: GeographyDistrict[];
  blocks?: GeographyBlock[];
  stateId: string;
  districtId: string;
  blockId?: string;
  locating: boolean;
  usingDeviceLocation?: boolean;
  hasLocation: boolean;
  onUseMyLocation: () => void;
  onStateChange: (stateId: string) => void;
  onDistrictChange: (districtId: string) => void;
  onBlockChange?: (blockId: string) => void;
};

type PickerField = 'state' | 'district' | 'block';

type OptionRow = {value: string; label: string};

function FieldTrigger({
  theme,
  label,
  valueLabel,
  placeholder,
  disabled,
  onPress,
}: {
  theme: Theme;
  label: string;
  valueLabel: string;
  placeholder: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, {color: theme.textSecondary}]}>
        {label}
      </Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.fieldTrigger,
          {
            backgroundColor: theme.background,
            borderColor: theme.border,
            opacity: disabled ? 0.55 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityState={{disabled: Boolean(disabled)}}>
        <Text
          style={[
            styles.fieldValue,
            {color: valueLabel ? theme.text : theme.textSecondary},
          ]}
          numberOfLines={2}>
          {valueLabel || placeholder}
        </Text>
        <Text style={[styles.chevron, {color: theme.textSecondary}]}>▾</Text>
      </Pressable>
    </View>
  );
}

/**
 * Location picker sheet — single Modal (no nested Select modals on Android).
 */
export function BrowseLocationPickerModal({
  theme,
  visible,
  onClose,
  states,
  districts,
  blocks = [],
  stateId,
  districtId,
  blockId = '',
  locating,
  usingDeviceLocation = false,
  hasLocation,
  onUseMyLocation,
  onStateChange,
  onDistrictChange,
  onBlockChange,
}: BrowseLocationPickerProps) {
  const {t} = useTranslation();
  const [activeField, setActiveField] = useState<PickerField | null>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    if (!visible) {
      setActiveField(null);
      setSearchText('');
      setDebouncedQuery('');
    }
  }, [visible]);

  useEffect(() => {
    setSearchText('');
    setDebouncedQuery('');
  }, [activeField]);

  useEffect(() => {
    if (!activeField) {
      setDebouncedQuery('');
      return;
    }
    const handle = setTimeout(() => {
      setDebouncedQuery(searchText);
    }, GEOGRAPHY_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchText, activeField]);

  const primaryTint = 'rgba(74, 144, 226, 0.12)';

  const filteredDistricts = useMemo(
    () => (stateId ? districts.filter(d => d.stateId === stateId) : []),
    [districts, stateId],
  );
  const filteredBlocks = useMemo(
    () => (districtId ? blocks.filter(b => b.districtId === districtId) : []),
    [blocks, districtId],
  );

  const stateLabel =
    states.find(s => s._id === stateId)?.name || '';
  const districtLabel =
    filteredDistricts.find(d => d._id === districtId)?.name || '';
  const blockLabel =
    filteredBlocks.find(b => b._id === blockId)?.name || '';

  const deviceLocationSelected = usingDeviceLocation && hasLocation && !locating;

  const activeOptions: OptionRow[] = useMemo(() => {
    let rows: OptionRow[] = [];
    if (activeField === 'state') {
      rows = states.map(s => ({value: s._id, label: s.name}));
    } else if (activeField === 'district') {
      rows = filteredDistricts.map(d => ({value: d._id, label: d.name}));
    } else if (activeField === 'block') {
      rows = filteredBlocks.map(b => ({value: b._id, label: b.name}));
    }
    return filterLabeledOptions(rows, debouncedQuery);
  }, [
    activeField,
    states,
    filteredDistricts,
    filteredBlocks,
    debouncedQuery,
  ]);

  const searchPlaceholder =
    activeField === 'state'
      ? String(t('browse.searchStatePlaceholder') || 'Search state...')
      : activeField === 'district'
        ? String(
            t('browse.searchDistrictPlaceholder') || 'Search district...',
          )
        : activeField === 'block'
          ? String(t('browse.searchBlockPlaceholder') || 'Search block...')
          : '';

  const emptySearchText =
    activeField === 'state'
      ? String(
          t('browse.noStatesFound') ||
            'No states found\nTry a different name.',
        )
      : activeField === 'district'
        ? String(
            t('browse.noDistrictsFound') ||
              'No districts found\nTry a different name.',
          )
        : String(
            t('browse.noBlocksFound') ||
              'No blocks found\nTry a different name.',
          );

  const activeTitle =
    activeField === 'state'
      ? String(t('browse.selectState'))
      : activeField === 'district'
        ? String(t('browse.selectDistrict'))
        : activeField === 'block'
          ? String(t('browse.selectBlock'))
          : '';

  const pickValue = (value: string) => {
    if (activeField === 'state') {
      onStateChange(value);
      setActiveField(null);
      return;
    }
    if (activeField === 'district') {
      onDistrictChange(value);
      setActiveField(null);
      return;
    }
    if (activeField === 'block' && onBlockChange) {
      onBlockChange(value);
      setActiveField(null);
    }
  };

  const clearActive = () => {
    if (activeField === 'state') onStateChange('');
    if (activeField === 'district') onDistrictChange('');
    if (activeField === 'block' && onBlockChange) onBlockChange('');
    setActiveField(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={() => (activeField ? setActiveField(null) : onClose())}>
      <View style={styles.modalRoot}>
        <Pressable
          style={styles.backdrop}
          onPress={() => (activeField ? setActiveField(null) : onClose())}
        />
        <View
          style={[
            styles.sheet,
            {backgroundColor: theme.card},
            // Option lists keep a fixed sheet height — search result count
            // must never shrink/expand the bottom sheet.
            activeField ? styles.sheetFixed : null,
          ]}>
        <View style={styles.sheetHead}>
          {activeField ? (
            <Pressable
              onPress={() => setActiveField(null)}
              hitSlop={12}
              accessibilityRole="button">
              <Text style={[styles.back, {color: theme.primary}]}>
                ← {String(t('common.back') || 'Back')}
              </Text>
            </Pressable>
          ) : (
            <Text style={[styles.sheetTitle, {color: theme.text}]}>
              {t('browse.locationPrompt')}
            </Text>
          )}
          {!activeField ? (
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <Text style={[styles.done, {color: theme.primary}]}>
                {t('browse.locationDone')}
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={clearActive} hitSlop={12} accessibilityRole="button">
              <Text style={[styles.done, {color: theme.textSecondary}]}>
                {String(t('common.clear') || 'Clear')}
              </Text>
            </Pressable>
          )}
        </View>

        {activeField ? (
          <>
            <Text style={[styles.listTitle, {color: theme.text}]}>
              {activeTitle}
            </Text>
            <View
              style={[
                styles.searchWrap,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}>
              <Icon name="search" size={18} color={theme.textSecondary} />
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder={searchPlaceholder}
                placeholderTextColor={theme.textSecondary}
                style={[styles.searchInput, {color: theme.text}]}
                autoCorrect={false}
                autoCapitalize="none"
                accessibilityLabel={searchPlaceholder}
                accessibilityRole="search"
              />
              {searchText ? (
                <Pressable
                  onPress={() => setSearchText('')}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={String(
                    t('common.clear') || 'Clear search',
                  )}>
                  <Icon name="close" size={18} color={theme.textSecondary} />
                </Pressable>
              ) : null}
            </View>
            <FlatList
              data={activeOptions}
              keyExtractor={item => item.value}
              keyboardShouldPersistTaps="handled"
              style={styles.optionList}
              contentContainerStyle={
                activeOptions.length === 0
                  ? [styles.optionListContent, styles.optionListEmptyContent]
                  : styles.optionListContent
              }
              ListEmptyComponent={
                <Text
                  style={[styles.emptyOptions, {color: theme.textSecondary}]}>
                  {emptySearchText}
                </Text>
              }
              renderItem={({item}) => {
                const selected =
                  (activeField === 'state' && item.value === stateId) ||
                  (activeField === 'district' && item.value === districtId) ||
                  (activeField === 'block' && item.value === blockId);
                return (
                  <Pressable
                    onPress={() => pickValue(item.value)}
                    style={[
                      styles.optionRow,
                      selected
                        ? {backgroundColor: `${theme.primary}18`}
                        : null,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{selected}}>
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: selected ? theme.primary : theme.text,
                          fontWeight: selected ? '700' : '500',
                        },
                      ]}>
                      {item.label}
                    </Text>
                    {selected ? (
                      <Text style={[styles.check, {color: theme.primary}]}>
                        ✓
                      </Text>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator>
            {!hasLocation && !locating ? (
              <Text style={[styles.hint, {color: theme.textSecondary}]}>
                {t('browse.locationFirstVisitHint')}
              </Text>
            ) : null}
            <View style={[styles.picker, {backgroundColor: primaryTint}]}>
              <Pressable
                onPress={onUseMyLocation}
                disabled={locating}
                style={[
                  styles.useLocationBtn,
                  {
                    backgroundColor: deviceLocationSelected
                      ? 'rgba(74, 144, 226, 0.22)'
                      : theme.primary,
                    borderColor: deviceLocationSelected
                      ? theme.primary
                      : theme.primary,
                    opacity: locating ? 0.7 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{
                  selected: deviceLocationSelected,
                  busy: locating,
                }}>
                {deviceLocationSelected && !locating ? (
                  <Icon name="check-circle" size={20} color={theme.primary} />
                ) : (
                  <Icon
                    name="my-location"
                    size={20}
                    color={deviceLocationSelected ? theme.primary : '#fff'}
                  />
                )}
                <Text
                  style={[
                    styles.useLocationLabel,
                    {
                      color: deviceLocationSelected ? theme.primary : '#fff',
                    },
                  ]}
                  numberOfLines={1}>
                  {locating
                    ? String(t('ecosystem.locating'))
                    : deviceLocationSelected
                      ? String(t('ecosystem.usingMyLocation'))
                      : String(t('ecosystem.useMyLocation'))}
                </Text>
              </Pressable>
              <Text style={[styles.or, {color: theme.textSecondary}]}>
                {t('ecosystem.orChooseArea')}
              </Text>

              <FieldTrigger
                theme={theme}
                label={String(t('browse.selectState'))}
                valueLabel={stateLabel}
                placeholder={String(t('browse.selectState'))}
                onPress={() => setActiveField('state')}
              />

              <FieldTrigger
                theme={theme}
                label={String(t('browse.selectDistrict'))}
                valueLabel={districtLabel}
                placeholder={String(t('browse.selectDistrict'))}
                disabled={!stateId}
                onPress={() => setActiveField('district')}
              />

              {onBlockChange ? (
                <FieldTrigger
                  theme={theme}
                  label={String(t('browse.selectBlock'))}
                  valueLabel={blockLabel}
                  placeholder={
                    districtId && filteredBlocks.length === 0
                      ? String(
                          t('browse.noBlocksForDistrict') ||
                            t('browse.noResults') ||
                            t('browse.selectBlock'),
                        )
                      : String(t('browse.selectBlock'))
                  }
                  disabled={!districtId}
                  onPress={() => setActiveField('block')}
                />
              ) : null}
            </View>
          </ScrollView>
        )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    width: '100%',
    maxHeight: '88%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  sheetFixed: {
    height: '78%',
    maxHeight: '78%',
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    minHeight: 44,
  },
  sheetTitle: {fontSize: 16, fontWeight: '700', flex: 1, paddingRight: 8},
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
    minHeight: 40,
  },
  back: {fontSize: 14, fontWeight: '700'},
  done: {fontSize: 14, fontWeight: '700'},
  hint: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  scrollContent: {paddingBottom: 16},
  picker: {
    gap: 12,
    padding: 14,
    marginHorizontal: 14,
    borderRadius: 16,
  },
  useLocationBtn: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  useLocationLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  or: {fontSize: 13, textAlign: 'center'},
  fieldWrap: {width: '100%'},
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  fieldTrigger: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  chevron: {fontSize: 14, marginLeft: 2},
  optionList: {flex: 1, minHeight: 0},
  optionListContent: {paddingHorizontal: 8, paddingBottom: 16},
  optionListEmptyContent: {flexGrow: 1, justifyContent: 'center'},
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  optionText: {fontSize: 15, flex: 1},
  check: {fontSize: 16, fontWeight: '700', marginLeft: 8},
  emptyOptions: {padding: 16, textAlign: 'center', fontSize: 14},
});
