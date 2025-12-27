export interface Theme {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  shadow: string;
  tabBar: string;
  placeholder: string;
}

export const lightTheme: Theme = {
  background: '#F5F7FA',
  card: '#FFFFFF',
  text: '#1A202C',
  textSecondary: '#718096',
  primary: '#3182CE',
  primaryDark: '#2C5282',
  secondary: '#38B2AC',
  border: '#E2E8F0',
  error: '#E53E3E',
  success: '#38A169',
  warning: '#DD6B20',
  shadow: '#000000',
  tabBar: '#FFFFFF',
  placeholder: '#A0AEC0',
};

export const darkTheme: Theme = {
  background: '#1A202C',
  card: '#2D3748',
  text: '#F7FAFC',
  textSecondary: '#A0AEC0',
  primary: '#4299E1',
  primaryDark: '#3182CE',
  secondary: '#4FD1C5',
  border: '#4A5568',
  error: '#FC8181',
  success: '#68D391',
  warning: '#F6AD55',
  shadow: '#000000',
  tabBar: '#2D3748',
  placeholder: '#718096',
};

export const commonStyles = {
  shadowSmall: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  shadowMedium: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  shadowLarge: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
};
