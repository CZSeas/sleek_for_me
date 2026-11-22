// The due time is stored in the todo.txt file as `due_time:HHmm` (e.g. 1430)
// because jstodotxt cannot parse a colon inside a tag value. The rest of the
// app works with "HH:mm".

const STORED_PATTERN = /^([01]\d|2[0-3])([0-5]\d)$/;
const DISPLAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

// "1430" -> "14:30", invalid -> null
export function parseStoredDueTime(
  value: string | null | undefined,
): string | null {
  const match = value ? STORED_PATTERN.exec(value) : null;
  return match ? `${match[1]}:${match[2]}` : null;
}

// "14:30" -> "1430", invalid -> null
export function toStoredDueTime(
  value: string | null | undefined,
): string | null {
  const match = value ? DISPLAY_PATTERN.exec(value) : null;
  return match ? `${match[1]}${match[2]}` : null;
}
