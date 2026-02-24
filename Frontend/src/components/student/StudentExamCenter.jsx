import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiBookOpen,
  FiCamera,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiPlayCircle,
  FiRefreshCcw,
  FiSend,
  FiShield,
  FiTarget,
  FiUserCheck,
} from "react-icons/fi";
import ClipLoader from "../../Admin/components/ClipLoader";
import { ADMIN_LOAD_STATES } from "../../Admin/constants/loadStates";
import {
  clearStudentExamResult,
  fetchStudentExamList,
  fetchStudentExamResult,
  saveStudentExamAnswer,
  setStudentExamAnswerDraft,
  setStudentExamQuestionIndex,
  startStudentExamAttempt,
  submitStudentExamAttempt,
} from "../../redux/studentExamSlice";
import "./StudentExamCenter.css";

const EXAM_INSTRUCTIONS = [
  "Exam start hone ke baad tab switch, browser minimize, ya window focus lose karne par attempt auto-submit ho jayega.",
  "Face verification complete hone ke baad hi MCQ questions open honge.",
  "Har question ke answer ko Save karte rahen. Unsaved answer submit ke time miss ho sakte hain.",
  "Exam duration complete hote hi attempt automatically submit ho jayega.",
  "Stable internet and charged device ensure karein before starting the exam.",
];

