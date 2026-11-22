import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import DatePickerInline from "./DatePickerInline";
import { SettingStore, TodoObject } from "@sleek-types";

vi.mock("../Shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../Shared")>();
  return {
    ...actual,
    HandleFilterSelect: vi.fn(),
    IsSelected: vi.fn(() => false),
  };
});

const { ipcRenderer } = window.api;

const settings = { language: "en", weekStart: 1 } as unknown as SettingStore;
const makeTodo = (overrides: Partial<TodoObject> = {}): TodoObject =>
  ({
    lineNumber: 3,
    string: "Call Sam due:2026-11-23",
    due: "2026-11-23",
    dueTime: null,
    notify: false,
    ...overrides,
  }) as TodoObject;

const renderInRow = (todo: TodoObject, rowClick = vi.fn()) =>
  render(
    <ul>
      <li onClick={rowClick}>
        <span className="filter" data-todotxt-attribute="due">
          <DatePickerInline
            type="due"
            todoObject={todo}
            date={todo.due}
            filters={null}
            settings={settings}
          />
        </span>
      </li>
    </ul>,
  );

describe("DatePickerInline", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("picking a date", () => {
    it("sets the due date from the calendar and leaves the time alone", async () => {
      renderInRow(makeTodo({ dueTime: "14:30" }));
      fireEvent.click(screen.getByTestId("datagrid-picker-date-due"));
      await waitFor(() =>
        expect(screen.getAllByRole("gridcell").length).toBeGreaterThan(0),
      );
      fireEvent.click(screen.getByRole("gridcell", { name: "25" }));
      await waitFor(() =>
        expect(ipcRenderer.send).toHaveBeenCalledWith(
          "updateTodoObject",
          3,
          expect.any(String),
          "due",
          "2026-11-25",
          true,
        ),
      );
    });
  });
});
