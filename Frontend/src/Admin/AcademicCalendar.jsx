import React, { useMemo, useState } from "react";
import { FiCalendar, FiClock, FiPlus } from "react-icons/fi";
import ModernDatePicker from "../components/common/ModernDatePicker";
import "./AcademicCalendar.css";
import { useDispatch, useSelector } from "react-redux";
import {
  createFeeCalendarEvent,
  deleteFeeCalendarEvent,
  fetchFeeCalendarEvents,
  selectFeeCalendarEvents,
} from "../redux/feeSlice";
import toast from "react-hot-toast";

const EVENT_TYPES = ["Financial", "Scholarship", "Operations", "General", "Semester Due Date"];

const toTimestamp = (event) => {
  const parsed = new Date(event?.eventDate || "");
  const ms = parsed.getTime();
  return Number.isNaN(ms) ? Number.MAX_SAFE_INTEGER : ms;
};

const formatDateLabel = (dateValue) => {
  if (!dateValue) return "";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTimeLabel = (dateValue) => {
  if (!dateValue) return "";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AcademicCalendar = () => {
  const dispatch = useDispatch();
  const events = useSelector(selectFeeCalendarEvents);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [formValues, setFormValues] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    type: EVENT_TYPES[0],
    academicYear: "",
    semesterNo: "",
  });

  useEffect(() => {
    dispatch(fetchFeeCalendarEvents());
  }, [dispatch]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => toTimestamp(a) - toTimestamp(b));
  }, [events]);

  const resetForm = () => {
    setFormValues({
      title: "",
      description: "",
      date: "",
      time: "",
      type: EVENT_TYPES[0],
      academicYear: "",
      semesterNo: "",
    });
    setFormError("");
  };

  const handleAddEvent = async (event) => {
    event.preventDefault();
    const title = String(formValues.title || "").trim();
    const description = String(formValues.description || "").trim();
    const date = String(formValues.date || "").trim();
    const time = String(formValues.time || "").trim();
    const type = String(formValues.type || EVENT_TYPES[0]).trim();
    const academicYear = String(formValues.academicYear || "").trim();
    const semesterNo = String(formValues.semesterNo || "").trim();

    if (!title || !date || !time || !type) {
      setFormError("Title, date, time, and type are required.");
      return;
    }
    if (type === "Semester Due Date" && (!academicYear || !semesterNo)) {
      setFormError("Academic year and semester are required for due dates.");
      return;
    }

    try {
      await dispatch(
        createFeeCalendarEvent({
          title,
          description,
          date,
          time,
          type,
          academicYear: type === "Semester Due Date" ? academicYear : undefined,
          semesterNo: type === "Semester Due Date" ? Number(semesterNo) : undefined,
        })
      ).unwrap();
      toast.success("Calendar event created");
      resetForm();
      setShowForm(false);
    } catch (error) {
      toast.error(error || "Failed to create calendar event");
    }
  };

  const handleDelete = async (id) => {
    try {
      await dispatch(deleteFeeCalendarEvent(id)).unwrap();
      toast.success("Event deleted");
    } catch (error) {
      toast.error(error || "Failed to delete event");
    }
  };

  return (
    <div className="academic-calendar-page">
      <header className="ac-hero">
        <div>
          <p className="ac-eyebrow">Configuration - Fees</p>
          <h1>Academic Calendar</h1>
          <p>
            Keep finance operations aligned with the academic schedule. Broadcast important fee
            deadlines and scholarship checkpoints.
          </p>
        </div>
        <button
          type="button"
          className="ac-primary-btn"
          onClick={() => {
            setShowForm((prev) => !prev);
            setFormError("");
          }}
        >
          <FiPlus />
          <span>{showForm ? "Close Form" : "Add Event"}</span>
        </button>
      </header>

      {showForm && (
        <section className="ac-form-card">
          <div className="ac-form-head">
            <h3>Create Calendar Event</h3>
            <p>Add finance, scholarship, or operations events for students.</p>
          </div>

          <form className="ac-form-grid" onSubmit={handleAddEvent}>
            <label className="ac-form-field">
              <span>Title</span>
              <input
                type="text"
                value={formValues.title}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="e.g. Mid-sem fee deadline"
                required
              />
            </label>

            <label className="ac-form-field">
              <span>Type</span>
              <select
                value={formValues.type}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, type: event.target.value }))
                }
                required
              >
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="ac-form-field">
              <span>Date</span>
              <ModernDatePicker
                value={formValues.date}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, date: event.target.value }))
                }
              />
            </label>

            <label className="ac-form-field">
              <span>Time</span>
              <input
                type="time"
                value={formValues.time}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, time: event.target.value }))
                }
                required
              />
            </label>

            {formValues.type === "Semester Due Date" && (
              <>
                <label className="ac-form-field">
                  <span>Academic Year</span>
                  <input
                    type="text"
                    placeholder="e.g. 2026-27"
                    value={formValues.academicYear}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, academicYear: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="ac-form-field">
                  <span>Semester No</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formValues.semesterNo}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, semesterNo: event.target.value }))
                    }
                    required
                  />
                </label>
              </>
            )}

            <label className="ac-form-field ac-form-field--full">
              <span>Description</span>
              <textarea
                rows={3}
                value={formValues.description}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Optional details for students/admin team"
              />
            </label>

            {formError && <p className="ac-form-error">{formError}</p>}

            <div className="ac-form-actions">
              <button
                type="button"
                className="ac-secondary-btn"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="ac-primary-btn ac-primary-btn--form">
                <FiCalendar />
                <span>Save Event</span>
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="ac-timeline">
        {sortedEvents.map((event) => (
          <article key={event._id} className="ac-event-card">
            <div className="ac-event-date">
              <span>{formatDateLabel(event.eventDate)}</span>
              <small>
                <FiClock /> {formatTimeLabel(event.eventDate)}
              </small>
            </div>
            <div className="ac-event-detail">
              <p className="ac-event-title">{event.title}</p>
              <p className="ac-event-description">{event.description}</p>
              {event.eventType === "Semester Due Date" && (
                <p className="ac-event-meta">
                  Semester {event.semesterNo} • {event.academicYear}
                </p>
              )}
            </div>
            <span
              className={`ac-event-tag tag-${String(event.eventType || "general")
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
            >
              {event.eventType}
            </span>
            <button
              type="button"
              className="ac-event-delete"
              onClick={() => handleDelete(event._id)}
              aria-label="Delete event"
            >
              <FiTrash2 />
            </button>
          </article>
        ))}
      </section>
    </div>
  );
};

export default AcademicCalendar;
