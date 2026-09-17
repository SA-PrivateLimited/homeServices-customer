import React from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {loginFromWeb as web, WEB} from '../../fromWebCss/loginFromWeb.styles';
import type {BiometryKind} from '../../services/biometricAuth';

type Props = {
  kind: BiometryKind;
  busy: boolean;
  title: string;
  subtitle: string;
  enableLabel: string;
  skipLabel: string;
  onEnable: () => void;
  onSkip: () => void;
};

export function BiometricOfferPanel({
  kind,
  busy,
  title,
  subtitle,
  enableLabel,
  skipLabel,
  onEnable,
  onSkip,
}: Props) {
  const icon =
    kind === 'face' ? 'scan-outline' : kind === 'iris' ? 'eye-outline' : 'finger-print';
  return (
    <View style={web.form}>
      <View style={[web.stepIcon, web.stepIconPin]}>
        <Icon name={icon} size={26} color={WEB.primary} />
      </View>
      <Text style={web.stepTitle}>{title}</Text>
      <Text style={web.stepSub}>{subtitle}</Text>
      <TouchableOpacity
        style={[web.primaryFill, web.bioPrimary, busy && {opacity: 0.65}]}
        onPress={onEnable}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={enableLabel}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={web.bioPrimaryInner}>
            <Icon name={icon} size={22} color="#fff" />
            <Text style={web.primaryFillText}>{enableLabel}</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[web.guestBtn, busy && {opacity: 0.65}]}
        onPress={onSkip}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={skipLabel}>
        <Text style={web.guestBtnText}>{skipLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}
