import { useEffect, useState } from "react";

const HOUR_MS = 60 * 60 * 1000;

// Returns the current time in ms, refreshed at the top of every hour.
// Does nothing (no timers) while disabled. When the window becomes visible
// again or the window regains focus (e.g. after the machine slept), the time is refreshed immediately and
// the timers are realigned to the next hour boundary.
export const useHourlyTick = (enabled: boolean): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;

    const clearTimers = (): void => {
      clearTimeout(timeout);
      clearInterval(interval);
      timeout = undefined;
      interval = undefined;
    };

    const schedule = (): void => {
      console.log(`scheduled`);
      clearTimers();
      setNow(Date.now());
      const untilNextHour = HOUR_MS - (Date.now() % HOUR_MS);
      timeout = setTimeout(() => {
        setNow(Date.now());
        interval = setInterval(() => setNow(Date.now()), HOUR_MS);
      }, untilNextHour);
    };

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "visible") schedule();
    };

    schedule();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    // Alt+tab and similar focus changes don't alter visibility
    window.addEventListener("focus", schedule);

    return () => {
      clearTimers();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", schedule);
    };
  }, [enabled]);

  return now;
};
