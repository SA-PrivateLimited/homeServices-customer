/**
 * Customer-facing Active Service status copy.
 * Explains what is happening to the request — not backend enums.
 */

import i18n from '../i18n';

export type ActiveUiPhase =
  | 'finding'
  | 'waiting-accept'
  | 'accepted'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export function resolveActivePhase(
  status: string,
  opts: {hasNearbyProviders?: boolean; hasNamedProvider?: boolean} = {},
): ActiveUiPhase {
  const s = (status || '').toLowerCase().trim();
  if (s === 'accepted' || s === 'confirmed' || s === 'assigned') return 'accepted';
  if (
    s === 'in-progress' ||
    s === 'in progress' ||
    s === 'inprogress' ||
    s === 'in_progress'
  ) {
    return 'in-progress';
  }
  if (s === 'completed' || s === 'done' || s === 'finished') return 'completed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'rejected' || s === 'declined') return 'rejected';

  // Pending: distinguish finding vs waiting for acceptance
  if (opts.hasNamedProvider || opts.hasNearbyProviders) return 'waiting-accept';
  return 'finding';
}

export function activePhaseIcon(phase: ActiveUiPhase): string {
  switch (phase) {
    case 'finding':
      return 'hourglass_empty';
    case 'waiting-accept':
      return 'schedule';
    case 'accepted':
      return 'check_circle';
    case 'in-progress':
      return 'engineering';
    case 'completed':
      return 'check_circle';
    case 'cancelled':
      return 'cancel';
    case 'rejected':
      return 'person_off';
    default:
      return 'hourglass_empty';
  }
}

export function activePhaseTitle(
  phase: ActiveUiPhase,
  opts: {serviceType?: string; providerName?: string} = {},
): string {
  const type = opts.serviceType?.trim() || i18n.t('common.service');
  const name = opts.providerName?.trim();
  switch (phase) {
    case 'finding':
      return i18n.t('active.status.finding', {type});
    case 'waiting-accept':
      return name
        ? i18n.t('active.status.waitingAcceptNamed', {name, type})
        : i18n.t('active.status.waitingAccept', {type});
    case 'accepted':
      return i18n.t('active.status.accepted', {type});
    case 'in-progress':
      return i18n.t('active.status.inProgress');
    case 'completed':
      return i18n.t('active.status.completed');
    case 'cancelled':
      return i18n.t('active.status.cancelled');
    case 'rejected':
      return name
        ? i18n.t('active.status.rejectedNamed', {name})
        : i18n.t('active.status.rejected', {type});
    default:
      return i18n.t('active.status.finding', {type});
  }
}

export function activePhaseSubtitle(
  phase: ActiveUiPhase,
  opts: {providerName?: string; brandName?: string; serviceType?: string} = {},
): string {
  const name = opts.providerName?.trim();
  const type = opts.serviceType?.trim() || i18n.t('common.service');
  switch (phase) {
    case 'finding':
      return i18n.t('active.sub.finding', {type});
    case 'waiting-accept':
      return name
        ? i18n.t('active.sub.waitingAcceptNamed', {name, type})
        : i18n.t('active.sub.waitingAccept', {type});
    case 'accepted':
      return name
        ? i18n.t('active.sub.accepted', {name, type})
        : i18n.t('active.sub.acceptedGeneric', {type});
    case 'in-progress':
      return name
        ? i18n.t('active.sub.inProgressNamed', {name})
        : i18n.t('active.sub.inProgress');
    case 'completed':
      return i18n.t('active.sub.completed', {
        brand: opts.brandName || 'Akansho',
      });
    case 'cancelled':
      return name
        ? i18n.t('active.sub.cancelledNamed', {name, type})
        : i18n.t('active.sub.cancelled', {type});
    case 'rejected':
      return name
        ? i18n.t('active.sub.rejectedNamed', {name, type})
        : i18n.t('active.sub.rejected', {type});
    default:
      return '';
  }
}
