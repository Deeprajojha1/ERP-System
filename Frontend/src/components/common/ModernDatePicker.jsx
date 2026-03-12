import { useEffect, useMemo, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { FiCalendar } from "react-icons/fi";
import "react-day-picker/style.css";
import "./ModernDatePicker.css";

const formatDateValue = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const parseDateValue = (value) => {
  const [yy, mm, dd] = String(value || "").split("-").map(Number);
  if (!yy || !mm || !dd) return undefined;
  const parsed = new Date(yy, mm - 1, dd, 12, 0, 0, 0);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
};

const displayDate = (value) => {
  const parsed = parseDateValue(value);
  if (!parsed) return "Select date";
  return parsed.toLocaleDateString("en-GB").replace(/\//g, "-");
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
}) {
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState({});

  const selected = useMemo(() => parseDateValue(value), [value]);
  const minDate = useMemo(() => parseDateValue(min), [min]);
  const maxDate = useMemo(() => parseDateValue(max), [max]);

  useEffect(() => {
    const onDocClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const onEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const desiredLeft = rect.left;
      const maxLeft = window.innerWidth - 340;
      const clampedLeft = Math.max(8, Math.min(desiredLeft, maxLeft));

      setPopoverStyle({
        top: `${rect.bottom + 12}px`,
        left: `${clampedLeft}px`,
        visibility: "visible",
      });
    };

    // Small delay to ensure trigger ref is available
    const timer = setTimeout(updatePosition, 0);
    updatePosition();
    
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const dayDisabled = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  return (
    <div ref={rootRef} className={`modern-date-picker ${className}`.trim()}>
      <input type="hidden" id={id} name={name} value={value || ""} readOnly />
      <button
        type="button"
        ref={triggerRef}
        className="modern-date-picker__trigger"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        aria-label={placeholder}
        aria-expanded={open}
        disabled={disabled}
      >
        <span>{value ? displayDate(value) : placeholder}</span>
        <FiCalendar />
      </button>

      {open ? (
        <div
          className="modern-date-picker__popover"
          role="dialog"
          aria-modal="false"
          style={popoverStyle}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(nextDate) => {
              const nextValue = formatDateValue(nextDate);
              onChange?.({ target: { value: nextValue, name } });
              setOpen(false);
            }}
            disabled={dayDisabled}
            startMonth={minDate}
            endMonth={maxDate}
          />
        </div>
      ) : null}
    </div>
  );
}
