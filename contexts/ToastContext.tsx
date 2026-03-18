import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';

// ── Types ───────────────────────────────────────────────────────────

export type ToastType =
  | 'prayer'
  | 'athan'
  | 'announcement'
  | 'urgent'
  | 'event'
  | 'donation'
  | 'success';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  subtitle?: string;
  /** Auto-dismiss in ms. 0 = sticky (must swipe). Defaults per type. */
  duration?: number;
  /** Called when user taps the toast. */
  onPress?: () => void;
  haptic?: 'light' | 'medium' | 'warning' | 'none';
}

interface ToastContextValue {
  /** Push a toast onto the queue. Returns its id. */
  showToast: (toast: Omit<ToastMessage, 'id'>) => string;
  /** Dismiss the currently-visible toast. */
  dismissToast: () => void;
  /** The toast that should be rendered right now (head of queue). */
  currentToast: ToastMessage | null;
}

// ── Defaults ────────────────────────────────────────────────────────

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  prayer: 4000,
  athan: 6000,
  announcement: 5000,
  urgent: 0,        // sticky
  event: 5000,
  donation: 4000,
  success: 3000,
};

const DEFAULT_HAPTICS: Record<ToastType, ToastMessage['haptic']> = {
  prayer: 'light',
  athan: 'medium',
  announcement: 'light',
  urgent: 'warning',
  event: 'light',
  donation: 'light',
  success: 'light',
};

// ── Reducer ─────────────────────────────────────────────────────────

const MAX_QUEUE = 3;

type Action =
  | { type: 'ADD'; toast: ToastMessage }
  | { type: 'REMOVE' }
  | { type: 'CLEAR' };

function reducer(queue: ToastMessage[], action: Action): ToastMessage[] {
  switch (action.type) {
    case 'ADD': {
      // Drop oldest if at capacity (stale notifications aren't useful)
      const next = [...queue, action.toast];
      return next.length > MAX_QUEUE ? next.slice(next.length - MAX_QUEUE) : next;
    }
    case 'REMOVE':
      return queue.slice(1);
    case 'CLEAR':
      return [];
    default:
      return queue;
  }
}

// ── Context ─────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, dispatch] = useReducer(reducer, []);

  const showToast = useCallback((input: Omit<ToastMessage, 'id'>): string => {
    const id = `toast-${++idCounter}-${Date.now()}`;
    const toast: ToastMessage = {
      ...input,
      id,
      duration: input.duration ?? DEFAULT_DURATIONS[input.type],
      haptic: input.haptic ?? DEFAULT_HAPTICS[input.type],
    };
    dispatch({ type: 'ADD', toast });
    return id;
  }, []);

  const dismissToast = useCallback(() => {
    dispatch({ type: 'REMOVE' });
  }, []);

  const currentToast = queue.length > 0 ? queue[0] : null;

  const value = useMemo<ToastContextValue>(
    () => ({ showToast, dismissToast, currentToast }),
    [showToast, dismissToast, currentToast],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
