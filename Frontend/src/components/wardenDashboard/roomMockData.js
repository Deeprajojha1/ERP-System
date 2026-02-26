// Mock data for Room Management
// Integration point: Replace with API calls to backend endpoints

export const roomsData = [
  // Floor 1
  {
    id: 1,
    roomNumber: "101",
    floor: 1,
    capacity: 3,
    occupied: 3,
    type: "Normal",
    baseFee: 8000,
    status: "Full",
    hasComplaints: true,
    complaintCount: 2,
    occupants: [
      { id: "ST2021001", name: "Rahul Kumar", enrollmentYear: 2021 },
      { id: "ST2021002", name: "Amit Sharma", enrollmentYear: 2021 },
      { id: "ST2021003", name: "Vijay Singh", enrollmentYear: 2021 },
    ],
  },
  {
    id: 2,
    roomNumber: "102",
    floor: 1,
    capacity: 2,
    occupied: 1,
    type: "Semi-Deluxe",
    baseFee: 12000,
    status: "Available",
    hasComplaints: false,
    complaintCount: 0,
    occupants: [
      { id: "ST2022015", name: "Priya Desai", enrollmentYear: 2022 },
    ],
  },
  {
    id: 3,
    roomNumber: "103",
    floor: 1,
    capacity: 3,
    occupied: 2,
    type: "Normal",
    baseFee: 8000,
    status: "Available",
    hasComplaints: false,
    complaintCount: 0,
    occupants: [
      { id: "ST2023045", name: "Neha Patel", enrollmentYear: 2023 },
      { id: "ST2023046", name: "Simran Kaur", enrollmentYear: 2023 },
    ],
  },
  {
    id: 4,
    roomNumber: "104",
    floor: 1,
    capacity: 2,
    occupied: 0,
    type: "Deluxe",
    baseFee: 15000,
    status: "Maintenance",
    hasComplaints: true,
    complaintCount: 1,
    occupants: [],
  },
  {
    id: 5,
    roomNumber: "105",
    floor: 1,
    capacity: 3,
    occupied: 2,
    type: "Normal",
    baseFee: 8000,
    status: "Available",
    hasComplaints: false,
    complaintCount: 0,
    occupants: [
      { id: "ST2022078", name: "Arjun Reddy", enrollmentYear: 2022 },
      { id: "ST2022079", name: "Karan Mehta", enrollmentYear: 2022 },
    ],
  },
  {
    id: 6,
    roomNumber: "106",
    floor: 1,
    capacity: 3,
    occupied: 3,
    type: "Normal",
    baseFee: 8000,
    status: "Full",
    hasComplaints: false,
    complaintCount: 0,
    occupants: [
      { id: "ST2021067", name: "Sanjay Gupta", enrollmentYear: 2021 },
      { id: "ST2021068", name: "Deepak Joshi", enrollmentYear: 2021 },
      { id: "ST2021069", name: "Rohan Malhotra", enrollmentYear: 2021 },
    ],
  },

  // Floor 2
  {
    id: 7,
    roomNumber: "201",
    floor: 2,
    capacity: 2,
    occupied: 2,
    type: "Semi-Deluxe",
    baseFee: 12000,
    status: "Full",
    hasComplaints: false,
    complaintCount: 0,
    occupants: [
      { id: "ST2022089", name: "Anjali Verma", enrollmentYear: 2022 },
      { id: "ST2022090", name: "Pooja Nair", enrollmentYear: 2022 },
    ],
  },
  {
    id: 8,
    roomNumber: "202",
    floor: 2,
    capacity: 3,
    occupied: 1,
    type: "Normal",
    baseFee: 8000,
    status: "Available",
    hasComplaints: false,
    complaintCount: 0,
    occupants: [
      { id: "ST2023101", name: "Aditya Kumar", enrollmentYear: 2023 },
    ],
  },
  {
    id: 9,
    roomNumber: "203",
    floor: 2,
    capacity: 2,
    occupied: 2,
    type: "Deluxe",
    baseFee: 15000,
    status: "Full",
    hasComplaints: false,
    complaintCount: 0,
    occupants: [
      { id: "ST2021110", name: "Vikram Singh", enrollmentYear: 2021 },
      { id: "ST2021111", name: "Manish Tiwari", enrollmentYear: 2021 },
    ],
  },
  {
    id: 10,
    roomNumber: "204",
    floor: 2,
    capacity: 3,
    occupied: 0,
    type: "Normal",
    baseFee: 8000,
    status: "Maintenance",
    hasComplaints: true,
    complaintCount: 3,
    occupants: [],
  },
  {
    id: 11,
    roomNumber: "205",
    floor: 2,
    capacity: 3,
    occupied: 3,
    type: "Normal",
    baseFee: 8000,
    status: "Full",
    hasComplaints: true,
    complaintCount: 1,
    occupants: [
      { id: "ST2022134", name: "Ravi Shankar", enrollmentYear: 2022 },
      { id: "ST2022135", name: "Suresh Babu", enrollmentYear: 2022 },
      { id: "ST2022136", name: "Naveen Kumar", enrollmentYear: 2022 },
    ],
  },
  {
    id: 12,
    roomNumber: "206",
    floor: 2,
    capacity: 2,
    occupied: 1,
    type: "Semi-Deluxe",
    baseFee: 12000,
    status: "Available",
    hasComplaints: false,
    complaintCount: 0,
    occupants: [
      { id: "ST2023145", name: "Sakshi Agarwal", enrollmentYear: 2023 },
    ],
  },

  // Floor 3
  {
    id: 13,
    roomNumber: "301",
    floor: 3,
    capacity: 3,
    occupied: 2,
    type: "Normal",
    baseFee: 8000,
    status: "Available",
    hasComplaints: false,
    complaintCount: 0,
    occupants: [
      { id: "ST2022156", name: "Harsh Vardhan", enrollmentYear: 2022 },
      { id: "ST2022157", name: "Gaurav Saxena", enrollmentYear: 2022 },
    ],
  },
  {
    id: 14,
    roomNumber: "302",
    floor: 3,
    capacity: 2,
    occupied: 2,
    type: "Deluxe",
    baseFee: 15000,
    status: "Full",
    hasComplaints: false,
    complaintCount: 0,
    occupants: [
      { id: "ST2021167", name: "Ashish Pandey", enrollmentYear: 2021 },
      { id: "ST2021168", name: "Nikhil Jain", enrollmentYear: 2021 },
    ],
  },
  {
    id: 15,
    roomNumber: "303",
    floor: 3,
    capacity: 3,
    occupied: 3,
    type: "Normal",
    baseFee: 8000,
    status: "Full",
    hasComplaints: false,
    complaintCount: 0,
    occupants: [
      { id: "ST2023177", name: "Tanvi Bhatt", enrollmentYear: 2023 },
      { id: "ST2023178", name: "Divya Rao", enrollmentYear: 2023 },
      { id: "ST2023179", name: "Shreya Kapoor", enrollmentYear: 2023 },
    ],
  },
  {
    id: 16,
    roomNumber: "304",
    floor: 3,
    capacity: 2,
    occupied: 1,
    type: "Semi-Deluxe",
    baseFee: 12000,
    status: "Available",
    hasComplaints: false,
    complaintCount: 0,
    occupants: [
      { id: "ST2022189", name: "Akash Choudhary", enrollmentYear: 2022 },
    ],
  },
  {
    id: 17,
    roomNumber: "305",
    floor: 3,
    capacity: 3,
    occupied: 2,
    type: "Normal",
    baseFee: 8000,
    status: "Available",
    hasComplaints: true,
    complaintCount: 1,
    occupants: [
      { id: "ST2023198", name: "Mohit Yadav", enrollmentYear: 2023 },
      { id: "ST2023199", name: "Sahil Khan", enrollmentYear: 2023 },
    ],
  },
  {
    id: 18,
    roomNumber: "306",
    floor: 3,
    capacity: 2,
    occupied: 0,
    type: "Deluxe",
    baseFee: 15000,
    status: "Available",
    hasComplaints: false,
    complaintCount: 0,
    occupants: [],
  },
];

// Calculate summary statistics
export const getRoomsSummary = (rooms) => {
  const totalRooms = rooms.length;
  const availableRooms = rooms.filter(
    (r) => r.status === "Available" || (r.status === "Full" && r.occupied < r.capacity)
  ).length;
  const fullRooms = rooms.filter((r) => r.occupied === r.capacity && r.status === "Full").length;
  const maintenanceRooms = rooms.filter((r) => r.status === "Maintenance").length;
  const totalOccupiedBeds = rooms.reduce((sum, r) => sum + r.occupied, 0);
  const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);

  return {
    totalRooms,
    availableRooms,
    fullRooms,
    maintenanceRooms,
    totalOccupiedBeds,
    totalCapacity,
  };
};

// API Integration Points:
// GET /api/warden/rooms - Fetch all rooms for warden's hostel
// GET /api/warden/rooms/:roomId - Fetch specific room details
// PUT /api/warden/rooms/:roomId/status - Update room status (maintenance)
// GET /api/warden/rooms/:roomId/complaints - Fetch room complaints
// GET /api/warden/rooms/:roomId/history - Fetch allocation history
