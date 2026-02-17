import React from "react";
import "./DetailsQuiz.css";

import { FaArrowLeftLong } from "react-icons/fa6";
import { IoIosNotificationsOutline } from "react-icons/io";
import { MdOutlineTimer, MdVerified } from "react-icons/md";
import { AiOutlineInfoCircle } from "react-icons/ai";
import { FiCheckCircle } from "react-icons/fi";
import { HiOutlineAcademicCap } from "react-icons/hi2";
import { BsClipboardCheck } from "react-icons/bs";

const DetailsQuiz = () => {
  const data = {
    status: "Pending",
    courseCode: "CS301",
    courseName: "Data Structures & Algorithms",
    title: "Quiz 1: Linked Lists & Pointers",
    subtitle: "MCQs + Coding questions based on Linked List concepts.",
    postedDate: "Oct 12, 2023",
    quizDate: "Oct 13, 2023",
    startTime: "09:15 AM",
    endTime: "10:00 AM",
    duration: "45 Minutes",
    totalMarks: 20,
    passingMarks: 8,
    instructions: [
      "Quiz contains 10 MCQs and 2 coding questions.",
      "Do not refresh the page during quiz attempt.",
      "Only 1 attempt is allowed.",
      "Submission will be auto after time ends.",
      "Maintain internet connection.",
    ],
    rules: {
      attemptsAllowed: 1,
      negativeMarking: false,
      proctored: false,
      showResultAfterSubmit: true,
      shuffleQuestions: true,
    },
    topicsCovered: [
      "Singly Linked List",
      "Doubly Linked List",
      "Insertion & Deletion",
      "Pointers & Memory",
    ],
    studentAttempt: {
      attempted: false,
    },
  };

  const statusClass = data.status.toLowerCase();

  return (
    <div className="quiz-page">
      <div className="container">
        <div className="topbar">
          <div className="left">
            <button className="icon-btn">
              <FaArrowLeftLong />
            </button>
            <h1>Quiz</h1>
          </div>
          <button className="icon-btn">
            <IoIosNotificationsOutline />
          </button>
        </div>

        <div className="layout">
          <div className="left-col">
            <div className="card">
              <div className="card-header">
                <span className={`status ${statusClass}`}>{data.status}</span>
                <span className="course-pill">
                  <HiOutlineAcademicCap />
                  {data.courseCode}
                </span>
              </div>

              <h2>{data.title}</h2>
              <p className="subtitle">{data.subtitle}</p>

              <div className="info-row">
                <div className="info-box">
                  <small>Quiz Date</small>
                  <strong>{data.quizDate}</strong>
                </div>
                <div className="info-box">
                  <small>Time</small>
                  <strong>
                    {data.startTime} - {data.endTime}
                  </strong>
                </div>
                <div className="info-box">
                  <small>
                    <MdOutlineTimer /> Duration
                  </small>
                  <strong>{data.duration}</strong>
                </div>
              </div>

              <div className="stats">
                <div>
                  <small>Total Marks</small>
                  <strong>{data.totalMarks}</strong>
                </div>
                <div className="divider" />
                <div>
                  <small>Passing</small>
                  <strong>{data.passingMarks}</strong>
                </div>
              </div>

              <div className="action">
                {data.studentAttempt.attempted ? (
                  <button className="btn outline">
                    <MdVerified /> Attempted
                  </button>
                ) : (
                  <button className="btn primary">
                    <BsClipboardCheck /> Start Quiz
                  </button>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="section-title">
                <AiOutlineInfoCircle />
                Instructions
              </h3>
              <ul className="instructions">
                {data.instructions.map((ins, i) => (
                  <li key={i}>
                    <FiCheckCircle />
                    {ins}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="right-col">
            <div className="card">
              <h3>Topics Covered</h3>
              <div className="topics">
                {data.topicsCovered.map((topic, i) => (
                  <span key={i}>{topic}</span>
                ))}
              </div>
            </div>

            <div className="card">
              <h3>Rules</h3>
              <div className="rules">
                <Rule label="Attempts Allowed" value={data.rules.attemptsAllowed} />
                <Rule label="Negative Marking" value={data.rules.negativeMarking ? "Yes" : "No"} />
                <Rule label="Proctored" value={data.rules.proctored ? "Yes" : "No"} />
                <Rule label="Shuffle Questions" value={data.rules.shuffleQuestions ? "Yes" : "No"} />
                <Rule label="Result After Submit" value={data.rules.showResultAfterSubmit ? "Yes" : "No"} />
              </div>
            </div>

            <div className="card">
              <Rule label="Course" value={data.courseName} />
              <Rule label="Posted Date" value={data.postedDate} />
              <Rule label="Status" value={data.status} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Rule = ({ label, value }) => (
  <div className="rule">
    <span>{label}</span>
    <b>{value}</b>
  </div>
);

export default DetailsQuiz;
