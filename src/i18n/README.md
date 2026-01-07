# Multi-Language Support (i18n)

This app supports multiple languages: English and Hindi.

## Usage

### Using the Translation Hook

```typescript
import useTranslation from '../hooks/useTranslation';

function MyComponent() {
  const {t} = useTranslation();
  
  return (
    <Text>{t('common.ok')}</Text>
  );
}
```

### Available Translation Keys

#### Common
- `common.ok`, `common.cancel`, `common.save`, `common.delete`, etc.

#### Auth
- `auth.login`, `auth.signup`, `auth.email`, `auth.password`, etc.

#### Settings
- `settings.title`, `settings.language`, `settings.theme`, etc.

#### Services
- `services.title`, `services.requestService`, `services.status`, etc.

#### Notifications
- `notifications.title`, `notifications.noNotifications`, etc.

#### Profile
- `profile.title`, `profile.editProfile`, etc.

#### Job Card
- `jobCard.title`, `jobCard.startTask`, `jobCard.completeTask`, etc.

#### Errors
- `errors.generic`, `errors.network`, `errors.permissionDenied`, etc.

#### Messages
- `messages.welcome`, `messages.thankYou`, etc.

#### Time
- `time.today`, `time.yesterday`, `time.ago`, etc.

## Changing Language

The language can be changed from the Settings screen, or programmatically:

```typescript
import {useStore} from '../store';

const {setLanguage} = useStore();

// Change to Hindi
await setLanguage('hi');

// Change to English
await setLanguage('en');
```

## Adding New Translations

1. Add the key-value pair to both `en.json` and `hi.json` files
2. Use the same key structure in your code
3. The translation will be automatically available

Example:
```json
// en.json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is my feature"
  }
}

// hi.json
{
  "myFeature": {
    "title": "मेरी सुविधा",
    "description": "यह मेरी सुविधा है"
  }
}
```

Usage:
```typescript
const {t} = useTranslation();
<Text>{t('myFeature.title')}</Text>
```

