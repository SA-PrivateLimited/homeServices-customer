import type {ServiceRequest} from '../../services/api/serviceRequestsApi';
import type {HelpRequestSnapshot} from './helpRequestContext';

function locationFromRequest(req: ServiceRequest): string | undefined {
  const addr = req.customerAddress as
    | {district?: string; city?: string; state?: string}
    | undefined;
  if (!addr) return undefined;
  return addr.district || addr.city || addr.state || undefined;
}

function phaseFromStatus(
  status: string,
  hasProvider: boolean,
): HelpRequestSnapshot['phase'] {
  const s = (status || '').toLowerCase().trim();
  if (s === 'accepted' || s === 'confirmed' || s === 'assigned') return 'accepted';
  if (s.includes('progress')) return 'in-progress';
  if (s === 'completed' || s === 'done') return 'completed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'rejected' || s === 'declined') return 'rejected';
  return hasProvider ? 'waiting-accept' : 'finding';
}

export function toHelpRequestSnapshot(
  req: ServiceRequest,
  requestId?: string,
): HelpRequestSnapshot | null {
  const id = String(requestId || req._id || req.id || '').trim();
  if (!id) return null;
  const status = String(req.status || '');
  const hasProvider = Boolean(req.providerName || req.providerId);
  const serviceType = req.serviceType || undefined;
  const phase = phaseFromStatus(status, hasProvider);

  return {
    requestId: id,
    serviceType,
    locationLabel: locationFromRequest(req),
    statusLabel: status,
    phase,
    hasProvider,
    canEdit: status === 'pending',
    canCancel: status === 'pending' || status === 'accepted',
    canCall:
      (status === 'accepted' || status === 'in-progress') &&
      Boolean(req.providerPhone),
  };
}

export function pickHelpCandidates(
  requests: ServiceRequest[],
  limit = 6,
): HelpRequestSnapshot[] {
  const rank = (phase: HelpRequestSnapshot['phase']) => {
    switch (phase) {
      case 'finding':
      case 'waiting-accept':
        return 0;
      case 'accepted':
      case 'in-progress':
        return 1;
      case 'completed':
        return 2;
      default:
        return 3;
    }
  };

  const mapped = requests
    .map(r => toHelpRequestSnapshot(r))
    .filter((s): s is HelpRequestSnapshot => Boolean(s));

  mapped.sort((a, b) => rank(a.phase) - rank(b.phase));
  return mapped.slice(0, limit);
}
