import type {HelpRequestSnapshot} from './helpRequestContext';
import type {HelpSurface} from './helpSurface';

export type HelpGroupId =
  | 'serviceRequest'
  | 'signIn'
  | 'findProvider'
  | 'account'
  | 'somethingElse';

export type HelpSubTopic = {
  id: string;
  titleKey: string;
  tipsKey: string;
  action?: 'cancel-request' | 'edit-request' | 'open-browse';
};

export type HelpGroup = {
  id: HelpGroupId;
  icon: string;
  titleKey: string;
  subtitleKey: string;
  /** Direct tips when there are no sub-topics (legacy single-level topics). */
  tipsKey?: string;
  subtopics?: HelpSubTopic[];
};

const SIGN_IN_SUB: HelpSubTopic[] = [
  {
    id: 'otp-not-received',
    titleKey: 'help.sub.otpNotReceived',
    tipsKey: 'help.sub.otpNotReceivedTips',
  },
  {
    id: 'otp-failed',
    titleKey: 'help.sub.otpFailed',
    tipsKey: 'help.sub.otpFailedTips',
  },
  {
    id: 'cant-set-pin',
    titleKey: 'help.sub.cantSetPin',
    tipsKey: 'help.topic.pinTips',
  },
  {
    id: 'cant-sign-in-pin',
    titleKey: 'help.sub.cantSignInPin',
    tipsKey: 'help.sub.cantSignInPinTips',
  },
];

const ACCOUNT_SUB: HelpSubTopic[] = [
  {
    id: 'profile',
    titleKey: 'help.sub.profileProblem',
    tipsKey: 'help.sub.profileProblemTips',
  },
  {
    id: 'address',
    titleKey: 'help.sub.addressProblem',
    tipsKey: 'help.sub.addressProblemTips',
  },
  {
    id: 'pin-account',
    titleKey: 'help.sub.pinProblem',
    tipsKey: 'help.topic.pinTips',
  },
  {
    id: 'settings',
    titleKey: 'help.sub.accountSettings',
    tipsKey: 'help.sub.accountSettingsTips',
  },
];

function serviceRequestSubtopics(
  surface: HelpSurface,
  request: HelpRequestSnapshot | null,
): HelpSubTopic[] {
  if (surface === 'active-with-provider') {
    const items: HelpSubTopic[] = [
      {
        id: 'provider-not-arrived',
        titleKey: 'help.sub.providerNotArrived',
        tipsKey: 'help.sub.providerNotArrivedTips',
      },
      {
        id: 'cant-contact',
        titleKey: 'help.sub.cantContactProvider',
        tipsKey: 'help.sub.cantContactProviderTips',
      },
      {
        id: 'service-problem',
        titleKey: 'help.sub.problemWithService',
        tipsKey: 'help.sub.problemWithServiceTips',
      },
    ];
    if (request?.canCancel) {
      items.push({
        id: 'cancel',
        titleKey: 'help.sub.cancelRequest',
        tipsKey: 'help.sub.cancelRequestTips',
        action: 'cancel-request',
      });
    }
    return items;
  }

  if (
    surface === 'active-pending' ||
    surface === 'active-other' ||
    surface === 'history' ||
    surface === 'request'
  ) {
    const items: HelpSubTopic[] = [
      {
        id: 'provider-not-accepted',
        titleKey: 'help.sub.providerNotAccepted',
        tipsKey: 'help.sub.providerNotAcceptedTips',
      },
      {
        id: 'provider-not-responding',
        titleKey: 'help.sub.providerNotResponding',
        tipsKey: 'help.sub.providerNotRespondingTips',
      },
      {
        id: 'wrong-details',
        titleKey: 'help.sub.wrongDetails',
        tipsKey: 'help.sub.wrongDetailsTips',
        action: request?.canEdit ? 'edit-request' : undefined,
      },
    ];
    if (request?.canCancel) {
      items.push({
        id: 'cancel',
        titleKey: 'help.sub.cancelRequest',
        tipsKey: 'help.sub.cancelRequestTips',
        action: 'cancel-request',
      });
    }
    if (surface === 'history') {
      items.unshift({
        id: 'status-problem',
        titleKey: 'help.sub.statusProblem',
        tipsKey: 'help.sub.statusProblemTips',
      });
    }
    return items;
  }

  return [];
}

