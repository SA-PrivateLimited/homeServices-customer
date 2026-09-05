import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Icon} from 'sapvt-ltd-app-packages';
import {useTranslation} from 'react-i18next';

type Props = {
  canSwitch: boolean;
  busy?: boolean;
  onBecomePartner: () => void;
};

export function BecomePartnerCard({canSwitch, busy, onBecomePartner}: Props) {
  const {t} = useTranslation();
  const title = canSwitch
    ? t('ecosystem.openPartnerTitle')
    : t('ecosystem.becomePartnerTitle');

  return (
    <View style={styles.card} accessibilityLabel={String(title)}>
      <Pressable
        disabled={busy}
        onPress={onBecomePartner}
        style={[styles.link, busy ? {opacity: 0.6} : null]}>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>
            {busy
              ? t('handoff.openingPartner')
              : canSwitch
                ? t('ecosystem.becomePartnerBodySwitch')
                : t('ecosystem.becomePartnerBodyJoin')}
          </Text>
        </View>
        <Icon name="chevron_right" size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 8,
  },
  copy: {flex: 1},
  title: {fontSize: 15, fontWeight: '700', color: '#1A202C'},
  body: {fontSize: 13, color: '#718096', marginTop: 4, lineHeight: 18},
});
