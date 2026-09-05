import type {
  QuestionnaireQuestion,
  ServiceCategory,
} from '../services/api/serviceCategoriesApi';
import i18n from '../i18n';

/** Synthetic id when a category has no questionnaire — not sent to API. */
export const FALLBACK_PROBLEM_ID = '__akanso_problem__';

/** Stable answer value — matches common admin questionnaire "Other". */
export const MORE_INFO_OPTION_VALUE = 'Other';

export function isMoreInfoOption(value: unknown): boolean {
  const text = String(
    Array.isArray(value) ? value.join(' ') : (value ?? ''),
  ).toLowerCase();
  return (
    /\bother\b|अन्य|more info|tell us more|describe below|और बताए|विवरण|जानकारी/.test(
      text,
    )
  );
}

/** @deprecated use isMoreInfoOption */
export const isOtherOption = isMoreInfoOption;

function fallbackProblemQuestion(): QuestionnaireQuestion {
  return {
    id: FALLBACK_PROBLEM_ID,
    question: "What's the problem?",
    questionHi: 'समस्या क्या है?',
    type: 'select',
    required: true,
    options: [
      'General service needed',
      'Repair / fix needed',
      'Installation / setup',
      'Inspection / visit',
      MORE_INFO_OPTION_VALUE,
    ],
    optionsHi: [
      i18n.t('request.problemOption.general'),
      i18n.t('request.problemOption.repair'),
      i18n.t('request.problemOption.install'),
      i18n.t('request.problemOption.inspection'),
      i18n.t('request.problemOption.moreInfo'),
    ],
  };
}

/** Append "More info" when admin options omit it — keeps API option values stable. */
export function withMoreInfoOption(
  q: QuestionnaireQuestion,
): QuestionnaireQuestion {
  const options = [...(q.options || [])];
  const optionsHi = q.optionsHi ? [...q.optionsHi] : [];
  const hasMore = options.some((o) => isMoreInfoOption(o));
  if (!hasMore) {
    options.push(MORE_INFO_OPTION_VALUE);
    optionsHi.push(i18n.t('request.problemOption.moreInfo'));
  }
  while (optionsHi.length < options.length) {
    optionsHi.push(options[optionsHi.length]);
  }
  return {
    ...q,
    type: 'select',
    options,
    optionsHi,
    required: q.required !== false,
  };
}

/** Admin question → select when it carries options (even if type was text). */
export function asSelectQuestion(
  q: QuestionnaireQuestion,
): QuestionnaireQuestion | null {
  if ((q.options?.length ?? 0) > 0) {
    return withMoreInfoOption({...q, type: 'select'});
  }
  if (q.type === 'select') {
    return withMoreInfoOption({...q, options: q.options || []});
  }
  return null;
}

export type ProblemFlow = {
  primary: QuestionnaireQuestion | null;
  followUps: QuestionnaireQuestion[];
};

/** One primary dropdown + non-duplicated follow-ups from admin questionnaire. */
export function resolveProblemFlow(
  category: ServiceCategory | null,
): ProblemFlow {
  const qs = category?.questionnaire || [];
  if (!qs.length) {
    return {primary: fallbackProblemQuestion(), followUps: []};
  }

  let primaryIdx = qs.findIndex(
    (q) => q.type === 'select' && (q.options?.length ?? 0) > 0,
  );
  if (primaryIdx < 0) {
    primaryIdx = qs.findIndex((q) => (q.options?.length ?? 0) > 0);
  }
  if (primaryIdx < 0) {
    primaryIdx = qs.findIndex((q) => q.type === 'select');
  }
  if (primaryIdx < 0) {
    primaryIdx = 0;
  }

  const raw = qs[primaryIdx];
  const primary =
    asSelectQuestion(raw) ??
    withMoreInfoOption({
      ...raw,
      type: 'select',
      options: raw.options?.length
        ? raw.options
        : fallbackProblemQuestion().options!,
      optionsHi: raw.optionsHi?.length
        ? raw.optionsHi
        : fallbackProblemQuestion().optionsHi,
    });

  const followUps = qs
    .filter((_, i) => i !== primaryIdx)
    .map((q) => {
      if (q.type === 'boolean') return q;
      if (q.type === 'multiselect' && (q.options?.length ?? 0) > 0) return q;
      const select = asSelectQuestion(q);
      if (select) return select;
      return null;
    })
    .filter((q): q is QuestionnaireQuestion => q !== null);

  return {primary, followUps};
}

/** @deprecated use resolveProblemFlow */
export function primaryProblemQuestion(
  category: ServiceCategory | null,
): QuestionnaireQuestion | null {
  return resolveProblemFlow(category).primary;
}

/** @deprecated use resolveProblemFlow */
export function followUpQuestions(
  category: ServiceCategory | null,
  primary: QuestionnaireQuestion | null,
): QuestionnaireQuestion[] {
  if (!primary) return [];
  return resolveProblemFlow(category).followUps;
}

