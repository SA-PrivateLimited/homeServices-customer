/**
 * Service address fields (web ServiceAddressFields parity):
 * address, landmark, state, district, block, pincode + Use current location.
 */

import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {Select} from 'sapvt-ltd-app-packages';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  getGeographyMeta,
  hasWarmGeographyMeta,
  peekGeographyMeta,
  resolveGeographyFromCoordinates,
  type GeographyBlock,
  type GeographyDistrict,
  type GeographyState,
} from '../services/api/geographyApi';
import GeolocationService from '../services/geolocationService';
import type {UserLocation} from '../types/common';
import useTranslation from '../hooks/useTranslation';
import {formatDetectedPlaceLine} from '../utils/addressDisplay';
import {getUserFacingErrorMessage} from '../utils/userFacingError';

export interface ServiceAddressValue extends UserLocation {
  landmark?: string;
  district?: string;
  stateId?: string;
  districtId?: string;
  blockId?: string;
  block?: string;
}

interface ServiceAddressFieldsProps {
  value: ServiceAddressValue;
  onChange: (next: ServiceAddressValue) => void;
  theme: {
    text: string;
    textSecondary: string;
    primary: string;
    card: string;
    border: string;
    background: string;
  };
  /** Prefill from GPS / saved "current" address (external handler) */
  onUseCurrentAddress?: () => void;
  currentAddressLoading?: boolean;
  /** Built-in GPS fill (same as Provider). Ignored if onUseCurrentAddress is set. */
  showUseCurrentLocation?: boolean;
  useCurrentLabel?: string;
  currentLocationLabel?: string;
  /** Persist as customer's saved home address */
  saveForFuture?: boolean;
  onSaveForFutureChange?: (v: boolean) => void;
  showSaveForFuture?: boolean;
  editable?: boolean;
}

function normalizeName(s?: string) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function findState(
  states: GeographyState[],
  name?: string,
): GeographyState | undefined {
  const n = normalizeName(name);
  if (!n) return undefined;
  return (
    states.find(s => normalizeName(s.name) === n) ||
    states.find(
      s =>
        normalizeName(s.name).includes(n) || n.includes(normalizeName(s.name)),
    )
  );
}

function findDistrict(
  districts: GeographyDistrict[],
  opts: {name?: string; pincode?: string; stateId?: string},
): GeographyDistrict | undefined {
  const {name, pincode, stateId} = opts;
  const scoped = stateId
    ? districts.filter(d => d.stateId === stateId)
    : districts;

  if (pincode && /^\d{6}$/.test(pincode)) {
    const byPin =
      scoped.find(d => d.pincode === pincode) ||
      districts.find(d => d.pincode === pincode);
    if (byPin) return byPin;
  }

  const n = normalizeName(name);
  if (!n) return undefined;
  return (
    scoped.find(d => normalizeName(d.name) === n) ||
    scoped.find(
      d =>
        normalizeName(d.name).includes(n) || n.includes(normalizeName(d.name)),
    ) ||
    districts.find(d => normalizeName(d.name) === n)
  );
}

