import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
    },
    author: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
    },
    isbn: {
      type: String,
      required: [true, 'ISBN is required'],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    publisher: {
      type: String,
      trim: true,
    },
    publishedYear: {
      type: Number,
    },
    totalCopies: {
      type: Number,
      default: 1,
      min: 1,
    },
    availableCopies: {
      type: Number,
      default: 1,
      min: 0,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ISSUED', 'MAINTENANCE'],
      default: 'AVAILABLE',
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// 🔎 Text index for search
bookSchema.index({ title: 'text', author: 'text', isbn: 'text' });

// ✅ Auto exclude soft-deleted books (no next used)
bookSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

const Book = mongoose.model('Book', bookSchema);

export default Book;