export function usesFallbackPrimary(
  primary: QuestionnaireQuestion | null,
): boolean {
  return primary?.id === FALLBACK_PROBLEM_ID;
}

/** Map saved request.problem into the primary dropdown when editing. */
export function hydrateProblemAnswersFromRequest(
  problem: string,
  answers: Record<string, string | boolean | string[]>,
  category: ServiceCategory | null,
): Record<string, string | boolean | string[]> {
  const trimmed = problem.trim();
  if (!trimmed) return answers;

  const {primary} = resolveProblemFlow(category);
  if (!primary) return answers;

  if (String(answers[primary.id] ?? '').trim()) return answers;

  const options = primary.options || [];
  const optionsHi = primary.optionsHi || [];
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const normalizedProblem = norm(trimmed);

  const exactIdx = options.findIndex(
    (o, i) =>
      norm(o) === normalizedProblem ||
      (optionsHi[i] && norm(optionsHi[i]) === normalizedProblem),
  );
  if (exactIdx >= 0) {
    return {...answers, [primary.id]: options[exactIdx]};
  }

  const partialIdx = options.findIndex((o, i) => {
    if (isMoreInfoOption(o)) return false;
    const n = norm(o);
    const nh = optionsHi[i] ? norm(optionsHi[i]) : '';
    return (
      normalizedProblem.includes(n) ||
      n.includes(normalizedProblem) ||
      (nh &&
        (normalizedProblem.includes(nh) || nh.includes(normalizedProblem)))
    );
  });
  if (partialIdx >= 0) {
    return {...answers, [primary.id]: options[partialIdx]};
  }

  const moreOption = options.find((o) => isMoreInfoOption(o));
  if (moreOption) {
    return {...answers, [primary.id]: moreOption};
  }

  if (usesFallbackPrimary(primary)) {
    return {...answers, [primary.id]: MORE_INFO_OPTION_VALUE};
  }

  return answers;
}

function firstRawAnswer(answers?: Record<string, unknown>): string {
  if (!answers) return '';
  for (const value of Object.values(answers)) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value) && value.length) {
      return value.map(String).filter(Boolean).join(', ');
    }
  }
  return '';
}

/** Display problem from free text or questionnaire selection. */
export function resolveServiceRequestProblemText(
  input: {
    problem?: string;
    questionnaireAnswers?: Record<string, unknown>;
  },
  category: ServiceCategory | null,
  lang: 'hi' | 'en' = i18n.language?.startsWith('hi') ? 'hi' : 'en',
): string {
  const direct = String(input.problem || '').trim();
  if (direct) return direct;

  const answers = input.questionnaireAnswers;
  if (!answers || !Object.keys(answers).length) return '';

  const {primary} = resolveProblemFlow(category);
  if (primary) {
    const selected = answers[primary.id];
    if (selected != null && String(selected).trim()) {
      const value = String(selected).trim();
      if (!isMoreInfoOption(value)) {
        const idx = (primary.options || []).indexOf(value);
        if (idx >= 0) {
          return lang === 'hi' && primary.optionsHi?.[idx]
            ? primary.optionsHi[idx]
            : value;
        }
        return value;
      }
    }
  }

  return firstRawAnswer(answers);
}

export function buildProblemPayload(opts: {
  primary: QuestionnaireQuestion | null;
  answers: Record<string, string | boolean | string[]>;
  freeText: string;
}): {
  problem?: string;
  questionnaireAnswers?: Record<string, string | boolean | string[]>;
} {
  const {primary, answers, freeText} = opts;
  const trimmed = freeText.trim();
  const nextAnswers = {...answers};

  if (primary && usesFallbackPrimary(primary)) {
    delete nextAnswers[FALLBACK_PROBLEM_ID];
    const selected = String(answers[primary.id] ?? '').trim();
    let problem: string | undefined;
    if (selected) {
      problem = isMoreInfoOption(selected) ? trimmed || undefined : selected;
    }
    return {
      problem,
      ...(Object.keys(nextAnswers).length
        ? {questionnaireAnswers: nextAnswers}
        : {}),
    };
  }

  if (primary && isMoreInfoOption(answers[primary.id]) && trimmed) {
    return {
      problem: trimmed,
      ...(Object.keys(nextAnswers).length
        ? {questionnaireAnswers: nextAnswers}
        : {}),
    };
  }

  if (primary) {
    const selected = String(answers[primary.id] ?? '').trim();
    if (selected && !isMoreInfoOption(selected)) {
      return {
        problem: selected,
        ...(Object.keys(nextAnswers).length
          ? {questionnaireAnswers: nextAnswers}
          : {}),
      };
    }
  }

  return {
    ...(trimmed ? {problem: trimmed} : {}),
    ...(Object.keys(nextAnswers).length
      ? {questionnaireAnswers: nextAnswers}
      : {}),
  };
}
