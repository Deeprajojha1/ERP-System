import {
  BedDouble,
  Building2,
  CircleAlert,
  Clock3,
  DoorOpen,
  MessageSquareWarning,
} from "lucide-react";

export const statCards = [
  {
    id: "total-rooms",
    title: "Total Rooms",
    value: 320,
    delta: "+2 added this week",
    icon: Building2,
  },
  {
    id: "occupied-rooms",
    title: "Occupied Rooms",
    value: 287,
    delta: "+5 today",
    icon: BedDouble,
  },
  {
    id: "active-outpass",
    title: "Students Currently Outside",
    value: 41,
    delta: "8 due back by 9 PM",
    icon: DoorOpen,
  },
  {
    id: "pending-complaints",
    title: "Pending Complaints",
    value: 16,
    delta: "+3 in last 24h",
    icon: MessageSquareWarning,
  },
  {
    id: "pending-outpass",
    title: "Pending Outpass Requests",
    value: 23,
    delta: "12 high priority",
    icon: Clock3,
  },
];

export const complaintStatusData = [
  { label: "Pending", value: 16, color: "bg-yellow-400" },
  { label: "Approved", value: 42, color: "bg-green-500" },
  { label: "Rejected", value: 9, color: "bg-red-500" },
];

export const roomOccupancyData = [
  { block: "A", occupied: 82, total: 90, widthClass: "w-11/12" },
  { block: "B", occupied: 71, total: 80, widthClass: "w-10/12" },
  { block: "C", occupied: 58, total: 70, widthClass: "w-8/12" },
  { block: "D", occupied: 76, total: 80, widthClass: "w-11/12" },
];

export const weeklyTrendData = [
  { day: "Mon", entries: 19, exits: 27, entryBarClass: "h-10", exitBarClass: "h-14" },
  { day: "Tue", entries: 24, exits: 31, entryBarClass: "h-12", exitBarClass: "h-16" },
  { day: "Wed", entries: 16, exits: 21, entryBarClass: "h-8", exitBarClass: "h-10" },
  { day: "Thu", entries: 28, exits: 34, entryBarClass: "h-14", exitBarClass: "h-[70px]" },
  { day: "Fri", entries: 35, exits: 40, entryBarClass: "h-[72px]", exitBarClass: "h-20" },
  { day: "Sat", entries: 22, exits: 29, entryBarClass: "h-11", exitBarClass: "h-[60px]" },
  { day: "Sun", entries: 18, exits: 20, entryBarClass: "h-9", exitBarClass: "h-10" },
];

export const alertItems = [
  {
    id: 1,
    category: "Overdue Return",
    student: "Aarav Sharma",
    room: "B-214",
    description: "Outpass overdue by 2h 40m.",
    status: "Exited",
  },
  {
    id: 2,
    category: "Aged Complaint",
    student: "Mehak Verma",
    room: "D-109",
    description: "Water leakage complaint pending for 4 days.",
    status: "Pending",
  },
  {
    id: 3,
    category: "Emergency Outpass",
    student: "Ritvik Nair",
    room: "A-118",
    description: "Medical emergency request awaiting approval.",
    status: "Pending",
  },
  {
    id: 4,
    category: "Late Return Cleared",
    student: "Nisha Iyer",
    room: "C-302",
    description: "Returned and verified by security.",
    status: "Returned",
  },
  {
    id: 5,
    category: "Emergency Request",
    student: "Kabir Gill",
    room: "B-009",
    description: "Guardian-approved urgent home visit.",
    status: "Approved",
  },
  {
    id: 6,
    category: "Outpass Review",
    student: "Ananya Patel",
    room: "A-205",
    description: "Rejected due to curfew overlap policy.",
    status: "Rejected",
  },
];

export const sidebarItems = [
  "Overview",
  "Rooms",
  "Students",
  "Outpass",
  "Complaints",
];

export const profile = {
  name: "Dr. Priya Menon",
  role: "Chief Hostel Warden",
};

export const emergencyNotice = {
  title: "Emergency Desk Active",
  message: "2 emergency outpass requests need immediate attention.",
  icon: CircleAlert,
};

export const mockData = {
  profile: {
    name: "Dr. Priya Menon",
    role: "Chief Hostel Warden",
  },
  currentDate: new Date().toISOString().split('T')[0],
};

// Integration point:
// Replace these mocks with API hooks/selectors once backend endpoints are finalized.
