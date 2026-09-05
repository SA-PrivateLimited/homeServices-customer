import React, {useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Avatar, Button, ImageViewer} from 'sapvt-ltd-app-packages';
import type {Theme} from '../../utils/theme';
import useTranslation from '../../hooks/useTranslation';
import {CrystalSurface} from '../CrystalSurface';
import {isUsableMediaUrl} from '../../utils/mediaUrl';

export type ProviderCardProps = {
  theme: Theme;
  name: string;
  profession: string;
  location?: string;
  experienceLabel?: string;
  rating?: number;
  reviewsLabel?: string;
  image?: string | null;
  isOnline?: boolean;
  onlineLabel?: string;
  phone?: string | null;
  callLabel: string;
  requestLabel: string;
  contactLabel?: string;
  hidePhoto?: boolean;
  onPress?: () => void;
  onCall?: () => void;
  alsoServices?: string[];
  alsoLead?: string;
  showcasePhotos?: string[];
  onRequest?: () => void;
  onContact?: () => void;
};

export function ProviderCard({
  theme,
  name,
  profession,
  location,
  experienceLabel,
  rating,
  reviewsLabel,
  image,
  isOnline,
  onlineLabel,
  phone,
  callLabel,
  requestLabel,
  contactLabel,
  hidePhoto = false,
  alsoServices = [],
  alsoLead,
  showcasePhotos,
  onPress,
  onCall,
  onRequest,
  onContact,
}: ProviderCardProps) {
  const {t} = useTranslation();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const showPhone = Boolean(phone);
  const resolvedOnline = onlineLabel ?? String(t('providers.online'));
  const resolvedContact =
    contactLabel ?? String(t('providers.contactProvider'));
  const resolvedCall = callLabel || String(t('providers.callProvider'));
  const resolvedRequest =
    requestLabel || String(t('providers.requestService'));
  const showCall = showPhone && Boolean(onCall);
  const showContact = !showCall && Boolean(onContact);
  const hasActions = showCall || showContact || Boolean(onRequest);
  const callOnly = hasActions && !onRequest && (showCall || showContact);
  const isDark = theme.background === '#0B1220';
  const showcase = (showcasePhotos || [])
    .filter(u => typeof u === 'string' && isUsableMediaUrl(u))
    .slice(0, 3);
  const showcaseExtra = Math.max(0, showcase.length - 1);

  return (
    <CrystalSurface
      primary={theme.primary}
      card={theme.card}
      isDark={isDark}
      accent
      radius={18}
      style={styles.card}
      contentStyle={styles.cardInner}>
      <Pressable
        style={styles.main}
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}>
        {hidePhoto ? null : (
          <View style={styles.avatarWrap}>
            <Avatar
              src={image}
              name={name}
              size={48}
              colors={{primary: theme.primary}}
              style={{
                borderWidth: 2,
                borderColor: `${theme.success}59`,
              }}
            />
            {isOnline ? (
              <View
                style={[
                  styles.onlineDot,
                  {backgroundColor: theme.success, borderColor: theme.card},
                ]}
              />
            ) : null}
          </View>
        )}
        <View style={styles.copy}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, {color: theme.text}]}>{name}</Text>
            {isOnline ? (
              <View
                style={[styles.onlineBadge, {backgroundColor: theme.success}]}>
                <Text style={styles.badgeText}>{resolvedOnline}</Text>
              </View>
            ) : (
              <View
                style={[
                  styles.onlineBadge,
                  {backgroundColor: theme.textSecondary},
                ]}>
                <Text style={styles.badgeText}>
                  {String(t('providers.offline') || 'Offline')}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.professionRow}>
            <Icon name="work" size={14} color={theme.primary} />
            <Text style={[styles.profession, {color: theme.text}]}>
              {profession}
            </Text>
          </View>
          {alsoServices.length > 0 && alsoLead ? (
            <View style={styles.also}>
              {alsoLead ? (
                <Text style={[styles.alsoLead, {color: theme.textSecondary}]}>
                  {alsoLead}
                </Text>
              ) : null}
              <View style={styles.alsoList}>
                {alsoServices.map(svc => (
                  <View
                    key={svc}
                    style={[
                      styles.alsoChip,
                      {backgroundColor: 'rgba(255,255,255,0.7)'},
                    ]}>
                    <Text style={[styles.alsoChipText, {color: theme.text}]}>
                      {svc}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {location ? (
            <View style={styles.metaRow}>
              <Icon name="place" size={14} color={theme.primary} />
              <Text style={[styles.meta, {color: theme.textSecondary}]}>
                {location}
              </Text>
            </View>
          ) : null}
          {experienceLabel ? (
            <View style={styles.metaRow}>
              <Icon name="verified-user" size={14} color={theme.primary} />
              <Text style={[styles.meta, {color: theme.textSecondary}]}>
                {experienceLabel}
              </Text>
            </View>
          ) : null}
          {typeof rating === 'number' && rating > 0 ? (
            <View style={styles.metaRow}>
              <Icon name="star" size={14} color="#FFD700" />
              <Text style={[styles.ratingValue, {color: theme.text}]}>
                {rating.toFixed(1)}
              </Text>
              {reviewsLabel ? (
                <Text style={[styles.reviews, {color: theme.textSecondary}]}>
                  {reviewsLabel}
                </Text>
              ) : null}
            </View>
          ) : null}
          {showcase.length > 0 ? (
            <View style={styles.showcase}>
              <Pressable
                onPress={e => {
                  e?.stopPropagation?.();
                  setViewerIndex(0);
                }}
                style={styles.showcasePrimary}
                accessibilityLabel={`View work photo 1 of ${showcase.length}`}>
                <Image
                  source={{uri: showcase[0]}}
                  style={styles.showcaseImg}
                />
              </Pressable>
              {showcaseExtra > 0 ? (
                <Pressable
                  onPress={e => {
                    e?.stopPropagation?.();
                    setViewerIndex(1);
                  }}
                  style={[
                    styles.showcaseMore,
                    {backgroundColor: 'rgba(100,116,139,0.12)'},
                  ]}
                  accessibilityLabel={`View ${showcaseExtra} more work photos`}>
                  <Text
                    style={[
                      styles.showcaseMoreText,
                      {color: theme.textSecondary},
                    ]}>
                    +{showcaseExtra}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>

      {hasActions ? (
        <View
          style={[
            styles.actions,
            callOnly ? styles.actionsCallOnly : null,
            {borderTopColor: 'rgba(226, 232, 240, 0.55)'},
          ]}>
          {/* Web: digits only when phone exists without Call CTA — never dump number next to Call */}
          {showPhone && !onCall ? (
            <View style={styles.phoneRow}>
              <Icon name="phone" size={14} color={theme.textSecondary} />
              <Text style={[styles.phone, {color: theme.text}]} numberOfLines={1}>
                {phone}
              </Text>
            </View>
          ) : null}
          {showCall ? (
            <Button
              title={resolvedCall}
              variant="secondary"
              size="sm"
              onPress={onCall}
              style={callOnly ? styles.callOnlyBtn : styles.callBtn}
              colors={{
                primary: theme.primary,
                card: theme.card,
                text: theme.primary,
                border: theme.primary,
              }}
              textStyle={{color: theme.primary, fontSize: 12}}
            />
          ) : showContact ? (
            <Button
              title={resolvedContact}
              variant="secondary"
              size="sm"
              onPress={onContact}
              style={styles.callBtn}
              colors={{
                primary: theme.primary,
                card: theme.card,
                text: theme.primary,
                border: theme.primary,
              }}
              textStyle={{color: theme.primary, fontSize: 12}}
            />
          ) : null}
          {onRequest ? (
            <Button
              title={resolvedRequest}
              variant="primary"
              size="sm"
              onPress={onRequest}
              style={styles.requestBtn}
              colors={{
                primary: theme.primary,
                card: theme.card,
                text: '#fff',
                border: theme.primary,
              }}
              textStyle={{fontSize: 12}}
            />
          ) : null}
        </View>
      ) : null}
      <ImageViewer
        open={viewerIndex != null}
        images={showcase}
        initialIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
        label={String(t('showcase.workShowcase') || 'Work showcase')}
        closeLabel={String(t('actions.close') || 'Close')}
      />
    </CrystalSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 0,
  },
  cardInner: {
    padding: 16,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  avatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
  copy: {flex: 1, minWidth: 0},
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  name: {fontSize: 15, fontWeight: '700', lineHeight: 18.75, flexShrink: 1},
  onlineBadge: {
    flexShrink: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  professionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  profession: {fontSize: 13, fontWeight: '700', flexShrink: 1},
  also: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 6,
    rowGap: 4,
    marginBottom: 6,
    paddingLeft: 19,
  },
  alsoLead: {fontSize: 11, fontWeight: '700'},
  alsoList: {flexDirection: 'row', flexWrap: 'wrap', gap: 4},
  alsoChip: {
    maxWidth: '100%',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  alsoChipText: {fontSize: 11, fontWeight: '600', lineHeight: 14.3},
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  meta: {flex: 1, fontSize: 12},
  ratingValue: {fontSize: 12, fontWeight: '700'},
  reviews: {fontSize: 12},
  showcase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  showcasePrimary: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  showcaseImg: {width: '100%', height: '100%'},
  showcaseMore: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  showcaseMoreText: {fontSize: 12, fontWeight: '700', lineHeight: 14},
  actions: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
  },
  actionsCallOnly: {
    borderTopWidth: 0,
    marginTop: 0,
    paddingTop: 0,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 'auto',
    marginBottom: 2,
  },
  phone: {fontSize: 12, fontWeight: '600'},
  callBtn: {minHeight: 30, paddingHorizontal: 9},
  callOnlyBtn: {minHeight: 28, paddingHorizontal: 9},
  requestBtn: {minHeight: 32, paddingHorizontal: 10},
});
