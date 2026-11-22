import { BrowserWindow, screen } from "electron";
import { SettingsStore } from "./Stores";

export type SnapSide = "left" | "right";

export function isSnapSide(value: unknown): value is SnapSide {
  return value === "left" || value === "right";
}

// Moves the window to the left or right edge of the display it is on and
// stretches it to the full work area height. The width is kept (clamped to
// the work area).
export function snapWindow(win: BrowserWindow, side: SnapSide): void {
  if (win.isFullScreen()) return;

  // A maximized window has no meaningful width, so use its restored size.
  const wasMaximized = win.isMaximized();
  const current = wasMaximized ? win.getNormalBounds() : win.getBounds();
  if (wasMaximized) win.unmaximize();

  const { workArea } = screen.getDisplayMatching(current);
  const width = Math.min(current.width, workArea.width);
  const bounds = {
    x: side === "left" ? workArea.x : workArea.x + workArea.width - width,
    y: workArea.y,
    width,
    height: workArea.height,
  };

  win.setBounds(bounds);

  // The resize and move handlers share one debounce timer, so one of the two
  // saves would be dropped. Persist everything explicitly instead.
  SettingsStore.set("windowDimensions", {
    width: bounds.width,
    height: bounds.height,
  });
  SettingsStore.set("windowPosition", { x: bounds.x, y: bounds.y });
  SettingsStore.set("windowMaximized", false);
}
