import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWindowSnapHotkeys } from "./useWindowSnapHotkeys";

const press = (init: KeyboardEventInit, target: EventTarget = document) => {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
};

describe("useWindowSnapHotkeys", () => {
  it("sends left for Ctrl+Left and right for Ctrl+Right", () => {
    const send = vi.fn();
    renderHook(() => useWindowSnapHotkeys(send));
    const left = press({ key: "ArrowLeft", ctrlKey: true });
    press({ key: "ArrowRight", ctrlKey: true });
    expect(send).toHaveBeenNthCalledWith(1, "snapWindow", "left");
    expect(send).toHaveBeenNthCalledWith(2, "snapWindow", "right");
    expect(left.defaultPrevented).toBe(true);
  });

  it("ignores arrows without Ctrl or with extra modifiers", () => {
    const send = vi.fn();
    renderHook(() => useWindowSnapHotkeys(send));
    press({ key: "ArrowLeft" });
    press({ key: "ArrowLeft", ctrlKey: true, shiftKey: true });
    press({ key: "ArrowLeft", ctrlKey: true, altKey: true });
    press({ key: "ArrowUp", ctrlKey: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("ignores key repeat", () => {
    const send = vi.fn();
    renderHook(() => useWindowSnapHotkeys(send));
    press({ key: "ArrowLeft", ctrlKey: true, repeat: true });
    expect(send).not.toHaveBeenCalled();
  });

  it.each(["input", "textarea"])(
    "keeps word-jump behavior inside a %s",
    (tag) => {
      const send = vi.fn();
      renderHook(() => useWindowSnapHotkeys(send));
      const el = document.createElement(tag);
      document.body.appendChild(el);
      const event = press({ key: "ArrowLeft", ctrlKey: true }, el);
      expect(send).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
      el.remove();
    },
  );

  it("removes the listener on unmount", () => {
    const send = vi.fn();
    const { unmount } = renderHook(() => useWindowSnapHotkeys(send));
    unmount();
    press({ key: "ArrowLeft", ctrlKey: true });
    expect(send).not.toHaveBeenCalled();
  });
});
