import Timetable from "../models/TimeTable.js";
import SectionCourse from "../models/SectionCourse.js";
import Classroom from "../models/ClassRoom.js";
import Section from "../models/Section.js";




const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const TOTAL_SLOTS = 7;

export const generateSectionTimetable = async (req, res) => {
  try {
    const { sectionId } = req.params;

    if (!sectionId) {
      return res.status(400).json({
        success: false,
        message: "Section ID is required",
      });
    }


    const section = await Section.findById(sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }


    if (section.isTimetableLocked) {
      return res.status(403).json({
        success: false,
        message: "Timetable is locked. Cannot regenerate.",
      });
    }


    await Timetable.deleteMany({ section: sectionId });


    const sectionCourses = await SectionCourse.find({
      section: sectionId,
      isActive: true,
    }).populate("faculty course");

    if (!sectionCourses.length) {
      return res.status(400).json({
        success: false,
        message: "No courses assigned to this section",
      });
    }


    const classrooms = await Classroom.find({ available: true });

    if (!classrooms.length) {
      return res.status(400).json({
        success: false,
        message: "No classrooms available",
      });
    }

    const DAYS = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const TOTAL_SLOTS = 7;

    // Expand lectures
    const lectures = [];

    for (const sc of sectionCourses) {
      for (let i = 0; i < sc.weeklyHours; i++) {
        lectures.push({
          course: sc.course,
          faculty: sc.faculty,
        });
      }
    }

    // Shuffle lectures
    lectures.sort(() => Math.random() - 0.5);

    const daySubjectCount = {};
    const dayTotalCount = {};
    const timetableMap = {};

    for (const day of DAYS) {
      daySubjectCount[day] = {};
      dayTotalCount[day] = 0;
      timetableMap[day] = {};

      for (let slot = 1; slot <= TOTAL_SLOTS; slot++) {
        timetableMap[day][slot] = null;
      }
    }

    const createdEntries = [];


    for (const lecture of lectures) {
      let placed = false;

      const sortedDays = [...DAYS].sort(
        (a, b) => dayTotalCount[a] - dayTotalCount[b]
      );

      for (const day of sortedDays) {
        if (placed) break;

        const courseId = lecture.course._id.toString();
        const subjectCount = daySubjectCount[day][courseId] || 0;

        // Max 2 per day
        if (subjectCount >= 2) continue;

        for (let slot = 1; slot <= TOTAL_SLOTS; slot++) {
          if (placed) break;

          if (timetableMap[day][slot]) continue;

          // No consecutive rule
          const prevSlot = timetableMap[day][slot - 1];
          if (
            prevSlot &&
            prevSlot.course._id.toString() === courseId
          ) {
            continue;
          }

          const randomClassroom =
            classrooms[Math.floor(Math.random() * classrooms.length)];

          const conflict = await Timetable.findOne({
            $or: [
              { section: sectionId, day, slotNumber: slot },
              { faculty: lecture.faculty._id, day, slotNumber: slot },
              { classroom: randomClassroom._id, day, slotNumber: slot },
            ],
          });

          if (conflict) continue;

          const entry = await Timetable.create({
            section: sectionId,
            course: lecture.course._id,
            faculty: lecture.faculty._id,
            classroom: randomClassroom._id,
            day,
            slotNumber: slot,
          });

          timetableMap[day][slot] = lecture;
          daySubjectCount[day][courseId] = subjectCount + 1;
          dayTotalCount[day] += 1;

          createdEntries.push(entry);
          placed = true;
        }
      }

      if (!placed) {
        return res.status(500).json({
          success: false,
          message:
            "Unable to generate strict balanced timetable. Reduce load.",
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Balanced timetable v3 generated successfully",
      totalSlotsCreated: createdEntries.length,
    });

  } catch (error) {
    console.error("Timetable generation error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSectionTimetable = async (req, res) => {
  try {
    const { sectionId } = req.params;

    if (!sectionId) {
      return res.status(400).json({
        success: false,
        message: "Section ID is required"
      });
    }

    const lectures = await Timetable.find({ section: sectionId })
      .populate("course", "code")
      .populate({
        path: "faculty",
        populate: {
          path: "user",
          select: "name"
        }
      })
      .populate("classroom", "name") 
      .lean();

    if (!lectures.length) {
      return res.status(404).json({
        success: false,
        message: "No timetable found for this section"
      });
    }

    const dayOrder = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6
    };

    lectures.sort((a, b) => {
      if (dayOrder[a.day] === dayOrder[b.day]) {
        return a.slotNumber - b.slotNumber;
      }
      return dayOrder[a.day] - dayOrder[b.day];
    });

    const formatted = lectures.map(l => ({
      day: l.day,
      slot: l.slotNumber,
      course: l.course?.code || null,
      faculty: l.faculty?.user?.name || null,
      classroom: l.classroom?.name || null  
    }));

    return res.status(200).json({
      success: true,
      totalScheduledLectures: formatted.length,
      timetable: formatted
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};






export const getFacultyTimetable = async (req, res) => {
  try {
    const { facultyId } = req.params;

    const lectures = await Timetable.find({ faculty: facultyId })
      .populate("course", "code")
      .populate("classroom", "roomNumber")
      .populate("section", "name")
      .lean();

    const timetable = [];

    for (const day of DAYS) {
      for (let slot = 1; slot <= TOTAL_SLOTS; slot++) {

        const entry = lectures.find(
          l => l.day === day && l.slotNumber === slot
        );

        timetable.push({
          day,
          slot,
          course: entry ? entry.course?.code : null,
          classroom: entry ? entry.classroom?.roomNumber : null,
          section: entry ? entry.section?.name : null
        });
      }
    }

    return res.status(200).json({
      success: true,
      total: timetable.length,
      timetable
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ===============================
// GET CLASSROOM TIMETABLE
// ===============================
export const getClassroomTimetable = async (req, res) => {
  try {
    const { classroomId } = req.params;

    const lectures = await Timetable.find({
      classroom: classroomId
    })
      .populate("course", "code")
      .populate("faculty", "name")
      .populate("section", "name");

    const classroomTimetable = {};

    for (const lecture of lectures) {
      const { day, slotNumber } = lecture;

      if (!classroomTimetable[day]) {
        classroomTimetable[day] = {};
      }

      classroomTimetable[day][slotNumber] = {
        course: lecture.course.code,
        faculty: lecture.faculty.name,
        section: lecture.section.name
      };
    }

    return res.status(200).json({
      success: true,
      timetable: classroomTimetable
    });

  } catch (error) {
    console.error("Classroom Timetable Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};


export const getAllTimetables = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      semester,
      section
    } = req.query;

    const query = {};

    if (semester) query.semester = semester;
    if (section) query.section = section;

    const timetables = await Timetable.find(query)
      .populate("course", "code")
      .populate("faculty", "name")
      .populate("classroom", "roomNumber")
      .populate("section", "name")
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Timetable.countDocuments(query);

    return res.status(200).json({
      success: true,
      totalRecords: total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
      data: timetables
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


export const approveTimetable = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { userId } = req.body;

    if (!sectionId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Section ID and User ID required",
      });
    }

    const section = await Section.findById(sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    if (section.timetableApprovedAt) {
      return res.status(400).json({
        success: false,
        message: "Timetable already approved",
      });
    }

    section.timetableApprovedBy = userId;
    section.timetableApprovedAt = new Date();

    await section.save();

    return res.status(200).json({
      success: true,
      message: "Timetable approved successfully",
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
