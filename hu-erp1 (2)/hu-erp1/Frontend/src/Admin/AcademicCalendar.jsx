import React from "react";
import { FiCalendar, FiClock } from "react-icons/fi";
import "./AcademicCalendar.css";

const CALENDAR_EVENTS = [
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

const AcademicCalendar = () => {
  return (
    <div className="academic-calendar-page">
      <header className="ac-hero">
        <div>
          <p className="ac-eyebrow">Configuration · Fees</p>
          <h1>Academic Calendar</h1>
          <p>
            Keep finance operations aligned with the academic schedule. Broadcast important fee deadlines and scholarship checkpoints.
          </p>
        </div>
        <button type="button" className="ac-primary-btn">
          <FiCalendar />
          <span>Add Event</span>
        </button>
      </header>

      <section className="ac-timeline">
        {CALENDAR_EVENTS.map((event) => (
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
            <span className={`ac-event-tag tag-${event.type.toLowerCase()}`}>
              {event.type}
            </span>
          </article>
        ))}
      </section>
    </div>
  );
};

export default AcademicCalendar;
