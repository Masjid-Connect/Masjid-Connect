import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/lib/api', () => ({
  announcements: {
    list: jest.fn(),
  },
}));

jest.mock('@/lib/storage', () => ({
  getCachedData: jest.fn(),
  setCachedData: jest.fn(),
}));

jest.mock('@/lib/sentry', () => ({
  Sentry: {
    captureException: jest.fn(),
  },
}));

jest.mock('@/constants/mosque', () => ({
  getMosqueId: jest.fn().mockResolvedValue('mosque-1'),
}));

import { useAnnouncements } from '@/hooks/useAnnouncements';
import { announcements as announcementsApi } from '@/lib/api';
import { getCachedData, setCachedData } from '@/lib/storage';
import { Sentry } from '@/lib/sentry';

const mockList = announcementsApi.list as jest.Mock;
const mockGetCachedData = getCachedData as jest.Mock;
const mockSetCachedData = setCachedData as jest.Mock;
const mockCaptureException = Sentry.captureException as jest.Mock;

describe('useAnnouncements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCachedData.mockResolvedValue(null);
    mockSetCachedData.mockResolvedValue(undefined);
    mockList.mockResolvedValue({ items: [] });
  });

  it('loads announcements from API successfully', async () => {
    const mockAnnouncements = [
      { id: '1', title: 'Eid Prayer Update', priority: 'normal' },
      { id: '2', title: 'Janazah Notice', priority: 'urgent' },
    ];
    mockList.mockResolvedValue({ items: mockAnnouncements });

    const { result } = renderHook(() => useAnnouncements());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.announcements).toEqual(mockAnnouncements);
    expect(result.current.error).toBeNull();
    expect(mockSetCachedData).toHaveBeenCalled();
  });

  it('serves cached data when API fails', async () => {
    const cachedAnnouncements = [
      { id: '1', title: 'Cached Announcement', priority: 'normal' },
    ];
    mockList.mockRejectedValue(new Error('Network error'));
    mockGetCachedData.mockResolvedValue(cachedAnnouncements);

    const { result } = renderHook(() => useAnnouncements());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.announcements).toEqual(cachedAnnouncements);
    expect(mockCaptureException).toHaveBeenCalled();
  });
});