const formatDateTime = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatExamType = (value = "") =>
  String(value || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((item) => item[0]?.toUpperCase() + item.slice(1))
    .join(" ");

const formatTimer = (ms = 0) => {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
};

const StudentExamCenter = () => {
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);
  const {
    exams,
    examsLoadState,
    examsError,
    activeBlueprintId,
    activeAttempt,
    activePaper,
    answerDrafts,
    activeQuestionIndex,
    startLoadState,
    startError,
    saveLoadState,
    saveError,
    savingQuestionIndex,
    submitLoadState,
    submitError,
    resultLoadState,
    resultError,
    result,
    activeResultAttemptId,
  } = useSelector((state) => state.studentExam);

  const [pendingBlueprintId, setPendingBlueprintId] = useState("");
  const [clockNow, setClockNow] = useState(Date.now());

  const [workspaceBlueprintId, setWorkspaceBlueprintId] = useState("");
  const [workspaceStep, setWorkspaceStep] = useState("instructions");
  const [isFaceChecking, setIsFaceChecking] = useState(false);
  const [isFaceVerified, setIsFaceVerified] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [faceError, setFaceError] = useState("");
  const [autoSubmitReason, setAutoSubmitReason] = useState("");

  const videoRef = useRef(null);
  const faceStreamRef = useRef(null);
  const faceDetectionIntervalRef = useRef(null);
  const submitLockRef = useRef(false);

  const stopFaceStream = useCallback(() => {
    if (faceDetectionIntervalRef.current) {
      window.clearInterval(faceDetectionIntervalRef.current);
      faceDetectionIntervalRef.current = null;
    }

    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach((track) => track.stop());
      faceStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, []);

  const submitAttemptKeepAlive = useCallback(
    (attemptId) => {
      if (!apiBase || !attemptId) return;
      const submitUrl = `${apiBase}/student/attempt/${attemptId}/submit`;

      try {
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
          const payload = new Blob(["{}"], { type: "application/json" });
          navigator.sendBeacon(submitUrl, payload);
          return;
        }
      } catch {
        // Fallback to fetch keepalive below.
      }

      try {
        fetch(submitUrl, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          keepalive: true,
        });
      } catch {
        // Ignore keepalive submission errors during unload lifecycle.
      }
    },
    [apiBase]
  );

  const handleAutoOrManualSubmit = useCallback(
    async (reason = "") => {
      if (!apiBase || !activeAttempt?._id || submitLockRef.current) return;
      submitLockRef.current = true;
      if (reason) {
        setAutoSubmitReason(reason);
      }

      try {
        await dispatch(
          submitStudentExamAttempt({
            apiBase,
            attemptId: activeAttempt._id,
          })
        ).unwrap();
        await dispatch(fetchStudentExamList({ apiBase })).unwrap();
      } catch {
        // Errors are already managed in slice state.
      } finally {
        submitLockRef.current = false;
        stopFaceStream();
        setWorkspaceBlueprintId("");
        setWorkspaceStep("instructions");
      }
    },
    [apiBase, activeAttempt?._id, dispatch, stopFaceStream]
  );

  useEffect(() => {
    if (!apiBase) return;
    dispatch(fetchStudentExamList({ apiBase }));
  }, [dispatch, apiBase]);

  useEffect(() => {
    if (!activeAttempt?._id || activeAttempt?.status !== "IN_PROGRESS") return undefined;
    const timer = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeAttempt?._id, activeAttempt?.status]);

  useEffect(() => {
    if (workspaceStep !== "face" || !workspaceBlueprintId) return undefined;
    let cancelled = false;
    let autoFallbackTimer = null;

    const startFaceCamera = async () => {
      stopFaceStream();
      setFaceError("");
      setIsFaceVerified(false);
      setIsFaceChecking(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        setFaceError("Camera not supported in this browser.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 360 } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        faceStreamRef.current = stream;
        setIsCameraReady(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        const FaceDetectorCtor =
          typeof window !== "undefined" ? window.FaceDetector : undefined;

        if (typeof FaceDetectorCtor === "function") {
          setIsFaceChecking(true);
          autoFallbackTimer = window.setTimeout(() => {
            if (cancelled) return;
            setIsFaceChecking(false);
            setFaceError(
              "Auto face detect slow hai. Camera visible rakhein aur 'Verify Face' button press karein."
            );
          }, 7000);
          const detector = new FaceDetectorCtor({
            maxDetectedFaces: 1,
            fastMode: true,
          });

          faceDetectionIntervalRef.current = window.setInterval(async () => {
            if (cancelled || !videoRef.current) return;
            if (videoRef.current.readyState < 2) return;

            try {
              const faces = await detector.detect(videoRef.current);
              if (Array.isArray(faces) && faces.length > 0) {
                setIsFaceVerified(true);
                setIsFaceChecking(false);
                setFaceError("");
                if (autoFallbackTimer) {
                  window.clearTimeout(autoFallbackTimer);
                  autoFallbackTimer = null;
                }
                if (faceDetectionIntervalRef.current) {
                  window.clearInterval(faceDetectionIntervalRef.current);
                  faceDetectionIntervalRef.current = null;
                }
              }
            } catch {
              setIsFaceChecking(false);
              setFaceError(
                "Automatic detection failed. Keep camera on and use manual verification."
              );
              if (faceDetectionIntervalRef.current) {
                window.clearInterval(faceDetectionIntervalRef.current);
                faceDetectionIntervalRef.current = null;
              }
            }
          }, 900);
        } else {
          setFaceError(
            "Automatic face detection is not supported on this browser. Manual camera verification enabled."
          );
        }
      } catch (error) {
        setFaceError(
          error?.message ||
            "Camera access denied. Please allow camera permission to continue."
        );
      }
    };

    startFaceCamera();

    return () => {
      cancelled = true;
      if (autoFallbackTimer) {
        window.clearTimeout(autoFallbackTimer);
      }
      stopFaceStream();
    };
  }, [workspaceStep, workspaceBlueprintId, stopFaceStream]);

  useEffect(() => {
    return () => {
      stopFaceStream();
    };
  }, [stopFaceStream]);

  const activeExam = useMemo(() => {
    const lookup = String(activeBlueprintId || activeAttempt?.blueprintId || "");
    return exams.find((item) => String(item?._id) === lookup) || null;
  }, [exams, activeBlueprintId, activeAttempt?.blueprintId]);

  const workspaceExam = useMemo(() => {
    const lookup = String(workspaceBlueprintId || "");
    if (!lookup) return activeExam;
    return exams.find((item) => String(item?._id) === lookup) || activeExam;
  }, [exams, workspaceBlueprintId, activeExam]);

  const rawPaperQuestions = useMemo(
    () => (Array.isArray(activePaper?.questions) ? activePaper.questions : []),
    [activePaper?.questions]
  );

  const questions = useMemo(() => {
    const normalized = rawPaperQuestions.map((question, idx) => ({
      ...question,
      questionIndex: Number.isFinite(Number(question?.questionIndex))
        ? Number(question.questionIndex)
        : idx,
    }));
    const mcqOnly = normalized.filter(
      (question) => String(question?.sectionType || "").toUpperCase() === "MCQ"
    );
    return mcqOnly.length > 0 ? mcqOnly : normalized;
  }, [rawPaperQuestions]);

  const totalQuestions = questions.length;

  const boundedQuestionIndex = useMemo(() => {
    if (totalQuestions === 0) return 0;
    return Math.min(Math.max(Number(activeQuestionIndex || 0), 0), totalQuestions - 1);
  }, [activeQuestionIndex, totalQuestions]);

  const currentQuestion = questions[boundedQuestionIndex] || null;
  const currentQuestionIndexKey = Number(
    currentQuestion?.questionIndex ?? boundedQuestionIndex
  );
  const currentDraft = answerDrafts[String(currentQuestionIndexKey)] || {
    answerText: "",
    selectedOption: "",
  };
  const isCurrentMcq =
    String(currentQuestion?.sectionType || "").toUpperCase() === "MCQ";

  const answeredCount = useMemo(() => {
    return questions.reduce((count, question) => {
      const questionKey = String(question?.questionIndex);
      const draft = answerDrafts[questionKey] || {};
      const hasMcq = String(draft?.selectedOption || "").trim().length > 0;
      const hasText = String(draft?.answerText || "").trim().length > 0;
      return hasMcq || hasText ? count + 1 : count;
    }, 0);
  }, [answerDrafts, questions]);

  const deadlineMs = useMemo(() => {
    const startedAt = activeAttempt?.startedAt;
    const duration = Number(activeExam?.durationMinutes || 0);
    if (!startedAt || duration <= 0) return 0;
    const startMs = new Date(startedAt).getTime();
    if (!Number.isFinite(startMs)) return 0;
    return startMs + duration * 60000;
  }, [activeAttempt?.startedAt, activeExam?.durationMinutes]);

  const remainingMs = Math.max(deadlineMs - clockNow, 0);
  const isTimeExpired = deadlineMs > 0 && remainingMs <= 0;
  const isAttemptInProgress =
    Boolean(activeAttempt?._id) && activeAttempt?.status === "IN_PROGRESS";
  const showWorkspace = Boolean(workspaceBlueprintId);

  useEffect(() => {
    if (!isAttemptInProgress || !isTimeExpired) return;
    handleAutoOrManualSubmit(
      "Time expired. Exam was automatically submitted."
    );
  }, [isAttemptInProgress, isTimeExpired, handleAutoOrManualSubmit]);

  useEffect(() => {
    if (!isAttemptInProgress || !activeAttempt?._id) return undefined;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleAutoOrManualSubmit(
          "Tab change detected. As per exam policy, your attempt was auto-submitted."
        );
      }
    };

    const handleWindowBlur = () => {
      window.setTimeout(() => {
        if (document.hidden || document.visibilityState !== "visible" || !document.hasFocus()) {
          handleAutoOrManualSubmit(
            "Focus lost outside exam screen. Attempt auto-submitted for exam integrity."
          );
        }
      }, 80);
    };

    const handlePageHide = () => {
      submitAttemptKeepAlive(activeAttempt._id);
    };

    const handleBeforeUnload = () => {
      submitAttemptKeepAlive(activeAttempt._id);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    activeAttempt?._id,
    isAttemptInProgress,
    handleAutoOrManualSubmit,
    submitAttemptKeepAlive,
  ]);

  const resultSummary = useMemo(() => {
    const evaluation = result?.evaluation;
    if (!evaluation) return null;
    const totalAwarded = Number(evaluation.totalAwarded || 0);
    const totalMax = Number(evaluation.totalMax || 0);
    const percentage =
      totalMax > 0 ? Number(((totalAwarded / totalMax) * 100).toFixed(1)) : 0;
    return { totalAwarded, totalMax, percentage };
  }, [result]);

  const handleRefreshExams = () => {
    if (!apiBase) return;
    dispatch(fetchStudentExamList({ apiBase }));
  };

  const openExamWorkspace = (blueprintId) => {
    if (!blueprintId) return;
    dispatch(clearStudentExamResult());
    setAutoSubmitReason("");
    setWorkspaceBlueprintId(String(blueprintId));
    setWorkspaceStep("instructions");
    setFaceError("");
    setIsFaceChecking(false);
    setIsFaceVerified(false);
    stopFaceStream();
  };

  const handleLaunchAttempt = async () => {
    if (!apiBase || !workspaceBlueprintId || !isFaceVerified) return;
    setPendingBlueprintId(String(workspaceBlueprintId));
    try {
      await dispatch(
        startStudentExamAttempt({
          apiBase,
          blueprintId: workspaceBlueprintId,
        })
      ).unwrap();
      setWorkspaceStep("attempt");
      await dispatch(fetchStudentExamList({ apiBase })).unwrap();
    } catch {
      // Error already handled in slice state.
    } finally {
      setPendingBlueprintId("");
      stopFaceStream();
    }
  };

  const closeWorkspace = () => {
    if (isAttemptInProgress) return;
    setWorkspaceBlueprintId("");
    setWorkspaceStep("instructions");
    setFaceError("");
    setIsFaceChecking(false);
    setIsFaceVerified(false);
    stopFaceStream();
  };

  const handleViewResult = (attemptId) => {
    if (!apiBase || !attemptId) return;
    dispatch(
      fetchStudentExamResult({
        apiBase,
        attemptId,
      })
    );
  };

  const handleSaveCurrentAnswer = () => {
    if (!apiBase || !activeAttempt?._id || !currentQuestion) return;
    dispatch(
      saveStudentExamAnswer({
        apiBase,
        attemptId: activeAttempt._id,
        questionIndex: currentQuestionIndexKey,
        answerText: isCurrentMcq ? "" : currentDraft.answerText,
        selectedOption: isCurrentMcq ? currentDraft.selectedOption : "",
      })
    );
  };

  const handleSubmitAttempt = async () => {
    if (!activeAttempt?._id || !apiBase) return;
    const confirmed = window.confirm(
      "Submit exam now? You will not be able to edit answers after submission."
    );
    if (!confirmed) return;
    await handleAutoOrManualSubmit("");
  };

  return (
    <section className="student-exam-center">
      <header className="student-exam-topbar">
        <div>
          <h3>Exam Center</h3>
          <p>Start attempts, save answers, submit exam, and view evaluated results.</p>
        </div>
        <button
          type="button"
          className="student-exam-refresh-btn"
          onClick={handleRefreshExams}
          disabled={examsLoadState === ADMIN_LOAD_STATES.PENDING}
        >
          {examsLoadState === ADMIN_LOAD_STATES.PENDING ? (
            <ClipLoader size={14} color="#ffffff" trackColor="rgba(255,255,255,0.28)" />
          ) : (
            <FiRefreshCcw />
          )}
          <span>Refresh</span>
        </button>
      </header>

      {(examsError || startError || saveError || submitError || resultError) && (
        <div className="student-exam-banner-error">
          <FiAlertCircle />
          <span>{examsError || startError || saveError || submitError || resultError}</span>
        </div>
      )}

      {autoSubmitReason && (
        <div className="student-exam-banner-policy">
          <FiShield />
          <span>{autoSubmitReason}</span>
        </div>
      )}

      {showWorkspace ? (
        <section className="student-exam-workspace">
          <header className="student-exam-workspace-head">
            <div>
              <h4>{workspaceExam?.title || "Exam Session"}</h4>
              <p>{workspaceExam?.subject || "Subject N/A"}</p>
            </div>
            <button
              type="button"
              className="student-exam-workspace-back"
              onClick={
                workspaceStep === "face"
                  ? () => {
                      setWorkspaceStep("instructions");
                      setFaceError("");
                      setIsFaceChecking(false);
                      setIsFaceVerified(false);
                      stopFaceStream();
                    }
                  : closeWorkspace
              }
              disabled={isAttemptInProgress && workspaceStep === "attempt"}
            >
              <FiArrowLeft />
              <span>
                {workspaceStep === "face"
                  ? "Back to Instructions"
                  : isAttemptInProgress && workspaceStep === "attempt"
                  ? "Exam Running"
                  : "Back to Exams"}
              </span>
            </button>
          </header>

          {workspaceStep === "instructions" && (
            <div className="student-exam-preflight-card">
              <div className="student-exam-preflight-title">
                <FiShield />
                <h5>Exam Instructions</h5>
              </div>

              <div className="student-exam-preflight-meta">
                <span>Duration: {Number(workspaceExam?.durationMinutes || 0)} mins</span>
                <span>Total Marks: {Number(workspaceExam?.totalMarks || 0)}</span>
                <span>
                  Window: {formatDateTime(workspaceExam?.scheduleStart)} -{" "}
                  {formatDateTime(workspaceExam?.scheduleEnd)}
                </span>
              </div>

              <ul className="student-exam-instruction-list">
                {EXAM_INSTRUCTIONS.map((line) => (
                  <li key={line}>
                    <FiCheckCircle />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <div className="student-exam-preflight-actions">
                <button
                  type="button"
                  className="student-exam-action secondary"
                  onClick={closeWorkspace}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="student-exam-action primary"
                  onClick={() => setWorkspaceStep("face")}
                >
                  <FiCamera />
                  <span>Proceed to Face Verification</span>
                </button>
              </div>
            </div>
          )}

          {workspaceStep === "face" && (
            <div className="student-exam-face-card">
              <div className="student-exam-preflight-title">
                <FiUserCheck />
                <h5>Face Verification</h5>
              </div>

              <p className="student-exam-face-subtext">
                Camera access allow karein. Face verify hone ke baad hi MCQ exam start hoga.
              </p>

              <div className="student-exam-face-preview">
                <video ref={videoRef} muted playsInline autoPlay />
              </div>

              <div className="student-exam-face-status-row">
                <span className={`student-exam-face-chip ${isFaceVerified ? "verified" : "pending"}`}>
                  {isFaceVerified ? "Face Verified" : "Verification Pending"}
                </span>
                {isFaceChecking && !isFaceVerified && (
                  <span className="student-exam-face-checking">
                    <ClipLoader size={13} color="#0f766e" trackColor="rgba(15,118,110,0.2)" />
                    <span>Detecting face...</span>
                  </span>
                )}
              </div>

              {faceError && <p className="student-exam-face-error">{faceError}</p>}

              <div className="student-exam-preflight-actions">
                {!isFaceVerified && (
                  <button
                    type="button"
                    className="student-exam-action secondary"
                    onClick={() => {
                      if (!faceStreamRef.current) return;
                      setIsFaceChecking(false);
                      setFaceError("");
                      setIsFaceVerified(true);
                    }}
                    disabled={!isCameraReady}
                  >
                    <FiUserCheck />
                    <span>Verify Face</span>
                  </button>
                )}
                <button
                  type="button"
                  className="student-exam-action primary"
                  onClick={handleLaunchAttempt}
                  disabled={
                    !isFaceVerified ||
                    (startLoadState === ADMIN_LOAD_STATES.PENDING &&
                      String(pendingBlueprintId) === String(workspaceBlueprintId))
                  }
                >
                  {startLoadState === ADMIN_LOAD_STATES.PENDING &&
                  String(pendingBlueprintId) === String(workspaceBlueprintId) ? (
                    <ClipLoader size={14} color="#ffffff" trackColor="rgba(255,255,255,0.28)" />
                  ) : (
                    <FiPlayCircle />
                  )}
                  <span>Start MCQ Exam</span>
                </button>
              </div>
            </div>
          )}

          {workspaceStep === "attempt" && (
            <>
              {isAttemptInProgress && activePaper?._id && totalQuestions > 0 ? (
                <section className="student-exam-attempt-panel">
                  <header className="student-exam-attempt-header">
                    <div>
                      <h4>{activeExam?.title || "Live Exam Attempt"}</h4>
                      <p>
                        Attempt #{Number(activeAttempt?.attemptNumber || 1)} - {answeredCount}/
                        {totalQuestions} answered
                      </p>
                    </div>
                    <div className={`student-exam-timer ${isTimeExpired ? "expired" : ""}`}>
                      <FiClock />
                      <span>{isTimeExpired ? "Time up" : formatTimer(remainingMs)}</span>
                    </div>
                  </header>

                  <div className="student-exam-integrity-note">
                    <FiShield />
                    <span>
                      Proctoring active: tab switch / window blur / page close detected hone par
                      attempt auto-submit ho jayega.
                    </span>
                  </div>

                  <div className="student-exam-attempt-body">
                    <aside className="student-question-nav">
                      {questions.map((item, index) => {
                        const isCurrent = index === boundedQuestionIndex;
                        const questionKey = String(item?.questionIndex ?? index);
                        const draft = answerDrafts[questionKey] || {};
                        const answered =
                          String(draft.selectedOption || "").trim().length > 0 ||
                          String(draft.answerText || "").trim().length > 0;
                        return (
                          <button
                            key={`${item?.questionIndex || index}-${index}`}
                            type="button"
                            className={`student-question-nav-btn ${isCurrent ? "current" : ""} ${
                              answered ? "answered" : ""
                            }`}
                            onClick={() => dispatch(setStudentExamQuestionIndex(index))}
                          >
                            Q{index + 1}
                          </button>
                        );
                      })}
                    </aside>

                    <div className="student-question-board">
                      <div className="student-question-head">
                        <span>
                          Question {boundedQuestionIndex + 1} of {totalQuestions}
                        </span>
                        <strong>{currentQuestion?.marks || 0} marks</strong>
                      </div>

                      <p className="student-question-text">
                        {currentQuestion?.questionText || "N/A"}
                      </p>

                      {isCurrentMcq ? (
                        <div className="student-question-options">
                          {(currentQuestion?.options || []).map((option, optionIndex) => {
                            const selected = currentDraft.selectedOption === option;
                            return (
                              <label
                                key={`${option}-${optionIndex}`}
                                className={`student-option-row ${selected ? "selected" : ""}`}
                              >
                                <input
                                  type="radio"
                                  name={`question-${currentQuestionIndexKey}`}
                                  checked={selected}
                                  onChange={() =>
                                    dispatch(
                                      setStudentExamAnswerDraft({
                                        questionIndex: currentQuestionIndexKey,
                                        answerText: "",
                                        selectedOption: option,
                                      })
                                    )
                                  }
                                />
                                <span>{option}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <textarea
                          className="student-question-textarea"
                          placeholder={
                            currentQuestion?.sectionType === "LONG"
                              ? "Write detailed answer..."
                              : "Write answer..."
                          }
                          value={currentDraft.answerText}
                          onChange={(event) =>
                            dispatch(
                              setStudentExamAnswerDraft({
                                questionIndex: currentQuestionIndexKey,
                                answerText: event.target.value,
                                selectedOption: "",
                              })
                            )
                          }
                          rows={currentQuestion?.sectionType === "LONG" ? 8 : 5}
                        />
                      )}

                      <footer className="student-question-actions">
                        <button
                          type="button"
                          className="student-question-btn muted"
                          onClick={() =>
                            dispatch(
                              setStudentExamQuestionIndex(
                                Math.max(boundedQuestionIndex - 1, 0)
                              )
                            )
                          }
                          disabled={boundedQuestionIndex <= 0}
                        >
                          <FiChevronLeft />
                          <span>Previous</span>
                        </button>

                        <button
                          type="button"
                          className="student-question-btn save"
                          onClick={handleSaveCurrentAnswer}
                          disabled={
                            saveLoadState === ADMIN_LOAD_STATES.PENDING ||
                            activeAttempt?.status !== "IN_PROGRESS"
                          }
                        >
                          {saveLoadState === ADMIN_LOAD_STATES.PENDING &&
                          Number(savingQuestionIndex) === Number(currentQuestionIndexKey) ? (
                            <ClipLoader
                              size={14}
                              color="#ffffff"
                              trackColor="rgba(255,255,255,0.24)"
                            />
                          ) : (
                            <FiCheckCircle />
                          )}
                          <span>Save Answer</span>
                        </button>

                        <button
                          type="button"
                          className="student-question-btn muted"
                          onClick={() =>
                            dispatch(
                              setStudentExamQuestionIndex(
                                Math.min(boundedQuestionIndex + 1, totalQuestions - 1)
                              )
                            )
                          }
                          disabled={boundedQuestionIndex >= totalQuestions - 1}
                        >
                          <span>Next</span>
                          <FiChevronRight />
                        </button>

                        <button
                          type="button"
                          className="student-question-btn submit"
                          onClick={handleSubmitAttempt}
                          disabled={
                            submitLoadState === ADMIN_LOAD_STATES.PENDING ||
                            activeAttempt?.status !== "IN_PROGRESS"
                          }
                        >
                          {submitLoadState === ADMIN_LOAD_STATES.PENDING ? (
                            <ClipLoader
                              size={14}
                              color="#ffffff"
                              trackColor="rgba(255,255,255,0.24)"
                            />
                          ) : (
                            <FiSend />
                          )}
                          <span>{isTimeExpired ? "Submit Now" : "Submit Exam"}</span>
                        </button>
                      </footer>
                    </div>
                  </div>
                </section>
              ) : (
                <div className="student-exam-preflight-card">
                  <div className="student-exam-preflight-title">
                    <FiAlertCircle />
                    <h5>Attempt session unavailable</h5>
                  </div>
                  <p>
                    Active exam attempt load nahi ho paaya. Please wapas jaakar exam dobara
                    start karein.
                  </p>
                  <div className="student-exam-preflight-actions">
                    <button
                      type="button"
                      className="student-exam-action secondary"
                      onClick={closeWorkspace}
                    >
                      Back to Exams
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      ) : (
        <div className="student-exam-grid">
          {examsLoadState === ADMIN_LOAD_STATES.PENDING && exams.length === 0 ? (
            <div className="student-exam-loading-card">
              <ClipLoader size={18} color="#0f766e" trackColor="rgba(15,118,110,0.25)" />
              <span>Loading published exams...</span>
            </div>
          ) : exams.length === 0 ? (
            <div className="student-exam-empty-card">
              <FiBookOpen />
              <strong>No published exams available right now.</strong>
              <p>New exams will appear here once they are published by admin.</p>
            </div>
          ) : (
            exams.map((exam) => {
              const isStartPending =
                startLoadState === ADMIN_LOAD_STATES.PENDING &&
                String(pendingBlueprintId) === String(exam?._id);
              const cardStatus = exam?.hasActiveAttempt
                ? "In Progress"
                : exam?.canAttempt
                ? "Available"
                : "Locked";
              const cardStatusClass = exam?.hasActiveAttempt
                ? "in-progress"
                : exam?.canAttempt
                ? "available"
                : "locked";

              return (
                <article key={exam?._id} className="student-exam-card">
                  <div className="student-exam-card-top">
                    <span className={`student-exam-status ${cardStatusClass}`}>
                      {cardStatus}
                    </span>
                    <span className="student-exam-type">{formatExamType(exam?.examType)}</span>
                  </div>

                  <h4>{exam?.title || "Untitled Exam"}</h4>
                  <p className="student-exam-subject">{exam?.subject || "Subject N/A"}</p>

                  <div className="student-exam-meta-grid">
                    <div>
                      <label>Duration</label>
                      <p>{Number(exam?.durationMinutes || 0)} mins</p>
                    </div>
                    <div>
                      <label>Total Marks</label>
                      <p>{Number(exam?.totalMarks || 0)}</p>
                    </div>
                    <div>
                      <label>Attempts</label>
                      <p>
                        {Number(exam?.attemptsUsed || 0)} / {Number(exam?.maxAttempts || 2)}
                      </p>
                    </div>
                    <div>
                      <label>Teacher</label>
                      <p>{exam?.teacher?.name || "Not Assigned"}</p>
                    </div>
                  </div>

                  <div className="student-exam-schedule">
                    <FiClock />
                    <span>
                      {formatDateTime(exam?.scheduleStart)} - {formatDateTime(exam?.scheduleEnd)}
                    </span>
                  </div>

                  <div className="student-exam-card-actions">
                    {(exam?.canAttempt || exam?.hasActiveAttempt) && (
                      <button
                        type="button"
                        className="student-exam-action primary"
                        onClick={() => openExamWorkspace(exam?._id)}
                        disabled={isStartPending}
                      >
                        {isStartPending ? (
                          <ClipLoader
                            size={14}
                            color="#ffffff"
                            trackColor="rgba(255,255,255,0.28)"
                          />
                        ) : exam?.hasActiveAttempt ? (
                          <FiPlayCircle />
                        ) : (
                          <FiTarget />
                        )}
                        <span>{exam?.hasActiveAttempt ? "Continue Exam" : "Start Exam"}</span>
                      </button>
                    )}

                    {exam?.latestEvaluatedAttemptId && (
                      <button
                        type="button"
                        className="student-exam-action secondary"
                        onClick={() => handleViewResult(exam.latestEvaluatedAttemptId)}
                        disabled={
                          resultLoadState === ADMIN_LOAD_STATES.PENDING &&
                          String(activeResultAttemptId) ===
                            String(exam.latestEvaluatedAttemptId)
                        }
                      >
                        {resultLoadState === ADMIN_LOAD_STATES.PENDING &&
                        String(activeResultAttemptId) === String(exam.latestEvaluatedAttemptId) ? (
                          <ClipLoader size={14} color="#0f172a" trackColor="rgba(15,23,42,0.18)" />
                        ) : (
                          <FiCheckCircle />
                        )}
                        <span>View Result</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      {!showWorkspace && (
        <section className="student-exam-result-panel">
          <header className="student-exam-result-header">
            <h4>Exam Result</h4>
            {resultSummary && (
              <span className="student-exam-result-score">
                {resultSummary.totalAwarded}/{resultSummary.totalMax}
              </span>
            )}
          </header>

          {resultLoadState === ADMIN_LOAD_STATES.PENDING ? (
            <div className="student-exam-result-loading">
              <ClipLoader size={18} color="#0f766e" trackColor="rgba(15,118,110,0.2)" />
              <span>Loading result...</span>
            </div>
          ) : !result?.evaluation ? (
            <p className="student-exam-result-empty">
              Result will appear here after you submit and evaluation is completed.
            </p>
          ) : (
            <>
              <div className="student-exam-result-cards">
                <article>
                  <label>Total Score</label>
                  <strong>
                    {resultSummary?.totalAwarded} / {resultSummary?.totalMax}
                  </strong>
                </article>
                <article>
                  <label>Percentage</label>
                  <strong>{resultSummary?.percentage}%</strong>
                </article>
                <article>
                  <label>Status</label>
                  <strong>{result?.attempt?.status || "EVALUATED"}</strong>
                </article>
              </div>

              <div className="student-exam-result-table-wrap">
                <table className="student-exam-result-table">
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Score</th>
                      <th>Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result?.evaluation?.perQuestion || []).map((item) => (
                      <tr key={`result-q-${item?.questionIndex}`}>
                        <td>Q{Number(item?.questionIndex || 0) + 1}</td>
                        <td>
                          {Number(item?.awardedMarks || 0)} / {Number(item?.maxMarks || 0)}
                        </td>
                        <td>{item?.feedback || "No feedback available."}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </section>
  );
};

export default StudentExamCenter;