const FIND_PROVIDER_SUB: HelpSubTopic[] = [
  {
    id: 'cant-find-service',
    titleKey: 'help.sub.cantFindService',
    tipsKey: 'help.sub.cantFindServiceTips',
  },
  {
    id: 'no-provider',
    titleKey: 'help.sub.noProviderAvailable',
    tipsKey: 'help.sub.noProviderAvailableTips',
  },
  {
    id: 'provider-info',
    titleKey: 'help.sub.providerInfoProblem',
    tipsKey: 'help.sub.providerInfoProblemTips',
  },
];

export function buildHelpGroups(
  surface: HelpSurface,
  request: HelpRequestSnapshot | null,
): HelpGroup[] {
  const contextual: HelpGroup[] = [];
  const general: HelpGroup[] = [];

  switch (surface) {
    case 'login':
      contextual.push({
        id: 'signIn',
        icon: 'lock',
        titleKey: 'help.group.signInTitle',
        subtitleKey: 'help.group.signInSubtitle',
        subtopics: SIGN_IN_SUB,
      });
      break;
    case 'active-pending':
    case 'active-with-provider':
    case 'active-other':
    case 'history':
    case 'request':
      contextual.push({
        id: 'serviceRequest',
        icon: 'handyman',
        titleKey: 'help.group.serviceRequestTitle',
        subtitleKey: 'help.group.serviceRequestSubtitle',
        subtopics: serviceRequestSubtopics(surface, request),
      });
      break;
    case 'browse':
      contextual.push({
        id: 'findProvider',
        icon: 'search',
        titleKey: 'help.group.findProviderTitle',
        subtitleKey: 'help.group.findProviderSubtitle',
        subtopics: FIND_PROVIDER_SUB,
      });
      break;
    case 'settings':
      contextual.push({
        id: 'account',
        icon: 'person',
        titleKey: 'help.group.accountTitle',
        subtitleKey: 'help.group.accountSubtitle',
        subtopics: ACCOUNT_SUB,
      });
      break;
    default:
      contextual.push({
        id: 'serviceRequest',
        icon: 'handyman',
        titleKey: 'help.group.serviceRequestTitle',
        subtitleKey: 'help.group.serviceRequestSubtitle',
        subtopics: serviceRequestSubtopics('history', request),
      });
      break;
  }

  if (surface !== 'login') {
    general.push({
      id: 'signIn',
      icon: 'lock',
      titleKey: 'help.group.loginOtpTitle',
      subtitleKey: 'help.group.loginOtpSubtitle',
      subtopics: SIGN_IN_SUB,
    });
  }

  if (surface !== 'settings') {
    general.push({
      id: 'account',
      icon: 'person',
      titleKey: 'help.group.accountTitle',
      subtitleKey: 'help.group.accountSubtitle',
      subtopics: ACCOUNT_SUB,
    });
  }

  general.push({
    id: 'somethingElse',
    icon: 'help',
    titleKey: 'help.group.somethingElseTitle',
    subtitleKey: 'help.group.somethingElseSubtitle',
    tipsKey: 'help.group.somethingElseTips',
  });

  return [...contextual, ...general];
}

export function contextualGroupLead(
  surface: HelpSurface,
  request: HelpRequestSnapshot | null,
): {titleKey: string; subtitleKey?: string; meta?: string} | null {
  if (!request) return null;
  if (!(surface.startsWith('active-') || surface === 'history')) return null;
  return {
    titleKey: 'help.context.requestTitle',
    subtitleKey: request.statusLabel,
    meta: [request.serviceType, request.locationLabel].filter(Boolean).join(' · '),
  };
}
