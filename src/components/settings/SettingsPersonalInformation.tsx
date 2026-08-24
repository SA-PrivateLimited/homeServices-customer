import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Button, Select} from 'sapvt-ltd-app-packages';
import type {Theme} from '../../utils/theme';
import {commonStyles} from '../../utils/theme';

export interface SettingsPersonalInformationProps {
  theme: Theme;
  title: string;
  editLabel: string;
  saveLabel: string;
  cancelLabel: string;
  isEditing: boolean;
  saving: boolean;
  nameLabel: string;
  name: string;
  onNameChange: (value: string) => void;
  phoneLabel: string;
  phone: string;
  phoneLockedHint: string;
  verifiedLabel: string;
  genderLabel: string;
  genderPlaceholder: string;
  gender: string;
  genderOptions: string[];
  onGenderChange: (value: string) => void;
  addressLabel: string;
  addressEditor: React.ReactNode;
  addressView: React.ReactNode;
  successMessage?: string | null;
  onToggleEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function SettingsPersonalInformation({
  theme,
  title,
  editLabel,
  saveLabel,
  cancelLabel,
  isEditing,
  saving,
  nameLabel,
  name,
  onNameChange,
  phoneLabel,
  phone,
  phoneLockedHint,
  verifiedLabel,
  genderLabel,
  genderPlaceholder,
  gender,
  genderOptions,
  onGenderChange,
  addressLabel,
  addressEditor,
  addressView,
  successMessage,
  onToggleEdit,
  onSave,
  onCancel,
}: SettingsPersonalInformationProps) {
  return (
    <View style={styles.section}>
      <View style={styles.kickerRow}>
        <Text style={[styles.kicker, {color: theme.textSecondary}]}>
          {title}
        </Text>
        <TouchableOpacity
          onPress={onToggleEdit}
          style={styles.editBtn}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={isEditing ? saveLabel : editLabel}>
          {saving ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Icon
              name={isEditing ? 'checkmark' : 'create-outline'}
              size={22}
              color={theme.primary}
            />
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.card, {backgroundColor: theme.card}]}>
        <Text style={[styles.label, {color: theme.textSecondary}]}>
          {nameLabel}
        </Text>
        {isEditing ? (
          <TextInput
            style={[
              styles.input,
              {color: theme.text, borderColor: theme.border},
            ]}
            value={name}
            onChangeText={onNameChange}
            accessibilityLabel={nameLabel}
          />
        ) : (
          <Text style={[styles.value, {color: theme.text}]}>
            {name || '—'}
          </Text>
        )}

        <View style={[styles.divider, {backgroundColor: theme.border}]} />

        <View style={styles.labelRow}>
          <Text style={[styles.label, styles.labelFlush, {color: theme.textSecondary}]}>
            {phoneLabel}
          </Text>
          <Icon
            name="lock-closed"
            size={14}
            color={theme.textSecondary}
            accessibilityLabel={phoneLockedHint}
          />
        </View>
        <View style={styles.phoneRow}>
          <Text style={[styles.value, {color: theme.text, flex: 1}]}>
            {phone}
          </Text>
          <View style={[styles.badge, {backgroundColor: theme.success}]}>
            <Icon name="checkmark-circle" size={12} color="#fff" />
            <Text style={styles.badgeText}>{verifiedLabel}</Text>
          </View>
        </View>
        <Text style={[styles.lockedHint, {color: theme.success}]}>
          {phoneLockedHint}
        </Text>

        <View style={[styles.divider, {backgroundColor: theme.border}]} />

        <Text style={[styles.label, {color: theme.textSecondary}]}>
          {genderLabel}
        </Text>
        {isEditing ? (
          <Select
            options={genderOptions.map((o) => ({value: o, label: o}))}
            value={gender}
            placeholder={genderPlaceholder}
            onChange={onGenderChange}
          />
        ) : (
          <Text style={[styles.value, {color: theme.text}]}>
            {gender || '—'}
          </Text>
        )}

        <View style={[styles.divider, {backgroundColor: theme.border}]} />

        <View style={styles.labelRow}>
          <Icon name="location-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.label, styles.labelFlush, {color: theme.textSecondary}]}>
            {addressLabel}
          </Text>
        </View>
        {isEditing ? addressEditor : addressView}

        {successMessage && !isEditing ? (
          <View
            style={[
              styles.success,
              {backgroundColor: `${theme.success}1A`, borderColor: `${theme.success}55`},
            ]}
            accessibilityRole="text">
            <Icon name="checkmark-circle" size={18} color={theme.success} />
            <Text style={[styles.successText, {color: theme.text}]}>
              {successMessage}
            </Text>
          </View>
        ) : null}

        {isEditing ? (
          <View style={styles.actions}>
            <Button
              title={cancelLabel}
              variant="secondary"
              onPress={onCancel}
              disabled={saving}
              style={styles.actionBtn}
              colors={{
                primary: theme.primary,
                card: theme.card,
                text: theme.text,
                border: theme.border,
              }}
            />
            <Button
              title={saveLabel}
              variant="primary"
              loading={saving}
              onPress={onSave}
              style={styles.actionBtn}
              colors={{
                primary: theme.primary,
                card: theme.card,
                text: theme.text,
                border: theme.border,
              }}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {marginBottom: 8},
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
    minHeight: 40,
  },
  kicker: {fontSize: 12, fontWeight: '700', letterSpacing: 1},
  editBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    ...commonStyles.shadowSmall,
  },
  label: {fontSize: 12, fontWeight: '600', marginTop: 4, marginBottom: 4},
  labelFlush: {marginTop: 0, marginBottom: 0},
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  value: {fontSize: 15, lineHeight: 22, fontWeight: '600'},
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  divider: {height: StyleSheet.hairlineWidth, marginVertical: 12},
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {color: '#fff', fontSize: 11, fontWeight: '700'},
  lockedHint: {fontSize: 12, marginTop: 4},
  success: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successText: {flex: 1, fontSize: 13, fontWeight: '600'},
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {minWidth: 96},
});
