import React, { useState, useMemo } from 'react';
import { FileText, AlertTriangle, Loader, CheckCircle2 } from 'lucide-react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import StatCard from './StatCard';
import ComplaintTable from './ComplaintTable';
import ComplaintDrawer from './ComplaintDrawer';
import { complaintsMock, currentStudent, getComplaintStats } from './complaintMockData';
import { mockData, sidebarItems } from './mockData';

const ComplaintManagement = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [complaints, setComplaints] = useState(complaintsMock);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Get profile and date from mock data
  const profile = mockData.profile;
  const currentDate = mockData.currentDate;

  // Calculate stats
  const stats = useMemo(() => getComplaintStats(complaints), [complaints]);

  // Summary cards data
  const summaryCards = [
    {
      id: 1,
      title: 'Total Complaints',
      value: stats.total,
      icon: FileText,
      color: 'blue',
      trend: null,
    },
    {
      id: 2,
      title: 'Pending',
      value: stats.pending,
      icon: AlertTriangle,
      color: 'yellow',
      trend: null,
    },
    {
      id: 3,
      title: 'In Progress',
      value: stats.inProgress,
      icon: Loader,
      color: 'blue',
      trend: null,
    },
    {
      id: 4,
      title: 'Resolved',
      value: stats.resolved,
      icon: CheckCircle2,
      color: 'green',
      trend: null,
    },
  ];

  // Handle view details
  const handleViewDetails = (complaint) => {
    setSelectedComplaint(complaint);
    setIsDrawerOpen(true);
  };

  // Handle status change
  const handleStatusChange = (complaintId, newStatus, remarks) => {
    // TODO: API Integration - PATCH /api/warden/complaints/:id
    // Make API call: updateComplaint(complaintId, { status: newStatus, remarks, updatedAt: new Date() })
    
    setComplaints((prevComplaints) =>
      prevComplaints.map((complaint) => {
        if (complaint.id === complaintId) {
          const newTimeline = [
            ...complaint.timeline,
            {
              status: newStatus,
              timestamp: new Date().toISOString(),
              note: remarks || `Status updated to ${newStatus}`,
            },
          ];
          return {
            ...complaint,
            status: newStatus,
            remarks: remarks || complaint.remarks,
            updatedAt: new Date().toISOString(),
            timeline: newTimeline,
          };
        }
        return complaint;
      })
    );
    
    // Update selected complaint to show changes immediately
    setSelectedComplaint((prevComplaint) => {
      if (prevComplaint && prevComplaint.id === complaintId) {
        const newTimeline = [
          ...prevComplaint.timeline,
          {
            status: newStatus,
            timestamp: new Date().toISOString(),
            note: remarks || `Status updated to ${newStatus}`,
          },
        ];
        return {
          ...prevComplaint,
          status: newStatus,
          remarks: remarks || prevComplaint.remarks,
          updatedAt: new Date().toISOString(),
          timeline: newTimeline,
        };
      }
      return prevComplaint;
    });
  };

  // Close drawer
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => {
      setSelectedComplaint(null);
    }, 300);
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
          {/* Header */}
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Complaint Management</h1>
            <p className="text-sm text-gray-600">Report and track hostel issues</p>
          </header>

          {/* Summary Cards */}
          <section aria-label="Complaint Summary" className="mb-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <StatCard key={card.id} {...card} />
              ))}
            </div>
          </section>

          {/* Complaint History */}
          <section aria-label="Complaint History">
            <ComplaintTable
              complaints={complaints}
              onViewDetails={handleViewDetails}
            />
          </section>
        </main>
      </div>

      {/* Complaint Details Drawer */}
      <ComplaintDrawer
        complaint={selectedComplaint}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default ComplaintManagement;
