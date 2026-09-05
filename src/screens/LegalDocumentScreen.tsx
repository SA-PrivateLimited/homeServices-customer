import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Button} from 'sapvt-ltd-app-packages';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import useTranslation from '../hooks/useTranslation';
import {
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from '../config/legal';

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export default function LegalDocumentScreen({route}: {route: any}) {
  const kind: 'privacy' | 'terms' = route?.params?.kind === 'terms' ? 'terms' : 'privacy';
  const url = kind === 'terms' ? TERMS_OF_SERVICE_URL : PRIVACY_POLICY_URL;
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(url);
        const html = await res.text();
        if (!cancelled) setBody(stripHtml(html));
      } catch {
        if (!cancelled) setBody('');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const title =
    kind === 'terms'
      ? String(t('settings.terms') || t('collab.terms'))
      : String(t('collab.privacy') || t('settings.privacy'));

  return (
    <View style={[styles.wrap, {backgroundColor: theme.background}]}>
      {loading ? (
        <ActivityIndicator style={{marginTop: 40}} color={theme.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={[styles.h, {color: theme.text}]}>{title}</Text>
          {body ? (
            <Text style={[styles.body, {color: theme.text}]}>{body}</Text>
          ) : (
            <Text style={[styles.body, {color: theme.textSecondary}]}>
              {t('settings.legalOpenHint') ||
                'Open the full document in your browser.'}
            </Text>
          )}
          <Button
            variant="secondary"
            block
            title={String(t('common.openInBrowser') || 'Open in browser')}
            onPress={() => void Linking.openURL(url)}
            style={{marginTop: 16}}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1},
  pad: {padding: 14, paddingBottom: 40},
  h: {fontSize: 20, fontWeight: '700', marginBottom: 12},
  body: {fontSize: 14, lineHeight: 22},
});
