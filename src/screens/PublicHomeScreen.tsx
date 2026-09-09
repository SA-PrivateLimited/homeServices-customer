import React, {useEffect, useMemo, useState} from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Button} from 'sapvt-ltd-app-packages';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import useTranslation from '../hooks/useTranslation';
import {
  loadBrowseServices,
  matchesBrowseSearch,
  popularBrowseServices,
  type BrowseService,
} from '../services/browseServices';
import {toSafeMaterialIcon} from '../utils/serviceIcons';
import {getGeographyMeta} from '../services/api/geographyApi';
import {CrystalSurface} from '../components/CrystalSurface';

const HOW = [
  {icon: 'handyman', titleKey: 'home.how1Title', bodyKey: 'home.how1Body'},
  {icon: 'group', titleKey: 'home.how2Title', bodyKey: 'home.how2Body'},
  {icon: 'send', titleKey: 'home.how3Title', bodyKey: 'home.how3Body'},
] as const;

const TRUST = [
  {icon: 'location-on', titleKey: 'home.trust1Title', bodyKey: 'home.trust1Body'},
  {icon: 'badge', titleKey: 'home.trust2Title', bodyKey: 'home.trust2Body'},
  {icon: 'assignment', titleKey: 'home.trust3Title', bodyKey: 'home.trust3Body'},
  {icon: 'lock', titleKey: 'home.trust4Title', bodyKey: 'home.trust4Body'},
] as const;

