import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Avatar, Button} from 'sapvt-ltd-app-packages';
import type {Theme} from '../../utils/theme';

export type AvailableProviderItem = {
  id: string;
  name: string;
  profession?: string;
  phone?: string | null;
  image?: string | null;
  location?: string;
  isOnline?: boolean;
  declined?: boolean;
};

export type AvailableProvidersProps = {
  theme: Theme;
  providers: AvailableProviderItem[];
  loading?: boolean;
  title: string;
  countLabel?: string;
  emptyTitle: string;
  emptyMessage: string;
  onlineLabel: string;
  offlineLabel: string;
  declinedLabel: string;
  callLabel: string;
  onCall?: (phone: string) => void;
};

export function AvailableProviders({
  theme,
  providers,
  loading = false,
  title,
  countLabel,
  emptyTitle,
  emptyMessage,
  onlineLabel,
  offlineLabel,
  declinedLabel,
  callLabel,
  onCall,
}: AvailableProvidersProps) {
  return (
    <View
      style={[
        styles.card,
        {backgroundColor: theme.card, borderColor: theme.border},
      ]}>
      <View style={styles.header}>
        <View style={[styles.headerMark, {backgroundColor: theme.success}]} />
        <View style={styles.headerCopy}>
          <Text style={[styles.title, {color: theme.text}]}>{title}</Text>
          {countLabel ? (
            <Text style={[styles.count, {color: theme.textSecondary}]}>
              {countLabel}
            </Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View>
          {[0, 1, 2].map(i => (
            <View
              key={i}
              style={[
                styles.skelRow,
                i === 0 ? styles.firstRow : {borderTopColor: theme.border},
              ]}>
              <View
                style={[styles.skelAvatar, {backgroundColor: theme.border}]}
              />
              <View style={styles.skelCopy}>
                <View
                  style={[styles.skelLine, styles.skelName, {backgroundColor: theme.border}]}
                />
                <View
                  style={[styles.skelLine, styles.skelMeta, {backgroundColor: theme.border}]}
                />
                <View
                  style={[
                    styles.skelLine,
                    styles.skelPhone,
                    {backgroundColor: theme.border},
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      ) : providers.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, {color: theme.text}]}>
            {emptyTitle}
          </Text>
          <Text style={[styles.emptyMessage, {color: theme.textSecondary}]}>
            {emptyMessage}
          </Text>
        </View>
      ) : (
        providers.map((p, index) => {
          const phone = String(p.phone || '').trim();
          const canCall = Boolean(phone && !p.declined && onCall);
          const presenceColor = p.declined
            ? theme.error
            : p.isOnline
              ? theme.success
              : theme.textSecondary;
          const presenceLabel = p.declined
            ? declinedLabel
            : p.isOnline
              ? onlineLabel
              : offlineLabel;

          return (
            <View
              key={p.id}
              style={[
                styles.row,
                index === 0 ? styles.firstRow : {borderTopColor: theme.border},
              ]}>
              <View style={styles.main}>
                <Avatar
                  src={p.image}
                  name={p.name}
                  size={44}
                  colors={{primary: '#94A3B8'}}
                />
                <View style={styles.identity}>
                  <View style={styles.nameRow}>
                    <Text
                      style={[styles.name, {color: theme.text}]}
                      numberOfLines={2}>
                      {p.name}
                    </Text>
                    <View style={styles.presence}>
                      <View
                        style={[
                          styles.presenceDot,
                          {backgroundColor: presenceColor},
                        ]}
                      />
                      <Text style={[styles.presenceText, {color: presenceColor}]}>
                        {presenceLabel}
                      </Text>
                    </View>
                  </View>
                  {p.profession ? (
                    <Text
                      style={[styles.meta, {color: theme.textSecondary}]}
                      numberOfLines={1}>
                      {p.profession}
                    </Text>
                  ) : null}
                  {p.location ? (
                    <Text
                      style={[styles.meta, {color: theme.textSecondary}]}
                      numberOfLines={1}>
                      {p.location}
                    </Text>
                  ) : null}
                  {phone && canCall ? (
                    <View style={styles.phoneRow}>
                      <Icon name="phone" size={14} color={theme.textSecondary} />
                      <Text
                        style={[styles.phone, {color: theme.textSecondary}]}
                        numberOfLines={2}>
                        {phone}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              {canCall ? (
                <View style={styles.callWrap}>
                  <Button
                    title={callLabel}
                    variant="secondary"
                    block
                    onPress={() => onCall?.(phone)}
                    colors={{
                      primary: theme.primary,
                      card: theme.card,
                      text: theme.primary,
                      border: theme.border,
                    }}
                    textStyle={{color: theme.primary}}
                  />
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 4,
  },
  headerMark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  count: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  row: {
    paddingTop: 16,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  firstRow: {
    borderTopWidth: 0,
    paddingTop: 12,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  presence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 3,
  },
  presenceDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  presenceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  meta: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '500',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  phone: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  callWrap: {
    marginTop: 12,
  },
  empty: {
    marginTop: 8,
    paddingTop: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  emptyMessage: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  skelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  skelAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  skelCopy: {
    flex: 1,
    paddingTop: 4,
    gap: 8,
  },
  skelLine: {
    height: 10,
    borderRadius: 6,
  },
  skelName: {
    width: '46%',
    height: 12,
  },
  skelMeta: {
    width: '32%',
  },
  skelPhone: {
    width: '40%',
  },
});
