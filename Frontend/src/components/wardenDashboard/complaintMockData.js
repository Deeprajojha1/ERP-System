// Mock data for Student Complaint Management
// TODO: Replace with actual API calls
// API Endpoints:
// - POST /api/student/complaints (Create new complaint)
// - GET /api/student/complaints (Fetch all complaints for logged-in student)
// - GET /api/student/complaints/:id (Fetch specific complaint details)

export const currentStudent = {
  id: 'STU001',
  name: 'Rahul Kumar',
  email: 'rahul.kumar@college.edu',
  room: 'A-201',
  hostel: 'Boys Hostel A',
};

export const complaintsMock = [
  {
    id: 'CMP001',
    studentId: 'STU001',
    studentName: 'Rahul Kumar',
    room: 'A-201',
    issueType: 'Electricity',
    description: 'The main light in the room is not working. It stopped functioning since yesterday evening. Need urgent replacement.',
    status: 'Resolved',
    imageUrl: null,
    createdAt: '2026-02-20T10:30:00Z',
    updatedAt: '2026-02-22T15:45:00Z',
    remarks: 'Electrician visited and replaced the faulty switch. Issue resolved.',
    timeline: [
      {
        status: 'Pending',
        timestamp: '2026-02-20T10:30:00Z',
        note: 'Complaint registered successfully',
      },
      {
        status: 'In Progress',
        timestamp: '2026-02-21T09:15:00Z',
        note: 'Electrician assigned to check the issue',
      },
      {
        status: 'Resolved',
        timestamp: '2026-02-22T15:45:00Z',
        note: 'Switch replaced. Light working properly now.',
      },
    ],
  },
  {
    id: 'CMP002',
    studentId: 'STU001',
    studentName: 'Rahul Kumar',
    room: 'A-201',
    issueType: 'Water',
    description: 'Low water pressure in bathroom tap. Water barely drips during morning hours. This has been an issue for the past 3 days.',
    status: 'In Progress',
    imageUrl: null,
    createdAt: '2026-02-22T08:00:00Z',
    updatedAt: '2026-02-23T11:30:00Z',
    remarks: 'Plumber scheduled to visit on 25th Feb. Checking overhead tank pressure.',
    timeline: [
      {
        status: 'Pending',
        timestamp: '2026-02-22T08:00:00Z',
        note: 'Complaint registered successfully',
      },
      {
        status: 'In Progress',
        timestamp: '2026-02-23T11:30:00Z',
        note: 'Plumber assigned. Will visit on 25th Feb.',
      },
    ],
  },
  {
    id: 'CMP003',
    studentId: 'STU001',
    studentName: 'Rahul Kumar',
    room: 'A-201',
    issueType: 'Furniture',
    description: 'Study table chair is broken. The backrest is loose and wobbles. Need replacement or repair for proper study setup.',
    status: 'Pending',
    imageUrl: null,
    createdAt: '2026-02-24T14:20:00Z',
    updatedAt: '2026-02-24T14:20:00Z',
    remarks: null,
    timeline: [
      {
        status: 'Pending',
        timestamp: '2026-02-24T14:20:00Z',
        note: 'Complaint registered successfully',
      },
    ],
  },
  {
    id: 'CMP004',
    studentId: 'STU001',
    studentName: 'Rahul Kumar',
    room: 'A-201',
    issueType: 'Cleanliness',
    description: 'Common washroom on 2nd floor needs thorough cleaning. Floor tiles are dirty and smell is unpleasant.',
    status: 'Resolved',
    imageUrl: null,
    createdAt: '2026-02-18T07:45:00Z',
    updatedAt: '2026-02-19T10:00:00Z',
    remarks: 'Cleaning staff assigned. Washroom cleaned and disinfected.',
    timeline: [
      {
        status: 'Pending',
        timestamp: '2026-02-18T07:45:00Z',
        note: 'Complaint registered successfully',
      },
      {
        status: 'In Progress',
        timestamp: '2026-02-18T16:30:00Z',
        note: 'Cleaning staff assigned for deep cleaning',
      },
      {
        status: 'Resolved',
        timestamp: '2026-02-19T10:00:00Z',
        note: 'Washroom cleaned, sanitized, and deodorized.',
      },
    ],
  },
  {
    id: 'CMP005',
    studentId: 'STU001',
    studentName: 'Rahul Kumar',
    room: 'A-201',
    issueType: 'Other',
    description: 'Window latch is damaged and window cannot be secured properly. Security concern during night time.',
    status: 'In Progress',
    imageUrl: null,
    createdAt: '2026-02-23T19:10:00Z',
    updatedAt: '2026-02-24T08:45:00Z',
    remarks: 'Carpenter will visit tomorrow to replace the latch mechanism.',
    timeline: [
      {
        status: 'Pending',
        timestamp: '2026-02-23T19:10:00Z',
        note: 'Complaint registered successfully',
      },
      {
        status: 'In Progress',
        timestamp: '2026-02-24T08:45:00Z',
        note: 'Carpenter assigned. Visit scheduled for 26th Feb.',
      },
    ],
  },
  {
    id: 'CMP006',
    studentId: 'STU001',
    studentName: 'Rahul Kumar',
    room: 'A-201',
    issueType: 'Electricity',
    description: 'Fan regulator not working. Fan runs at full speed only. Cannot control speed, making it difficult during night.',
    status: 'Pending',
    imageUrl: null,
    createdAt: '2026-02-25T06:30:00Z',
    updatedAt: '2026-02-25T06:30:00Z',
    remarks: null,
    timeline: [
      {
        status: 'Pending',
        timestamp: '2026-02-25T06:30:00Z',
        note: 'Complaint registered successfully',
      },
    ],
  },
];

// Helper function to get complaint statistics
export const getComplaintStats = (complaints) => {
  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === 'Pending').length;
  const inProgress = complaints.filter((c) => c.status === 'In Progress').length;
  const resolved = complaints.filter((c) => c.status === 'Resolved').length;

  return { total, pending, inProgress, resolved };
};

// Helper function to filter complaints
export const filterComplaints = (complaints, filters) => {
  let filtered = [...complaints];

  if (filters.status && filters.status !== 'All') {
    filtered = filtered.filter((c) => c.status === filters.status);
  }

  if (filters.issueType && filters.issueType !== 'All') {
    filtered = filtered.filter((c) => c.issueType === filters.issueType);
  }

  if (filters.dateFrom) {
    filtered = filtered.filter((c) => new Date(c.createdAt) >= new Date(filters.dateFrom));
  }

  if (filters.dateTo) {
    filtered = filtered.filter((c) => new Date(c.createdAt) <= new Date(filters.dateTo));
  }

  return filtered;
};

// Issue types for dropdown
export const issueTypes = [
  'Electricity',
  'Water',
  'Furniture',
  'Cleanliness',
  'Other',
];
