import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import DueTimeInline from "./DueTimeInline";
import { SettingStore, TodoObject } from "@sleek-types";

const { ipcRenderer } = window.api;

const settings = { language: "en", weekStart: 1 } as unknown as SettingStore;
const makeTodo = (overrides: Partial<TodoObject> = {}): TodoObject =>
  ({
    lineNumber: 3,
    string: "Call Sam due:2026-11-23",
    due: "2026-11-23",
    dueTime: null,
    ...overrides,
  }) as TodoObject;

const renderChip = (todo: TodoObject, placeholder = false) =>
  render(
    <ul>
      <li>
        <span className="filter" data-todotxt-attribute="due_time">
          <DueTimeInline
            todoObject={todo}
            settings={settings}
            placeholder={placeholder}
          />
        </span>
      </li>
    </ul>,
  );

const openPicker = async (todo: TodoObject) => {
  renderChip(todo, !todo.dueTime);
  fireEvent.click(screen.getByTestId("datagrid-picker-time-due"));
  await waitFor(() =>
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0),
  );
};

describe("DueTimeInline", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("chip", () => {
    it("is a separate due_time chip showing the time", () => {
      renderChip(makeTodo({ dueTime: "14:30" }));
      const chip = screen.getByTestId("datagrid-picker-time-due");
      expect(chip).toHaveTextContent(/^time/);
      expect(chip).toHaveTextContent("14:30");
    });

    it("is a faint '+ time' chip when no time is set", () => {
      renderChip(makeTodo(), true);
      const chip = screen.getByTestId("datagrid-picker-time-due");
      expect(chip).toHaveTextContent("+ time");
      expect(chip.closest(".due-time-placeholder")).not.toBeNull();
    });

    it("does not render the placeholder class for a real time", () => {
      renderChip(makeTodo({ dueTime: "14:30" }));
      expect(document.querySelector(".due-time-placeholder")).toBeNull();
    });
  });

  describe("picking a time", () => {
    it("keeps both the hour and the minute that were clicked", async () => {
      await openPicker(makeTodo());
      fireEvent.click(screen.getByRole("option", { name: "9 hours" }));
      fireEvent.click(screen.getByRole("option", { name: "30 minutes" }));
      fireEvent.click(screen.getByRole("button", { name: "OK" }));
      await waitFor(() =>
        expect(ipcRenderer.send).toHaveBeenCalledWith(
          "updateTodoObject",
          3,
          "Call Sam due:2026-11-23",
          "due_time",
          "09:30",
          true,
        ),
      );
      expect(ipcRenderer.send).toHaveBeenCalledTimes(1);
    });

    it("changes an existing time", async () => {
      await openPicker(makeTodo({ dueTime: "14:30" }));
      fireEvent.click(screen.getByRole("option", { name: "9 hours" }));
      fireEvent.click(screen.getByRole("button", { name: "OK" }));
      await waitFor(() =>
        expect(ipcRenderer.send).toHaveBeenCalledWith(
          "updateTodoObject",
          3,
          expect.any(String),
          "due_time",
          "09:30",
          true,
        ),
      );
    });

    it("clears the time exactly once", async () => {
      await openPicker(makeTodo({ dueTime: "14:30" }));
      fireEvent.click(screen.getByRole("button", { name: "Clear" }));
      await waitFor(() =>
        expect(ipcRenderer.send).toHaveBeenCalledWith(
          "updateTodoObject",
          3,
          expect.any(String),
          "due_time",
          null,
          true,
        ),
      );
      expect(ipcRenderer.send).toHaveBeenCalledTimes(1);
    });

    it("commits a picked time when the picker is dismissed", async () => {
      await openPicker(makeTodo({ dueTime: "14:30" }));
      fireEvent.click(screen.getByRole("option", { name: "9 hours" }));
      fireEvent.keyDown(document.activeElement ?? document.body, {
        key: "Escape",
      });
      await waitFor(() =>
        expect(ipcRenderer.send).toHaveBeenCalledWith(
          "updateTodoObject",
          3,
          expect.any(String),
          "due_time",
          "09:30",
          true,
        ),
      );
    });

    it("renders the markup that DatePicker.scss centers and compacts", async () => {
      // The popup is a portal, so its look comes from global selectors in
      // Dialog/DatePicker.scss; fail here if MUI renames these classes.
      await openPicker(makeTodo());
      const layout = document.querySelector(".MuiPickersLayout-root")!;
      expect(layout).not.toBeNull();
      expect(
        layout.querySelector(".MuiMultiSectionDigitalClock-root"),
      ).not.toBeNull();
      expect(
        layout.querySelectorAll(".MuiMultiSectionDigitalClockSection-item")
          .length,
      ).toBeGreaterThan(0);
    });

    it("renders inside containers the row ignores clicks from", async () => {
      // Row.preventDialog skips clicks inside these, otherwise picking a time
      // would also open the edit dialog.
      await openPicker(makeTodo());
      const option = screen.getByRole("option", { name: "9 hours" });
      expect(
        option.closest(".MuiPopper-root") ||
          option.closest(".MuiPickersLayout-root"),
      ).not.toBeNull();
    });
  });
});
