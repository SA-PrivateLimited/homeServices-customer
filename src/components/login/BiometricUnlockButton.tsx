import React from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {loginFromWeb as web, WEB} from '../../fromWebCss/loginFromWeb.styles';
import type {BiometryKind} from '../../services/biometricAuth';

type Props = {
  kind: BiometryKind;
  busy: boolean;
  disabled?: boolean;
  label: string;
  checkingLabel: string;
  onPress: () => void;
};

export function BiometricUnlockButton({
  kind,
  busy,
  disabled,
  label,
  checkingLabel,
  onPress,
}: Props) {
  const icon =
    kind === 'face' ? 'scan-outline' : kind === 'iris' ? 'eye-outline' : 'finger-print';
  return (
    <TouchableOpacity
      style={[web.primaryFill, web.bioPrimary, (busy || disabled) && {opacity: 0.65}]}
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
      accessibilityState={{busy, disabled: busy || !!disabled}}
      accessibilityLabel={busy ? checkingLabel : label}>
      {busy ? (
        <View style={web.bioPrimaryInner}>
          <ActivityIndicator color="#fff" />
          <Text style={web.primaryFillText}>{checkingLabel}</Text>
        </View>
      ) : (
        <View style={web.bioPrimaryInner}>
          <Icon name={icon} size={22} color="#fff" />
          <Text style={web.primaryFillText}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
