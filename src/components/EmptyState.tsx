import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({icon, title, message}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <View style={styles.container}>
      <Icon name={icon} size={80} color={theme.textSecondary} />
      <Text style={[styles.title, {color: theme.text}]}>{title}</Text>
      <Text style={[styles.message, {color: theme.textSecondary}]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default EmptyState;