export default function PublicHomeScreen({navigation}: any) {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t, i18n} = useTranslation();
  const isHindi = String(i18n.language || '').startsWith('hi');
  const [services, setServices] = useState<BrowseService[]>([]);
  const [serviceQuery, setServiceQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedService, setSelectedService] = useState<BrowseService | null>(
    null,
  );

  useEffect(() => {
    void loadBrowseServices()
      .then(setServices)
      .catch(() => setServices([]));
    void getGeographyMeta().catch(() => {});
  }, []);

  const popular = useMemo(
    () => popularBrowseServices(services).slice(0, 8),
    [services],
  );
  const suggestions = useMemo(() => {
    const q = serviceQuery.trim();
    if (!q) return popular.slice(0, 6);
    return services.filter(s => matchesBrowseSearch(s, q)).slice(0, 8);
  }, [serviceQuery, services, popular]);

  const goBrowse = (svc?: BrowseService | null) => {
    const chosen = svc || selectedService;
    navigation.navigate('GuestProviders', {
      service: chosen?.apiName || serviceQuery.trim() || undefined,
      locationQuery: locationQuery.trim() || undefined,
    });
  };

  const goLogin = () => {
    // Login lives on the root stack (above GuestStack / Main)
    const root = navigation.getParent()?.getParent() ?? navigation.getParent();
    if (root) root.navigate('Login');
    else navigation.navigate('Login');
  };

  const goLegal = (kind: 'privacy' | 'terms') => {
    const root = navigation.getParent()?.getParent() ?? navigation.getParent();
    if (root) root.navigate('LegalDocument', {kind});
    else navigation.navigate('LegalDocument', {kind});
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: theme.background}]}>
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.topBar}>
          <Text style={[styles.eyebrow, {color: theme.primary}]}>
            {t('home.eyebrow')}
          </Text>
          {/* Web AppShell guest: header Sign in */}
          <TouchableOpacity
            onPress={goLogin}
            style={[
              styles.signInBtn,
              {backgroundColor: `${theme.primary}1A`},
            ]}
            accessibilityRole="button"
            accessibilityLabel={String(t('actions.signIn'))}>
            <Text style={[styles.signInText, {color: theme.primary}]}>
              {t('actions.signIn')}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.brandRow}>
          <Image
            source={require('../assets/fromWeb/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.brand, {color: theme.text}]}>Akansho</Text>
        </View>
        <Text style={[styles.h1, {color: theme.text}]}>{t('home.h1')}</Text>
        <Text style={[styles.lead, {color: theme.textSecondary}]}>
          {t('home.lead')}
        </Text>

        {/* Web `.public-home__search` — crystal/glass card with primary wash */}
        <CrystalSurface
          primary={theme.primary}
          card={theme.card}
          isDark={isDarkMode}
          accent
          radius={22}
          style={styles.searchCard}
          contentStyle={styles.searchCardInner}>
          <Text style={[styles.fieldLabel, {color: theme.textSecondary}]}>
            {t('home.serviceLabel')}
          </Text>
          <TextInput
            value={
              selectedService
                ? isHindi
                  ? selectedService.name.hi
                  : selectedService.name.en
                : serviceQuery
            }
            onChangeText={text => {
              setSelectedService(null);
              setServiceQuery(text);
            }}
            placeholder={String(t('home.servicePlaceholder'))}
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, {color: theme.text, borderColor: theme.border}]}
          />
          {serviceQuery && !selectedService
            ? suggestions.map(s => (
                <TouchableOpacity
                  key={s.key}
                  style={styles.suggest}
                  onPress={() => {
                    setSelectedService(s);
                    setServiceQuery('');
                  }}>
                  <Icon
                    name={toSafeMaterialIcon(s.icon, s.apiName)}
                    size={16}
                    color={theme.primary}
                  />
                  <Text style={{color: theme.text}}>
                    {isHindi ? s.name.hi : s.name.en}
                  </Text>
                </TouchableOpacity>
              ))
            : null}
          <Text
            style={[
              styles.fieldLabel,
              {color: theme.textSecondary, marginTop: 12},
            ]}>
            {t('home.locationLabel')}
          </Text>
          <TextInput
            value={locationQuery}
            onChangeText={setLocationQuery}
            placeholder={String(t('home.locationPlaceholder'))}
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, {color: theme.text, borderColor: theme.border}]}
          />
          <Button
            variant="primary"
            block
            title={String(t('home.searchCta'))}
            onPress={() => goBrowse()}
            style={{marginTop: 12}}
          />
        </CrystalSurface>

        <View style={styles.sectionHead}>
          <Text style={[styles.h2, {color: theme.text}]}>
            {t('home.popularServicesTitle')}
          </Text>
          <TouchableOpacity onPress={() => goBrowse()}>
            <Text style={{color: theme.primary, fontWeight: '700'}}>
              {t('home.seeAllServices')}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.chips}>
          {popular.map(s => (
            <TouchableOpacity
              key={s.key}
              style={styles.chip}
              onPress={() => goBrowse(s)}>
              <Icon
                name={toSafeMaterialIcon(s.icon, s.apiName)}
                size={16}
                color={theme.primary}
              />
              <Text style={[styles.chipLabel, {color: theme.text}]}>
                {isHindi ? s.name.hi : s.name.en}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.h2, {color: theme.text, marginTop: 8}]}>
          {t('home.howTitle') || t('home.how1Title')}
        </Text>
        {HOW.map(step => (
          <View key={step.titleKey} style={[styles.step, {backgroundColor: 'rgba(49, 130, 206, 0.08)'}]}>
            <Icon name={step.icon} size={22} color={theme.primary} />
            <View style={{flex: 1}}>
              <Text style={[styles.stepTitle, {color: theme.text}]}>
                {t(step.titleKey)}
              </Text>
              <Text style={{color: theme.textSecondary, fontSize: 13, lineHeight: 18}}>
                {t(step.bodyKey)}
              </Text>
            </View>
          </View>
        ))}

          {TRUST.map(item => (
          <View key={item.titleKey} style={styles.trust}>
            <Icon name={item.icon} size={20} color={theme.primary} />
            <View style={{flex: 1}}>
              <Text style={[styles.stepTitle, {color: theme.text}]}>
                {t(item.titleKey)}
              </Text>
              <Text style={{color: theme.textSecondary, fontSize: 13}}>
                {t(item.bodyKey)}
              </Text>
            </View>
          </View>
        ))}

        <Text style={[styles.h2, {color: theme.text, marginTop: 8}]}>
          {t('home.faqTitle')}
        </Text>
        {[1, 2, 3, 4, 5].map(n => (
          <View
            key={n}
            style={[styles.step, {backgroundColor: 'rgba(49, 130, 206, 0.06)'}]}>
            <View style={{flex: 1}}>
              <Text style={[styles.stepTitle, {color: theme.text}]}>
                {t(`home.faq${n}Q`)}
              </Text>
              <Text style={{color: theme.textSecondary, fontSize: 13, lineHeight: 18}}>
                {t(`home.faq${n}A`)}
              </Text>
            </View>
          </View>
        ))}
        <Button
          variant="primary"
          block
          title={String(t('home.ctaBrowse'))}
          onPress={() => goBrowse()}
        />

        {/* Web public-home__foot */}
        <View style={[styles.foot, {borderTopColor: theme.border}]}>
          <TouchableOpacity onPress={() => goBrowse()} accessibilityRole="link">
            <Text style={[styles.footLink, {color: theme.primary}]}>
              {t('home.ctaBrowse')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goLogin} accessibilityRole="link">
            <Text style={[styles.footLink, {color: theme.primary}]}>
              {t('actions.signIn')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => goLegal('privacy')}
            accessibilityRole="link">
            <Text style={[styles.footLink, {color: theme.textSecondary}]}>
              {t('settings.privacy')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => goLegal('terms')}
            accessibilityRole="link">
            <Text style={[styles.footLink, {color: theme.textSecondary}]}>
              {t('settings.terms')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  pad: {padding: 14, paddingBottom: 40, gap: 12},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  eyebrow: {fontSize: 13, fontWeight: '700', flexShrink: 1},
  signInBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    flexShrink: 0,
  },
  signInText: {fontSize: 14, fontWeight: '700'},
  brandRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  logo: {width: 44, height: 44},
  brand: {fontSize: 18, fontWeight: '800'},
  h1: {fontSize: 28, fontWeight: '800', lineHeight: 34, letterSpacing: -0.4},
  lead: {fontSize: 16, lineHeight: 24},
  searchCard: {borderRadius: 22},
  searchCardInner: {padding: 16, gap: 6},
  fieldLabel: {fontSize: 12, fontWeight: '700'},
  input: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  suggest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  h2: {fontSize: 18, fontWeight: '800'},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(49, 130, 206, 0.10)',
  },
  chipLabel: {fontSize: 13, fontWeight: '600'},
  step: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    alignItems: 'flex-start',
  },
  stepTitle: {fontSize: 15, fontWeight: '700', marginBottom: 2},
  trust: {flexDirection: 'row', gap: 10, alignItems: 'flex-start'},
  foot: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  footLink: {fontSize: 14, fontWeight: '600'},
});
