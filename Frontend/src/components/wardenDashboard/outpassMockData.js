// Mock data for Student Outpass Management
// Integration point: Replace with API calls to backend endpoints

export const currentStudent = {
  id: "ST2023045",
  name: "Neha Patel",
  room: "B-214",
  hostel: "Girls Hostel A",
  phone: "+91 9876543210",
};

export const outpassesData = [
  {
    id: "OP2026001",
    studentId: "ST2023045",
    fromDate: "2026-02-28T10:00:00",
    toDate: "2026-03-02T20:00:00",
    destination: "Home - Mumbai",
    reason: "Family function - Sister's wedding",
    emergencyContact: "+91 9876543210",
    parentContact: "+91 9123456789",
    status: "Approved",
    appliedAt: "2026-02-25T09:30:00",
    approvedBy: "Dr. Priya Menon",
    approvedAt: "2026-02-25T11:20:00",
    exitTime: null,
    entryTime: null,
    qrCode: "QR-OP2026001-ABCD1234",
    logs: [
      {
        action: "Applied",
        timestamp: "2026-02-25T09:30:00",
        by: "Neha Patel",
        remarks: "New outpass request submitted",
      },
      {
        action: "Approved",
        timestamp: "2026-02-25T11:20:00",
        by: "Dr. Priya Menon",
        remarks: "Approved by Warden",
      },
    ],
  },
  {
    id: "OP2026002",
    studentId: "ST2023045",
    fromDate: "2026-02-20T14:00:00",
    toDate: "2026-02-21T10:00:00",
    destination: "Phoenix Mall, Mumbai",
    reason: "Shopping with friends",
    emergencyContact: "+91 9876543210",
    parentContact: "+91 9123456789",
    status: "Returned",
    appliedAt: "2026-02-19T16:00:00",
    approvedBy: "Dr. Priya Menon",
    approvedAt: "2026-02-19T18:30:00",
    exitTime: "2026-02-20T14:15:00",
    entryTime: "2026-02-21T09:45:00",
    qrCode: "QR-OP2026002-XYZ5678",
    logs: [
      {
        action: "Applied",
        timestamp: "2026-02-19T16:00:00",
        by: "Neha Patel",
        remarks: "New outpass request submitted",
      },
      {
        action: "Approved",
        timestamp: "2026-02-19T18:30:00",
        by: "Dr. Priya Menon",
        remarks: "Approved by Warden",
      },
      {
        action: "Exited",
        timestamp: "2026-02-20T14:15:00",
        by: "Security - Gate 1",
        remarks: "Student exited via main gate",
      },
      {
        action: "Returned",
        timestamp: "2026-02-21T09:45:00",
        by: "Security - Gate 1",
        remarks: "Student returned successfully",
      },
    ],
  },
  {
    id: "OP2026003",
    studentId: "ST2023045",
    fromDate: "2026-02-15T10:00:00",
    toDate: "2026-02-15T22:00:00",
    destination: "Hospital - KEM, Parel",
    reason: "Medical checkup appointment",
    emergencyContact: "+91 9876543210",
    parentContact: "+91 9123456789",
    status: "Returned",
    appliedAt: "2026-02-14T08:00:00",
    approvedBy: "Dr. Priya Menon",
    approvedAt: "2026-02-14T08:30:00",
    exitTime: "2026-02-15T10:05:00",
    entryTime: "2026-02-15T18:20:00",
    qrCode: "QR-OP2026003-MED9012",
    logs: [
      {
        action: "Applied",
        timestamp: "2026-02-14T08:00:00",
        by: "Neha Patel",
        remarks: "Medical emergency pass",
      },
      {
        action: "Approved",
        timestamp: "2026-02-14T08:30:00",
        by: "Dr. Priya Menon",
        remarks: "Emergency approved",
      },
      {
        action: "Exited",
        timestamp: "2026-02-15T10:05:00",
        by: "Security - Gate 1",
        remarks: "Student exited for medical purpose",
      },
      {
        action: "Returned",
        timestamp: "2026-02-15T18:20:00",
        by: "Security - Gate 1",
        remarks: "Student returned",
      },
    ],
  },
  {
    id: "OP2026004",
    studentId: "ST2023045",
    fromDate: "2026-02-10T09:00:00",
    toDate: "2026-02-11T21:00:00",
    destination: "Pune",
    reason: "College event participation",
    emergencyContact: "+91 9876543210",
    parentContact: "+91 9123456789",
    status: "Returned",
    appliedAt: "2026-02-08T10:00:00",
    approvedBy: "Dr. Priya Menon",
    approvedAt: "2026-02-08T14:00:00",
    exitTime: "2026-02-10T09:10:00",
    entryTime: "2026-02-11T20:30:00",
    qrCode: "QR-OP2026004-EVT3456",
    logs: [
      {
        action: "Applied",
        timestamp: "2026-02-08T10:00:00",
        by: "Neha Patel",
        remarks: "Academic event",
      },
      {
        action: "Approved",
        timestamp: "2026-02-08T14:00:00",
        by: "Dr. Priya Menon",
        remarks: "Approved for college event",
      },
      {
        action: "Exited",
        timestamp: "2026-02-10T09:10:00",
        by: "Security - Gate 2",
        remarks: "Student exited",
      },
      {
        action: "Returned",
        timestamp: "2026-02-11T20:30:00",
        by: "Security - Gate 1",
        remarks: "Returned on time",
      },
    ],
  },
  {
    id: "OP2026005",
    studentId: "ST2023045",
    fromDate: "2026-02-05T16:00:00",
    toDate: "2026-02-06T10:00:00",
    destination: "Bandra, Mumbai",
    reason: "Meeting with project mentor",
    emergencyContact: "+91 9876543210",
    parentContact: "+91 9123456789",
    status: "Rejected",
    appliedAt: "2026-02-05T07:00:00",
    approvedBy: null,
    approvedAt: null,
    rejectedAt: "2026-02-05T08:30:00",
    rejectedBy: "Dr. Priya Menon",
    rejectionReason: "Overlaps with hostel curfew policy",
    exitTime: null,
    entryTime: null,
    qrCode: null,
    logs: [
      {
        action: "Applied",
        timestamp: "2026-02-05T07:00:00",
        by: "Neha Patel",
        remarks: "Academic mentorship meeting",
      },
      {
        action: "Rejected",
        timestamp: "2026-02-05T08:30:00",
        by: "Dr. Priya Menon",
        remarks: "Overlaps with hostel curfew policy",
      },
    ],
  },
  {
    id: "OP2026006",
    studentId: "ST2023045",
    fromDate: "2026-02-01T11:00:00",
    toDate: "2026-02-01T20:00:00",
    destination: "Library - Central Mumbai",
    reason: "Research work",
    emergencyContact: "+91 9876543210",
    parentContact: "+91 9123456789",
    status: "Returned",
    appliedAt: "2026-01-31T18:00:00",
    approvedBy: "Dr. Priya Menon",
    approvedAt: "2026-01-31T19:00:00",
    exitTime: "2026-02-01T11:05:00",
    entryTime: "2026-02-01T19:50:00",
    qrCode: "QR-OP2026006-LIB7890",
    logs: [
      {
        action: "Applied",
        timestamp: "2026-01-31T18:00:00",
        by: "Neha Patel",
        remarks: "Research purpose",
      },
      {
        action: "Approved",
        timestamp: "2026-01-31T19:00:00",
        by: "Dr. Priya Menon",
        remarks: "Approved",
      },
      {
        action: "Exited",
        timestamp: "2026-02-01T11:05:00",
        by: "Security - Gate 1",
        remarks: "Student exited",
      },
      {
        action: "Returned",
        timestamp: "2026-02-01T19:50:00",
        by: "Security - Gate 1",
        remarks: "Returned early",
      },
    ],
  },
];

