/**
 * Promise bridge so GeolocationService can show a themed consent UI
 * without importing React Native screens into the service layer.
 */

export type LocationConsentResult = 'allow' | 'not_now';

type Presenter = () => Promise<LocationConsentResult>;

let presenter: Presenter | null = null;

export function registerLocationConsentPresenter(next: Presenter | null) {
  presenter = next;
}

export async function requestLocationConsent(): Promise<LocationConsentResult> {
  if (!presenter) {
    // No UI host mounted — proceed so native permission can still run.
    return 'allow';
  }
  return presenter();
}
