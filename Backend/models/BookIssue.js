import mongoose from 'mongoose';

const bookIssueSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    rollNumber: {
      type: String,
      required: true,
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    returnDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['ISSUED', 'RETURNED', 'OVERDUE'],
      default: 'ISSUED',
    },
    fine: {
      type: Number,
      default: 0,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    returnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

bookIssueSchema.index({ book: 1, student: 1, status: 1 });

const BookIssue = mongoose.model('BookIssue', bookIssueSchema);
export default BookIssue;
