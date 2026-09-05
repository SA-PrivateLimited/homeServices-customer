import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Button, Select} from 'sapvt-ltd-app-packages';
import type {Theme} from '../../utils/theme';

export type GenderOption = {value: string; label: string};

export interface SettingsPersonalInformationProps {
  theme: Theme;
  title: string;
  subtitle?: string;
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
  secondaryPhoneLabel?: string;
  secondaryPhoneHint?: string;
  secondaryPhonePlaceholder?: string;
  secondaryPhone?: string;
  secondaryPhoneDisplay?: string;
  onSecondaryPhoneChange?: (value: string) => void;
  genderLabel: string;
  genderPlaceholder: string;
  gender: string;
  genderDisplay?: string;
  genderOptions: GenderOption[];
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
  subtitle,
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
  secondaryPhoneLabel,
  secondaryPhoneHint,
  secondaryPhonePlaceholder,
  secondaryPhone = '',
  secondaryPhoneDisplay,
  onSecondaryPhoneChange,
  genderLabel,
  genderPlaceholder,
  gender,
  genderDisplay,
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
  const isDark = theme.background.toLowerCase() === '#0b1220';

  return (
    <View style={styles.section}>
      <View
        style={[
          styles.card,
          {backgroundColor: theme.card, borderColor: theme.border},
        ]}>
        {/* Web `.personal-info-header` — title inside card; Edit only when not editing */}
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={[styles.title, {color: theme.text}]}>{title}</Text>
            {isEditing && subtitle ? (
              <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {!isEditing ? (
            <TouchableOpacity
              onPress={onToggleEdit}
              style={styles.editBtn}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={editLabel}>
              {saving ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <Icon name="edit" size={16} color={theme.primary} />
                  <Text style={[styles.editText, {color: theme.primary}]}>
                    {editLabel}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>

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

        <Text style={[styles.label, {color: theme.textSecondary}]}>
          {phoneLabel}
        </Text>
        <View style={styles.phoneRow}>
          <Text style={[styles.value, {color: theme.text, flexShrink: 1}]}>
            {phone}
          </Text>
          <View style={styles.verifiedInline}>
            <Icon name="check-circle" size={14} color={theme.success} />
            <Text style={[styles.verifiedText, {color: theme.success}]}>
              {verifiedLabel}
            </Text>
          </View>
        </View>
        <Text style={[styles.lockedHint, {color: theme.textSecondary}]}>
          {phoneLockedHint}
        </Text>

        {secondaryPhoneLabel ? (
          <>
            <View style={[styles.divider, {backgroundColor: theme.border}]} />
            <Text style={[styles.label, {color: theme.textSecondary}]}>
              {secondaryPhoneLabel}
            </Text>
            {isEditing ? (
              <>
                <View
                  style={[
                    styles.phoneInputRow,
                    {borderColor: theme.border},
                  ]}>
                  <Text
                    style={[styles.phonePrefix, {color: theme.textSecondary}]}>
                    +91
                  </Text>
                  <TextInput
                    style={[styles.phoneInput, {color: theme.text}]}
                    value={secondaryPhone}
                    onChangeText={text =>
                      onSecondaryPhoneChange?.(
                        text.replace(/\D/g, '').slice(0, 10),
                      )
                    }
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholder={secondaryPhonePlaceholder || '10-digit mobile'}
                    placeholderTextColor={theme.textSecondary}
                    accessibilityLabel={secondaryPhoneLabel}
                  />
                </View>
                {secondaryPhoneHint ? (
                  <Text
                    style={[styles.lockedHint, {color: theme.textSecondary}]}>
                    {secondaryPhoneHint}
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                <Text style={[styles.value, {color: theme.text}]}>
                  {secondaryPhoneDisplay ||
                    (secondaryPhone ? `+91 ${secondaryPhone}` : '—')}
                </Text>
                {secondaryPhoneHint ? (
                  <Text
                    style={[styles.lockedHint, {color: theme.textSecondary}]}>
                    {secondaryPhoneHint}
                  </Text>
                ) : null}
              </>
            )}
          </>
        ) : null}

        <View style={[styles.divider, {backgroundColor: theme.border}]} />

        <Text style={[styles.label, {color: theme.textSecondary}]}>
          {genderLabel}
        </Text>
        {isEditing ? (
          <Select
            variant="crystal"
            options={genderOptions}
            value={gender}
            placeholder={genderPlaceholder}
            allowClear
            clearAriaLabel="Clear"
            onChange={onGenderChange}
            colors={{
              card: isDark
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(255,255,255,0.55)',
            }}
          />
        ) : (
          <Text style={[styles.value, {color: theme.text}]}>
            {genderDisplay || gender || '—'}
          </Text>
        )}

        <View style={[styles.divider, {backgroundColor: theme.border}]} />

        <Text style={[styles.label, {color: theme.textSecondary}]}>
          {addressLabel}
        </Text>
        {isEditing ? addressEditor : addressView}

        {successMessage && !isEditing ? (
          <View
            style={[
              styles.success,
              {
                backgroundColor: `${theme.success}1A`,
                borderColor: `${theme.success}55`,
              },
            ]}
            accessibilityRole="text">
            <Icon name="check-circle" size={18} color={theme.success} />
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
              block
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
              block
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
  card: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 0,
    shadowOpacity: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  heading: {flex: 1, paddingRight: 4},
  title: {fontSize: 15, fontWeight: '700', letterSpacing: -0.2},
  subtitle: {fontSize: 13, marginTop: 2, lineHeight: 18},
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    minHeight: 32,
  },
  editText: {fontSize: 13, fontWeight: '600'},
  label: {fontSize: 12, fontWeight: '600', marginTop: 4, marginBottom: 4},
  value: {fontSize: 15, lineHeight: 22, fontWeight: '600'},
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  phonePrefix: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },
  divider: {height: StyleSheet.hairlineWidth, marginVertical: 12},
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  verifiedInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  verifiedText: {fontSize: 12, fontWeight: '600'},
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
    flexDirection: 'column-reverse',
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {width: '100%', alignSelf: 'stretch'},
});
