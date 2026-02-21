export const studentData = {
    personalInfo: {
        studentId: "STU2024001",
        name: "Milan Chauhan",
        email: "milan.@huuniversity.edu",
        phone: "9845651278",
        dateOfBirth: "2009-05-15",
        address: "123 Main Street, City, State 12345"
    },
    parentInfo: {
        fatherName: "Rahul chauhan",
        fatherPhone: "6372003785",


    },
    academicInfo: {
        course: "Computer Science Engineering",
        semester: "6th Semester",
        academicYear: "2023-2024",
        rollNumber: "CSE2021045",
        section: "A",
        batch: "2021-2025",
        university: "HARIDWAR UNIVERSITY",
        
    }
};

export const coursesData = [
    {
        id: 1,
        courseCode: "CSE301",
        courseName: "Data Structures and Algorithms",
        credits: 4,
        instructor: "Dr. Alice Johnson",
        schedule: "Mon, Wed, Fri - 9:00 AM",
        room: "Room 301, Academic Block",
        totalClasses: 45,
        attendedClasses: 38,
        attendancePercentage: 84.4,
        classTimings: {
            monday: { time: "09:00-10:00", room: "301" },
            wednesday: { time: "09:00-10:00", room: "301" },
            friday: { time: "09:00-10:00", room: "301" }
        }
    },
    {
        id: 2,
        courseCode: "CSE302",
        courseName: "Database Management Systems",
        credits: 3,
        instructor: "Prof. Bob Wilson",
        schedule: "Tue, Thu - 11:00 AM",
        room: "Room 205, Academic Block",
        totalClasses: 30,
        attendedClasses: 27,
        attendancePercentage: 90.0,
        classTimings: {
            tuesday: { time: "11:00-12:00", room: "205" },
            thursday: { time: "11:00-12:00", room: "205" }
        }
    },
    {
        id: 3,
        courseCode: "CSE303",
        courseName: "Computer Networks",
        credits: 3,
        instructor: "Dr. Carol Davis",
        schedule: "Mon, Wed - 2:00 PM",
        room: "Room 402, Academic Block",
        totalClasses: 30,
        attendedClasses: 25,
        attendancePercentage: 83.3,
        classTimings: {
            monday: { time: "14:00-15:00", room: "402" },
            wednesday: { time: "14:00-15:00", room: "402" }
        }
    },
    {
        id: 4,
        courseCode: "CSE304",
        courseName: "Software Engineering",
        credits: 4,
        instructor: "Prof. David Brown",
        schedule: "Tue, Thu, Fri - 10:00 AM",
        room: "Room 303, Academic Block",
        totalClasses: 40,
        attendedClasses: 35,
        attendancePercentage: 87.5,
        classTimings: {
            tuesday: { time: "10:00-11:00", room: "303" },
            thursday: { time: "10:00-11:00", room: "303" },
            friday: { time: "10:00-11:00", room: "303" }
        }
    },
    {
        id: 5,
        courseCode: "MAT301",
        courseName: "Discrete Mathematics",
        credits: 3,
        instructor: "Dr. Emma Taylor",
        schedule: "Wed, Fri - 1:00 PM",
        room: "Room 201, Academic Block",
        totalClasses: 25,
        attendedClasses: 22,
        attendancePercentage: 88.0,
        classTimings: {
            wednesday: { time: "13:00-14:00", room: "201" },
            friday: { time: "13:00-14:00", room: "201" }
        }
    }
];

// Generate attendance data for calendar view
export const generateAttendanceData = () => {
    const attendanceData = {};
    const startDate = new Date('2024-01-15');
    const endDate = new Date('2024-05-15');

    // Course schedules with detailed timing
    const schedules = {
        'CSE301': [1, 3, 5], // Mon, Wed, Fri
        'CSE302': [2, 4],    // Tue, Thu
        'CSE303': [1, 3],    // Mon, Wed
        'CSE304': [2, 4, 5], // Tue, Thu, Fri
        'MAT301': [3, 5]     // Wed, Fri
    };

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();
        const dateStr = date.toISOString().split('T')[0];

        // Skip weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        attendanceData[dateStr] = {};

        Object.entries(schedules).forEach(([courseCode, days]) => {
            if (days.includes(dayOfWeek)) {
                // Simulate attendance with 85% probability of being present
                attendanceData[dateStr][courseCode] = Math.random() > 0.15 ? 'present' : 'absent';
            }
        });
    }

    return attendanceData;
};

// Daily class schedule data
export const getDailySchedule = (date) => {
    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[dayOfWeek];
    
    const dailyClasses = [];
    
    coursesData.forEach(course => {
        if (course.classTimings && course.classTimings[currentDay]) {
            const classInfo = course.classTimings[currentDay];
            dailyClasses.push({
                courseCode: course.courseCode,
                courseName: course.courseName,
                instructor: course.instructor,
                time: classInfo.time,
                room: `Room ${classInfo.room}, Academic Block`,
                credits: course.credits
            });
        }
    });
    
    // Sort by time
    dailyClasses.sort((a, b) => a.time.localeCompare(b.time));
    
    return dailyClasses;
};

export const attendanceData = generateAttendanceData();