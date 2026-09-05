import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Snapshot of a service request for contextual Help. */
export type HelpRequestSnapshot = {
  requestId: string;
  serviceType?: string;
  locationLabel?: string;
  statusLabel?: string;
  phase:
    | 'finding'
    | 'waiting-accept'
    | 'accepted'
    | 'in-progress'
    | 'completed'
    | 'cancelled'
    | 'rejected';
  hasProvider: boolean;
  canEdit: boolean;
  canCancel: boolean;
  canCall: boolean;
};

type Ctx = {
  snapshot: HelpRequestSnapshot | null;
  setSnapshot: (value: HelpRequestSnapshot | null) => void;
  /** Recent requests on History for “which request?” picking. */
  candidates: HelpRequestSnapshot[];
  setCandidates: (value: HelpRequestSnapshot[]) => void;
  clearHelpRequest: () => void;
};

const HelpRequestContext = createContext<Ctx | null>(null);

export function HelpRequestProvider({children}: {children: ReactNode}) {
  const [snapshot, setSnapshot] = useState<HelpRequestSnapshot | null>(null);
  const [candidates, setCandidates] = useState<HelpRequestSnapshot[]>([]);

  const clearHelpRequest = useCallback(() => {
    setSnapshot(null);
    setCandidates([]);
  }, []);

  const value = useMemo(
    () => ({
      snapshot,
      setSnapshot,
      candidates,
      setCandidates,
      clearHelpRequest,
    }),
    [snapshot, candidates, clearHelpRequest],
  );

  return (
    <HelpRequestContext.Provider value={value}>
      {children}
    </HelpRequestContext.Provider>
  );
}

export function useHelpRequestSnapshot() {
  return useContext(HelpRequestContext)?.snapshot ?? null;
}

export function useSetHelpRequestSnapshot() {
  const ctx = useContext(HelpRequestContext);
  return ctx?.setSnapshot ?? (() => {});
}

export function useHelpRequestCandidates() {
  return useContext(HelpRequestContext)?.candidates ?? [];
}

export function useSetHelpRequestCandidates() {
  const ctx = useContext(HelpRequestContext);
  return ctx?.setCandidates ?? (() => {});
}

export function useClearHelpRequest() {
  const ctx = useContext(HelpRequestContext);
  return ctx?.clearHelpRequest ?? (() => {});
}
