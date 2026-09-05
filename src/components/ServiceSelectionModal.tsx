/**
 * Service picker — parity with web ServiceSelectionModal
 * (2-col crystal pick cards: icon + stacked bilingual name; Popular / All).
 */

import React, {useMemo, useState} from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  bilingualServiceNames,
  matchesServiceSearch,
  resolveServiceMeta,
} from 'sapvt-ltd-app-packages';
import type {ServiceCategory} from '../services/serviceCategoriesService';
import {toSafeMaterialIcon} from '../utils/serviceIcons';
import useTranslation from '../hooks/useTranslation';
import {CrystalSurface} from './CrystalSurface';

type ThemeColors = {
  text: string;
  textSecondary: string;
  primary: string;
  card: string;
  border: string;
  background: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  categories: ServiceCategory[];
  selectedName?: string;
  onSelect: (category: ServiceCategory) => void;
  theme: ThemeColors;
  isDark?: boolean;
  language?: string;
};

function ServicePickCard({
  category,
  selected,
  onSelect,
  theme,
  isDark,
  language,
}: {
  category: ServiceCategory;
  selected: boolean;
  onSelect: () => void;
  theme: ThemeColors;
  isDark?: boolean;
  language?: string;
}) {
  const iconName = toSafeMaterialIcon(category.icon, category.name);
  const tint = category.color || theme.primary;
  const lang = String(language || 'en').startsWith('hi') ? 'hi' : 'en';
  const {primary, secondary} = bilingualServiceNames(category.name, lang, {
    nameHi: category.nameHi,
  });

  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{selected}}
      style={styles.pickWrap}>
      <CrystalSurface
        primary={theme.primary}
        card={theme.card}
        isDark={isDark}
        accent
        radius={18}
        style={[
          styles.pickCard,
          selected
            ? {
                shadowColor: theme.primary,
                shadowOpacity: 0.22,
                shadowRadius: 10,
                elevation: 4,
              }
            : null,
        ]}
        contentStyle={styles.pickInner}>
        {selected ? (
          <Icon
            name="check-circle"
            size={18}
            color={theme.primary}
            style={styles.pickCheck}
          />
        ) : null}
        <View style={[styles.pickIcon, {backgroundColor: `${tint}24`}]}>
          <Icon name={iconName} size={22} color={tint} />
        </View>
        <View style={styles.pickNameBlock}>
          <Text
            style={[styles.pickName, {color: theme.text}]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {primary}
          </Text>
          {secondary ? (
            <Text
              style={[styles.pickNameSecondary, {color: theme.textSecondary}]}
              numberOfLines={1}
              ellipsizeMode="tail">
              {secondary}
            </Text>
          ) : null}
        </View>
      </CrystalSurface>
    </TouchableOpacity>
  );
}

export default function ServiceSelectionModal({
  open,
  onClose,
  categories,
  selectedName,
  onSelect,
  theme,
  isDark,
  language,
}: Props) {
  const {t} = useTranslation();
  const [query, setQuery] = useState('');

  const visible = useMemo(
    () =>
      categories.filter(item =>
        matchesServiceSearch(
          query,
          resolveServiceMeta(item.name, {nameHi: item.nameHi}),
        ),
      ),
    [categories, query],
  );

  const popular = useMemo(() => {
    const list = visible.filter(c =>
      Boolean((c as {isPopular?: boolean}).isPopular),
    );
    const base = list.length ? list : visible.slice(0, 8);
    return [...base]
      .sort(
        (a, b) =>
          (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name),
      )
      .slice(0, 8);
  }, [visible]);

  const more = useMemo(() => {
    if (query.trim()) return visible;
    return visible.filter(
      c => !popular.some(p => (p.id || p.name) === (c.id || c.name)),
    );
  }, [visible, popular, query]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const pick = (c: ServiceCategory) => {
    onSelect(c);
    setQuery('');
  };

  const sheetH = Math.min(Dimensions.get('window').height * 0.72, 640);

  const renderSection = (title: string | null, data: ServiceCategory[]) => {
    if (!data.length) return null;
    return (
      <View style={styles.section}>
        {title ? (
          <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
            {title}
          </Text>
        ) : null}
        <View style={styles.grid}>
          {data.map(c => (
            <ServicePickCard
              key={c.id || c.name}
              category={c}
              selected={selectedName === c.name}
              onSelect={() => pick(c)}
              theme={theme}
              isDark={isDark}
              language={language}
            />
          ))}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? theme.card : 'rgba(255,255,255,0.96)',
              height: sheetH,
              maxHeight: sheetH,
            },
          ]}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, {backgroundColor: theme.border}]} />
          </View>
          <View style={styles.header}>
            <Text style={[styles.title, {color: theme.text}]}>
              {t('request.chooseServiceTitle')}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <Icon name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={String(t('browse.searchProfession'))}
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.search,
              {
                color: theme.text,
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(255,255,255,0.9)',
                borderColor: theme.border,
              },
            ]}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />

          {visible.length === 0 ? (
            <Text style={[styles.empty, {color: theme.textSecondary}]}>
              {t('browse.noProfessionsFound')}
            </Text>
          ) : (
            <FlatList
              data={[{key: 'body'}]}
              keyExtractor={i => i.key}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              renderItem={() => (
                <View>
                  {!query.trim()
                    ? renderSection(
                        String(t('request.popularServices')),
                        popular,
                      )
                    : null}
                  {renderSection(
                    query.trim() ? null : String(t('request.allServices')),
                    query.trim() ? visible : more,
                  )}
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingTop: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  search: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    marginBottom: 12,
  },
  empty: {
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pickWrap: {
    width: '48%',
    flexGrow: 1,
    maxWidth: '48.5%',
  },
  pickCard: {
    minHeight: 108,
    maxHeight: 120,
  },
  pickInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 6,
    minHeight: 108,
  },
  pickCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  pickIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickNameBlock: {
    width: '100%',
    alignItems: 'center',
  },
  pickName: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    textAlign: 'center',
    width: '100%',
  },
  pickNameSecondary: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
    textAlign: 'center',
    width: '100%',
    marginTop: 2,
  },
});
