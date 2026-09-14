import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {HelpSupportPanel} from '../components/help/HelpSupportPanel';
import useTranslation from '../hooks/useTranslation';

const HelpSupportScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, {backgroundColor: theme.background}]}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
            paddingTop: Math.max(insets.top, 8),
          },
        ]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel={String(t('common.back') || 'Back')}>
          <Icon name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, {color: theme.text}]} numberOfLines={1}>
          {String(t('help.title') || t('helpSupport.title') || 'Help & Support')}
        </Text>
        <View style={styles.backSpacer} />
      </View>
      <HelpSupportPanel surfaceOverride="default" />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: {padding: 8, width: 40},
  backSpacer: {width: 40},
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },
});

export default HelpSupportScreen;
