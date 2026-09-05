import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {HelpSupportPanel} from '../components/help/HelpSupportPanel';

const HelpSupportScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <View style={[styles.root, {backgroundColor: theme.background}]}>
      <View
        style={[
          styles.bar,
          {backgroundColor: theme.card, borderBottomColor: theme.border},
        ]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Icon name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
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
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  back: {padding: 8},
});

export default HelpSupportScreen;
