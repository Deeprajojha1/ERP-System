import React, { useEffect, useMemo, useState } from "react";
import { FiPlus, FiSearch, FiSettings, FiUserPlus, FiX } from "react-icons/fi";
import { HiOutlineTrash } from "react-icons/hi";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import axios from "../utils/axiosInstance";
import ModernDatePicker from "../components/common/ModernDatePicker";
import emptyStateImg from "../assets/empty-state.svg";
import ClipLoader from "./components/ClipLoader";
import "./Library.css";

const defaultBookForm = {
  title: "",
  author: "",
  isbn: "",
  category: "",
  publisher: "",
  publishedYear: "",
  totalCopies: "1",
};

const defaultIssueForm = {
  bookId: "",
  rollNumber: "",
  dueDate: "",
};

const defaultLibrarianForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
};

const Library = () => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState(null);
  const [books, setBooks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [librarians, setLibrarians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showAddLibrarianModal, setShowAddLibrarianModal] = useState(false);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [showIssueBookModal, setShowIssueBookModal] = useState(false);
  const [showReturnBookModal, setShowReturnBookModal] = useState(false);
  const [bookForm, setBookForm] = useState(defaultBookForm);
  const [issueForm, setIssueForm] = useState(defaultIssueForm);
  const [librarianForm, setLibrarianForm] = useState(defaultLibrarianForm);
  const [creatingLibrarian, setCreatingLibrarian] = useState(false);
  const [deletingLibrarianId, setDeletingLibrarianId] = useState("");
  const [submittingBook, setSubmittingBook] = useState(false);
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [returningIssueId, setReturningIssueId] = useState("");

  const activeIssues = useMemo(
    () => issues.filter((issue) => issue.status === "ISSUED" || issue.status === "OVERDUE"),
    [issues]
  );

  const loadData = async () => {
    if (!apiBase) return;
    try {
      setLoading(true);
      const [statRes, booksRes, issuesRes, librarianRes] = await Promise.all([
        axios.get(`${apiBase}/admin/library/statistics`, { withCredentials: true }),
        axios.get(`${apiBase}/admin/library/books`, {
          withCredentials: true,
          params: { search: query || undefined, limit: 100 },
        }),
        axios.get(`${apiBase}/admin/library/issues`, {
          withCredentials: true,
          params: { limit: 100 },
        }),
        axios.get(`${apiBase}/admin/librarian`, { withCredentials: true }),
      ]);
      setStats(statRes.data?.data || null);
      setBooks(booksRes.data?.data?.books || []);
      setIssues(issuesRes.data?.data?.issues || []);
      setLibrarians(librarianRes.data?.librarians || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load library data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [apiBase, query]);

  const handleCreateLibrarian = async (event) => {
    event.preventDefault();
    const { firstName, lastName, email, password } = librarianForm;
    if (!firstName || !lastName || !email || !password) {
      toast.error("All librarian fields are required");
      return;
    }
    try {
      setCreatingLibrarian(true);
      await axios.post(
        `${apiBase}/admin/librarian`,
        { firstName, lastName, email, password },
        { withCredentials: true }
      );
      toast.success("Librarian created");
      setLibrarianForm(defaultLibrarianForm);
      setShowAddLibrarianModal(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create librarian");
    } finally {
      setCreatingLibrarian(false);
    }
  };

  const deleteLibrarian = async (librarianId) => {
    try {
      setDeletingLibrarianId(librarianId);
      await axios.patch(
        `${apiBase}/admin/librarian/${librarianId}/delete`,
        {},
        { withCredentials: true }
      );
      toast.success("Librarian deleted");
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete librarian");
    } finally {
      setDeletingLibrarianId("");
    }
  };

  const addBook = async (event) => {
    event.preventDefault();
    try {
      setSubmittingBook(true);
      await axios.post(
        `${apiBase}/admin/library/books`,
        {
          ...bookForm,
          publishedYear: Number(bookForm.publishedYear || 0),
          totalCopies: Number(bookForm.totalCopies || 1),
        },
        { withCredentials: true }
      );
      toast.success("Book added");
      setBookForm(defaultBookForm);
      setShowAddBookModal(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add book");
    } finally {
      setSubmittingBook(false);
    }
  };

  const issueBook = async (event) => {
    event.preventDefault();
    if (!issueForm.bookId || !issueForm.rollNumber || !issueForm.dueDate) {
      toast.error("Book, roll number and due date are required");
      return;
    }
    try {
      setSubmittingIssue(true);
      await axios.post(`${apiBase}/admin/library/issues`, issueForm, {
        withCredentials: true,
      });
      toast.success("Book issued");
      setIssueForm(defaultIssueForm);
      setShowIssueBookModal(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to issue book");
    } finally {
      setSubmittingIssue(false);
    }
  };

  const returnBook = async (issueId) => {
    try {
      setReturningIssueId(issueId);
      await axios.patch(
        `${apiBase}/admin/library/issues/${issueId}/return`,
        {},
        { withCredentials: true }
      );
      toast.success("Book returned");
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to return book");
    } finally {
      setReturningIssueId("");
    }
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

      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          <div className="library-librarian-card">
            <h3>Total Books</h3>
            <p>{stats.totalBooks || 0}</p>
          </div>
          <div className="library-librarian-card">
            <h3>Available</h3>
            <p>{stats.availableBooks || 0}</p>
          </div>
          <div className="library-librarian-card">
            <h3>Issued</h3>
            <p>{stats.issuedBooks || 0}</p>
          </div>
          <div className="library-librarian-card">
            <h3>Overdue</h3>
            <p>{stats.overdueBooks || 0}</p>
          </div>
          <div className="library-librarian-card">
            <h3>Issues</h3>
            <p>{stats.totalIssues || 0}</p>
          </div>
        </div>
      )}

      <div className="library-search">
        <FiSearch />
        <input
          type="text"
          placeholder="Search by title / author / isbn..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {loading ? (
        <div className="library-empty-only">
          <div className="library-empty-state">
            <img src={emptyStateImg} alt="Loading books" />
            <h3>Loading books...</h3>
          </div>
        </div>
      ) : books.length === 0 ? (
        <div className="library-empty-only">
          <div className="library-empty-state">
            <img src={emptyStateImg} alt="No books" />
            <h3>No books found</h3>
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
                <th>Copies</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book._id}>
                  <td>{book.title}</td>
                  <td>{book.author}</td>
                  <td>{book.isbn}</td>
                  <td>
                    {book.availableCopies}/{book.totalCopies}
                  </td>
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
              setShowAddLibrarianModal(false);
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
                  setShowAddLibrarianModal(false);
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

            {librarians.length === 0 ? (
              <div className="library-librarian-empty">No librarians found</div>
            ) : (
              <div className="library-librarian-grid">
                {librarians.map((librarian) => (
                  <div className="library-librarian-card" key={librarian._id}>
                    <h3>{librarian.name || "Unnamed Librarian"}</h3>
                    <p>
                      <span>Email:</span> {librarian.email || "N/A"}
                    </p>
                    <p>
                      <span>Phone:</span> {librarian.phoneNumber || "N/A"}
                    </p>
                    <button
                      type="button"
                      className="library-librarian-delete-btn admin-btn-with-loader"
                      disabled={deletingLibrarianId === librarian._id}
                      onClick={() => deleteLibrarian(librarian._id)}
                    >
                      {deletingLibrarianId === librarian._id ? (
                        <ClipLoader
                          size={14}
                          color="#dc2626"
                          trackColor="rgba(220, 38, 38, 0.2)"
                        />
                      ) : (
                        <HiOutlineTrash />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showAddLibrarianModal && (
        <div className="library-modal library-modal-top">
          <div
            className="library-modal-backdrop"
            onClick={() => setShowAddLibrarianModal(false)}
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
                onClick={() => setShowAddLibrarianModal(false)}
              >
                <FiX />
              </button>
            </div>

            <form className="library-form" onSubmit={handleCreateLibrarian}>
              <label>
                First Name
                <input
                  name="firstName"
                  value={librarianForm.firstName}
                  onChange={(event) =>
                    setLibrarianForm((prev) => ({ ...prev, firstName: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Last Name
                <input
                  name="lastName"
                  value={librarianForm.lastName}
                  onChange={(event) =>
                    setLibrarianForm((prev) => ({ ...prev, lastName: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={librarianForm.email}
                  onChange={(event) =>
                    setLibrarianForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  name="password"
                  value={librarianForm.password}
                  onChange={(event) =>
                    setLibrarianForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  minLength={8}
                  required
                />
              </label>
              <div className="library-form-actions">
                <button type="button" className="library-btn-cancel" onClick={() => setShowAddLibrarianModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="library-btn-create" disabled={creatingLibrarian}>
                  {creatingLibrarian ? "Creating..." : "Create Librarian"}
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
            onClick={() => setShowAddBookModal(false)}
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
                onClick={() => setShowAddBookModal(false)}
              >
                <FiX />
              </button>
            </div>

            <form className="library-form" onSubmit={addBook}>
              <label>
                Title
                <input
                  name="title"
                  value={bookForm.title}
                  onChange={(event) =>
                    setBookForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Author
                <input
                  name="author"
                  value={bookForm.author}
                  onChange={(event) =>
                    setBookForm((prev) => ({ ...prev, author: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                ISBN
                <input
                  name="isbn"
                  value={bookForm.isbn}
                  onChange={(event) =>
                    setBookForm((prev) => ({ ...prev, isbn: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Category
                <input
                  name="category"
                  value={bookForm.category}
                  onChange={(event) =>
                    setBookForm((prev) => ({ ...prev, category: event.target.value }))
                  }
                />
              </label>
              <label>
                Publisher
                <input
                  name="publisher"
                  value={bookForm.publisher}
                  onChange={(event) =>
                    setBookForm((prev) => ({ ...prev, publisher: event.target.value }))
                  }
                />
              </label>
              <label>
                Published Year
                <input
                  name="publishedYear"
                  type="number"
                  value={bookForm.publishedYear}
                  onChange={(event) =>
                    setBookForm((prev) => ({ ...prev, publishedYear: event.target.value }))
                  }
                />
              </label>
              <label>
                Total Copies
                <input
                  name="totalCopies"
                  type="number"
                  min="1"
                  value={bookForm.totalCopies}
                  onChange={(event) =>
                    setBookForm((prev) => ({ ...prev, totalCopies: event.target.value }))
                  }
                  required
                />
              </label>

              <div className="library-form-actions">
                <button type="button" className="library-btn-cancel" onClick={() => setShowAddBookModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="library-btn-create" disabled={submittingBook}>
                  {submittingBook ? "Adding..." : "Add Book"}
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
            onClick={() => setShowIssueBookModal(false)}
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
                onClick={() => setShowIssueBookModal(false)}
              >
                <FiX />
              </button>
            </div>

            <form className="library-form" onSubmit={issueBook}>
              <label>
                Select Book
                <select
                  name="bookId"
                  value={issueForm.bookId}
                  onChange={(event) =>
                    setIssueForm((prev) => ({ ...prev, bookId: event.target.value }))
                  }
                  required
                >
                  <option value="">Choose a book</option>
                  {books.map((book) => (
                    <option key={book._id} value={book._id}>
                      {book.title} ({book.availableCopies}/{book.totalCopies})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Student Roll Number
                <input
                  name="rollNumber"
                  value={issueForm.rollNumber}
                  onChange={(event) =>
                    setIssueForm((prev) => ({ ...prev, rollNumber: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                Due Date
                <ModernDatePicker
                  name="dueDate"
                  value={issueForm.dueDate}
                  onChange={(event) =>
                    setIssueForm((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                />
              </label>

              <div className="library-form-actions">
                <button type="button" className="library-btn-cancel" onClick={() => setShowIssueBookModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="library-btn-create" disabled={submittingIssue}>
                  {submittingIssue ? "Issuing..." : "Issue Book"}
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
            {activeIssues.length === 0 ? (
              <div className="library-return-empty">No issued books</div>
            ) : (
              <div className="library-librarian-grid">
                {activeIssues.map((issue) => (
                  <div className="library-librarian-card" key={issue._id}>
                    <h3>{issue.book?.title || "Book"}</h3>
                    <p>
                      <span>Roll:</span> {issue.rollNumber}
                    </p>
                    <p>
                      <span>Due:</span>{" "}
                      {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : "N/A"}
                    </p>
                    <p>
                      <span>Status:</span> {issue.status}
                    </p>
                    <button
                      type="button"
                      className="library-btn library-btn-green"
                      disabled={returningIssueId === issue._id}
                      onClick={() => returnBook(issue._id)}
                    >
                      {returningIssueId === issue._id ? "Returning..." : "Mark Returned"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;
