import { useState, useEffect, useCallback } from 'react';
import { auth, adminRoles } from '@/lib/api';
import type { MosqueAdminRole } from '@/types';

interface AdminStatus {
  isAdmin: boolean;
  loading: boolean;
  roles: MosqueAdminRole[];
  /** Mosques the user administers (convenience list of IDs) */
  mosqueIds: string[];
  refresh: () => Promise<void>;
}

export function useAdminStatus(): AdminStatus {
  const [roles, setRoles] = useState<MosqueAdminRole[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!auth.isLoggedIn) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await adminRoles.list();
      setRoles(data);
    } catch {
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    isAdmin: roles.length > 0,
    loading,
    roles,
    mosqueIds: roles.map((r) => r.mosque),
    refresh,
  };
}
