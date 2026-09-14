import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  groupBrowseServices,
  loadBrowseServices,
  matchesBrowseSearch,
  popularBrowseServices,
  type BrowseService,
} from '../../services/browseServices';
import {toSafeMaterialIcon} from '../../utils/serviceIcons';
import useTranslation from '../../hooks/useTranslation';
import type {Theme} from '../../utils/theme';

type CatalogProps = {
  theme: Theme;
  selectedApiName: string;
  onSelect: (apiName: string) => void;
  /** When provided, chips use this list and skip their own catalog fetch. */
  services?: BrowseService[];
};

function ServiceRow({
  theme,
  meta,
  isHindi,
  selected,
  onSelect,
}: {
  theme: Theme;
  meta: BrowseService;
  isHindi: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      style={[
        overlayStyles.row,
        selected ? {backgroundColor: 'rgba(49, 130, 206, 0.12)'} : null,
      ]}
      accessibilityRole="button"
      accessibilityState={{selected}}>
      <Icon
        name={toSafeMaterialIcon(meta.icon, meta.apiName)}
        size={20}
        color={theme.primary}
      />
      <Text style={[overlayStyles.rowLabel, {color: theme.text}]}>
        {isHindi ? meta.name.hi : meta.name.en}
      </Text>
      {selected ? (
        <Icon name="check-circle" size={18} color={theme.primary} />
      ) : null}
    </TouchableOpacity>
  );
}

type ServiceGroup = ReturnType<typeof groupBrowseServices>[number];

