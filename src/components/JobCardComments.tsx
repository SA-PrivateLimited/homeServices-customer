/**
 * Job card comment thread — customer app.
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Button} from 'sapvt-ltd-app-packages';
import useTranslation from '../hooks/useTranslation';

export type JobComment = {
  _id: string;
  role: 'admin' | 'provider' | 'customer';
  authorId?: string;
  authorName?: string;
  text: string;
  createdAt?: string | Date;
};

type ThemeColors = {
  text: string;
  textSecondary: string;
  primary: string;
  card: string;
  border: string;
  background: string;
};

type Props = {
  comments: JobComment[];
  theme: ThemeColors;
  onSubmit: (text: string) => Promise<void>;
  canComment?: boolean;
  title?: string;
  placeholder?: string;
  emptyText?: string;
  postLabel?: string;
};

function roleIcon(role: JobComment['role']): string {
  if (role === 'customer') return 'person';
  if (role === 'provider') return 'engineering';
  return 'admin-panel-settings';
}

function formatTime(value?: string | Date): string {
  if (!value) return '';
  try {
    const d = value instanceof Date ? value : new Date(value);
    return d.toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function JobCardComments({
  comments,
  theme,
  onSubmit,
  canComment = true,
  title,
  placeholder,
  emptyText,
  postLabel,
}: Props) {
  const {t} = useTranslation();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedTitle = title ?? String(t('jobCard.comments'));
  const resolvedPlaceholder =
    placeholder ?? String(t('jobCard.commentPlaceholder'));
  const resolvedEmpty = emptyText ?? String(t('jobCard.noComments'));
  const resolvedPost = postLabel ?? String(t('jobCard.postComment'));

  const roleLabel = (role: JobComment['role']): string => {
    if (role === 'customer') return String(t('review.role.customer'));
    if (role === 'provider') return String(t('review.role.provider'));
    return String(t('review.role.admin'));
  };

  const handlePost = async () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setText('');
    } catch (e: any) {
      setError(e?.message || String(t('review.comments.postFailed')));
    } finally {
      setBusy(false);
    }
  };

  const list = Array.isArray(comments) ? comments : [];

  return (
    <View style={[styles.wrap, {backgroundColor: theme.card, borderColor: theme.border}]}>
      <View style={styles.header}>
        <Icon name="chat" size={18} color={theme.primary} />
        <Text style={[styles.title, {color: theme.text}]}>{resolvedTitle}</Text>
      </View>

      {list.length === 0 ? (
        <Text style={[styles.empty, {color: theme.textSecondary}]}>
          {resolvedEmpty}
        </Text>
      ) : (
        list.map(c => (
          <View
            key={c._id}
            style={[styles.item, {borderBottomColor: theme.border}]}>
            <View style={styles.meta}>
              <Icon name={roleIcon(c.role)} size={16} color={theme.primary} />
              <Text style={[styles.role, {color: theme.primary}]}>
                {roleLabel(c.role)}
              </Text>
              {c.authorName ? (
                <Text
                  style={[styles.author, {color: theme.textSecondary}]}
                  numberOfLines={1}>
                  {c.authorName}
                </Text>
              ) : null}
              <Text style={[styles.time, {color: theme.textSecondary}]}>
                {formatTime(c.createdAt)}
              </Text>
            </View>
            <Text style={[styles.body, {color: theme.text}]}>{c.text}</Text>
          </View>
        ))
      )}

      {canComment ? (
        <View style={styles.composer}>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.background,
              },
            ]}
            value={text}
            onChangeText={setText}
            placeholder={resolvedPlaceholder}
            placeholderTextColor={theme.textSecondary}
            multiline
            editable={!busy}
          />
          <Button
            title={resolvedPost}
            variant="primary"
            size="sm"
            onPress={() => void handlePost()}
            disabled={busy || !text.trim()}
            loading={busy}
            style={{alignSelf: 'flex-end'}}
            colors={{
              primary: theme.primary,
              card: theme.card,
              text: '#fff',
              border: theme.primary,
            }}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  empty: {
    fontSize: 13,
    marginBottom: 8,
  },
  item: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  role: {
    fontSize: 12,
    fontWeight: '700',
  },
  author: {
    fontSize: 12,
    flexShrink: 1,
  },
  time: {
    fontSize: 11,
    marginLeft: 'auto',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  composer: {
    marginTop: 12,
    gap: 8,
  },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  error: {
    color: '#E53E3E',
    fontSize: 12,
  },
});
