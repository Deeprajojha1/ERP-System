import React, { useMemo, useState } from "react";
import { FiCalendar, FiClock, FiPlus } from "react-icons/fi";
import ModernDatePicker from "../components/common/ModernDatePicker";
import "./AcademicCalendar.css";

const INITIAL_CALENDAR_EVENTS = [
  {
    id: 1,
    title: "Semester Fee Deadline",
    description: "Final date for Sem 4 installments",
    date: "15 Mar 2026",
    time: "11:59 PM",
    type: "Financial",
  },
  {
    id: 2,
    title: "Scholarship Review",
    description: "Scholarship committee review for new applicants",
    date: "22 Mar 2026",
    time: "02:00 PM",
    type: "Scholarship",
  },
  {
    id: 3,
    title: "Transport Renewal",
    description: "Window opens for transport pass renewals",
    date: "01 Apr 2026",
    time: "09:00 AM",
    type: "Operations",
  },
];

const EVENT_TYPES = ["Financial", "Scholarship", "Operations", "General"];

const toTimestamp = ({ date, time }) => {
  const parsed = new Date(`${date} ${time}`);
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

const formatTimeLabel = (timeValue) => {
  if (!timeValue) return "";
  const parsed = new Date(`1970-01-01T${timeValue}`);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AcademicCalendar = () => {
  const [events, setEvents] = useState(INITIAL_CALENDAR_EVENTS);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [formValues, setFormValues] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    type: EVENT_TYPES[0],
  });

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
    });
    setFormError("");
  };

  const handleAddEvent = (event) => {
    event.preventDefault();
    const title = String(formValues.title || "").trim();
    const description = String(formValues.description || "").trim();
    const date = String(formValues.date || "").trim();
    const time = String(formValues.time || "").trim();
    const type = String(formValues.type || EVENT_TYPES[0]).trim();

    if (!title || !date || !time || !type) {
      setFormError("Title, date, time, and type are required.");
      return;
    }

    const nextEvent = {
      id: Date.now(),
      title,
      description: description || "No description provided.",
      date: formatDateLabel(date),
      time: formatTimeLabel(time),
      type,
    };

    setEvents((prev) => [...prev, nextEvent]);
    resetForm();
    setShowForm(false);
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
          <article key={event.id} className="ac-event-card">
            <div className="ac-event-date">
              <span>{event.date}</span>
              <small>
                <FiClock /> {event.time}
              </small>
            </div>
            <div className="ac-event-detail">
              <p className="ac-event-title">{event.title}</p>
              <p className="ac-event-description">{event.description}</p>
            </div>
            <span
              className={`ac-event-tag tag-${String(event.type || "general")
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
            >
              {event.type}
            </span>
          </article>
        ))}
      </section>
    </div>
  );
};

export default AcademicCalendar;
