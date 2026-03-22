import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/lib/api', () => ({
  events: {
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

jest.mock('date-fns', () => ({
  format: jest.fn().mockReturnValue('2026-03-22'),
}));

import { useEvents } from '@/hooks/useEvents';
import { events as eventsApi } from '@/lib/api';
import { getCachedData, setCachedData } from '@/lib/storage';
import { Sentry } from '@/lib/sentry';

const mockEventsList = eventsApi.list as jest.Mock;
const mockGetCachedData = getCachedData as jest.Mock;
const mockSetCachedData = setCachedData as jest.Mock;
const mockCaptureException = Sentry.captureException as jest.Mock;

describe('useEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCachedData.mockResolvedValue(null);
    mockSetCachedData.mockResolvedValue(undefined);
    mockEventsList.mockResolvedValue({ items: [] });
  });

  it('loads events from API successfully', async () => {
    const mockEvents = [
      { id: '1', title: 'Friday Khutbah', category: 'lecture' },
      { id: '2', title: 'Quran Circle', category: 'quran_circle' },
    ];
    mockEventsList.mockResolvedValue({ items: mockEvents });

    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toEqual(mockEvents);
    expect(result.current.error).toBeNull();
    expect(mockSetCachedData).toHaveBeenCalled();
  });

  it('serves cached data when API fails', async () => {
    const cachedEvents = [
      { id: '1', title: 'Cached Event', category: 'lesson' },
    ];
    mockEventsList.mockRejectedValue(new Error('Network error'));
    mockGetCachedData.mockResolvedValue(cachedEvents);

    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.events).toEqual(cachedEvents);
    expect(mockCaptureException).toHaveBeenCalled();
  });

  it('sets error when API fails and no cache is available', async () => {
    mockEventsList.mockRejectedValue(new Error('Network error'));
    mockGetCachedData.mockResolvedValue(null);

    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(mockCaptureException).toHaveBeenCalled();
  });
});
