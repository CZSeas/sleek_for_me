import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHourlyTick } from "./useHourlyTick";

const HOUR = 60 * 60 * 1000;

describe("useHourlyTick", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not schedule timers while disabled", () => {
    vi.useFakeTimers();
    renderHook(() => useHourlyTick(false));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("updates at the next hour boundary and hourly after", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 4, 12, 30, 0));
    const { result } = renderHook(() => useHourlyTick(true));
    const start = result.current;

    act(() => {
      vi.advanceTimersByTime(HOUR / 2 - 1);
    });
    expect(result.current).toBe(start);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current - start).toBe(HOUR / 2);

    act(() => {
      vi.advanceTimersByTime(HOUR);
    });
    expect(result.current - start).toBe(HOUR / 2 + HOUR);
  });

  it("realigns to the hour boundary when the window becomes visible", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 4, 12, 30, 0));
    const { result } = renderHook(() => useHourlyTick(true));

    // Simulate the machine sleeping for 3h 15m without timers firing
    act(() => {
      vi.setSystemTime(new Date(2026, 2, 4, 15, 45, 0));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe(new Date(2026, 2, 4, 15, 45, 0).getTime());

    // Next update is at 16:00, 15 minutes later, not at the old schedule
    act(() => {
      vi.advanceTimersByTime(15 * 60 * 1000 - 1);
    });
    expect(result.current).toBe(new Date(2026, 2, 4, 15, 45, 0).getTime());
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(new Date(2026, 2, 4, 16, 0, 0).getTime());
  });

  it("realigns when the window regains focus", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 4, 12, 30, 0));
    const { result } = renderHook(() => useHourlyTick(true));

    act(() => {
      vi.setSystemTime(new Date(2026, 2, 4, 15, 45, 0));
      window.dispatchEvent(new Event("focus"));
    });
    expect(result.current).toBe(new Date(2026, 2, 4, 15, 45, 0).getTime());

    act(() => {
      vi.advanceTimersByTime(15 * 60 * 1000);
    });
    expect(result.current).toBe(new Date(2026, 2, 4, 16, 0, 0).getTime());
  });

  it("does not stack timers when focus and visibility both fire", () => {
    vi.useFakeTimers();
    renderHook(() => useHourlyTick(true));
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
    });
    expect(vi.getTimerCount()).toBe(1);
  });

  it("removes the event listeners on unmount", () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useHourlyTick(true));
    unmount();
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("removes the visibility listener on unmount", () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useHourlyTick(true));
    unmount();
    document.dispatchEvent(new Event("visibilitychange"));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cleans up timers on unmount", () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useHourlyTick(true));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
