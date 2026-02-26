import Book from '../models/Book.js';
import BookIssue from '../models/BookIssue.js';
import Student from '../models/Student.js';
import {
  bumpNamespaceVersion,
  getOrSetVersionedJsonCache,
} from "../utils/cacheNamespace.js";

/* =====================================================
   ADD BOOK
===================================================== */
export const addBook = async (req, res) => {
  try {
    const existingBook = await Book.findOne({ isbn: req.body.isbn });
    if (existingBook) {
      return res.status(400).json({
        success: false,
        message: 'Book with this ISBN already exists',
      });
    }

    const totalCopies = Number(req.body.totalCopies || 1);

    const book = await Book.create({
      ...req.body,
      totalCopies,
      addedBy: req.user?.id,
      availableCopies:
        req.body.availableCopies != null
          ? Number(req.body.availableCopies)
          : totalCopies,
    });

    await bumpNamespaceVersion("library");
    return res.status(201).json({ success: true, data: book });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =====================================================
   GET ALL BOOKS
===================================================== */
export const getAllBooks = async (req, res) => {
  try {
    const { search, status, category, page = 1, limit = 20, noCache } = req.query;

    const query = { isDeleted: { $ne: true } };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { isbn: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) query.status = status;
    if (category) query.category = category;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const payload = await getOrSetVersionedJsonCache({
      namespace: "library",
      baseKey: `books:${JSON.stringify({
        search: search || "",
        status: status || "",
        category: category || "",
        page: pageNum,
        limit: limitNum,
      })}`,
      noCache: noCache === "true",
      fetcher: async () => {
        const [books, total] = await Promise.all([
          Book.find(query)
            .populate('addedBy', 'firstName lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean(),
          Book.countDocuments(query),
        ]);

        return {
          success: true,
          data: {
            books,
            pagination: {
              page: pageNum,
              limit: limitNum,
              total,
              pages: Math.ceil(total / limitNum),
            },
          },
        };
      },
    });

    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =====================================================
   GET BOOK BY ID
===================================================== */
export const getBookById = async (req, res) => {
  try {
    const book = await Book.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    }).populate('addedBy', 'firstName lastName');

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    return res.json({ success: true, data: book });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =====================================================
   UPDATE BOOK
===================================================== */
export const updateBook = async (req, res) => {
  try {
    const updates = { ...req.body };

    // If totalCopies is updated, adjust availableCopies safely
    let book = await Book.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    if (updates.totalCopies != null) {
      const newTotal = Number(updates.totalCopies);
      if (Number.isNaN(newTotal) || newTotal < 0) {
        return res.status(400).json({
          success: false,
          message: 'totalCopies must be a valid non-negative number',
        });
      }

      // issued = total - available
      const issued = Math.max(0, Number(book.totalCopies || 0) - Number(book.availableCopies || 0));
      if (newTotal < issued) {
        return res.status(400).json({
          success: false,
          message: `Cannot set totalCopies less than currently issued copies (${issued})`,
        });
      }

      updates.totalCopies = newTotal;
      // keep issued same, recompute available
      updates.availableCopies = newTotal - issued;
    }

    if (updates.availableCopies != null && updates.totalCopies == null) {
      const avail = Number(updates.availableCopies);
      if (Number.isNaN(avail) || avail < 0) {
        return res.status(400).json({
          success: false,
          message: 'availableCopies must be a valid non-negative number',
        });
      }
      updates.availableCopies = avail;
    }

    book = await Book.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!book || book.isDeleted) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    await bumpNamespaceVersion("library");
    return res.json({ success: true, data: book });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =====================================================
   DELETE BOOK (Soft Delete)
===================================================== */
export const deleteBook = async (req, res) => {
  try {
    const book = await Book.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    const issuedCount = await BookIssue.countDocuments({
      book: book._id,
      status: { $in: ['ISSUED', 'OVERDUE'] },
    });

    if (issuedCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete book that is currently issued',
      });
    }

    book.isDeleted = true;
    await book.save();

    await bumpNamespaceVersion("library");
    return res.json({ success: true, message: 'Book deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =====================================================
   ISSUE BOOK
===================================================== */
export const issueBook = async (req, res) => {
  try {
    const { bookId, rollNumber, dueDate } = req.body;

    if (!bookId || !rollNumber || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'bookId, rollNumber, and dueDate are required',
      });
    }

    const book = await Book.findOne({ _id: bookId, isDeleted: { $ne: true } });
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

    if (Number(book.availableCopies) <= 0) {
      return res.status(400).json({ success: false, message: 'Book not available' });
    }

    const student = await Student.findOne({ enrollmentNumber: rollNumber });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student ${rollNumber} not found`,
      });
    }

    const existingIssue = await BookIssue.findOne({
      book: bookId,
      student: student._id,
      status: { $in: ['ISSUED', 'OVERDUE'] },
    });

    if (existingIssue) {
      return res.status(400).json({
        success: false,
        message: 'Student already has this book',
      });
    }

    const parsedDue = new Date(dueDate);
    if (Number.isNaN(parsedDue.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dueDate',
      });
    }

    const bookIssue = await BookIssue.create({
      book: bookId,
      student: student._id,
      rollNumber,
      dueDate: parsedDue,
      issuedBy: req.user?.id,
    });

    book.availableCopies = Number(book.availableCopies) - 1;
    book.status = book.availableCopies > 0 ? 'AVAILABLE' : 'ISSUED';
    await book.save();

    await bookIssue.populate([
      { path: 'book', select: 'title author isbn' },
      { path: 'student', select: 'firstName lastName enrollmentNumber' },
      { path: 'issuedBy', select: 'firstName lastName' },
    ]);

    await bumpNamespaceVersion("library");
    return res.status(201).json({ success: true, data: bookIssue });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =====================================================
   RETURN BOOK
===================================================== */
export const returnBook = async (req, res) => {
  try {
    const bookIssue = await BookIssue.findById(req.params.id)
      .populate('book')
      .populate('student', 'firstName lastName enrollmentNumber');

    if (!bookIssue) {
      return res.status(404).json({
        success: false,
        message: 'Book issue record not found',
      });
    }

    if (bookIssue.status === 'RETURNED') {
      return res.status(400).json({
        success: false,
        message: 'Book already returned',
      });
    }

    const returnDate = new Date();
    let fine = 0;

    if (returnDate > bookIssue.dueDate) {
      const daysOverdue = Math.ceil(
        (returnDate - bookIssue.dueDate) / (1000 * 60 * 60 * 24)
      );
      fine = daysOverdue * 5;
    }

    bookIssue.returnDate = returnDate;
    bookIssue.status = 'RETURNED';
    bookIssue.fine = fine;
    bookIssue.returnedBy = req.user?.id;
    await bookIssue.save();

    const book = await Book.findById(bookIssue.book._id);
    if (book) {
      book.availableCopies = Number(book.availableCopies || 0) + 1;
      book.status = 'AVAILABLE';
      await book.save();
    }

    await bumpNamespaceVersion("library");
    return res.json({ success: true, data: bookIssue });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =====================================================
   GET ISSUED BOOKS
===================================================== */
export const getIssuedBooks = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, noCache } = req.query;

    const query = status
      ? { status }
      : { status: { $in: ['ISSUED', 'OVERDUE'] } };

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const payload = await getOrSetVersionedJsonCache({
      namespace: "library",
      baseKey: `issues:${JSON.stringify({
        status: status || "",
        page: pageNum,
        limit: limitNum,
      })}`,
      noCache: noCache === "true",
      fetcher: async () => {
        const [issues, total] = await Promise.all([
          BookIssue.find(query)
            .populate('book', 'title author isbn')
            .populate('student', 'firstName lastName enrollmentNumber')
            .populate('issuedBy', 'firstName lastName')
            .populate('returnedBy', 'firstName lastName')
            .sort({ issueDate: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean(),
          BookIssue.countDocuments(query),
        ]);

        return {
          success: true,
          data: {
            issues,
            pagination: {
              page: pageNum,
              limit: limitNum,
              total,
              pages: Math.ceil(total / limitNum),
            },
          },
        };
      },
    });

    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* =====================================================
   GET STATISTICS
===================================================== */
export const getStatistics = async (req, res) => {
  try {
    const noCache = req.query.noCache === "true";
    const payload = await getOrSetVersionedJsonCache({
      namespace: "library",
      baseKey: "stats",
      noCache,
      fetcher: async () => {
        const [totalBooks, totalIssues, overdueIssues] = await Promise.all([
          Book.countDocuments({ isDeleted: { $ne: true } }),
          BookIssue.countDocuments(),
          BookIssue.countDocuments({ status: 'OVERDUE' }),
        ]);

        const availableBooks = await Book.countDocuments({
          isDeleted: { $ne: true },
          availableCopies: { $gt: 0 },
        });

        const issuedBooks = await Book.countDocuments({
          isDeleted: { $ne: true },
          availableCopies: { $lte: 0 },
        });

        return {
          success: true,
          data: {
            totalBooks,
            availableBooks,
            issuedBooks,
            overdueBooks: overdueIssues,
            totalIssues,
          },
        };
      },
    });

    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
