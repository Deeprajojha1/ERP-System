import React, { useMemo, useState } from "react";
import jsPDF from "jspdf";
import { Oval } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import {
  FiCalendar,
  FiDownload,
  FiEdit3,
  FiGrid,
  FiSearch,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { MdOutlineSchedule } from "react-icons/md";
import "./Timetable.css";

const Timetable = () => {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("Group");
  const [selectedGroup, setSelectedGroup] = useState("BCSE-6A");
  const [loadState, setLoadState] = useState("success");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState({
    dayIndex: 0,
    slotIndex: 0,
  });

  const groups = ["BCSE-6A", "BCSE-6B", "BME-5A", "BEE-4A"];
  const groupCards = [
    { group: "BCSE-6A", sem: "Sem 6", room: "C-204", students: 62 },
    { group: "BCSE-6B", sem: "Sem 6", room: "C-206", students: 58 },
    { group: "BME-5A", sem: "Sem 5", room: "M-102", students: 54 },
    { group: "BEE-4A", sem: "Sem 4", room: "E-110", students: 49 },
  ];

  const filteredGroups = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return groupCards;
    return groupCards.filter((g) => {
      const hay = `${g.group} ${g.sem} ${g.room} ${g.students}`.toLowerCase();
      return hay.includes(term);
    });
  }, [query, groupCards]);
  const faculty = ["Rajesh Kumar", "Neha Verma", "Amit Sharma"];
  const slots = [
    "09:00-10:00",
    "10:00-11:00",
    "11:00-12:00",
    "01:00-02:00",
    "02:00-03:00",
  ];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const summaryRows = [
    {
      code: "CSE2601",
      faculty: "Rajesh Kumar",
      subjectCode: "BCSE601",
      subjectName: "DBMS",
      credits: 5,
    },
    {
      code: "ECE2101",
      faculty: "Neha Verma",
      subjectCode: "BECE502",
      subjectName: "Signals",
      credits: 4,
    },
  ];

  const makeSchedule = () => {
    const base = [
      ["CSE301", "DBMS", "Rajesh"],
      ["CSE302", "DSA", "Neha"],
      ["CSE303", "OS", "Amit"],
      ["FREE", "Free", ""],
      ["CSE304", "CN", "Rajesh"],
    ];
    return days.map((d, i) => ({
      day: d,
      slots: base.map((b, idx) => ({
        code: b[0],
        name: b[1],
        by: b[2],
        color: (i + idx) % 5,
      })),
    }));
  };

  const [schedules, setSchedules] = useState(() => {
    const initial = {};
    groups.forEach((g) => {
      initial[g] = makeSchedule();
    });
    return initial;
  });

  const schedule = schedules[selectedGroup] || makeSchedule();

  const currentSlot =
    schedule?.[selectedSlot.dayIndex]?.slots?.[
      selectedSlot.slotIndex
    ] || { code: "FREE", name: "Free", by: "" };

  const [editForm, setEditForm] = useState({
    day: "Mon",
    lecture: 1,
    subject: currentSlot.name,
    faculty: currentSlot.by,
    code: currentSlot.code,
  });

  React.useEffect(() => {
    setEditForm({
      day: days[selectedSlot.dayIndex],
      lecture: selectedSlot.slotIndex + 1,
      subject: currentSlot.name,
      faculty: currentSlot.by,
      code: currentSlot.code,
    });
  }, [
    selectedGroup,
    selectedSlot.dayIndex,
    selectedSlot.slotIndex,
    currentSlot.name,
    currentSlot.by,
    currentSlot.code,
  ]);

  const applyEdit = () => {
    setSchedules((prev) => {
      const next = { ...prev };
      const groupSchedule = next[selectedGroup].map((d) => ({
        ...d,
        slots: d.slots.map((s) => ({ ...s })),
      }));
      const dIdx = days.indexOf(editForm.day);
      const sIdx = Math.max(0, (editForm.lecture || 1) - 1);
      if (groupSchedule[dIdx] && groupSchedule[dIdx].slots[sIdx]) {
        groupSchedule[dIdx].slots[sIdx] = {
          ...groupSchedule[dIdx].slots[sIdx],
          code: editForm.code || "FREE",
          name: editForm.subject || "Free",
          by: editForm.faculty || "",
        };
      }
      next[selectedGroup] = groupSchedule;
      return next;
    });
  };

  const downloadTimetable = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Timetable: ${selectedGroup}`, 14, 18);
    doc.setFontSize(11);
    let y = 28;
    schedule.forEach((row) => {
      const line = `${row.day}: ${row.slots
        .map((s) => `${s.code} (${s.name})`)
        .join(" | ")}`;
      doc.text(line, 14, y);
      y += 7;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });
    doc.save(`${selectedGroup}_timetable.pdf`);
  };

  const palette = [
    "t-item c-blue",
    "t-item c-teal",
    "t-item c-amber",
    "t-item c-violet",
    "t-item c-rose",
  ];


  const renderState = () => {
    if (loadState === "pending") {
      return (
        <div className="tt-state pending">
          <Oval
            height={64}
            width={64}
            color="#2563eb"
            secondaryColor="#bfdbfe"
            strokeWidth={4}
            strokeWidthSecondary={4}
            ariaLabel="Loading"
            visible
          />
          <p>Loading timetable...</p>
        </div>
      );
    }
    if (loadState === "failure") {
      return (
        <div className="tt-state error">
          <img src={emptyStateImg} alt="Failed" className="tt-state-img" />
          <h3>Failed to load timetable</h3>
          <p>Please try again in a moment.</p>
        </div>
      );
    }

    return (
      <>
        <div className="tt-head">
          <div>
            <h1 className="tt-title">TimeTable</h1>
            <p className="tt-subtitle">
              Plan, edit and visualize weekly schedules
            </p>
          </div>
          <div className="tt-head-actions">
            <button
              className="tt-download-btn"
              type="button"
              onClick={downloadTimetable}
            >
              <FiDownload />
              Download
            </button>
            <button
              className="tt-edit-btn"
              type="button"
              onClick={() => setIsEditing((prev) => !prev)}
            >
              <FiEdit3 />
              {isEditing ? "Editing" : "Edit"}
            </button>
          </div>
        </div>

        <div className="tt-top">
          <div className="tt-search">
            <FiSearch />
            <input
              type="text"
              placeholder="Filter for Group / Faculty"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="tt-toggle">
            <button
              type="button"
              className={`tt-pill ${mode === "Group" ? "active" : ""}`}
              onClick={() => setMode("Group")}
            >
              <FiUsers />
              Group
            </button>
            <button
              type="button"
              className={`tt-pill ${mode === "Faculty" ? "active" : ""}`}
              onClick={() => setMode("Faculty")}
            >
              <FiUser />
              Faculty
            </button>
          </div>
        </div>

        <div className="tt-group-board">
          <div className="tt-group-head">
            <span className="tt-group-title">
              <FiUsers />
              Groups Dashboard
            </span>
            <span className="tt-group-subtitle">
              Sample groups for timetable overview
            </span>
          </div>
          <div className="tt-group-grid">
            {filteredGroups.length === 0 ? (
              <div className="tt-empty">No groups found.</div>
            ) : (
              filteredGroups.map((g) => (
                <button
                  key={g.group}
                  type="button"
                  className={`tt-group-card ${
                    selectedGroup === g.group ? "active" : ""
                  }`}
                  onClick={() => {
                    setSelectedGroup(g.group);
                    setMode("Group");
                  }}
                >
                  <div className="tt-group-badge">
                    <FiGrid />
                    {g.group}
                  </div>
                  <div className="tt-group-meta">
                    <span>{g.sem}</span>
                    <span>Room {g.room}</span>
                    <span>{g.students} Students</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="tt-flow">
          <div className="tt-flow-main">
            <div className="tt-panel">
              <div className="tt-panel-head">
                <div className="tt-panel-title">
                  <MdOutlineSchedule />
                  Group Schedule ({selectedGroup})
                </div>
                <div className="tt-panel-actions">
                  <select
                    className="tt-select"
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                  >
                    {groups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <select className="tt-select">
                    {faculty.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="tt-calendar">
                <div className="tt-calendar-scroll">
                  <div className="tt-calendar-head">
                    <div className="tt-calendar-cell tt-label">Day</div>
                    {slots.map((s) => (
                      <div key={s} className="tt-calendar-cell tt-slot">
                        {s}
                      </div>
                    ))}
                  </div>
                  {schedule.map((row) => (
                    <div key={row.day} className="tt-calendar-row">
                      <div className="tt-calendar-cell tt-label">
                        {row.day}
                      </div>
                      {row.slots.map((slot, idx) => (
                        <div
                          key={`${row.day}-${idx}`}
                          className="tt-calendar-cell"
                        >
                          <button
                            type="button"
                            className={`${palette[slot.color]} ${
                              isEditing &&
                              selectedSlot.dayIndex ===
                                days.indexOf(row.day) &&
                              selectedSlot.slotIndex === idx
                                ? "t-active"
                                : ""
                            }`}
                            disabled={!isEditing}
                            onClick={() => {
                              if (!isEditing) return;
                              setSelectedSlot({
                                dayIndex: days.indexOf(row.day),
                                slotIndex: idx,
                              });
                            }}
                          >
                            <span className="t-code">{slot.code}</span>
                            <span className="t-name">{slot.name}</span>
                            <span className="t-by">{slot.by}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="tt-table-wrap">
                <div className="tt-table">
                  <div className="tt-table-head">
                    <span>t.code</span>
                    <span>faculty name</span>
                    <span>subject.code</span>
                    <span>subject name (course)</span>
                    <span>credits</span>
                  </div>
                  {summaryRows.map((r, i) => (
                    <div key={`${r.code}-${i}`} className="tt-table-row">
                      <span>{r.code}</span>
                      <span>{r.faculty}</span>
                      <span>{r.subjectCode}</span>
                      <span>{r.subjectName}</span>
                      <span>{r.credits}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="tt-flow-right">
            <div className="tt-side">
              <div className="tt-side-head">
                <FiGrid />
                Edit Group Timetable
              </div>
              <label className="tt-label-field">
                Day
                <select
                  value={editForm.day}
                  onChange={(e) => {
                    const nextDay = e.target.value;
                    setEditForm((prev) => ({
                      ...prev,
                      day: nextDay,
                    }));
                    setSelectedSlot((prev) => ({
                      ...prev,
                      dayIndex: days.indexOf(nextDay),
                    }));
                  }}
                >
                  {days.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label className="tt-label-field">
                Lecture No.
                <select
                  value={editForm.lecture}
                  onChange={(e) => {
                    const nextLecture = Number(e.target.value);
                    setEditForm((prev) => ({
                      ...prev,
                      lecture: nextLecture,
                    }));
                    setSelectedSlot((prev) => ({
                      ...prev,
                      slotIndex: nextLecture - 1,
                    }));
                  }}
                >
                  {slots.map((s, i) => (
                    <option key={s} value={i + 1}>
                      {`Lecture ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="tt-label-field">
                Subject Code
                <input
                  placeholder="e.g., CSE301"
                  value={editForm.code}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      code: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="tt-label-field">
                Subject/Course name
                <input
                  placeholder="e.g., DBMS"
                  value={editForm.subject}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="tt-label-field">
                Faculty
                <select
                  value={editForm.faculty}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      faculty: e.target.value,
                    }))
                  }
                >
                  {faculty.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
              <button
                className="tt-submit"
                type="button"
                onClick={applyEdit}
              >
                Submit
              </button>
            </div>

            <div className="tt-note">
              <FiCalendar />
              <p>
                When you submit, the faculty routing is also updated if there is
                an assignment for that group and course.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="tt-page">
      {renderState()}

    </div>
  );
};

export default Timetable;
