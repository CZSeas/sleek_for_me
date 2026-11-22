import { beforeEach, describe, expect, it, vi } from "vitest";
import { snapWindow, isSnapSide } from "./WindowSnap";
import { SettingsStore } from "./Stores";

const workArea = { x: 100, y: 30, width: 1920, height: 1050 };

vi.mock("electron", () => ({
  screen: {
    getDisplayMatching: vi.fn(() => ({ workArea })),
  },
}));

vi.mock("./Stores", () => ({
  SettingsStore: { set: vi.fn() },
}));

const makeWindow = (
  bounds = { x: 500, y: 200, width: 800, height: 600 },
  { maximized = false, fullScreen = false } = {},
) =>
  ({
    isFullScreen: vi.fn(() => fullScreen),
    isMaximized: vi.fn(() => maximized),
    getBounds: vi.fn(() => bounds),
    getNormalBounds: vi.fn(() => bounds),
    unmaximize: vi.fn(),
    setBounds: vi.fn(),
  }) as unknown as Electron.BrowserWindow & {
    setBounds: ReturnType<typeof vi.fn>;
    unmaximize: ReturnType<typeof vi.fn>;
  };

describe("snapWindow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("snaps to the left edge, keeping width and filling the work area height", () => {
    const win = makeWindow();
    snapWindow(win, "left");
    expect(win.setBounds).toHaveBeenCalledWith({
      x: 100,
      y: 30,
      width: 800,
      height: 1050,
    });
  });

  it("snaps to the right edge, keeping width", () => {
    const win = makeWindow();
    snapWindow(win, "right");
    expect(win.setBounds).toHaveBeenCalledWith({
      x: 100 + 1920 - 800,
      y: 30,
      width: 800,
      height: 1050,
    });
  });

  it("clamps a window wider than the work area", () => {
    const win = makeWindow({ x: 0, y: 0, width: 5000, height: 600 });
    snapWindow(win, "right");
    expect(win.setBounds).toHaveBeenCalledWith({
      x: 100,
      y: 30,
      width: 1920,
      height: 1050,
    });
  });

  it("unmaximizes first and uses the restored width", () => {
    const win = makeWindow(undefined, { maximized: true });
    snapWindow(win, "left");
    expect(win.unmaximize).toHaveBeenCalledOnce();
    expect(win.setBounds).toHaveBeenCalledWith(
      expect.objectContaining({ width: 800 }),
    );
  });

  it("does nothing for a full screen window", () => {
    const win = makeWindow(undefined, { fullScreen: true });
    snapWindow(win, "left");
    expect(win.setBounds).not.toHaveBeenCalled();
  });

  it("persists size, position and the unmaximized state", () => {
    snapWindow(makeWindow(), "left");
    expect(SettingsStore.set).toHaveBeenCalledWith("windowDimensions", {
      width: 800,
      height: 1050,
    });
    expect(SettingsStore.set).toHaveBeenCalledWith("windowPosition", {
      x: 100,
      y: 30,
    });
    expect(SettingsStore.set).toHaveBeenCalledWith("windowMaximized", false);
  });
});

describe("isSnapSide", () => {
  it("accepts only left and right", () => {
    expect(isSnapSide("left")).toBe(true);
    expect(isSnapSide("right")).toBe(true);
    expect(isSnapSide("up")).toBe(false);
    expect(isSnapSide(undefined)).toBe(false);
  });
});
