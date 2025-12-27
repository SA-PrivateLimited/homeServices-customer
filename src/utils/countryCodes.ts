/**
 * Country Codes for Phone Number Input
 * India (+91) is hardcoded as default
 */

export interface CountryCode {
  name: string;
  code: string;
  dialCode: string;
  flag: string; // Emoji flag
}

export const COUNTRY_CODES: CountryCode[] = [
  {name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳'},
  {name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸'},
  {name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧'},
  {name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦'},
  {name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺'},
  {name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪'},
  {name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷'},
  {name: 'Italy', code: 'IT', dialCode: '+39', flag: '🇮🇹'},
  {name: 'Spain', code: 'ES', dialCode: '+34', flag: '🇪🇸'},
  {name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵'},
  {name: 'China', code: 'CN', dialCode: '+86', flag: '🇨🇳'},
  {name: 'South Korea', code: 'KR', dialCode: '+82', flag: '🇰🇷'},
  {name: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬'},
  {name: 'Malaysia', code: 'MY', dialCode: '+60', flag: '🇲🇾'},
  {name: 'UAE', code: 'AE', dialCode: '+971', flag: '🇦🇪'},
  {name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '🇸🇦'},
  {name: 'Bangladesh', code: 'BD', dialCode: '+880', flag: '🇧🇩'},
  {name: 'Pakistan', code: 'PK', dialCode: '+92', flag: '🇵🇰'},
  {name: 'Sri Lanka', code: 'LK', dialCode: '+94', flag: '🇱🇰'},
  {name: 'Nepal', code: 'NP', dialCode: '+977', flag: '🇳🇵'},
  {name: 'Brazil', code: 'BR', dialCode: '+55', flag: '🇧🇷'},
  {name: 'Mexico', code: 'MX', dialCode: '+52', flag: '🇲🇽'},
  {name: 'Russia', code: 'RU', dialCode: '+7', flag: '🇷🇺'},
  {name: 'South Africa', code: 'ZA', dialCode: '+27', flag: '🇿🇦'},
  {name: 'Turkey', code: 'TR', dialCode: '+90', flag: '🇹🇷'},
];

// Default country code (India +91) - hardcoded as default
export const DEFAULT_COUNTRY_CODE: CountryCode = COUNTRY_CODES[0]; // India (+91)

/**
 * Get country code by dial code
 */
export const getCountryByDialCode = (dialCode: string): CountryCode | undefined => {
  return COUNTRY_CODES.find(country => country.dialCode === dialCode);
};

/**
 * Get country code by country code (ISO)
 */
export const getCountryByCode = (code: string): CountryCode | undefined => {
  return COUNTRY_CODES.find(country => country.code === code);
};

