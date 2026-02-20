import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
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
import { downloadPdfFromHtml } from "../utils/pdfDownload";
import ClipLoader from "./components/ClipLoader";
import {
  applyTimetableEdit,
  fetchGroupTimetable,
  saveGroupTimetable,
  fetchTimetableGroups,
  selectTimetableDeptFaculty,
  selectTimetableError,
  selectTimetableGroupCards,
  selectTimetableGroupCourses,
  selectTimetableLoading,
  selectTimetableSchedule,
  selectTimetableSelectedGroupCode,
  setSelectedGroupCode,
} from "../redux/timetableSlice";

const Timetable = () => {
  const dispatch = useDispatch();
  const [query, setQuery] = useState("");
  const [isEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState({
    dayIndex: 0,
    slotIndex: 0,
  });
  const selectedGroupCode = useSelector(selectTimetableSelectedGroupCode);
  const groupCards = useSelector(selectTimetableGroupCards);
  const schedule = useSelector(selectTimetableSchedule);
  const groupCourses = useSelector(selectTimetableGroupCourses);
  const deptFaculty = useSelector(selectTimetableDeptFaculty);
  const timetableLoading = useSelector(selectTimetableLoading);
  const timetableError = useSelector(selectTimetableError);

  const apiBase = useSelector((state) => state.config.apiBase);
  const loadState = useMemo(() => {
    if (timetableLoading) return ADMIN_LOAD_STATES.PENDING;
    if (timetableError) return ADMIN_LOAD_STATES.FAILURE;
    return ADMIN_LOAD_STATES.SUCCESS;
  }, [timetableLoading, timetableError]);

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
  const lectureSlots = [
    "09:10 AM-10:05 AM",
    "10:05 AM-11:00 AM",
    "11:10 AM-12:05 PM",
    "12:05 PM-01:00 PM",
    "02:00 PM-02:55 PM",
    "02:55 PM-03:50 PM",
    "03:50 PM-04:45 PM",
  ];
  const days = useMemo(() => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], []);
  const dayKeyMap = {
    Mon: "monday",
    Tue: "tuesday",
    Wed: "wednesday",
    Thu: "thursday",
    Fri: "friday",
    Sat: "saturday",
  };

  const normalizedSchedule = useMemo(() => {
    return schedule.map((row) => {
      const normalizedSlots = Array.from(
        { length: lectureSlots.length },
        (_, idx) => row.slots?.[idx] || { code: "FREE", name: "Free", by: "", color: idx % 5 }
      );
      return { ...row, slots: normalizedSlots };
    });
  }, [schedule, lectureSlots.length]);

  /* ---------- Fetch group cards ---------- */
  useEffect(() => {
    if (!apiBase) return;
    dispatch(fetchTimetableGroups())
      .unwrap()
      .catch((message) => {
        toast.error(`${message || "Failed to load timetable groups"}`);
      });
  }, [apiBase, dispatch]);

  /* ---------- Fetch selected group timetable ---------- */
  useEffect(() => {
    if (!apiBase || !selectedGroupCode || groupCards.length === 0) return;
    const current = groupCards.find((g) => g.groupCode === selectedGroupCode);
    if (!current) return;
    dispatch(fetchGroupTimetable(current.id))
      .unwrap()
      .catch((message) => {
        toast.error(`${message || "Failed to load group timetable"}`);
      });
  }, [apiBase, selectedGroupCode, groupCards, dispatch]);

  const summaryRows = useMemo(() => {
    const seen = new Map();
    normalizedSchedule.forEach((row) => {
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
  }, [normalizedSchedule]);

  const subjectCodeOptions = useMemo(() => {
    if (groupCourses.length > 0) return groupCourses;
    const current = groupCards.find((g) => g.groupCode === selectedGroupCode);
    const fallbackCourses = current?.courses || [];
    return fallbackCourses.map((c) => ({
      id: c?._id || c?.id,
      code: c?.code,
      courseName: c?.courseName,
    }));
  }, [groupCourses, groupCards, selectedGroupCode]);

  const currentSlot =
    normalizedSchedule?.[selectedSlot.dayIndex]?.slots?.[
      selectedSlot.slotIndex
    ] || { code: "FREE", name: "Free", by: "" };

  const [editForm, setEditForm] = useState({
    day: "Mon",
    lecture: 1,
    subject: currentSlot.name,
    faculty: currentSlot.by,
    facultyId: "",
    code: currentSlot.code,
  });

  React.useEffect(() => {
    const matchedFaculty = deptFaculty.find((f) => f.name === currentSlot.by);
    setEditForm({
      day: days[selectedSlot.dayIndex],
      lecture: selectedSlot.slotIndex + 1,
      subject: currentSlot.name,
      faculty: currentSlot.by,
      facultyId: matchedFaculty?.id || "",
      code: currentSlot.code,
    });
  }, [
    selectedGroupCode,
    selectedSlot.dayIndex,
    selectedSlot.slotIndex,
    currentSlot.name,
    currentSlot.by,
    currentSlot.code,
    deptFaculty,
    days,
  ]);

  const applyEdit = () => {
    dispatch(
      applyTimetableEdit({
        day: editForm.day,
        lecture: editForm.lecture,
        code: editForm.code,
        subject: editForm.subject,
        faculty: editForm.faculty,
      })
    );
  };

  const buildNextSchedule = () => {
    const next = normalizedSchedule.map((d) => ({
      ...d,
      slots: d.slots.map((s) => ({ ...s })),
    }));
    const dayIndex = days.indexOf(editForm.day);
    const slotIndex = Math.max(0, Number(editForm.lecture || 1) - 1);
    if (!next[dayIndex] || !next[dayIndex].slots[slotIndex]) return next;
    next[dayIndex].slots[slotIndex] = {
      ...next[dayIndex].slots[slotIndex],
      code: editForm.code || "FREE",
      name: editForm.subject || "Free",
      by: editForm.faculty || "",
    };
    return next;
  };

  const buildCreatePayload = (nextSchedule) => {
    const scheduleSlots = {};
    const courseFacultyMap = new Map();

    nextSchedule.forEach((row) => {
      const dayKey = dayKeyMap[row.day];
      if (!dayKey) return;
      row.slots.forEach((slot, idx) => {
        if (!slot?.code || slot.code === "FREE") return;
        const matchCourse = subjectCodeOptions.find((c) => c.code === slot.code);
        const courseId = matchCourse?.id;
        if (!courseId) return;
        if (!scheduleSlots[dayKey]) scheduleSlots[dayKey] = {};
        scheduleSlots[dayKey][String(idx + 1)] = courseId;

        const matchFaculty = deptFaculty.find((f) => f.name === slot.by);
        if (matchFaculty?.id) {
          const key = `${courseId}-${matchFaculty.id}`;
          courseFacultyMap.set(key, { course: courseId, faculty: matchFaculty.id });
        }
      });
    });

    return {
      scheduleSlots,
      courseFaculty: Array.from(courseFacultyMap.values()),
    };
  };

  const handleSubmitTimetable = async () => {
    if (saving) return;
    const currentGroup = groupCards.find((g) => g.groupCode === selectedGroupCode);
    if (!currentGroup?.id) {
      toast.error("Please select a group first.");
      return;
    }

    const selectedCourse = subjectCodeOptions.find((c) => c.code === editForm.code);
    const derivedFacultyId =
      editForm.facultyId || deptFaculty.find((f) => f.name === editForm.faculty)?.id;

    if (editForm.code !== "FREE" && !selectedCourse?.id) {
      toast.error("Course ID not found for selected subject code.");
      return;
    }

    if (editForm.code !== "FREE" && !derivedFacultyId) {
      toast.error("Please select a faculty for the selected subject.");
      return;
    }

    const dayKey = dayKeyMap[editForm.day];
    if (!dayKey) {
      toast.error("Invalid day selected.");
      return;
    }

    const nextSchedule = buildNextSchedule();
    const putPayload = {
      day: dayKey,
      lectureNumber: Number(editForm.lecture),
      courseId: editForm.code === "FREE" ? null : selectedCourse.id,
      facultyId: editForm.code === "FREE" ? null : derivedFacultyId,
    };

    try {
      setSaving(true);
      const postPayload = buildCreatePayload(nextSchedule);
      await dispatch(
        saveGroupTimetable({
          groupId: currentGroup.id,
          putPayload,
          createPayload: postPayload,
        })
      ).unwrap();

      applyEdit();
      dispatch(fetchGroupTimetable({ groupId: currentGroup.id, silent: true }));
      toast.success("Timetable updated successfully");
    } catch (error) {
      toast.error(
        typeof error === "string" ? error : error?.message || "Failed to update timetable"
      );
    } finally {
      setSaving(false);
    }
  };

  const downloadTimetable = async () => {
    if (downloading) return;
    setDownloading(true);

    const esc = (value = "") =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const toInitials = (name = "") => {
      const words = String(name).trim().split(/\s+/).filter(Boolean);
      if (!words.length) return "";
      if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
      return words.slice(0, 2).map((word) => word[0].toUpperCase()).join("");
    };

    const currentGroup = groupCards.find((g) => g.groupCode === selectedGroupCode);
    const departmentCode =
      currentGroup?.department?.code ||
      currentGroup?.departmentCode ||
      String(selectedGroupCode || "").split("-")[0] ||
      "CSE";
    const semesterTitle =
      currentGroup?.semester != null
        ? `TIME TABLE SEMESTER ${currentGroup.semester}: ${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`
        : `TIME TABLE: ${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`;
    const classTitle = currentGroup?.name || selectedGroupCode || "Group";
    const roomNo = currentGroup?.roomNo || "-";
    const wef = new Date().toLocaleDateString("en-GB").replace(/\//g, ".");

    const slotCell = (slot = {}) => {
      const code = esc(slot.code || "FREE");
      const initials = slot.by ? `(${toInitials(slot.by)})` : "";
      return `
        <div class="tt-sub-code">${code}</div>
        <div class="tt-sub-fac">${esc(initials)}</div>
      `;
    };

    const timetableRowsHtml = normalizedSchedule
      .map((row, dayIndex) => {
        const slots = row.slots || [];
        return `
          <tr>
            <th class="day-name">${esc(row.day)}</th>
            <td>${slotCell(slots[0])}</td>
            <td>${slotCell(slots[1])}</td>
            ${dayIndex === 0 ? '<td class="break-vertical" rowspan="6"><span>BREAK</span></td>' : ""}
            <td>${slotCell(slots[2])}</td>
            <td>${slotCell(slots[3])}</td>
            ${dayIndex === 0 ? '<td class="break-vertical" rowspan="6"><span>LUNCH BREAK</span></td>' : ""}
            <td>${slotCell(slots[4])}</td>
            <td>${slotCell(slots[5])}</td>
            <td>${slotCell(slots[6])}</td>
          </tr>
        `;
      })
      .join("");

    const facultyRowsHtml = summaryRows
      .filter((row) => row.code && row.code !== "FREE")
      .map((row) => `
        <tr>
          <td>${esc(toInitials(row.faculty || ""))}</td>
          <td>${esc(row.faculty || "-")}</td>
          <td>${esc(departmentCode)}</td>
          <td>${esc(row.subjectCode || "-")}</td>
          <td>${esc(row.subjectName || "-")}</td>
          <td>-</td>
        </tr>
      `)
      .join("");

    const html = `
      <html>
        <head>
          <style>
            @page { size: A4 landscape; margin: 6mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 0;
              font-family: "Times New Roman", serif;
              color: #111;
            }
            .sheet {
              width: 100%;
              border: 1px solid #111;
            }
            .uni-title, .sem-title {
              text-align: center;
              font-weight: 700;
              border-bottom: 1px solid #111;
              letter-spacing: 0.2px;
            }
            .uni-title { font-size: 16px; }
            .sem-title { font-size: 14px; }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            th, td {
              border: 1px solid #111;
              text-align: center;
              vertical-align: middle;
              padding: 2px 3px;
              line-height: 1.05;
              font-size: 12px;
            }
            .meta th {
              font-size: 13px;
              font-weight: 700;
            }
            .meta .left { text-align: left; padding-left: 8px; }
            .header-time {
              font-size: 13px;
              font-weight: 700;
            }
            .header-lecture {
              font-size: 14px;
              font-weight: 700;
            }
            .day-time {
              width: 76px;
              font-size: 13px;
              font-weight: 700;
            }
            .day-name {
              width: 64px;
              font-size: 13px;
              font-weight: 700;
            }
            .tt-sub-code {
              font-weight: 700;
              font-size: 12px;
            }
            .tt-sub-fac {
              margin-top: 1px;
              font-size: 12px;
              font-weight: 700;
            }
            .break-vertical {
              width: 28px;
              padding: 0;
            }
            .break-vertical span {
              writing-mode: vertical-rl;
              transform: rotate(180deg);
              display: inline-block;
              font-weight: 700;
              letter-spacing: 1px;
            }
            .faculty-table th { font-size: 12px; font-weight: 700; }
            .footer td { font-size: 12px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="uni-title">HARIDWAR UNIVERSITY, ROORKEE</div>
            <div class="sem-title">${esc(semesterTitle)}</div>
            <table class="meta">
              <tr>
                <th class="left" colspan="4">Class :- ${esc(classTitle)}</th>
                <th colspan="3">Room No- ${esc(roomNo)}</th>
                <th colspan="3">(WEF-${esc(wef)})</th>
              </tr>
            </table>
            <table>
              <thead>
                <tr>
                  <th class="day-time" rowspan="2">Day/<br/>Time</th>
                  <th class="header-lecture">1</th>
                  <th class="header-lecture">2</th>
                  <th class="header-lecture"></th>
                  <th class="header-lecture">3</th>
                  <th class="header-lecture">4</th>
                  <th class="header-lecture"></th>
                  <th class="header-lecture">5</th>
                  <th class="header-lecture">6</th>
                  <th class="header-lecture">7</th>
                </tr>
                <tr>
                  <th class="header-time">${esc(lectureSlots[0])}</th>
                  <th class="header-time">${esc(lectureSlots[1])}</th>
                  <th class="header-time"></th>
                  <th class="header-time">${esc(lectureSlots[2])}</th>
                  <th class="header-time">${esc(lectureSlots[3])}</th>
                  <th class="header-time"></th>
                  <th class="header-time">${esc(lectureSlots[4])}</th>
                  <th class="header-time">${esc(lectureSlots[5])}</th>
                  <th class="header-time">${esc(lectureSlots[6])}</th>
                </tr>
              </thead>
              <tbody>
                ${timetableRowsHtml}
              </tbody>
            </table>
            <table class="faculty-table">
              <thead>
                <tr>
                  <th>FACULTY INITIALS</th>
                  <th>FACULTY NAME</th>
                  <th>DEPARTMENT</th>
                  <th>SUBJECT CODE</th>
                  <th>SUBJECT NAME</th>
                  <th>LTP</th>
                </tr>
              </thead>
              <tbody>
                ${facultyRowsHtml || '<tr><td colspan="6">No subject mapping available</td></tr>'}
              </tbody>
            </table>
            <table class="footer">
              <tr>
                <td>Class Teacher- ____________________</td>
                <td>Head of Department- ____________________</td>
                <td>OSD- ____________________</td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `;

    downloadPdfFromHtml(apiBase, {
      html,
      fileName: `${selectedGroupCode || "group"}_timetable.pdf`,
      fallbackToPrint: false,
    }).catch((error) => {
      toast.error(error.response?.data?.message || "Failed to download timetable PDF");
    });
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
    centerPadding: "28px",
    slidesToShow: 3,
    slidesToScroll: 1,
    speed: 500,
    arrows: true,
    dots: false,
    responsive: [
      {
        breakpoint: 1200,
        settings: { slidesToShow: 2, slidesToScroll: 1, centerPadding: "20px" },
      },
      {
        breakpoint: 900,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          centerMode: false,
          centerPadding: "0px",
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          centerMode: false,
          centerPadding: "0px",
        },
      },
    ],
  };

  const renderState = () => {
    if (loadState === ADMIN_LOAD_STATES.PENDING) {
      return (
        <div className="tt-state pending app-loader-state">
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
              className="tt-download-btn admin-btn-with-loader"
              type="button"
              onClick={downloadTimetable}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <ClipLoader size={15} color="#0f172a" trackColor="rgba(15, 23, 42, 0.2)" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <FiDownload />
                  <span>Download</span>
                </>
              )}
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
                        dispatch(setSelectedGroupCode(g.groupCode));
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
                    onChange={(e) =>
                      dispatch(setSelectedGroupCode(e.target.value))
                    }
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
                    {lectureSlots.map((s, i) => (
                      <React.Fragment key={s}>
                        {(i === 2 || i === 4) && (
                          <div className="tt-calendar-cell tt-break-head">
                            {i === 2 ? "Break" : "Lunch Break"}
                          </div>
                        )}
                        <div className="tt-calendar-cell tt-slot">
                          <span className="tt-slot-no">{i + 1}</span>
                          <span>{s}</span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  {normalizedSchedule.map((row) => (
                    <div key={row.day} className="tt-calendar-row">
                      <div className="tt-calendar-cell tt-label">
                        {row.day}
                      </div>
                      {row.slots.map((slot, idx) => (
                        <React.Fragment key={`${row.day}-${idx}`}>
                          {(idx === 2 || idx === 4) && (
                            <div className="tt-calendar-cell tt-break-col">
                              {idx === 2 ? "Break" : "Lunch Break"}
                            </div>
                          )}
                          <div className="tt-calendar-cell">
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
                        </React.Fragment>
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
                  {lectureSlots.map((s, i) => (
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
                    const match = subjectCodeOptions.find((c) => c.code === code);
                    setEditForm((prev) => ({
                      ...prev,
                      code,
                      subject: match ? match.courseName : "",
                    }));
                  }}
                >
                  <option value="FREE">FREE</option>
                  {subjectCodeOptions.map((c) => (
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
                  value={editForm.facultyId}
                  onChange={(e) => {
                    const nextFacultyId = e.target.value;
                    const match = deptFaculty.find(
                      (f) => String(f.id) === String(nextFacultyId)
                    );
                    setEditForm((prev) => ({
                      ...prev,
                      facultyId: nextFacultyId,
                      faculty: match?.name || "",
                    }));
                  }}
                >
                  <option value="">Select Faculty</option>
                  {deptFaculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="tt-submit admin-btn-with-loader"
                type="button"
                onClick={handleSubmitTimetable}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <ClipLoader size={15} />
                    <span>Saving...</span>
                  </>
                ) : (
                  "Submit"
                )}
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