export function ServiceAddressFields({
  value,
  onChange,
  theme,
  onUseCurrentAddress,
  currentAddressLoading,
  showUseCurrentLocation = false,
  useCurrentLabel,
  currentLocationLabel,
  saveForFuture,
  onSaveForFutureChange,
  showSaveForFuture = false,
  editable = true,
}: ServiceAddressFieldsProps) {
  const {t} = useTranslation();
  const warm = peekGeographyMeta();
  const [states, setStates] = useState<GeographyState[]>(
    () => warm?.states || [],
  );
  const [districts, setDistricts] = useState<GeographyDistrict[]>(
    () => warm?.districts || [],
  );
  const [blocks, setBlocks] = useState<GeographyBlock[]>(
    () => warm?.blocks || [],
  );
  const [loadingMeta, setLoadingMeta] = useState(() => !hasWarmGeographyMeta());
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const showSpinner = !hasWarmGeographyMeta();
    if (showSpinner) {
      setLoadingMeta(true);
    }
    (async () => {
      const meta = await getGeographyMeta();
      if (!cancelled) {
        setStates(meta.states);
        setDistricts(meta.districts);
        setBlocks(meta.blocks || []);
        setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // When editing, address may have names/pincode but no IDs — resolve dropdowns.
  useEffect(() => {
    if (loadingMeta || !states.length) return;
    const needsState = !value.stateId && Boolean(value.state || value.pincode);
    const needsDistrict =
      !value.districtId &&
      Boolean(value.district || value.city || value.pincode);
    if (!needsState && !needsDistrict) return;

    let matchedState = value.stateId
      ? states.find(s => s._id === value.stateId)
      : findState(states, value.state);
    let matchedDistrict = value.districtId
      ? districts.find(d => d._id === value.districtId)
      : findDistrict(districts, {
          name: value.district || value.city,
          pincode: value.pincode,
          stateId: matchedState?._id || value.stateId,
        });

    if (matchedDistrict && !matchedState) {
      matchedState = states.find(s => s._id === matchedDistrict!.stateId);
    }
    if (!matchedState && !matchedDistrict) return;

    const nextStateId = matchedState?._id || value.stateId || '';
    const nextDistrictId = matchedDistrict?._id || value.districtId || '';
    if (
      nextStateId === (value.stateId || '') &&
      nextDistrictId === (value.districtId || '')
    ) {
      return;
    }

    onChange({
      ...value,
      stateId: nextStateId,
      state: matchedState?.name || value.state || '',
      districtId: nextDistrictId,
      district: matchedDistrict?.name || value.district || value.city || '',
      city: matchedDistrict?.name || value.city || value.district || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loadingMeta,
    states,
    districts,
    value.stateId,
    value.districtId,
    value.state,
    value.district,
    value.city,
    value.pincode,
  ]);

  const stateOptions = useMemo(
    () => states.map(s => ({value: s._id, label: s.name})),
    [states],
  );

  const districtOptions = useMemo(() => {
    const sid = value.stateId || '';
    return districts
      .filter(d => !sid || d.stateId === sid)
      .map(d => ({value: d._id, label: d.name}));
  }, [districts, value.stateId]);

  const blockOptions = useMemo(() => {
    const did = value.districtId || '';
    if (!did) return [];
    return blocks
      .filter(b => b.districtId === did)
      .map(b => ({value: b._id, label: b.name}));
  }, [blocks, value.districtId]);

  const crystalColors = {
    card:
      theme.background.toLowerCase() === '#0b1220'
        ? 'rgba(255,255,255,0.1)'
        : 'rgba(255,255,255,0.55)',
  };

  const patch = (partial: Partial<ServiceAddressValue>) => {
    onChange({...value, ...partial});
  };

  const onStateChange = (stateId: string) => {
    if (!stateId) {
      patch({
        stateId: '',
        state: '',
        districtId: '',
        district: '',
        city: '',
        blockId: '',
        block: '',
        pincode: '',
      });
      return;
    }
    const st = states.find(s => s._id === stateId);
    patch({
      stateId,
      state: st?.name || '',
      districtId: '',
      district: '',
      city: '',
      blockId: '',
      block: '',
      pincode: '',
    });
  };

  const onDistrictChange = (districtId: string) => {
    if (!districtId) {
      patch({
        districtId: '',
        district: '',
        city: '',
        blockId: '',
        block: '',
      });
      return;
    }
    const d = districts.find(x => x._id === districtId);
    const hqPin = String(d?.pincode || '')
      .replace(/\D/g, '')
      .slice(0, 6);
    // Prefill HQ pin only when empty (web parity).
    const nextPin = /^\d{6}$/.test(value.pincode || '')
      ? value.pincode
      : hqPin || value.pincode || '';
    patch({
      districtId,
      district: d?.name || '',
      city: d?.name || value.city || '',
      blockId: '',
      block: '',
      pincode: nextPin,
      stateId: d?.stateId || value.stateId,
      state:
        d?.stateName ||
        states.find(s => s._id === (d?.stateId || value.stateId))?.name ||
        value.state,
    });
  };

  const onBlockChange = (blockId: string) => {
    if (!blockId) {
      patch({blockId: '', block: ''});
      return;
    }
    const b = blocks.find(x => x._id === blockId);
    patch({
      blockId,
      block: b?.name || '',
    });
  };

  const fillFromCurrentLocation = async () => {
    if (!editable) return;
    setDetecting(true);
    try {
      const [location, meta] = await Promise.all([
        GeolocationService.getLocationWithPrompt(),
        getGeographyMeta(),
      ]);
      setStates(meta.states);
      setDistricts(meta.districts);
      setBlocks(meta.blocks || []);

      let place: Awaited<
        ReturnType<typeof resolveGeographyFromCoordinates>
      > | null = null;
      try {
        if (
          typeof location.latitude === 'number' &&
          typeof location.longitude === 'number'
        ) {
          place = await resolveGeographyFromCoordinates(
            location.latitude,
            location.longitude,
          );
        }
      } catch {
        place = null;
      }

      const nextPincode = (
        place?.pincode ||
        location.pincode ||
        ''
      )
        .replace(/\D/g, '')
        .slice(0, 6);
      let matchedState =
        (place?.stateId
          ? meta.states.find(s => s._id === place!.stateId)
          : undefined) || findState(meta.states, place?.stateName || location.state);
      let matchedDistrict =
        (place?.districtId
          ? meta.districts.find(d => d._id === place!.districtId)
          : undefined) ||
        findDistrict(meta.districts, {
          name: place?.districtName || location.city,
          pincode: nextPincode,
          stateId: matchedState?._id,
        });

      if (matchedDistrict && !matchedState) {
        matchedState = meta.states.find(s => s._id === matchedDistrict!.stateId);
      }

      const districtName =
        matchedDistrict?.name ||
        place?.districtName ||
        location.city ||
        value.district ||
        '';
      const stateName =
        matchedState?.name ||
        place?.stateName ||
        matchedDistrict?.stateName ||
        location.state ||
        value.state ||
        '';

      onChange({
        ...value,
        address: place?.addressLine || location.address || value.address || '',
        landmark: place?.landmark || value.landmark || '',
        city: districtName || value.city || '',
        district: districtName,
        state: stateName,
        stateId:
          matchedState?._id || matchedDistrict?.stateId || value.stateId || '',
        districtId: matchedDistrict?._id || place?.districtId || '',
        blockId: place?.blockId || '',
        block: place?.blockName || '',
        pincode: nextPincode || matchedDistrict?.pincode || value.pincode || '',
        latitude: location.latitude,
        longitude: location.longitude,
        country: 'IN',
      });
    } catch (error: unknown) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as {code: string}).code)
          : '';
      if (code === 'services_off') {
        Alert.alert(
          String(t('ecosystem.turnOnLocationTitle')),
          String(t('ecosystem.turnOnLocationMessage')),
          [
            {text: String(t('common.cancel') || 'Cancel'), style: 'cancel'},
            {
              text: String(t('ecosystem.turnOnLocationAction')),
              onPress: () => {
                void GeolocationService.promptEnableDeviceLocation().then(
                  result => {
                    if (result === 'enabled') {
                      void fillFromCurrentLocation();
                    }
                  },
                );
              },
            },
          ],
        );
        return;
      }
      if (code === 'never_ask_again') {
        Alert.alert(
          String(t('ecosystem.allowLocationTitle')),
          String(t('ecosystem.locationNeverAskAgain')),
          [
            {text: String(t('common.cancel') || 'Cancel'), style: 'cancel'},
            {
              text: String(t('ecosystem.openAppSettings')),
              onPress: () => {
                void GeolocationService.openAppPermissionSettings();
              },
            },
          ],
        );
        return;
      }
      if (code === 'denied') {
        Alert.alert(
          String(t('ecosystem.allowLocationTitle')),
          String(t('ecosystem.locationDenied')),
        );
        return;
      }
      Alert.alert(
        String(t('common.error')),
        getUserFacingErrorMessage(error, 'generic') ||
          String(t('ecosystem.locationUnavailable') || t('services.detectLocationFailed')),
      );
    } finally {
      setDetecting(false);
    }
  };

  const showCurrentBtn = Boolean(onUseCurrentAddress) || showUseCurrentLocation;
  const currentLoading = Boolean(currentAddressLoading) || detecting;
  const onCurrentPress = onUseCurrentAddress
    ? onUseCurrentAddress
    : () => void fillFromCurrentLocation();

  const hasCoords =
    typeof value.latitude === 'number' && typeof value.longitude === 'number';

  const detectedPlaceLabel = formatDetectedPlaceLine({
    block: value.block,
    district: value.district,
    city: value.city,
    state: value.state,
  });

  return (
    <View style={styles.wrap}>
      {showCurrentBtn ? (
        <TouchableOpacity
          style={[
            styles.currentBtn,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
          onPress={onCurrentPress}
          disabled={currentLoading || !editable}
          activeOpacity={0.85}>
          {currentLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Icon name="my-location" size={18} color={theme.primary} />
          )}
          <Text style={[styles.currentBtnText, {color: theme.primary}]}>
            {useCurrentLabel ||
              String(
                t('request.useCurrentLocation') ||
                  t('services.useCurrentLocation'),
              )}
          </Text>
        </TouchableOpacity>
      ) : null}

      {hasCoords ? (
        <View style={styles.coordsRow}>
          <Icon name="place" size={14} color={theme.textSecondary} />
          <Text style={[styles.coordsText, {color: theme.textSecondary}]}>
            {detectedPlaceLabel
              ? String(
                  t('request.locationDetectedPlace', {
                    place: detectedPlaceLabel,
                  }) || detectedPlaceLabel,
                )
              : String(
                  t('request.locationDetected') ||
                    t('services.locationDetected') ||
                    'Location detected',
                )}
          </Text>
        </View>
      ) : null}

      <Text style={[styles.label, {color: theme.text}]}>
        {t('request.houseStreet') || t('services.address')}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.card,
          },
        ]}
        value={value.address || ''}
        onChangeText={address => patch({address})}
        placeholder={String(
          t('request.houseStreetPlaceholder') || t('services.houseStreetArea'),
        )}
        placeholderTextColor={theme.textSecondary}
        editable={editable}
        multiline
      />

      <Text style={[styles.label, {color: theme.text}]}>
        {t('request.landmark') || t('services.landmarkOptional')}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.card,
          },
        ]}
        value={value.landmark || ''}
        onChangeText={landmark => patch({landmark})}
        placeholder={String(
          t('request.landmarkPlaceholder') || t('services.landmarkPlaceholder'),
        )}
        placeholderTextColor={theme.textSecondary}
        editable={editable}
      />

      {loadingMeta ? (
        <ActivityIndicator style={{marginVertical: 8}} color={theme.primary} />
      ) : (
        <>
          <Text style={[styles.label, {color: theme.text}]}>
            {t('request.state') || t('services.state')}
          </Text>
          <Select
            variant="crystal"
            options={stateOptions}
            value={value.stateId || ''}
            placeholder={String(
              t('browse.selectState') || t('services.selectState'),
            )}
            disabled={!editable}
            allowClear
            clearAriaLabel={String(t('common.clear') || 'Clear')}
            onChange={onStateChange}
            colors={crystalColors}
            showSearch
            searchPlaceholder={String(
              t('browse.searchStatePlaceholder') || 'Search state...',
            )}
            emptySearchText={String(
              t('browse.noStatesFound') ||
                'No states found\nTry a different name.',
            )}
          />

          <Text style={[styles.label, {color: theme.text}]}>
            {t('request.district') || t('services.districtLabel')}
          </Text>
          <Select
            variant="crystal"
            options={districtOptions}
            value={value.districtId || ''}
            placeholder={String(
              t('browse.selectDistrict') || t('services.selectDistrict'),
            )}
            disabled={!editable || !value.stateId}
            allowClear
            clearAriaLabel={String(t('common.clear') || 'Clear')}
            onChange={onDistrictChange}
            colors={crystalColors}
            showSearch
            searchPlaceholder={String(
              t('browse.searchDistrictPlaceholder') || 'Search district...',
            )}
            emptySearchText={String(
              t('browse.noDistrictsFound') ||
                'No districts found\nTry a different name.',
            )}
          />

          {blockOptions.length > 0 ? (
            <>
              <Text style={[styles.label, {color: theme.text}]}>
                {t('browse.selectBlock') || 'Select block'}
              </Text>
              <Select
                variant="crystal"
                options={blockOptions}
                value={value.blockId || ''}
                placeholder={String(t('browse.selectBlock') || 'Select block')}
                disabled={!editable || !value.districtId}
                allowClear
                clearAriaLabel={String(t('common.clear') || 'Clear')}
                onChange={onBlockChange}
                colors={crystalColors}
                showSearch
                searchPlaceholder={String(
                  t('browse.searchBlockPlaceholder') || 'Search block...',
                )}
                emptySearchText={String(
                  t('browse.noBlocksFound') ||
                    'No blocks found\nTry a different name.',
                )}
              />
            </>
          ) : null}
        </>
      )}

      <Text style={[styles.label, {color: theme.text}]}>
        {t('request.pincode') || t('services.pincode')}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.card,
          },
        ]}
        value={value.pincode || ''}
        onChangeText={pincode =>
          patch({pincode: pincode.replace(/\D/g, '').slice(0, 6)})
        }
        placeholder={String(
          t('request.pincodePlaceholder') ||
            t('services.cityAutoFromDistrict'),
        )}
        placeholderTextColor={theme.textSecondary}
        keyboardType="number-pad"
        maxLength={6}
        editable={editable}
      />

      {showSaveForFuture && onSaveForFutureChange ? (
        <View style={styles.saveRow}>
          <Text style={[styles.saveLabel, {color: theme.text}]}>
            {t('request.saveForFuture') || t('services.saveAsAddress')}
          </Text>
          <Switch
            value={Boolean(saveForFuture)}
            onValueChange={onSaveForFutureChange}
            trackColor={{false: theme.border, true: theme.primary}}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: 4},
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
  },
  currentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 6,
    marginBottom: 4,
    borderWidth: 1,
  },
  currentBtnText: {fontSize: 14, fontWeight: '700'},
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  coordsText: {fontSize: 12, flex: 1, lineHeight: 16},
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  saveLabel: {fontSize: 14, fontWeight: '500'},
});

export default ServiceAddressFields;
