import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import axios from "../utils/axiosInstance";
import jsPDF from "jspdf";
import { Oval } from "react-loader-spinner";
import emptyStateImg from "../assets/empty-state.svg";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import {
  FiCalendar,
  FiDownload,
  FiGrid,
  FiSearch,
  FiUsers,
} from "react-icons/fi";
import { MdOutlineSchedule } from "react-icons/md";
import "./Timetable.css";
import { ADMIN_LOAD_STATES } from "./constants/loadStates";
import toast from "react-hot-toast";

const DAY_LABEL_TO_KEY = {
  Mon: "monday",
  Tue: "tuesday",
  Wed: "wednesday",
  Thu: "thursday",
  Fri: "friday",
  Sat: "saturday",
};

const Timetable = () => {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("Group");
  const [selectedGroupCode, setSelectedGroupCode] = useState("");
  const [loadState, setLoadState] = useState(ADMIN_LOAD_STATES.PENDING);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState({
    dayIndex: 0,
    slotIndex: 0,
  });
  const [groupCards, setGroupCards] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [groupCourses, setGroupCourses] = useState([]);
  const [deptFaculty, setDeptFaculty] = useState([]);

  const apiBase = useSelector((state) => state.config.apiBase);

  const groups = useMemo(() => groupCards.map((g) => g.groupCode), [groupCards]);

  const filteredGroups = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return groupCards;
    return groupCards.filter((g) => {
      const hay = `${g.groupCode} ${g.semester ?? ""} ${g.roomNo ?? ""} ${g.studentCount ?? ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [query, groupCards]);

  const faculty = useMemo(() => {
    const names = new Set();
    schedule.forEach((row) => {
      row.slots.forEach((slot) => {
        if (slot.by) names.add(slot.by);
      });
    });
    return Array.from(names);
  }, [schedule]);
  const slots = [
    "09:00-10:00",
    "10:00-11:00",
    "11:00-12:00",
    "01:00-02:00",
    "02:00-03:00",
  ];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const buildScheduleFromBackend = (timetable = []) => {
    const byDay = {};
    timetable.forEach((entry) => {
      if (!entry?.day) return;
      byDay[String(entry.day).toLowerCase()] = entry.lectures || [];
    });

    return days.map((label, dayIdx) => {
      const key = DAY_LABEL_TO_KEY[label];
      const lectures = byDay[key] || [];

      const rowSlots = slots.map((_, slotIdx) => {
        const lectureNumber = slotIdx + 1;
        const lecture = lectures.find((l) => l.lectureNumber === lectureNumber);

        if (!lecture) {
          return { code: "FREE", name: "Free", by: "", color: 3 };
        }

        return {
          code: lecture.courseCode || "FREE",
          name: lecture.courseName || "Free",
          by: lecture.facultyName || "",
          color: (dayIdx + slotIdx) % 5,
        };
      });

      return { day: label, slots: rowSlots };
    });
  };

  /* ---------- Fetch group cards ---------- */
  useEffect(() => {
    if (!apiBase) return;
    const fetchGroups = async () => {
      try {
        setLoadState(ADMIN_LOAD_STATES.PENDING);
        const res = await axios.get(`${apiBase}/admin/timetable/group`, {
          withCredentials: true,
        });
        const cards = res.data?.groups || [];
        setGroupCards(cards);
        if (cards.length > 0 && !selectedGroupCode) {
          setSelectedGroupCode(cards[0].groupCode);
        } else {
          setLoadState(ADMIN_LOAD_STATES.SUCCESS);
        }
      } catch (err) {
        console.error("Fetch timetable groups failed", err.response?.data || err.message);
        setLoadState(ADMIN_LOAD_STATES.FAILURE);
        toast.error(`❌ ${err.response?.data?.message || "Failed to load timetable groups"}`);
      }
    };
    fetchGroups();
  }, [apiBase]);

  /* ---------- Fetch selected group timetable ---------- */
  useEffect(() => {
    if (!apiBase || !selectedGroupCode || groupCards.length === 0) return;
    const current = groupCards.find((g) => g.groupCode === selectedGroupCode);
    if (!current) return;
    const fetchTimetable = async () => {
      try {
        setLoadState(ADMIN_LOAD_STATES.PENDING);
        const res = await axios.get(
          `${apiBase}/admin/timetable/group/${current.id}`,
          { withCredentials: true }
        );
        const timetable = res.data?.group?.timetable || [];
        const courses = res.data?.group?.courses || [];
        const departmentFaculty = res.data?.group?.departmentFaculty || [];
        setSchedule(buildScheduleFromBackend(timetable));
        setGroupCourses(courses);
        setDeptFaculty(departmentFaculty);
        setLoadState(ADMIN_LOAD_STATES.SUCCESS);
      } catch (err) {
        console.error("Fetch group timetable failed", err.response?.data || err.message);
        setLoadState(ADMIN_LOAD_STATES.FAILURE);
        toast.error(`❌ ${err.response?.data?.message || "Failed to load group timetable"}`);
      }
    };
    fetchTimetable();
  }, [apiBase, selectedGroupCode, groupCards]);

  const summaryRows = useMemo(() => {
    const seen = new Map();
    schedule.forEach((row) => {
      row.slots.forEach((slot) => {
        if (slot.code && slot.code !== "FREE" && !seen.has(slot.code)) {
          seen.set(slot.code, {
            code: slot.code,
            faculty: slot.by || "-",
            subjectCode: slot.code,
            subjectName: slot.name,
            credits: "-",
          });
        }
      });
    });
    return Array.from(seen.values());
  }, [schedule]);

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
    selectedGroupCode,
    selectedSlot.dayIndex,
    selectedSlot.slotIndex,
    currentSlot.name,
    currentSlot.by,
    currentSlot.code,
  ]);

  const applyEdit = () => {
    setSchedule((prev) => {
      const next = prev.map((d) => ({
        ...d,
        slots: d.slots.map((s) => ({ ...s })),
      }));
      const dIdx = days.indexOf(editForm.day);
      const sIdx = Math.max(0, (editForm.lecture || 1) - 1);
      if (next[dIdx] && next[dIdx].slots[sIdx]) {
        next[dIdx].slots[sIdx] = {
          ...next[dIdx].slots[sIdx],
          code: editForm.code || "FREE",
          name: editForm.subject || "Free",
          by: editForm.faculty || "",
        };
      }
      return next;
    });
  };

  const downloadTimetable = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Timetable: ${selectedGroupCode}`, 14, 18);
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
    doc.save(`${selectedGroupCode}_timetable.pdf`);
  };

  const palette = [
    "t-item c-blue",
    "t-item c-teal",
    "t-item c-amber",
    "t-item c-violet",
    "t-item c-rose",
  ];

  const sliderSettings = {
    className: "center",
    centerMode: true,
    infinite: true,
    centerPadding: "24px",
    slidesToShow: 3,
    speed: 500,
    arrows: true,
    dots: false,
    responsive: [
      { breakpoint: 1200, settings: { slidesToShow: 2, centerPadding: "20px" } },
      { breakpoint: 900, settings: { slidesToShow: 1, centerPadding: "20px" } },
      { breakpoint: 640, settings: { slidesToShow: 1, centerPadding: "12px" } },
    ],
  };

  const renderState = () => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) {
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
    if (loadState === ADMIN_LOAD_STATES.FAILURE) {
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
          <div className="tt-head-actions" />
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
              className="tt-download-btn"
              type="button"
              onClick={downloadTimetable}
            >
              <FiDownload />
              Download
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
              Groups with semester, room and student count
            </span>
          </div>
          <div className="tt-group-slider">
            {filteredGroups.length === 0 ? (
              <div className="tt-empty">No groups found.</div>
            ) : (
              <Slider {...sliderSettings}>
                {filteredGroups.map((g) => (
                  <div key={g.id}>
                    <button
                      type="button"
                      className={`tt-group-card ${
                        selectedGroupCode === g.groupCode ? "active" : ""
                      }`}
                      onClick={() => {
                        setSelectedGroupCode(g.groupCode);
                        setMode("Group");
                      }}
                    >
                      <div className="tt-group-badge">
                        <FiGrid />
                        {g.groupCode}
                      </div>
                      <div className="tt-group-meta">
                        <span>{g.semester ? `Sem ${g.semester}` : "Sem -"}</span>
                        <span>Room {g.roomNo || "-"}</span>
                        <span>{g.studentCount ?? 0} Students</span>
                      </div>
                    </button>
                  </div>
                ))}
              </Slider>
            )}
          </div>
        </div>

        <div className="tt-flow">
          <div className="tt-flow-main">
            <div className="tt-panel">
              <div className="tt-panel-head">
                <div className="tt-panel-title">
                  <MdOutlineSchedule />
                  Group Schedule ({selectedGroupCode})
                </div>
                <div className="tt-panel-actions">
                  <select
                    className="tt-select"
                    value={selectedGroupCode}
                    onChange={(e) => setSelectedGroupCode(e.target.value)}
                  >
                    {groups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <select className="tt-select">
                    {faculty.length === 0 ? (
                      <option value="">No Faculty</option>
                    ) : (
                      faculty.map((f) => (
                        <option key={f}>{f}</option>
                      ))
                    )}
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
                <select
                  value={editForm.code}
                  onChange={(e) => {
                    const code = e.target.value;
                    const match = groupCourses.find((c) => c.code === code);
                    setEditForm((prev) => ({
                      ...prev,
                      code,
                      subject: match ? match.courseName : "",
                    }));
                  }}
                >
                  <option value="FREE">FREE</option>
                  {groupCourses.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="tt-label-field">
                Subject/Course name
                <input
                  placeholder="Auto-filled from subject code"
                  value={editForm.subject}
                  readOnly
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
                  <option value="">Select Faculty</option>
                  {deptFaculty.map((f) => (
                    <option key={f.id} value={f.name}>
                      {f.name}
                    </option>
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

