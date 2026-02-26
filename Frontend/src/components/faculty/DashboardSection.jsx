import { Calendar, Clock, Users, BookOpen, Bell, AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ClipLoader } from "react-spinners";
import { ADMIN_LOAD_STATES } from "../../Admin/constants/loadStates";
import { facultyUi } from "./uiTokens";
import {
  fetchFacultyAlerts,
  selectFacultyAlerts,
  selectFacultyAlertsLoadState,
} from "../../redux/facultyDashboardSlice";

const PRIORITY_ACCENT_CLASS = {
  urgent: "border-l-red-500",
  warning: "border-l-amber-500",
  info: "border-l-blue-500",
};

const PRIORITY_BADGE_CLASS = {
  urgent: "bg-red-100 text-red-800",
  warning: "bg-amber-100 text-amber-800",
  info: "bg-blue-100 text-blue-800",
};

const STATUS_BADGE_CLASS = {
  completed: "bg-emerald-100 text-emerald-900",
  ongoing: "bg-amber-100 text-amber-900",
  scheduled: "bg-gray-200 text-gray-700",
};

export default function DashboardSection({ facultyData, isScheduleLoading = false }) {
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);
  const alerts = useSelector(selectFacultyAlerts);
  const alertsLoadState = useSelector(selectFacultyAlertsLoadState);
  
  const todaySchedule = Array.isArray(facultyData?.todaySchedule)
    ? facultyData.todaySchedule
    : [];
  const facultyName = facultyData?.user?.name || "Faculty";
  const departmentName = 
    facultyData?.facultyDetails?.department?.name || 
    facultyData?.roleDetails?.department?.name || 
    "Department";
  const designation = 
    facultyData?.facultyDetails?.designation || 
    facultyData?.roleDetails?.designation || 
    "Faculty";
  const employeeId = 
    facultyData?.facultyDetails?.employeeId || 
    facultyData?.roleDetails?.employeeId || 
    "";
  const alertsLoading = alertsLoadState === ADMIN_LOAD_STATES.PENDING;

  useEffect(() => {
    if (!apiBase || alertsLoadState !== ADMIN_LOAD_STATES.INITIAL) return;
    dispatch(fetchFacultyAlerts({ apiBase }));
  }, [apiBase, alertsLoadState, dispatch]);

  // Get current time to determine class status
  const getCurrentStatus = (lectureNumber) => {
    const currentHour = new Date().getHours();
    const lectureStartHours = [8, 9, 10, 11, 13, 14, 15, 16];
    const lectureHour = lectureStartHours[lectureNumber - 1] || 8;

    if (currentHour > lectureHour) return { label: "Completed", color: "completed" };
    if (currentHour === lectureHour) return { label: "Ongoing", color: "ongoing" };
    return { label: "Scheduled", color: "scheduled" };
  };

  const getLectureTime = (lectureNumber) => {
    const times = [
      ["08:30", "09:20"],
      ["09:30", "10:20"],
      ["10:30", "11:20"],
      ["11:30", "12:20"],
      ["13:00", "13:50"],
      ["14:00", "14:50"],
      ["15:00", "15:50"],
      ["16:00", "16:50"],
    ];
    return times[lectureNumber - 1] || ["--:--", "--:--"];
  };

  const nextClass = !todaySchedule.length
    ? null
    : [...todaySchedule].sort(
        (a, b) => Number(a.lectureNumber || 0) - Number(b.lectureNumber || 0)
      )[0];

  const classesByStatus = todaySchedule.reduce(
    (acc, lecture) => {
      const status = getCurrentStatus(lecture.lectureNumber).color;
      if (status === "completed") acc.completed += 1;
      if (status === "ongoing") acc.ongoing += 1;
      if (status === "scheduled") acc.scheduled += 1;
      return acc;
    },
    { completed: 0, ongoing: 0, scheduled: 0 }
  );

  return (
    <section className={facultyUi.page}>
      <div className={facultyUi.pageHeader}>
        <div>
          <h2 className={facultyUi.title}>Welcome back, {facultyName.split(" ").pop()}!</h2>
          <p className={facultyUi.subtitle}>Here is your academic overview for today</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`${facultyUi.statCard} flex flex-col gap-2`}>
          <div className="flex items-center justify-between gap-2">
            <p className="m-0 text-sm font-medium text-slate-500">Today's Classes</p>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-blue-100 text-blue-700">
              <Users size={20} />
            </div>
          </div>
          <p className="m-0 bg-gradient-to-br from-blue-700 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">
            {isScheduleLoading ? <ClipLoader size={24} color="#0f5ed7" /> : todaySchedule.length}
          </p>
          <p className="m-0 text-xs text-slate-500">{facultyData?.today || "Today"}</p>
        </div>

        <div className={`${facultyUi.statCard} flex flex-col gap-2`}>
          <div className="flex items-center justify-between gap-2">
            <p className="m-0 text-sm font-medium text-slate-500">Department</p>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-emerald-100 text-emerald-800">
              <BookOpen size={20} />
            </div>
          </div>
          <p className="m-0 bg-gradient-to-br from-blue-700 to-cyan-600 bg-clip-text text-xl font-bold text-transparent">
            {departmentName}
          </p>
          <p className="m-0 text-xs text-slate-500">Active</p>
        </div>

        <div className={`${facultyUi.statCard} flex flex-col gap-2`}>
          <div className="flex items-center justify-between gap-2">
            <p className="m-0 text-sm font-medium text-slate-500">Designation</p>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-violet-100 text-violet-700">
              <Calendar size={20} />
            </div>
          </div>
          <p className="m-0 bg-gradient-to-br from-blue-700 to-cyan-600 bg-clip-text text-lg font-bold text-transparent">
            {designation}
          </p>
          <p className="m-0 text-xs text-slate-500">{employeeId}</p>
        </div>

        <div className={`${facultyUi.statCard} flex flex-col gap-2`}>
          <div className="flex items-center justify-between gap-2">
            <p className="m-0 text-sm font-medium text-slate-500">Next Class</p>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-amber-100 text-amber-800">
              <Clock size={20} />
            </div>
          </div>
          <p className="m-0 bg-gradient-to-br from-blue-700 to-cyan-600 bg-clip-text text-xl font-bold text-transparent">
            {nextClass ? getLectureTime(nextClass.lectureNumber)[0] : "No classes"}
          </p>
          <p className="m-0 text-xs text-slate-500">
            {nextClass ? nextClass.course?.courseName?.substring(0, 20) : "Today"}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className={`${facultyUi.panel} mb-[18px] w-full overflow-x-hidden xl:col-span-1 xl:mx-auto xl:max-w-[700px]`}>
          <h3 className="m-0 mb-4 text-lg font-bold tracking-[0.2px] text-slate-900">Today's Schedule</h3>
          {isScheduleLoading ? (
            <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
              <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg bg-slate-50/70">
                <ClipLoader size={28} color="#0284c7" />
                <span className="text-sm font-semibold text-slate-600">Loading today's schedule</span>
              </div>
            </div>
          ) : todaySchedule.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">
              <Calendar size={48} color="#94a3b8" />
              <p className="m-0 mt-4">No classes scheduled for today</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="mb-1 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-cyan-50 px-[10px] py-1 text-[11px] font-bold tracking-[0.2px] text-cyan-700">
                  Ongoing: {classesByStatus.ongoing}
                </span>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-[10px] py-1 text-[11px] font-bold tracking-[0.2px] text-blue-700">
                  Scheduled: {classesByStatus.scheduled}
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-[10px] py-1 text-[11px] font-bold tracking-[0.2px] text-emerald-700">
                  Completed: {classesByStatus.completed}
                </span>
              </div>
              {todaySchedule.map((lecture) => {
                const [startTime, endTime] = getLectureTime(lecture.lectureNumber);
                const status = getCurrentStatus(lecture.lectureNumber);
                return (
                  <div key={lecture.lectureNumber} className="flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-gradient-to-br from-sky-50 to-slate-100 p-[14px] transition duration-200 hover:border-blue-200 hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:gap-4">
                    <div className="min-w-20 shrink-0 text-center">
                      <p className="m-0 mb-[2px] text-[13px] font-semibold text-slate-900">Lecture {lecture.lectureNumber}</p>
                      <p className="m-0 text-[11px] text-slate-500">
                        {startTime} - {endTime}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 mb-1 text-[15px] font-semibold text-slate-900">{lecture.course?.courseName || "Course"}</p>
                      <p className="m-0 text-[13px] text-slate-500">
                        {lecture.course?.code || ""} | {lecture.group?.name || "Group"} | Room {lecture.group?.roomNo || "N/A"}
                      </p>
                    </div>
                    <span className={`whitespace-nowrap rounded-[20px] px-3 py-1 text-xs font-semibold sm:shrink-0 ${STATUS_BADGE_CLASS[status.color] || STATUS_BADGE_CLASS.scheduled}`}>{status.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={`${facultyUi.panel} mb-[18px] overflow-x-hidden xl:col-span-1`}>
          <h3 className="m-0 mb-4 inline-flex items-center text-lg font-bold tracking-[0.2px] text-slate-900">
            <Bell size={20} className="mr-2" />
            Notifications
          </h3>
          {alertsLoading ? (
            <div className="flex min-h-52 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/70">
              <ClipLoader size={24} color="#0284c7" />
              <span className="text-sm font-medium text-slate-600">Loading notifications...</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">
              <AlertCircle size={48} color="#94a3b8" />
              <p className="m-0 mt-4">No notifications</p>
            </div>
          ) : (
            <div className="flex max-h-[500px] flex-col gap-4 overflow-y-auto">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert._id}
                  className={`rounded-lg border-l-4 bg-gray-50 p-4 transition duration-200 hover:translate-x-1 hover:bg-gray-100 ${PRIORITY_ACCENT_CLASS[alert.priority] || PRIORITY_ACCENT_CLASS.info}`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h4 className="m-0 flex-1 text-[0.95rem] font-semibold text-gray-900">{alert.title}</h4>
                    <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[0.75rem] font-semibold uppercase ${PRIORITY_BADGE_CLASS[alert.priority] || PRIORITY_BADGE_CLASS.info}`}>{alert.priority}</span>
                  </div>
                  <p className="m-0 mb-2 line-clamp-3 text-sm leading-6 text-gray-600">{alert.message}</p>
                  <p className="m-0 text-xs text-gray-400">
                    {new Date(alert.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
