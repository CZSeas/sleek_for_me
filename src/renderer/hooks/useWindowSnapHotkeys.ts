import { useEffect } from "react";

const TEXT_FIELD_SELECTOR =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

export const isTextField = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(TEXT_FIELD_SELECTOR) !== null;

// Ctrl+Left / Ctrl+Right snap the window to that side of the screen. Ignored
// while typing in a text field, where the combo jumps by word.
export const useWindowSnapHotkeys = (
  send: (channel: string, ...args: unknown[]) => void,
): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.repeat) return;
      if (!event.ctrlKey || event.shiftKey || event.altKey || event.metaKey)
        return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (isTextField(event.target)) return;

      event.preventDefault();
      send("snapWindow", event.key === "ArrowLeft" ? "left" : "right");
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [send]);
};
