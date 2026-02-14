import React, { useMemo, useState } from "react";
import {
  FiPlus,
  FiSearch,
  FiSettings,
  FiUserPlus,
  FiX,
} from "react-icons/fi";
import emptyStateImg from "../assets/empty-state.svg";
import "./Library.css";

const Library = () => {
  const [query, setQuery] = useState("");
  const [showManageModal, setShowManageModal] = useState(false);
  const [showAddLibrarianModal, setShowAddLibrarianModal] = useState(false);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [showIssueBookModal, setShowIssueBookModal] = useState(false);
  const [showReturnBookModal, setShowReturnBookModal] = useState(false);
  const [librarianForm, setLibrarianForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "",
    publisher: "",
    publishedYear: "",
    totalCopies: "1",
  });
  const [issueBookForm, setIssueBookForm] = useState({
    bookId: "",
    studentRollNumber: "",
    dueDate: "",
  });
  const books = [];
  const librarians = [];

  const filteredBooks = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return books;
    return books.filter((b) =>
      `${b.title} ${b.author} ${b.isbn} ${b.status}`.toLowerCase().includes(term)
    );
  }, [query, books]);

  const closeAddLibrarianModal = () => {
    setShowAddLibrarianModal(false);
    setLibrarianForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    });
  };

  const handleLibrarianFormChange = (e) => {
    const { name, value } = e.target;
    setLibrarianForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateLibrarian = (e) => {
    e.preventDefault();
    closeAddLibrarianModal();
  };

  const closeAddBookModal = () => {
    setShowAddBookModal(false);
    setBookForm({
      title: "",
      author: "",
      isbn: "",
      category: "",
      publisher: "",
      publishedYear: "",
      totalCopies: "1",
    });
  };

  const handleBookFormChange = (e) => {
    const { name, value } = e.target;
    setBookForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddBook = (e) => {
    e.preventDefault();
    closeAddBookModal();
  };

  const closeIssueBookModal = () => {
    setShowIssueBookModal(false);
    setIssueBookForm({
      bookId: "",
      studentRollNumber: "",
      dueDate: "",
    });
  };

  const handleIssueBookFormChange = (e) => {
    const { name, value } = e.target;
    setIssueBookForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleIssueBook = (e) => {
    e.preventDefault();
    closeIssueBookModal();
  };

  return (
    <div className="library-page">
      <div className="library-header">
        <h1 className="library-title">Library Management</h1>
        <div className="library-actions">
          <button
            type="button"
            className="library-btn library-btn-dark"
            onClick={() => setShowManageModal(true)}
          >
            <FiSettings />
            Manage Librarians
          </button>
          <button
            type="button"
            className="library-btn library-btn-blue"
            onClick={() => setShowAddBookModal(true)}
          >
            <FiPlus />
            Add Book
          </button>
          <button
            type="button"
            className="library-btn library-btn-green"
            onClick={() => setShowIssueBookModal(true)}
          >
            Issue Book
          </button>
          <button
            type="button"
            className="library-btn library-btn-orange"
            onClick={() => setShowReturnBookModal(true)}
          >
            Return Book
          </button>
        </div>
      </div>

      <div className="library-search">
        <FiSearch />
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filteredBooks.length === 0 ? (
        <div className="library-empty-only">
          <div className="library-empty-state">
            <img src={emptyStateImg} alt="No books" />
            <h3>Oops... no books found</h3>
            <p>Add your first book to start library management.</p>
          </div>
        </div>
      ) : (
        <div className="library-table-wrap">
          <table className="library-table">
            <thead>
              <tr>
                <th>Book Title</th>
                <th>Author</th>
                <th>ISBN</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map((book) => (
                <tr key={book.id}>
                  <td>{book.title}</td>
                  <td>{book.author}</td>
                  <td>{book.isbn}</td>
                  <td>{book.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showManageModal && (
        <div className="library-modal">
          <div
            className="library-modal-backdrop"
            onClick={() => {
              setShowManageModal(false);
              closeAddLibrarianModal();
            }}
            role="button"
            tabIndex={0}
            aria-label="Close Manage Librarians"
          />
          <div className="library-modal-card">
            <div className="library-modal-head">
              <h2>Manage Librarians</h2>
              <button
                type="button"
                className="library-icon-close"
                onClick={() => {
                  setShowManageModal(false);
                  closeAddLibrarianModal();
                }}
              >
                <FiX />
              </button>
            </div>

            <button
              type="button"
              className="library-btn library-btn-sky"
              onClick={() => setShowAddLibrarianModal(true)}
            >
              <FiUserPlus />
              Add New Librarian
            </button>

            <div className="library-librarian-empty">
              {librarians.length === 0 ? "No librarians found" : ""}
            </div>
          </div>
        </div>
      )}

      {showAddLibrarianModal && (
        <div className="library-modal library-modal-top">
          <div
            className="library-modal-backdrop"
            onClick={closeAddLibrarianModal}
            role="button"
            tabIndex={0}
            aria-label="Close Add Librarian"
          />
          <div className="library-modal-card library-add-librarian-card">
            <div className="library-modal-head">
              <h2>Add New Librarian</h2>
              <button
                type="button"
                className="library-icon-close"
                onClick={closeAddLibrarianModal}
              >
                <FiX />
              </button>
            </div>

            <form className="library-form" onSubmit={handleCreateLibrarian}>
              <label>
                First Name
                <input
                  name="firstName"
                  placeholder="John"
                  value={librarianForm.firstName}
                  onChange={handleLibrarianFormChange}
                  required
                />
              </label>
              <label>
                Last Name
                <input
                  name="lastName"
                  placeholder="Doe"
                  value={librarianForm.lastName}
                  onChange={handleLibrarianFormChange}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  placeholder="librarian@huroorkee.ac.in"
                  value={librarianForm.email}
                  onChange={handleLibrarianFormChange}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  name="password"
                  placeholder="Minimum 8 characters"
                  value={librarianForm.password}
                  onChange={handleLibrarianFormChange}
                  minLength={8}
                  required
                />
              </label>

              <div className="library-note">
                The librarian will have access to library management features
                only.
              </div>

              <div className="library-form-actions">
                <button
                  type="button"
                  className="library-btn-cancel"
                  onClick={closeAddLibrarianModal}
                >
                  Cancel
                </button>
                <button type="submit" className="library-btn-create">
                  Create Librarian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddBookModal && (
        <div className="library-modal library-modal-top">
          <div
            className="library-modal-backdrop"
            onClick={closeAddBookModal}
            role="button"
            tabIndex={0}
            aria-label="Close Add Book"
          />
          <div className="library-modal-card library-add-book-card">
            <div className="library-modal-head">
              <h2>Add New Book</h2>
              <button
                type="button"
                className="library-icon-close"
                onClick={closeAddBookModal}
              >
                <FiX />
              </button>
            </div>

            <form className="library-form" onSubmit={handleAddBook}>
              <label>
                Title
                <input
                  name="title"
                  value={bookForm.title}
                  onChange={handleBookFormChange}
                  required
                />
              </label>
              <label>
                Author
                <input
                  name="author"
                  value={bookForm.author}
                  onChange={handleBookFormChange}
                  required
                />
              </label>
              <label>
                ISBN
                <input
                  name="isbn"
                  value={bookForm.isbn}
                  onChange={handleBookFormChange}
                  required
                />
              </label>
              <label>
                Category
                <input
                  name="category"
                  value={bookForm.category}
                  onChange={handleBookFormChange}
                  required
                />
              </label>
              <label>
                Publisher
                <input
                  name="publisher"
                  value={bookForm.publisher}
                  onChange={handleBookFormChange}
                  required
                />
              </label>
              <label>
                Published Year
                <input
                  name="publishedYear"
                  type="number"
                  value={bookForm.publishedYear}
                  onChange={handleBookFormChange}
                  required
                />
              </label>
              <label>
                Total Copies
                <input
                  name="totalCopies"
                  type="number"
                  min="1"
                  value={bookForm.totalCopies}
                  onChange={handleBookFormChange}
                  required
                />
              </label>

              <div className="library-form-actions">
                <button
                  type="button"
                  className="library-btn-cancel"
                  onClick={closeAddBookModal}
                >
                  Cancel
                </button>
                <button type="submit" className="library-btn-create">
                  Add Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showIssueBookModal && (
        <div className="library-modal library-modal-top">
          <div
            className="library-modal-backdrop"
            onClick={closeIssueBookModal}
            role="button"
            tabIndex={0}
            aria-label="Close Issue Book"
          />
          <div className="library-modal-card library-issue-book-card">
            <div className="library-modal-head">
              <h2>Issue Book</h2>
              <button
                type="button"
                className="library-icon-close"
                onClick={closeIssueBookModal}
              >
                <FiX />
              </button>
            </div>

            <form className="library-form" onSubmit={handleIssueBook}>
              <label>
                Select Book
                <select
                  name="bookId"
                  value={issueBookForm.bookId}
                  onChange={handleIssueBookFormChange}
                  required
                >
                  <option value="">Choose a book</option>
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Student Roll Number
                <input
                  name="studentRollNumber"
                  placeholder="Enter roll number"
                  value={issueBookForm.studentRollNumber}
                  onChange={handleIssueBookFormChange}
                  required
                />
              </label>

              <label>
                Due Date
                <input
                  name="dueDate"
                  type="date"
                  value={issueBookForm.dueDate}
                  onChange={handleIssueBookFormChange}
                  required
                />
              </label>

              <div className="library-form-actions">
                <button
                  type="button"
                  className="library-btn-cancel"
                  onClick={closeIssueBookModal}
                >
                  Cancel
                </button>
                <button type="submit" className="library-btn-create">
                  Issue Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReturnBookModal && (
        <div className="library-modal library-modal-top">
          <div
            className="library-modal-backdrop"
            onClick={() => setShowReturnBookModal(false)}
            role="button"
            tabIndex={0}
            aria-label="Close Return Book"
          />
          <div className="library-modal-card library-return-book-card">
            <div className="library-modal-head">
              <h2>Return Book</h2>
              <button
                type="button"
                className="library-icon-close"
                onClick={() => setShowReturnBookModal(false)}
              >
                <FiX />
              </button>
            </div>
            <div className="library-return-empty">No issued books</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;
