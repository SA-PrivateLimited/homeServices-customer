import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import useTranslation from '../../hooks/useTranslation';
import {WEB} from '../../fromWebCss/loginFromWeb.styles';
import type {Theme} from '../../utils/theme';

export type LoginStepFlow = 'preview' | 'pinLogin' | 'otpFlow';

type Props = {
  theme: Theme;
  step: 'phone' | 'pin' | 'otp' | 'createPin' | 'showPin';
  flow: LoginStepFlow;
};

export function LoginStepIndicator({step, flow}: Props) {
  const {t} = useTranslation();
  const phone = String(t('login.step.phone'));
  const otp = String(t('login.step.verify'));
  const pin = String(t('login.step.pin'));

  const items =
    flow === 'pinLogin'
      ? [
          {id: 'phone', label: phone, state: step === 'phone' ? 'current' : 'done'},
          {
            id: 'pin',
            label: pin,
            state: step === 'pin' ? 'current' : step === 'phone' ? 'todo' : 'done',
          },
        ]
      : flow === 'otpFlow'
        ? [
            {id: 'phone', label: phone, state: 'done' as const},
            {
              id: 'otp',
              label: otp,
              state: step === 'otp' ? 'current' : 'done',
            },
            {
              id: 'pin',
              label: pin,
              state:
                step === 'otp'
                  ? 'todo'
                  : step === 'createPin' || step === 'showPin'
                    ? 'current'
                    : 'done',
            },
          ]
        : [{id: 'phone', label: phone, state: 'current' as const}];

  return (
    <View
      style={[
        styles.row,
        items.length === 1 && styles.row1,
        items.length === 2 && styles.row2,
      ]}
      accessibilityRole="progressbar">
      {items.map((item, index) => (
        <View key={item.id} style={styles.step}>
          {index > 0 ? (
            <View
              style={[
                styles.connector,
                (item.state === 'done' || item.state === 'current') &&
                  styles.connectorActive,
              ]}
            />
          ) : null}
          <View
            style={[
              styles.dot,
              item.state === 'current' && styles.dotCurrent,
              item.state === 'done' && styles.dotDone,
            ]}>
            <Text
              style={[
                styles.dotText,
                item.state === 'todo' && styles.dotTextTodo,
              ]}>
              {item.state === 'done' ? '✓' : String(index + 1)}
            </Text>
          </View>
          <Text
            style={[
              styles.label,
              item.state === 'current' && styles.labelCurrent,
            ]}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 6,
  },
  row1: {
    justifyContent: 'center',
  },
  row2: {
    maxWidth: 280,
    width: '100%',
    alignSelf: 'center',
  },
  step: {flex: 1, alignItems: 'center', minWidth: 0, position: 'relative'},
  connector: {
    position: 'absolute',
    left: -12,
    top: 9,
    width: 12,
    height: 2,
    backgroundColor: WEB.border,
    zIndex: 0,
  },
  connectorActive: {
    backgroundColor: 'rgba(52, 199, 89, 0.55)',
  },
  dot: {
    zIndex: 1,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    backgroundColor: WEB.border,
  },
  dotCurrent: {
    backgroundColor: WEB.primary,
    shadowColor: WEB.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 2,
  },
  dotDone: {
    backgroundColor: WEB.doneDot,
  },
  dotText: {color: '#fff', fontSize: 11, fontWeight: '700'},
  dotTextTodo: {color: WEB.textSecondary},
  label: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    color: WEB.textSecondary,
    lineHeight: 12,
  },
  labelCurrent: {color: WEB.text},
});
