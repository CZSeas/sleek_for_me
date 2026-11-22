import React, { useState, useCallback } from "react";
import { LocalizationProvider, TimePicker } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import Chip from "@mui/material/Chip";
import { DateTime } from "luxon";
import { SettingStore, TodoObject } from "@sleek-types";

const { ipcRenderer } = window.api;

interface DueTimeInlineProps {
  todoObject: TodoObject;
  settings: SettingStore;
  // Without a time yet: a faint "+ time" chip that only shows on row hover
  placeholder?: boolean;
}

// The optional time of day of a due date, stored as `due_time:HHmm` and shown
// as its own chip next to the due date chip.
const DueTimeInlineComponent: React.FC<DueTimeInlineProps> = ({
  todoObject,
  settings,
  placeholder = false,
}) => {
  const [open, setOpen] = useState(false);
  // The picker is controlled, so it needs its own draft: without it every
  // click on an hour or minute would start again from the stored value and the
  // previous pick would be lost.
  const [draftTime, setDraftTime] = useState<DateTime | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const setAnchorRef = useCallback((node: HTMLElement | null) => {
    setAnchorEl(node);
  }, []);

  const handleTimeChange = (time: DateTime | null) => {
    try {
      ipcRenderer.send(
        "updateTodoObject",
        todoObject.lineNumber,
        todoObject.string,
        "due_time",
        time?.isValid ? time.toFormat("HH:mm") : null,
        true, // Write immediately for inline pickers
      );
    } catch (error) {
      console.error(error);
    }
    setOpen(false);
  };

  const toggleOpen = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!open) {
      setDraftTime(
        todoObject.dueTime
          ? DateTime.fromFormat(todoObject.dueTime, "HH:mm")
          : null,
      );
    }
    setOpen((prev) => !prev);
  };

  return (
    <LocalizationProvider
      dateAdapter={AdapterLuxon}
      adapterLocale={settings.language}
    >
      <span
        data-todotxt-attribute="due_time"
        className={placeholder ? "due-time-placeholder" : undefined}
      >
        <button
          ref={setAnchorRef}
          tabIndex={-1}
          onClick={toggleOpen}
          onKeyDown={(event) => event.key === "Enter" && toggleOpen(event)}
          data-testid="datagrid-picker-time-due"
        >
          <Chip
            label={placeholder ? "+ time" : "time:"}
            sx={{
              backgroundColor: "var(--chip-bg)",
              color: "var(--chip-text)",
            }}
          />
          {placeholder ? null : <div>{todoObject.dueTime}</div>}
        </button>
      </span>
      <TimePicker
        open={open}
        onClose={() => setOpen(false)}
        ampm={false}
        value={draftTime}
        onChange={(time) => {
          // Clear fires onChange(null) only, so it is sent from here. The
          // picker does not reliably follow it with onAccept(null).
          if (time === null) handleTimeChange(null);
          else setDraftTime(time);
        }}
        onAccept={(time) => {
          if (time) handleTimeChange(time);
        }}
        slots={{ field: () => <span style={{ display: "none" }} /> }}
        slotProps={{
          actionBar: { actions: ["clear", "accept"] },
          popper: {
            anchorEl,
            placement: "bottom-start",
          },
        }}
      />
    </LocalizationProvider>
  );
};

export default DueTimeInlineComponent;
