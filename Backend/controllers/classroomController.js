import Classroom from "../models/ClassRoom.js";
import {
  bumpNamespaceVersion,
  getOrSetVersionedJsonCache,
} from "../utils/cacheNamespace.js";

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

    await bumpNamespaceVersion("classrooms");
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
    const noCache = req.query.noCache === "true";
    const payload = await getOrSetVersionedJsonCache({
      namespace: "classrooms",
      baseKey: "all",
      noCache,
      fetcher: async () => {
        const classrooms = await Classroom.find();
        return {
          success: true,
          classrooms,
        };
      },
    });

    res.json(payload);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
