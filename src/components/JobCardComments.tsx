/**
 * Job card comment thread — customer app.
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

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

function roleLabel(role: JobComment['role']): string {
  if (role === 'customer') return 'Customer';
  if (role === 'provider') return 'Provider';
  return 'Admin';
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
  title = 'Comments',
  placeholder = 'Write a comment…',
  emptyText = 'No comments yet',
  postLabel = 'Post',
}: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePost = async () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setText('');
    } catch (e: any) {
      setError(e?.message || 'Failed to post comment');
    } finally {
      setBusy(false);
    }
  };

  const list = Array.isArray(comments) ? comments : [];

  return (
    <View style={[styles.wrap, {backgroundColor: theme.card, borderColor: theme.border}]}>
      <View style={styles.header}>
        <Icon name="chat" size={18} color={theme.primary} />
        <Text style={[styles.title, {color: theme.text}]}>{title}</Text>
      </View>

      {list.length === 0 ? (
        <Text style={[styles.empty, {color: theme.textSecondary}]}>{emptyText}</Text>
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
                <Text style={[styles.author, {color: theme.textSecondary}]} numberOfLines={1}>
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
            placeholder={placeholder}
            placeholderTextColor={theme.textSecondary}
            multiline
            editable={!busy}
          />
          <TouchableOpacity
            style={[
              styles.postBtn,
              {
                backgroundColor: theme.primary,
                opacity: busy || !text.trim() ? 0.5 : 1,
              },
            ]}
            onPress={() => void handlePost()}
            disabled={busy || !text.trim()}>
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="send" size={16} color="#fff" />
                <Text style={styles.postText}>{postLabel}</Text>
              </>
            )}
          </TouchableOpacity>
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
  postBtn: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  postText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  error: {
    color: '#E53E3E',
    fontSize: 12,
  },
});
