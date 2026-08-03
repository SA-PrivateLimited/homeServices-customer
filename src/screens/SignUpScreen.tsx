import React, {useEffect} from 'react';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

/**
 * Legacy email signup — redirected to phone + PIN login (MongoDB/JWT).
 */
const SignUpScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    navigation.replace('Login');
  }, [navigation]);

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[styles.text, {color: theme.textSecondary}]}>
        Redirecting to phone login…
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    marginTop: 12,
    fontSize: 14,
  },
});

export default SignUpScreen;