function foldSearch(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function groupMatchesQuery(group: ServiceGroup, query: string): boolean {
  const q = foldSearch(query);
  if (!q) return true;
  return [group.titleHi, group.titleEn, group.key.replace(/_/g, ' ')]
    .filter(Boolean)
    .some(title => foldSearch(String(title)).includes(q));
}

export function ServiceCatalogOverlay({
  theme,
  open,
  onClose,
  services,
  selectedApiName,
  onSelect,
}: CatalogProps & {
  open: boolean;
  onClose: () => void;
  services: BrowseService[];
}) {
  const {t, i18n} = useTranslation();
  const isHindi = String(i18n.language || '').startsWith('hi');
  const [search, setSearch] = useState('');
  const searchRef = useRef<TextInput>(null);
  const query = foldSearch(search);
  const groups = useMemo(() => groupBrowseServices(services), [services]);

  const visibleGroups = useMemo(() => {
    if (!query) return groups;
    return groups
      .map(group => ({
        ...group,
        items: group.items.filter(
          item =>
            matchesBrowseSearch(item, query) || groupMatchesQuery(group, query),
        ),
      }))
      .filter(group => group.items.length > 0);
  }, [groups, query]);

  const resultCount = useMemo(
    () => visibleGroups.reduce((sum, g) => sum + g.items.length, 0),
    [visibleGroups],
  );

  useEffect(() => {
    if (!open) {
      setSearch('');
      return;
    }
    const timer = setTimeout(() => searchRef.current?.focus(), 280);
    return () => clearTimeout(timer);
  }, [open]);

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  const handleSelect = (apiName: string) => {
    onSelect(apiName);
    setSearch('');
    onClose();
  };

  const renderGroup = ({item: group}: {item: ServiceGroup}) => (
    <View style={overlayStyles.groupBlock}>
      <Text style={[overlayStyles.groupTitle, {color: theme.text}]}>
        {isHindi ? group.titleHi : group.titleEn}
      </Text>
      {group.items.map(meta => (
        <ServiceRow
          key={meta.key}
          theme={theme}
          meta={meta}
          isHindi={isHindi}
          selected={selectedApiName === meta.apiName}
          onSelect={() => handleSelect(meta.apiName)}
        />
      ))}
    </View>
  );

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}>
      <View style={overlayStyles.modalRoot}>
        <Pressable style={overlayStyles.backdrop} onPress={handleClose} />
        <View style={[overlayStyles.sheet, {backgroundColor: theme.card}]}>
          <View style={overlayStyles.sheetHead}>
            <Text style={[overlayStyles.sheetTitle, {color: theme.text}]}>
              {t('browse.allServicesTitle')}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <Icon name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              overlayStyles.searchWrap,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
            ]}>
            <Icon name="search" size={20} color={theme.textSecondary} />
            <TextInput
              ref={searchRef}
              value={search}
              onChangeText={setSearch}
              placeholder={String(
                t('browse.searchProfession') || t('browse.searchPlaceholder'),
              )}
              placeholderTextColor={theme.textSecondary}
              style={[overlayStyles.searchInput, {color: theme.text}]}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              clearButtonMode="while-editing"
              accessibilityLabel={String(t('browse.searchPlaceholder'))}
            />
            {search.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearch('')}
                hitSlop={8}
                accessibilityLabel={String(t('common.clear'))}>
                <Icon name="close" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {query ? (
            <Text style={[overlayStyles.resultHint, {color: theme.textSecondary}]}>
              {resultCount === 0
                ? String(t('browse.noResults'))
                : String(
                    t('browse.availableCount', {
                      count: resultCount,
                      defaultValue: `${resultCount} available`,
                    }),
                  )}
            </Text>
          ) : (
            <Text style={[overlayStyles.resultHint, {color: theme.textSecondary}]}>
              {String(t('browse.hint'))}
            </Text>
          )}

          <FlatList
            data={visibleGroups}
            keyExtractor={group => group.key}
            renderItem={renderGroup}
            keyboardShouldPersistTaps="handled"
            style={overlayStyles.list}
            contentContainerStyle={overlayStyles.listContent}
            ListEmptyComponent={
              <Text style={[overlayStyles.empty, {color: theme.textSecondary}]}>
                {t('browse.noResults')}
              </Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

export function PopularServices({
  theme,
  selectedApiName,
  onSelect,
  services: servicesProp,
}: CatalogProps) {
  const {t, i18n} = useTranslation();
  const isHindi = String(i18n.language || '').startsWith('hi');
  const hasExternalServices = servicesProp !== undefined;
  const [fetchedServices, setFetchedServices] = useState<BrowseService[]>([]);
  const [loading, setLoading] = useState(!hasExternalServices);

  useEffect(() => {
    if (hasExternalServices) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void loadBrowseServices()
      .then(list => {
        if (!cancelled) setFetchedServices(list);
      })
      .catch(() => {
        if (!cancelled) setFetchedServices([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasExternalServices]);

  const services = hasExternalServices ? servicesProp : fetchedServices;

  const items = useMemo(
    () => popularBrowseServices(services).slice(0, 16),
    [services],
  );
  const selectedKey =
    services.find(s => s.apiName === selectedApiName)?.key || '';

  if (!loading && items.length === 0) {
    return null;
  }

  return (
    <View
      style={styles.wrap}
      accessibilityLabel={String(t('browse.popularTitle'))}>
      {loading ? (
        <ActivityIndicator color={theme.primary} />
      ) : (
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          {items.map(meta => {
            const selected = selectedKey === meta.key;
            const label = isHindi ? meta.name.hi : meta.name.en;
            return (
              <TouchableOpacity
                key={meta.key}
                onPress={() => onSelect(selected ? '' : meta.apiName)}
                style={[
                  styles.chip,
                  selected ? styles.chipSelected : null,
                  selected
                    ? {borderColor: theme.primary}
                    : {borderColor: 'transparent'},
                ]}
                accessibilityRole="button"
                accessibilityState={{selected}}>
                <Icon
                  name={toSafeMaterialIcon(meta.icon, meta.apiName)}
                  size={16}
                  color={theme.primary}
                />
                <Text
                  style={[
                    styles.label,
                    {color: selected ? theme.primary : theme.text},
                  ]}
                  numberOfLines={1}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {marginTop: 0, marginBottom: 0, minHeight: 36},
  chips: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 2,
    paddingHorizontal: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: 'rgba(49, 130, 206, 0.10)',
  },
  chipSelected: {
    backgroundColor: 'rgba(49, 130, 206, 0.20)',
  },
  label: {fontSize: 13, fontWeight: '600', maxWidth: 140},
});

const overlayStyles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    width: '100%',
    maxHeight: '88%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 14,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  sheetTitle: {fontSize: 17, fontWeight: '700', flex: 1, paddingRight: 8},
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 6,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    minHeight: 40,
  },
  resultHint: {
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  list: {flexGrow: 1},
  listContent: {paddingHorizontal: 8, paddingBottom: 16},
  groupBlock: {marginBottom: 12},
  empty: {padding: 20, textAlign: 'center', fontSize: 14},
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  rowLabel: {flex: 1, fontSize: 15, fontWeight: '600'},
});
