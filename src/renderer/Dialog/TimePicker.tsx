import React from "react";
import { useTranslation } from "react-i18next";
import { TimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { DateTime } from "luxon";
import "./DatePicker.scss";
import { SettingStore } from "../../@types";

interface TimePickerComponentProps {
  // HH:mm
  time: string | null;
  // The time only applies to a due date
  disabled: boolean;
  settings: SettingStore;
  handleChange: (time: string | null) => void;
}

const TimePickerComponent: React.FC<TimePickerComponentProps> = ({
  time,
  disabled,
  settings,
  handleChange,
}) => {
  const { t } = useTranslation();

  return (
    <LocalizationProvider
      dateAdapter={AdapterLuxon}
      adapterLocale={settings.language}
    >
      <TimePicker
        className="datePicker"
        ampm={false}
        disabled={disabled}
        label={t("todoDialog.datePicker.dueTime")}
        value={time ? DateTime.fromFormat(time, "HH:mm") : null}
        onChange={(value) =>
          handleChange(value?.isValid ? value.toFormat("HH:mm") : null)
        }
        slotProps={{
          field: { clearable: true, onClear: () => handleChange(null) },
        }}
      />
    </LocalizationProvider>
  );
};

export default TimePickerComponent;
