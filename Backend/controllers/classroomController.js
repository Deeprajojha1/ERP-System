import Classroom from "../models/ClassRoom.js";

export const addClassroom = async (req, res) => {
  try {
    const { name, capacity, available } = req.body;

    if (!name || !capacity) {
      return res.status(400).json({
        success: false,
        message: "Name and capacity are required",
      });
    }

    const classroom = await Classroom.create({
      name,
      capacity,
      available: available ?? true,
    });

    res.status(201).json({
      success: true,
      classroom,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getClassrooms = async (req, res) => {
  try {
    const classrooms = await Classroom.find();

    res.json({
      success: true,
      classrooms,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