// Get active outpass
export const getActiveOutpass = () => {
  return outpassesData.find(
    (op) => op.status === "Approved" || op.status === "Exited"
  );
};

// Get statistics
export const getOutpassStats = () => {
  const total = outpassesData.length;
  const pending = outpassesData.filter((op) => op.status === "Pending").length;
  const approved = outpassesData.filter((op) => op.status === "Approved").length;
  const returned = outpassesData.filter((op) => op.status === "Returned").length;
  const rejected = outpassesData.filter((op) => op.status === "Rejected").length;
  
  // Check for overdue (if returned after toDate)
  const overdue = outpassesData.filter((op) => {
    if (op.status === "Exited" && op.exitTime) {
      const toDate = new Date(op.toDate);
      const now = new Date();
      return now > toDate;
    }
    return false;
  }).length;

  return {
    total,
    pending,
    approved,
    returned,
    rejected,
    overdue,
    activeStatus: approved > 0 ? "Active" : "None",
  };
};

// API Integration Points:
// POST /api/student/outpass - Apply for new outpass
// GET /api/student/outpass - Get all outpasses for logged-in student
// GET /api/student/outpass/:id - Get specific outpass details
// PUT /api/student/outpass/:id/cancel - Cancel pending outpass
// GET /api/student/outpass/active - Get current active outpass
// GET /api/student/outpass/:id/qr - Get QR code for approved outpass
