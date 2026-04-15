import { renderHook, waitFor } from '@testing-library/react-native';

import { useAdminStatus } from '@/hooks/useAdminStatus';
import { adminRoles } from '@/lib/api';

let mockIsLoggedIn = false;

jest.mock('@/lib/api', () => ({
  auth: {
    get isLoggedIn() {
      return mockIsLoggedIn;
    },
  },
  adminRoles: {
    list: jest.fn(),
  },
}));

const mockAdminRolesList = adminRoles.list as jest.Mock;

describe('useAdminStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLoggedIn = false;
    mockAdminRolesList.mockResolvedValue([]);
  });

  it('returns isAdmin=false when not logged in', async () => {
    mockIsLoggedIn = false;

    const { result } = renderHook(() => useAdminStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.roles).toEqual([]);
    expect(mockAdminRolesList).not.toHaveBeenCalled();
  });

  it('returns isAdmin=true with roles when logged in', async () => {
    const mockRoles = [
      { id: '1', mosque: 'mosque-1', role: 'admin' },
      { id: '2', mosque: 'mosque-2', role: 'super_admin' },
    ];
    mockIsLoggedIn = true;
    mockAdminRolesList.mockResolvedValue(mockRoles);

    const { result } = renderHook(() => useAdminStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.roles).toEqual(mockRoles);
    expect(mockAdminRolesList).toHaveBeenCalled();
  });

  it('derives mosqueIds from roles', async () => {
    const mockRoles = [
      { id: '1', mosque: 'mosque-1', role: 'admin' },
      { id: '2', mosque: 'mosque-2', role: 'super_admin' },
      { id: '3', mosque: 'mosque-3', role: 'admin' },
    ];
    mockIsLoggedIn = true;
    mockAdminRolesList.mockResolvedValue(mockRoles);

    const { result } = renderHook(() => useAdminStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.mosqueIds).toEqual(['mosque-1', 'mosque-2', 'mosque-3']);
  });
});
