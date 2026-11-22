import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import RendererComponent from "./Renderer";
import { SettingStore, TodoObject, Filters } from "@sleek-types";

vi.mock("../Shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../Shared")>();
  return {
    ...actual,
    HandleFilterSelect: vi.fn(),
    IsSelected: vi.fn(() => false),
  };
});

vi.mock("../Shared/useAttributeContextMenu", () => ({
  useAttributeContextMenu: () => ({ handleContextMenu: vi.fn() }),
}));

const settings = { language: "en", weekStart: 1 } as unknown as SettingStore;

const renderTodo = (overrides: Partial<TodoObject>) =>
  render(
    <RendererComponent
      todoObject={
        {
          lineNumber: 1,
          dueString: "2026-11-23",
          tString: null,
          due: "2026-11-23",
          dueTime: null,
          t: null,
          ...overrides,
        } as TodoObject
      }
      filters={{} as Filters}
      settings={settings}
      setContextMenu={vi.fn()}
    />,
  );

describe("Renderer due time", () => {
  it("shows due_time as its own chip, separate from the due chip", () => {
    renderTodo({
      body: "Call Sam due:2026-11-23 due_time:1430",
      dueTime: "14:30",
    });
    const timeChip = screen.getByTestId("datagrid-picker-time-due");
    expect(timeChip).toHaveTextContent(/^time/);
    expect(timeChip).toHaveTextContent("14:30");
    // The due chip does not contain the time
    expect(
      screen.getByTestId("datagrid-picker-date-due"),
    ).not.toHaveTextContent("14:30");
    // and the time chip is not nested in the due chip
    expect(timeChip.closest('[data-todotxt-attribute="due"]')).toBeNull();
    // the raw tag is not left behind as text or a custom tag chip
    expect(screen.queryByText(/due_time:1430/)).toBeNull();
  });

  it("offers a '+ time' chip for a due date without a time", () => {
    renderTodo({ body: "Call Sam due:2026-11-23" });
    expect(screen.getByTestId("datagrid-picker-time-due")).toHaveTextContent(
      "+ time",
    );
  });

  it("offers no time chip without a due date", () => {
    renderTodo({ body: "Call Sam", due: null, dueString: null });
    expect(screen.queryByTestId("datagrid-picker-time-due")).toBeNull();
  });
});
