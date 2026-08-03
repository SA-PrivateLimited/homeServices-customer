/**
 * Simplified service address fields:
 * address, landmark (optional), state, district, pincode (auto from district).
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
} from 'react-native';
import {Select} from 'sapvt-ltd-app-packages';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  getGeographyMeta,
  hasWarmGeographyMeta,
  peekGeographyMeta,
  type GeographyDistrict,
  type GeographyState,
} from '../services/api/geographyApi';
import type {UserLocation} from '../types/common';

export interface ServiceAddressValue extends UserLocation {
  landmark?: string;
  district?: string;
  stateId?: string;
  districtId?: string;
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
  /** Prefill from GPS / saved "current" address */
  onUseCurrentAddress?: () => void;
  currentAddressLoading?: boolean;
  /** Persist as customer's saved home address */
  saveForFuture?: boolean;
  onSaveForFutureChange?: (v: boolean) => void;
  showSaveForFuture?: boolean;
  editable?: boolean;
}

export function ServiceAddressFields({
  value,
  onChange,
  theme,
  onUseCurrentAddress,
  currentAddressLoading,
  saveForFuture,
  onSaveForFutureChange,
  showSaveForFuture = false,
  editable = true,
}: ServiceAddressFieldsProps) {
  const warm = peekGeographyMeta();
  const [states, setStates] = useState<GeographyState[]>(
    () => warm?.states || [],
  );
  const [districts, setDistricts] = useState<GeographyDistrict[]>(
    () => warm?.districts || [],
  );
  const [loadingMeta, setLoadingMeta] = useState(() => !hasWarmGeographyMeta());

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
        setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stateOptions = useMemo(
    () => states.map((s) => ({value: s._id, label: s.name})),
    [states],
  );

  const districtOptions = useMemo(() => {
    const sid = value.stateId || '';
    return districts
      .filter((d) => !sid || d.stateId === sid)
      .map((d) => ({value: d._id, label: d.name}));
  }, [districts, value.stateId]);

  const patch = (partial: Partial<ServiceAddressValue>) => {
    onChange({...value, ...partial});
  };

  const onStateChange = (stateId: string) => {
    const st = states.find((s) => s._id === stateId);
    patch({
      stateId,
      state: st?.name || '',
      districtId: '',
      district: '',
      city: '',
      pincode: '',
    });
  };

  const onDistrictChange = (districtId: string) => {
    const d = districts.find((x) => x._id === districtId);
    patch({
      districtId,
      district: d?.name || '',
      city: d?.name || value.city || '',
      pincode: d?.pincode || value.pincode || '',
      stateId: d?.stateId || value.stateId,
      state:
        d?.stateName ||
        states.find((s) => s._id === (d?.stateId || value.stateId))?.name ||
        value.state,
    });
  };

  return (
    <View style={styles.wrap}>
      {onUseCurrentAddress ? (
        <TouchableOpacity
          style={[styles.currentBtn, {borderColor: theme.primary}]}
          onPress={onUseCurrentAddress}
          disabled={currentAddressLoading || !editable}>
          {currentAddressLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Icon name="my-location" size={18} color={theme.primary} />
          )}
          <Text style={[styles.currentBtnText, {color: theme.primary}]}>
            Use current address
          </Text>
        </TouchableOpacity>
      ) : null}

      <Text style={[styles.label, {color: theme.textSecondary}]}>Address</Text>
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
        onChangeText={(address) => patch({address})}
        placeholder="House / street / area"
        placeholderTextColor={theme.textSecondary}
        editable={editable}
        multiline
      />

      <Text style={[styles.label, {color: theme.textSecondary}]}>
        Landmark (optional)
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
        onChangeText={(landmark) => patch({landmark})}
        placeholder="Near park, temple, etc."
        placeholderTextColor={theme.textSecondary}
        editable={editable}
      />

      {loadingMeta ? (
        <ActivityIndicator style={{marginVertical: 8}} color={theme.primary} />
      ) : (
        <>
          <Text style={[styles.label, {color: theme.textSecondary}]}>State</Text>
          <Select
            options={stateOptions}
            value={value.stateId || ''}
            placeholder="Select state"
            disabled={!editable}
            onChange={onStateChange}
          />

          <Text style={[styles.label, {color: theme.textSecondary}]}>
            District
          </Text>
          <Select
            options={districtOptions}
            value={value.districtId || ''}
            placeholder="Select district"
            disabled={!editable || !value.stateId}
            onChange={onDistrictChange}
          />
        </>
      )}

      <Text style={[styles.label, {color: theme.textSecondary}]}>Pincode</Text>
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
        onChangeText={(pincode) =>
          patch({pincode: pincode.replace(/\D/g, '').slice(0, 6)})
        }
        placeholder="Auto from district"
        placeholderTextColor={theme.textSecondary}
        keyboardType="number-pad"
        maxLength={6}
        editable={editable}
      />

      {showSaveForFuture && onSaveForFutureChange ? (
        <View style={styles.saveRow}>
          <Text style={[styles.saveLabel, {color: theme.text}]}>
            Save for future
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
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  currentBtnText: {fontSize: 14, fontWeight: '600'},
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  saveLabel: {fontSize: 14, fontWeight: '500'},
});

export default ServiceAddressFields;
