import { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Menu, PencilLine } from "lucide-react";
import axios from "../../utils/axiosInstance";
import toast from "react-hot-toast";
import ModernDatePicker from "../common/ModernDatePicker";
import Sidebar from "./Sidebar";
import NavBar from "./NavBar";
import {
  fetchFacultyProfile,
  selectIsSidebarOpen,
  setActiveSection,
  setSidebarOpen,
  toggleSidebar,
} from "../../redux/facultyDashboardSlice";

export default function FacultyEditProfile({ embedded = false, onClose = null, onSaved = null }) {
  const apiBase = useSelector((s) => s.config.apiBase);
  const userData = useSelector((s) => s.user.userData);
  const facultyProfile = useSelector((s) => s.facultyDashboard.facultyProfile) || userData;
  const isSidebarOpen = useSelector(selectIsSidebarOpen);
  const faculty = facultyProfile?.facultyDetails || facultyProfile?.roleDetails || {};
  const user = facultyProfile?.user || {};
  const roleDetails = facultyProfile?.roleDetails || {};
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const defaultUniversityName = "Haridwar university";

  const defaultForm = useMemo(() => ({
    phoneNumber: user.phoneNumber || "",
    DOB: user.DOB ? user.DOB.split("T")[0] : (user.DOB || ""),
    gender: user.gender || "",
    aadharNumber: user.aadharNumber || "",
    qualification: faculty.qualification || "",
    specialization: faculty.specialization || "",
    university: faculty.university || defaultUniversityName,
  }), [
    user.phoneNumber,
    user.DOB,
    user.gender,
    user.aadharNumber,
    faculty.qualification,
    faculty.specialization,
    faculty.university,
    defaultUniversityName,
  ]);

  const [form, setForm] = useState(defaultForm);
  const [isDirty, setIsDirty] = useState(false);
  const activeForm = isDirty ? form : defaultForm;
  const facultyData = facultyProfile || userData;

  useEffect(() => {
    if (embedded) return;
    dispatch(setActiveSection("profile"));
  }, [dispatch, embedded]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setIsDirty(true);
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        phoneNumber: activeForm.phoneNumber || undefined,
        DOB: activeForm.DOB || undefined,
        gender: activeForm.gender || undefined,
        aadharNumber: activeForm.aadharNumber || undefined,
        qualification: activeForm.qualification || undefined,
        specialization: activeForm.specialization || undefined,
        university: activeForm.university || defaultUniversityName,
      };

      const url = `${apiBase}/faculty/me`;
      await axios.put(url, payload, { withCredentials: true });
      toast.success("Profile updated");
      await dispatch(fetchFacultyProfile({ apiBase }));
      if (typeof onSaved === "function") onSaved();
      if (embedded && typeof onClose === "function") {
        onClose();
      } else {
        navigate("/faculty/faculty-dashboard");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to update profile";
      toast.error(msg);
    }
  };

  const handleClose = () => {
    if (typeof onClose === "function") {
      onClose();
      return;
    }
    navigate(-1);
  };

  const closeSidebar = () => {
    dispatch(setSidebarOpen(false));
  };

  const formSection = (
    <section className={`${embedded ? "h-full w-full px-0.5 pb-0.5 sm:px-3" : "w-full"}`}>
      <div className={`mx-auto border border-blue-100 bg-white/95 shadow-[0_14px_34px_rgba(15,23,42,0.14)] ${embedded ? "max-h-[calc(100dvh-100px)] max-w-[740px] overflow-y-auto overscroll-contain rounded-2xl p-3 pb-5 sm:max-h-[calc(100dvh-116px)] sm:rounded-3xl sm:p-5 md:p-6" : "max-w-[980px] rounded-3xl p-4 sm:p-5 md:p-6"}`}>
        <div className="mb-4">
          <div className="mb-3 flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              onClick={handleClose}
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <h1 className="m-0 inline-flex items-center gap-2 text-[1.65rem] font-bold leading-tight text-slate-900 sm:text-2xl">
              <PencilLine size={19} />
              Edit Profile
            </h1>
          </div>
          <p className="text-sm text-slate-600">You can edit profile fields except Name, Email and Designation.</p>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2.5 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</span>
            <strong className="mt-1 block text-[1rem] text-slate-900 sm:text-[1.05rem]">{user?.name || "N/A"}</strong>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span>
            <strong className="mt-1 block text-[1rem] text-slate-900 break-all sm:text-[1.05rem]">{user?.email || "N/A"}</strong>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Designation</span>
            <strong className="mt-1 block text-[1rem] text-slate-900 sm:text-[1.05rem]">{roleDetails?.designation || faculty?.designation || "Faculty"}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <label className="flex flex-col gap-1.5 md:col-span-6">
            <span className="text-sm font-semibold text-slate-700">Phone</span>
            <input
              name="phoneNumber"
              value={activeForm.phoneNumber}
              onChange={handleChange}
              placeholder="Enter phone number"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="flex flex-col gap-1.5 md:col-span-6">
            <span className="text-sm font-semibold text-slate-700">Date of Birth</span>
            <ModernDatePicker
              name="DOB"
              value={activeForm.DOB}
              onChange={handleChange}
              max={new Date().toISOString().slice(0, 10)}
            />
          </label>

          <label className="flex flex-col gap-1.5 md:col-span-6">
            <span className="text-sm font-semibold text-slate-700">Gender</span>
            <select
              name="gender"
              value={activeForm.gender}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 md:col-span-6">
            <span className="text-sm font-semibold text-slate-700">Aadhar Number</span>
            <input
              name="aadharNumber"
              value={activeForm.aadharNumber}
              onChange={handleChange}
              placeholder="Enter aadhar number"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="flex flex-col gap-1.5 md:col-span-6">
            <span className="text-sm font-semibold text-slate-700">Qualification</span>
            <input
              name="qualification"
              value={activeForm.qualification}
              onChange={handleChange}
              placeholder="Enter qualification"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="flex flex-col gap-1.5 md:col-span-6">
            <span className="text-sm font-semibold text-slate-700">Specialization</span>
            <input
              name="specialization"
              value={activeForm.specialization}
              onChange={handleChange}
              placeholder="Enter specialization"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="flex flex-col gap-1.5 md:col-span-12">
            <span className="text-sm font-semibold text-slate-700">University</span>
            <input
              name="university"
              value={activeForm.university}
              onChange={handleChange}
              placeholder="Enter university name"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <div className="mt-3 flex flex-col-reverse gap-2 sm:mt-2 sm:flex-row sm:flex-wrap sm:justify-end md:col-span-12">
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-cyan-700 hover:to-blue-700 sm:w-auto"
            >
              <PencilLine size={16} />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </section>
  );

  if (embedded) {
    return formSection;
  }

  return (
    <>
      <NavBar facultyData={facultyData} />

      {!isSidebarOpen && (
        <button
          type="button"
          className="fixed left-0 top-[74px] z-[95] inline-flex h-10 w-10 items-center justify-center rounded-r-lg border border-white/20 bg-[#0b2d6b] text-white transition-colors duration-200 hover:bg-[#10398a]"
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Open sidebar"
          aria-expanded={isSidebarOpen}
        >
          <Menu size={20} />
        </button>
      )}

      <div className="relative mt-[74px] flex min-h-[calc(100dvh-74px)] bg-[#f2f6fb]">
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,#f4f8fc_0%,#eef3f9_65%,#ecf1f7_100%)]"
          aria-hidden="true"
        />

        <div
          className={`fixed inset-0 z-[45] bg-black/35 transition-opacity duration-200 lg:hidden ${
            isSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={closeSidebar}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />

        <Sidebar facultyData={facultyData} isSidebarOpen={isSidebarOpen} />

        <main
          className={`relative z-[1] min-w-0 flex-1 overflow-x-hidden p-[clamp(16px,2.2vw,26px)] pt-[max(20px,clamp(16px,2.2vw,26px))] transition-[margin] duration-300 ${
            isSidebarOpen ? "lg:ml-[292px]" : "lg:ml-0"
          }`}
        >
          {formSection}
        </main>
      </div>
    </>
  );
}
