import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
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
  const query = search.trim().toLowerCase();
  const groups = useMemo(() => groupBrowseServices(services), [services]);
  const filtered = useMemo(() => {
    if (!query) return null;
    return services.filter(s => matchesBrowseSearch(s, query));
  }, [services, query]);

  const handleSelect = (apiName: string) => {
    onSelect(apiName);
    onClose();
  };

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <Pressable style={overlayStyles.backdrop} onPress={onClose} />
      <View style={[overlayStyles.sheet, {backgroundColor: theme.card}]}>
        <View style={overlayStyles.sheetHead}>
          <Text style={[overlayStyles.sheetTitle, {color: theme.text}]}>
            {t('browse.allServicesTitle')}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Icon name="close" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={String(t('browse.searchPlaceholder'))}
          placeholderTextColor={theme.textSecondary}
          style={[
            overlayStyles.search,
            {color: theme.text, borderColor: theme.border},
          ]}
        />
        <ScrollView style={overlayStyles.scroll} keyboardShouldPersistTaps="handled">
          {filtered ? (
            filtered.length === 0 ? (
              <Text style={{color: theme.textSecondary, padding: 16}}>
                {t('browse.noResults')}
              </Text>
            ) : (
              filtered.map(meta => (
                <ServiceRow
                  key={meta.key}
                  theme={theme}
                  meta={meta}
                  isHindi={isHindi}
                  selected={selectedApiName === meta.apiName}
                  onSelect={() => handleSelect(meta.apiName)}
                />
              ))
            )
          ) : (
            groups.map(group => (
              <View key={group.key} style={{marginBottom: 12}}>
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
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export function PopularServices({theme, selectedApiName, onSelect}: CatalogProps) {
  const {t, i18n} = useTranslation();
  const isHindi = String(i18n.language || '').startsWith('hi');
  const [services, setServices] = useState<BrowseService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadBrowseServices()
      .then(list => {
        if (!cancelled) setServices(list);
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(
    () => popularBrowseServices(services).slice(0, 6),
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
                  ]}>
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
  wrap: {marginTop: 4, marginBottom: 12, minHeight: 36},
  chips: {gap: 12, paddingBottom: 4, paddingHorizontal: 14},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(49, 130, 206, 0.10)',
  },
  chipSelected: {
    backgroundColor: 'rgba(49, 130, 206, 0.18)',
  },
  label: {fontSize: 13, fontWeight: '600'},
});

const overlayStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '82%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  sheetTitle: {fontSize: 17, fontWeight: '700'},
  search: {
    marginHorizontal: 14,
    marginBottom: 10,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  scroll: {paddingHorizontal: 8},
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
