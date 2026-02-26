import { useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { facultyUi } from "./uiTokens";

const DAYS_OF_WEEK = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
];

const LECTURE_SLOTS = [
  { id: "1", label: "08:30 - 09:20" },
  { id: "2", label: "09:30 - 10:20" },
  { id: "3", label: "10:30 - 11:20" },
  { id: "4", label: "11:30 - 12:20" },
  { id: "5", label: "13:00 - 13:50" },
  { id: "6", label: "14:00 - 14:50" },
  { id: "7", label: "15:00 - 15:50" },
  { id: "8", label: "16:00 - 16:50" },
];

const getSlotLabel = (slotId) =>
  LECTURE_SLOTS.find((slot) => slot.id === String(slotId))?.label ||
  `Lecture ${slotId}`;

const getCurrentDayIndex = () => {
  const jsDay = new Date().getDay();
  if (jsDay === 0) return 0;
  return Math.min(jsDay - 1, DAYS_OF_WEEK.length - 1);
};

export default function FacultyScheduleSection({ facultyData }) {
  const [viewMode, setViewMode] = useState("week");
  const [selectedDay, setSelectedDay] = useState(getCurrentDayIndex());

  const routine = facultyData?.roleDetails?.routine || facultyData?.facultyDetails?.routine;

  const schedule = useMemo(() => {
    const scheduleMap = {};

    DAYS_OF_WEEK.forEach((day) => {
      scheduleMap[day.id] = {};
      const sourceRoutine = routine || {};
      const dayData =
        sourceRoutine[day.id] ||
        sourceRoutine[day.label] ||
        sourceRoutine[day.label.toLowerCase()] ||
        {};

      Object.entries(dayData).forEach(([slot, item]) => {
        if (item?.course && item?.group) {
          scheduleMap[day.id][slot] = {
            course: item.course,
            group: item.group,
            slot,
          };
        }
      });
    });

    return scheduleMap;
  }, [routine]);

  const daySchedule = useMemo(() => {
    const dayId = DAYS_OF_WEEK[selectedDay]?.id;
    const selected = schedule[dayId] || {};
    return Object.values(selected).sort(
      (a, b) => Number(a.slot || 0) - Number(b.slot || 0)
    );
  }, [schedule, selectedDay]);

  const totalClasses = useMemo(
    () =>
      Object.values(schedule).reduce(
        (total, dayMap) => total + Object.keys(dayMap).length,
        0
      ),
    [schedule]
  );

  const navigateDay = (direction) => {
    setSelectedDay((prev) => {
      const next = prev + direction;
      if (next < 0) return DAYS_OF_WEEK.length - 1;
      if (next >= DAYS_OF_WEEK.length) return 0;
      return next;
    });
  };

  return (
    <section className={facultyUi.page}>
      <div className={facultyUi.pageHeader}>
        <div>
          <h2 className={facultyUi.title}>My Schedule</h2>
          <p className={facultyUi.subtitle}>View your weekly teaching schedule</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
              viewMode === "day"
                ? "bg-cyan-600 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => setViewMode("day")}
          >
            Day View
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
              viewMode === "week"
                ? "bg-cyan-600 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => setViewMode("week")}
          >
            Week View
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={`${facultyUi.statCard} relative overflow-hidden`}>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total Classes</span>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-blue-100">
              <Calendar size={20} color="#2563eb" />
            </div>
          </div>
          <p className="m-0 bg-gradient-to-br from-blue-700 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">
            {totalClasses}
          </p>
          <p className="mt-1 text-xs text-slate-500">This week</p>
        </div>
        <div className={`${facultyUi.statCard} relative overflow-hidden`}>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Today's Classes</span>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-emerald-100">
              <Clock size={20} color="#10b981" />
            </div>
          </div>
          <p className="m-0 bg-gradient-to-br from-blue-700 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">
            {Object.keys(schedule[DAYS_OF_WEEK[getCurrentDayIndex()]?.id] || {}).length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {DAYS_OF_WEEK[getCurrentDayIndex()]?.label}
          </p>
        </div>
      </div>

      {viewMode === "day" ? (
        <div className={facultyUi.panel}>
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100"
              onClick={() => navigateDay(-1)}
            >
              <ChevronLeft size={20} />
            </button>
            <h3 className="m-0 inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
              {DAYS_OF_WEEK[selectedDay]?.label}
              {selectedDay === getCurrentDayIndex() && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  Today
                </span>
              )}
            </h3>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100"
              onClick={() => navigateDay(1)}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {daySchedule.length === 0 ? (
            <div className={facultyUi.empty}>
              <Calendar size={48} color="#94a3b8" />
              <p className="m-0 mt-3">
                No classes scheduled for {DAYS_OF_WEEK[selectedDay]?.label}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {daySchedule.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.05)] md:grid-cols-[200px_1fr_auto]"
                >
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Clock size={16} />
                    <span>{getSlotLabel(item.slot)}</span>
                  </div>
                  <div>
                    <h4 className="m-0 text-base font-semibold text-slate-900">
                      {item.course?.courseName || item.course?.title || "Course"}
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">{item.course?.code || "N/A"}</p>
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-slate-600">
                    <div className="inline-flex items-center gap-1.5">
                      <Users size={14} />
                      <span>{item.group?.name || "Group"}</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                      <MapPin size={14} />
                      <span>{item.group?.roomNo || "TBA"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={`${facultyUi.panel} relative overflow-hidden`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 opacity-70" />
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="m-0 inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <Sparkles size={14} /> Weekly Matrix
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[840px] w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Time
                  </th>
                  {DAYS_OF_WEEK.map((day, index) => (
                    <th
                      key={day.id}
                      className={`border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide ${
                        index === getCurrentDayIndex() ? "text-cyan-700" : "text-slate-500"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {day.label.substring(0, 3)}
                        {index === getCurrentDayIndex() ? (
                          <span className="inline-block h-2 w-2 rounded-full bg-cyan-600" />
                        ) : null}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LECTURE_SLOTS.map((slot) => (
                  <tr key={slot.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="border-b border-slate-100 px-3 py-2 text-xs text-slate-600">
                      {slot.label}
                    </td>
                    {DAYS_OF_WEEK.map((day, dayIndex) => {
                      const classItem = schedule[day.id]?.[slot.id];
                      return (
                        <td
                          key={day.id}
                          className={`border-b border-slate-100 px-2 py-2 align-top ${
                            dayIndex === getCurrentDayIndex() ? "bg-white" : ""
                          }`}
                        >
                          {classItem ? (
                            <div className={`rounded-lg border px-2 py-1.5 shadow-[0_4px_10px_rgba(8,145,178,0.12)] ${
                              dayIndex === getCurrentDayIndex()
                                ? "border-cyan-300 bg-[linear-gradient(180deg,#effbff_0%,#d8f5ff_100%)]"
                                : "border-cyan-200 bg-[linear-gradient(180deg,#f4fdff_0%,#e6f8ff_100%)]"
                            }`}>
                              <span className="block text-xs font-semibold text-cyan-800">
                                {classItem.course?.code || "Course"}
                              </span>
                              <span className="block text-[11px] text-cyan-700">
                                {classItem.group?.name || ""}
                              </span>
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
