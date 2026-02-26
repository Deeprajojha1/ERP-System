import React, { useState, useMemo } from "react";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import StudentStats from "./StudentStats";
import StudentFilters from "./StudentFilters";
import StudentTable from "./StudentTable";
import StudentDrawer from "./StudentDrawer";
import { studentsData, getStudentStats } from "./studentMockData";
import { profile, sidebarItems } from "./mockData";

function StudentManagement() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("all");
  const [selectedRoom, setSelectedRoom] = useState("all");
  const [selectedOutpass, setSelectedOutpass] = useState("all");
  const [selectedFeeStatus, setSelectedFeeStatus] = useState("all");

  // Current date
  const currentDate = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    []
  );

  // Get statistics
  const stats = useMemo(() => getStudentStats(studentsData), []);

  // Filter students
  const filteredStudents = useMemo(() => {
    let filtered = [...studentsData];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (student) =>
          student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Floor filter
    if (selectedFloor !== "all") {
      filtered = filtered.filter((student) => student.floor === parseInt(selectedFloor));
    }

    // Room filter
    if (selectedRoom !== "all") {
      filtered = filtered.filter((student) => student.room === selectedRoom);
    }

    // Outpass status filter
    if (selectedOutpass !== "all") {
      filtered = filtered.filter((student) => student.outpassStatus === selectedOutpass);
    }

    // Fee status filter
    if (selectedFeeStatus !== "all") {
      filtered = filtered.filter((student) => student.feeStatus === selectedFeeStatus);
    }

    return filtered;
  }, [searchQuery, selectedFloor, selectedRoom, selectedOutpass, selectedFeeStatus]);

  // Handle view details
  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setIsDrawerOpen(true);
  };

  // Handle close drawer
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => {
      setSelectedStudent(null);
    }, 300);
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedFloor("all");
    setSelectedRoom("all");
    setSelectedOutpass("all");
    setSelectedFeeStatus("all");
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-[#f8fbff] via-[#eef4ff] to-[#f4f7fb] text-gray-900">
      {/* Desktop Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
        items={sidebarItems}
      />

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          />
          <div className="relative h-full w-72 border-r border-gray-200 bg-white p-4 shadow-xl">
            <Sidebar
              isCollapsed={false}
              onToggle={() => setIsMobileSidebarOpen(false)}
              items={sidebarItems}
              mobile
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="min-h-screen flex-1">
        <TopNavbar
          currentDate={currentDate}
          profile={profile}
          onMobileMenuToggle={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

        <main className="p-6">
          {/* Page Header */}
          <section className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Students</h1>
            <p className="mt-2 text-gray-600">
              Monitor and manage hostel students
            </p>
          </section>

          {/* Summary Stats */}
          <StudentStats stats={stats} />

          {/* Filters */}
          <StudentFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedFloor={selectedFloor}
            setSelectedFloor={setSelectedFloor}
            selectedRoom={selectedRoom}
            setSelectedRoom={setSelectedRoom}
            selectedOutpass={selectedOutpass}
            setSelectedOutpass={setSelectedOutpass}
            selectedFeeStatus={selectedFeeStatus}
            setSelectedFeeStatus={setSelectedFeeStatus}
            onReset={handleResetFilters}
            students={studentsData}
          />

          {/* Results Count */}
          <div className="mb-4 text-sm text-gray-600">
            Found <span className="font-semibold text-gray-900">{filteredStudents.length}</span> of{" "}
            <span className="font-semibold text-gray-900">{studentsData.length}</span> students
          </div>

          {/* Students Table */}
          {filteredStudents.length > 0 ? (
            <StudentTable students={filteredStudents} onViewDetails={handleViewDetails} />
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
              <p className="text-gray-600">No students found matching your filters.</p>
            </div>
          )}
        </main>
      </div>

      {/* Student Details Drawer */}
      <StudentDrawer
        student={selectedStudent}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}

export default StudentManagement;
