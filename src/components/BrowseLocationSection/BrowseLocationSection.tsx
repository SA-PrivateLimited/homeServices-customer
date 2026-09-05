import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Button, Select} from 'sapvt-ltd-app-packages';
import type {
  GeographyBlock,
  GeographyDistrict,
  GeographyState,
} from '../../services/api/geographyApi';
import {
  formatBrowsePlaceLabel,
  hasBrowseLocationFilter,
} from '../../utils/browsePlaceLabel';
import type {Theme} from '../../utils/theme';
import useTranslation from '../../hooks/useTranslation';

type Props = {
  theme: Theme;
  states: GeographyState[];
  districts: GeographyDistrict[];
  blocks?: GeographyBlock[];
  stateId: string;
  districtId: string;
  blockId?: string;
  blockName?: string;
  locationLabel: string | null;
  locating: boolean;
  usingDeviceLocation?: boolean;
  pickerOpen?: boolean;
  onPickerOpenChange?: (open: boolean) => void;
  onUseMyLocation: () => void;
  onStateChange: (stateId: string) => void;
  onDistrictChange: (districtId: string) => void;
  onBlockChange?: (blockId: string) => void;
};

/**
 * Web BrowseLocationSection parity — compact place chip + State / District / Block.
 */
export function BrowseLocationSection({
  theme,
  states,
  districts,
  blocks = [],
  stateId,
  districtId,
  blockId = '',
  blockName = '',
  locationLabel,
  locating,
  usingDeviceLocation = false,
  pickerOpen,
  onPickerOpenChange,
  onUseMyLocation,
  onStateChange,
  onDistrictChange,
  onBlockChange,
}: Props) {
  const {t} = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const expanded = pickerOpen ?? internalOpen;
  const setExpanded = (open: boolean) => {
    if (onPickerOpenChange) onPickerOpenChange(open);
    else setInternalOpen(open);
  };

  const isDark = theme.background.toLowerCase() === '#0b1220';
  const crystalCard = isDark
    ? 'rgba(255,255,255,0.1)'
    : 'rgba(255,255,255,0.55)';

  const filteredDistricts = stateId
    ? districts.filter(d => d.stateId === stateId)
    : [];

  const filteredBlocks = districtId
    ? blocks.filter(b => b.districtId === districtId)
    : [];

  const hasLocation = hasBrowseLocationFilter(
    locationLabel,
    stateId,
    districtId,
    blockId,
  );

  const displayPlace = formatBrowsePlaceLabel(
    locationLabel,
    stateId,
    districtId,
    states,
    districts,
    blockId,
    blocks,
    blockName,
  );

  const compactLabel = (() => {
    if (locating) return String(t('ecosystem.locating'));
    if (!hasLocation) return String(t('browse.chooseYourPlace'));
    const state = states.find(s => s._id === stateId);
    const district = districts.find(d => d._id === districtId);
    const block = blocks.find(b => b._id === blockId);
    const parts = [
      block?.name || blockName?.trim(),
      district?.name,
      state?.name,
    ].filter(Boolean);
    if (parts.length) return parts.join(' · ');
    return displayPlace || String(t('browse.chooseYourPlace'));
  })();

  const deviceLocationSelected = usingDeviceLocation && hasLocation && !locating;
  const primaryTint = 'rgba(74, 144, 226, 0.12)';
  const selectColors = {
    primary: theme.primary,
    card: crystalCard,
    text: theme.text,
    textSecondary: theme.textSecondary,
    border: theme.border,
    background: theme.background,
  };

  return (
    <View
      style={styles.section}
      accessibilityLabel={String(t('browse.locationPrompt'))}>
      <Text style={[styles.prompt, {color: theme.text}]}>
        {t('browse.locationPrompt')}
      </Text>
      {!hasLocation && !locating ? (
        <Text style={[styles.hint, {color: theme.textSecondary}]}>
          {t('browse.locationFirstVisitHint')}
        </Text>
      ) : null}

      <TouchableOpacity
        style={[
          styles.compact,
          {
            backgroundColor: hasLocation
              ? crystalCard
              : 'rgba(49, 130, 206, 0.10)',
          },
        ]}
        onPress={() => setExpanded(!expanded)}
        accessibilityRole="button"
        accessibilityState={{expanded}}>
        <Text
          style={[styles.compactLabel, {color: theme.text}]}
          numberOfLines={1}>
          {compactLabel}
        </Text>
        <Text style={[styles.compactAction, {color: theme.primary}]}>
          {expanded
            ? t('browse.locationDone')
            : hasLocation
              ? t('browse.changeLocation')
              : t('browse.choosePlace')}
        </Text>
      </TouchableOpacity>

      {expanded ? (
        <View style={[styles.picker, {backgroundColor: primaryTint}]}>
          <Button
            variant={deviceLocationSelected ? 'secondary' : 'primary'}
            onPress={onUseMyLocation}
            loading={locating}
            disabled={locating}
            block
            title={
              locating
                ? String(t('ecosystem.locating'))
                : deviceLocationSelected
                  ? String(t('ecosystem.usingMyLocation'))
                  : String(t('ecosystem.useMyLocation'))
            }
            colors={selectColors}
          />
          <Text style={[styles.or, {color: theme.textSecondary}]}>
            {t('ecosystem.orChooseArea')}
          </Text>
          <Select
            variant="crystal"
            label={String(t('browse.selectState'))}
            value={stateId}
            placeholder={String(t('browse.selectState'))}
            allowClear
            clearAriaLabel={String(t('common.clear') || 'Clear')}
            options={states.map(s => ({value: s._id, label: s.name}))}
            onChange={onStateChange}
            title={String(t('browse.selectState'))}
            style={{marginBottom: 0}}
            colors={selectColors}
          />
          <Select
            variant="crystal"
            label={String(t('browse.selectDistrict'))}
            value={districtId}
            placeholder={String(t('browse.selectDistrict'))}
            allowClear
            clearAriaLabel={String(t('common.clear') || 'Clear')}
            disabled={!stateId}
            options={filteredDistricts.map(d => ({
              value: d._id,
              label: d.name,
            }))}
            onChange={onDistrictChange}
            title={String(t('browse.selectDistrict'))}
            style={{marginBottom: 0}}
            colors={selectColors}
          />
          {filteredBlocks.length > 0 && onBlockChange ? (
            <Select
              variant="crystal"
              label={String(t('browse.selectBlock'))}
              value={blockId}
              placeholder={String(t('browse.selectBlock'))}
              allowClear
              clearAriaLabel={String(t('common.clear') || 'Clear')}
              disabled={!districtId}
              options={filteredBlocks.map(b => ({
                value: b._id,
                label: b.name,
              }))}
              onChange={onBlockChange}
              title={String(t('browse.selectBlock'))}
              style={{marginBottom: 0}}
              colors={selectColors}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {gap: 10, minWidth: 0, marginHorizontal: 14},
  prompt: {fontSize: 15, fontWeight: '700', lineHeight: 20},
  hint: {fontSize: 13, lineHeight: 18},
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 0,
    elevation: 0,
  },
  compactLabel: {flex: 1, fontSize: 14, fontWeight: '600'},
  compactAction: {fontSize: 13, fontWeight: '700'},
  picker: {
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 0,
  },
  or: {fontSize: 13, textAlign: 'center'},
});
