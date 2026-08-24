/**
 * Shared service-category questionnaire fields.
 */

import React from 'react';
import {View, Text, TextInput, StyleSheet, TouchableOpacity} from 'react-native';
import {Select, MultiSelect} from 'sapvt-ltd-app-packages';
import type {QuestionnaireQuestion} from '../services/serviceCategoriesService';
import useTranslation from '../hooks/useTranslation';

type ThemeColors = {
  text: string;
  textSecondary: string;
  primary: string;
  card: string;
  border: string;
  background: string;
};

type Props = {
  questions: QuestionnaireQuestion[];
  answers: Record<string, any>;
  onChange: (questionId: string, answer: any) => void;
  theme: ThemeColors;
  language?: string;
  title?: string;
  subtitle?: string;
  yesLabel?: string;
  noLabel?: string;
  selectPlaceholder?: string;
  textPlaceholder?: string;
  numberPlaceholder?: string;
};

function questionText(q: QuestionnaireQuestion, language?: string): string {
  if (language === 'hi' && q.questionHi) return q.questionHi;
  return q.question;
}

function placeholderText(
  q: QuestionnaireQuestion,
  fallback: string,
  language?: string,
): string {
  if (language === 'hi' && q.placeholderHi) return q.placeholderHi;
  return q.placeholder || fallback;
}

function optionsOf(q: QuestionnaireQuestion, language?: string): string[] {
  if (language === 'hi' && q.optionsHi?.length) return q.optionsHi;
  return q.options || [];
}

export default function ServiceQuestionnaireFields({
  questions,
  answers,
  onChange,
  theme,
  language,
  title,
  subtitle,
  yesLabel,
  noLabel,
  selectPlaceholder,
  textPlaceholder,
  numberPlaceholder,
}: Props) {
  const {t} = useTranslation();
  const resolvedYes = yesLabel ?? String(t('common.yes'));
  const resolvedNo = noLabel ?? String(t('common.no'));
  const resolvedSelect = selectPlaceholder ?? String(t('common.select'));
  const resolvedText =
    textPlaceholder ?? String(t('services.enterYourAnswer'));
  const resolvedNumber =
    numberPlaceholder ?? String(t('services.enterANumber'));

  if (!questions?.length) return null;

  return (
    <View style={styles.wrap}>
      {title ? (
        <Text style={[styles.title, {color: theme.text}]}>{title}</Text>
      ) : null}
      {subtitle ? (
        <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
          {subtitle}
        </Text>
      ) : null}
      {questions.map((question, index) => (
        <View key={question.id} style={styles.question}>
          <Text style={[styles.questionText, {color: theme.text}]}>
            {index + 1}. {questionText(question, language)}
            {question.required ? (
              <Text style={styles.required}> *</Text>
            ) : null}
          </Text>

          {question.type === 'text' ? (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              value={answers[question.id] || ''}
              onChangeText={text => onChange(question.id, text)}
              placeholder={placeholderText(
                question,
                resolvedText,
                language,
              )}
              placeholderTextColor={theme.textSecondary}
              multiline
            />
          ) : null}

          {question.type === 'number' ? (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              value={answers[question.id] || ''}
              onChangeText={text => onChange(question.id, text)}
              placeholder={placeholderText(
                question,
                resolvedNumber,
                language,
              )}
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
            />
          ) : null}

          {question.type === 'boolean' ? (
            <View style={styles.boolRow}>
              <TouchableOpacity
                style={[
                  styles.boolBtn,
                  {borderColor: theme.border},
                  answers[question.id] === true && {
                    backgroundColor: theme.primary,
                  },
                ]}
                onPress={() => onChange(question.id, true)}>
                <Text
                  style={{
                    color:
                      answers[question.id] === true ? '#fff' : theme.text,
                    fontWeight: '600',
                  }}>
                  {resolvedYes}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.boolBtn,
                  {borderColor: theme.border},
                  answers[question.id] === false && {
                    backgroundColor: theme.primary,
                  },
                ]}
                onPress={() => onChange(question.id, false)}>
                <Text
                  style={{
                    color:
                      answers[question.id] === false ? '#fff' : theme.text,
                    fontWeight: '600',
                  }}>
                  {resolvedNo}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {question.type === 'select' && optionsOf(question, language).length > 0 ? (
            <Select
              options={optionsOf(question, language).map((option, optIdx) => ({
                value: question.options?.[optIdx] || option,
                label: option,
              }))}
              value={
                typeof answers[question.id] === 'string'
                  ? answers[question.id]
                  : ''
              }
              onChange={value => onChange(question.id, value)}
              placeholder={resolvedSelect}
            />
          ) : null}

          {question.type === 'multiselect' &&
          optionsOf(question, language).length > 0 ? (
            <MultiSelect
              options={optionsOf(question, language).map((option, optIdx) => ({
                value: question.options?.[optIdx] || option,
                label: option,
              }))}
              value={
                Array.isArray(answers[question.id])
                  ? answers[question.id]
                  : []
              }
              onChange={value => onChange(question.id, value)}
              placeholder={resolvedSelect}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: 4},
  title: {fontSize: 16, fontWeight: '700', marginBottom: 4},
  subtitle: {fontSize: 13, marginBottom: 12},
  question: {marginBottom: 14},
  questionText: {fontSize: 14, fontWeight: '600', marginBottom: 8},
  required: {color: '#E53E3E'},
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 44,
  },
  boolRow: {flexDirection: 'row', gap: 10},
  boolBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
});
