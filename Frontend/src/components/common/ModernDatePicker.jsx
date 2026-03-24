import { useMemo } from "react";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import "./ModernDatePicker.css";

const parseDateValue = (value) => {
  const parsed = dayjs(String(value || ""));
  if (!parsed.isValid()) return null;
  return parsed;
};

export default function ModernDatePicker({
  id,
  name,
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  min,
  max,
  className = "",
  required = false,
  ariaLabel,
}) {
  const selected = useMemo(() => parseDateValue(value), [value]);
  const minDate = useMemo(() => parseDateValue(min), [min]);
  const maxDate = useMemo(() => parseDateValue(max), [max]);

  return (
    <div className={`modern-date-picker ${className}`.trim()}>
      <input
        type="hidden"
        id={id}
        name={name}
        value={value || ""}
        required={required}
        readOnly
      />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          value={selected}
          onChange={(nextDate) => {
            const nextValue = nextDate?.isValid?.() ? nextDate.format("YYYY-MM-DD") : "";
            onChange?.({ target: { value: nextValue, name, id } });
          }}
          minDate={minDate}
          maxDate={maxDate}
          disabled={disabled}
          format="DD-MM-YYYY"
          slotProps={{
            textField: {
              fullWidth: true,
              size: "small",
              placeholder,
              inputProps: {
                readOnly: true,
                "aria-label": ariaLabel || placeholder,
              },
              sx: {
                "& .MuiInputBase-root": {
                  minHeight: 44,
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                },
                "& .MuiOutlinedInput-input": {
                  padding: "10px 12px",
                  fontSize: "14px",
                },
              },
            },
          }}
        />
      </LocalizationProvider>
    </div>
  );
}
