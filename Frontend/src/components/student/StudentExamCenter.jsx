import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
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
  FiSend,
  FiShield,
  FiSkipForward,
  FiTarget,
  FiUserCheck,
} from "react-icons/fi";
import { BeatLoader } from "react-spinners";
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
import axios from "../../utils/axiosInstance";
import "./StudentExamCenter.css";

const PROCTOR_FACE_CHECK_INTERVAL_MS = 7000;
const EXTENSION_PANEL_WIDTH_THRESHOLD = 120;

const EXAM_INSTRUCTIONS = [
  "After starting the exam, tab switch/minimize/focus loss or face-check failures trigger one warning. A second violation auto-submits your attempt.",
  "External activity like fullscreen exit, extension side panel usage, copy/cut/paste, or screenshot attempts trigger warning on first violation and auto-submit on second.",
  "Questions will open only after face verification is complete.",
  "Keep saving answers for each question. Unsaved answers may be missed during submission.",
  "Your attempt will be automatically submitted when the exam duration ends.",
  "Ensure you have a stable internet connection and a charged device before starting the exam.",
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

const hashText = (value = "") => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const StudentExamCenter = ({ onExamFocusModeChange }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [lockedQuestionMap, setLockedQuestionMap] = useState({});
  const [hasOpenExtensionPanel, setHasOpenExtensionPanel] = useState(false);

  const videoRef = useRef(null);
  const proctorVideoRef = useRef(null);
  const faceStreamRef = useRef(null);
  const proctorCheckIntervalRef = useRef(null);
  const submitLockRef = useRef(false);
  const integrityViolationCountRef = useRef(0);
  const lastIntegrityViolationAtRef = useRef(0);
  const missingFaceFrameCountRef = useRef(0);
  const isFaceMonitoringUnavailableRef = useRef(false);
  const examViewportBaselineRef = useRef(0);

  const getFullscreenElement = useCallback(
    () =>
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement ||
      null,
    []
  );

  const enterExamFullscreen = useCallback(async () => {
    try {
      const docEl = document.documentElement;
      const requestFullscreen =
        docEl?.requestFullscreen ||
        docEl?.webkitRequestFullscreen ||
        docEl?.msRequestFullscreen;
      if (!requestFullscreen) return false;
      if (getFullscreenElement()) return true;
      await requestFullscreen.call(docEl);
      return Boolean(getFullscreenElement());
    } catch {
      return false;
    }
  }, [getFullscreenElement]);

  const exitExamFullscreen = useCallback(async () => {
    try {
      const exitFullscreen =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.msExitFullscreen;
      if (!exitFullscreen || !getFullscreenElement()) return;
      await exitFullscreen.call(document);
    } catch {
      // Ignore fullscreen exit errors.
    }
  }, [getFullscreenElement]);

  const stopFaceStream = useCallback(() => {
    if (proctorCheckIntervalRef.current) {
      window.clearInterval(proctorCheckIntervalRef.current);
      proctorCheckIntervalRef.current = null;
    }

    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach((track) => track.stop());
      faceStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (proctorVideoRef.current) {
      proctorVideoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, []);

  const captureFrameDataUrl = useCallback((videoEl) => {
    if (!videoEl || videoEl.readyState < 2) return "";
    const width = videoEl.videoWidth || 640;
    const height = videoEl.videoHeight || 360;
    if (!width || !height) return "";
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return "";
    context.drawImage(videoEl, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.85);
  }, []);

  const hasLikelyOpenExtensionPanel = useCallback(() => {
    const viewportWidth = window.visualViewport?.width || window.innerWidth || 0;
    const outerWidth = window.outerWidth || 0;
    if (!viewportWidth || !outerWidth) return false;
    const occupiedWidth = outerWidth - viewportWidth;
    return occupiedWidth >= EXTENSION_PANEL_WIDTH_THRESHOLD;
  }, []);

  const verifyFaceWithBackend = useCallback(
    async ({ imageData, attemptId = "" }) => {
      if (!apiBase || !imageData) {
        return {
          ok: false,
          error: "FACE_FRAME_MISSING",
          message: "Face frame is not available.",
        };
      }
      const endpoint = attemptId
        ? `${apiBase}/student/attempt/${attemptId}/face-check`
        : `${apiBase}/student/exam/face-verify`;
      try {
        const response = await axios.post(
          endpoint,
          { imageData },
          { withCredentials: true }
        );
        return {
          ok: true,
          verified: Boolean(response.data?.verified),
          reason: String(response.data?.reason || ""),
          facesDetected: Number(response.data?.facesDetected || 0),
          eyesDetected: Number(response.data?.eyesDetected || 0),
          gazeVerified: Boolean(response.data?.gazeVerified),
        };
      } catch (error) {
        return {
          ok: false,
          error: String(error?.response?.data?.error || "FACE_VERIFY_REQUEST_FAILED"),
          message:
            error?.response?.data?.message || "Face verification request failed.",
        };
      }
    },
    [apiBase]
  );

  const verifyFaceWithBrowserDetector = useCallback(async (videoEl) => {
    const FaceDetectorCtor =
      typeof window !== "undefined" ? window.FaceDetector : undefined;
    if (typeof FaceDetectorCtor !== "function") {
      return {
        ok: false,
        error: "BROWSER_FACE_DETECTOR_UNAVAILABLE",
        message:
          "Face verification service unavailable and this browser does not support FaceDetector.",
      };
    }
    if (!videoEl || videoEl.readyState < 2) {
      return {
        ok: false,
        error: "BROWSER_FACE_FRAME_MISSING",
        message: "Camera frame not ready for browser face detection.",
      };
    }
    try {
      const detector = new FaceDetectorCtor({
        maxDetectedFaces: 2,
        fastMode: true,
      });
      const faces = await detector.detect(videoEl);
      const facesDetected = Array.isArray(faces) ? faces.length : 0;
      const verified = facesDetected === 1;
      return {
        ok: true,
        verified,
        facesDetected,
        eyesDetected: 0,
        gazeVerified: verified,
        reason: verified ? "VERIFIED" : facesDetected === 0 ? "NO_FACE" : "MULTIPLE_FACES",
      };
    } catch (error) {
      return {
        ok: false,
        error: "BROWSER_FACE_DETECTOR_FAILED",
        message: error?.message || "Browser face detection failed.",
      };
    }
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
        integrityViolationCountRef.current = 0;
        lastIntegrityViolationAtRef.current = 0;
        missingFaceFrameCountRef.current = 0;
        isFaceMonitoringUnavailableRef.current = false;
        await exitExamFullscreen();
        stopFaceStream();
        setWorkspaceBlueprintId("");
        setWorkspaceStep("instructions");
      }
    },
    [apiBase, activeAttempt?._id, dispatch, exitExamFullscreen, stopFaceStream]
  );

  useEffect(() => {
    if (!apiBase) return;
    dispatch(fetchStudentExamList({ apiBase }));
  }, [dispatch, apiBase]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (workspaceStep !== "face" || !workspaceBlueprintId) return undefined;
    let cancelled = false;

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
        if (proctorVideoRef.current) {
          proctorVideoRef.current.srcObject = stream;
          await proctorVideoRef.current.play().catch(() => {});
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
    };
  }, [workspaceStep, workspaceBlueprintId, stopFaceStream]);

  useEffect(() => {
    return () => {
      stopFaceStream();
      exitExamFullscreen();
    };
  }, [stopFaceStream, exitExamFullscreen]);

  const activeExam = useMemo(() => {
    const lookup = String(activeBlueprintId || activeAttempt?.blueprintId || "");
    return exams.find((item) => String(item?._id) === lookup) || null;
  }, [exams, activeBlueprintId, activeAttempt?.blueprintId]);

  const workspaceExam = useMemo(() => {
    const lookup = String(workspaceBlueprintId || "");
    if (!lookup) return activeExam;
    return exams.find((item) => String(item?._id) === lookup) || activeExam;
  }, [exams, workspaceBlueprintId, activeExam]);

  const workspaceScheduleInfo = useMemo(() => {
    const startMs = new Date(workspaceExam?.scheduleStart || "").getTime();
    const endMs = new Date(workspaceExam?.scheduleEnd || "").getTime();
    const hasValidWindow = Number.isFinite(startMs) && Number.isFinite(endMs);
    const isBeforeStart = hasValidWindow && clockNow < startMs;
    const isExpired = hasValidWindow && clockNow >= endMs;
    const startCountdownMs = hasValidWindow ? Math.max(startMs - clockNow, 0) : 0;
    const endCountdownMs = hasValidWindow ? Math.max(endMs - clockNow, 0) : 0;
    return {
      hasValidWindow,
      isBeforeStart,
      isExpired,
      startCountdownMs,
      endCountdownMs,
    };
  }, [workspaceExam?.scheduleStart, workspaceExam?.scheduleEnd, clockNow]);

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
    const seed = String(activeAttempt?._id || workspaceBlueprintId || activeBlueprintId || "exam");
    return [...normalized].sort((a, b) => {
      const aRank = hashText(`${seed}:${a.questionIndex}:${a.questionText || ""}`);
      const bRank = hashText(`${seed}:${b.questionIndex}:${b.questionText || ""}`);
      return aRank - bRank;
    });
  }, [rawPaperQuestions, activeAttempt?._id, workspaceBlueprintId, activeBlueprintId]);

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
  const isCurrentQuestionLocked = Boolean(
    lockedQuestionMap[String(currentQuestionIndexKey)]
  );
  const hasCurrentAnswer =
    String(currentDraft?.selectedOption || "").trim().length > 0 ||
    String(currentDraft?.answerText || "").trim().length > 0;

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
  const isExamFocusMode = isAttemptInProgress && workspaceStep === "attempt";
  const resultRouteMatch = useMemo(() => {
    const match = String(location.pathname || "").match(
      /\/dashboard\/exams\/results\/([^/]+)/i
    );
    return match?.[1] ? decodeURIComponent(match[1]) : "";
  }, [location.pathname]);
  const isAttemptResultsPage = Boolean(resultRouteMatch) && !showWorkspace;
  const selectedResultExam = useMemo(() => {
    if (!resultRouteMatch) return null;
    return (
      exams.find((item) => String(item?._id) === String(resultRouteMatch)) || null
    );
  }, [exams, resultRouteMatch]);

  useEffect(() => {
    if (!showWorkspace || isAttemptInProgress) return undefined;

    const evaluatePanelState = () => {
      setHasOpenExtensionPanel(hasLikelyOpenExtensionPanel());
    };

    evaluatePanelState();
    const timer = window.setInterval(evaluatePanelState, 800);
    window.addEventListener("resize", evaluatePanelState);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", evaluatePanelState);
    }

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", evaluatePanelState);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", evaluatePanelState);
      }
      setHasOpenExtensionPanel(false);
    };
  }, [hasLikelyOpenExtensionPanel, isAttemptInProgress, showWorkspace]);

  useEffect(() => {
    if (typeof onExamFocusModeChange === "function") {
      onExamFocusModeChange(isExamFocusMode);
    }
    return () => {
      if (typeof onExamFocusModeChange === "function") {
        onExamFocusModeChange(false);
      }
    };
  }, [isExamFocusMode, onExamFocusModeChange]);

  useEffect(() => {
    if (!isAttemptInProgress) {
      setLockedQuestionMap({});
      return;
    }
    const nextLocked = {};
    (activeAttempt?.answers || []).forEach((item) => {
      const key = String(item?.questionIndex);
      const hasMcq = String(item?.selectedOption || "").trim().length > 0;
      const hasText = String(item?.answerText || "").trim().length > 0;
      if (hasMcq || hasText) {
        nextLocked[key] = true;
      }
    });
    setLockedQuestionMap(nextLocked);
  }, [isAttemptInProgress, activeAttempt?.answers]);

  const isQuestionLocked = useCallback(
    (question) => Boolean(lockedQuestionMap[String(question?.questionIndex)]),
    [lockedQuestionMap]
  );

  const getNavigableIndex = useCallback(
    (fromIndex, direction = 1, wrap = false) => {
      if (totalQuestions <= 0) return -1;
      if (direction > 0) {
        for (let i = fromIndex + 1; i < totalQuestions; i += 1) {
          if (!isQuestionLocked(questions[i])) return i;
        }
        if (wrap) {
          for (let i = 0; i < fromIndex; i += 1) {
            if (!isQuestionLocked(questions[i])) return i;
          }
        }
        return -1;
      }
      for (let i = fromIndex - 1; i >= 0; i -= 1) {
        if (!isQuestionLocked(questions[i])) return i;
      }
      if (wrap) {
        for (let i = totalQuestions - 1; i > fromIndex; i -= 1) {
          if (!isQuestionLocked(questions[i])) return i;
        }
      }
      return -1;
    },
    [totalQuestions, isQuestionLocked, questions]
  );

  const previousQuestionIndex = useMemo(
    () => getNavigableIndex(boundedQuestionIndex, -1, false),
    [getNavigableIndex, boundedQuestionIndex]
  );
  const nextQuestionIndex = useMemo(
    () => getNavigableIndex(boundedQuestionIndex, 1, false),
    [getNavigableIndex, boundedQuestionIndex]
  );
  const skipQuestionIndex = useMemo(
    () => getNavigableIndex(boundedQuestionIndex, 1, true),
    [getNavigableIndex, boundedQuestionIndex]
  );

  useEffect(() => {
    if (!currentQuestion || !isCurrentQuestionLocked) return;
    const nextOpen = getNavigableIndex(boundedQuestionIndex, 1, true);
    if (nextOpen >= 0) {
      dispatch(setStudentExamQuestionIndex(nextOpen));
    }
  }, [
    boundedQuestionIndex,
    currentQuestion,
    dispatch,
    getNavigableIndex,
    isCurrentQuestionLocked,
  ]);

  const handleIntegrityViolation = useCallback((warningText, submitText) => {
    if (!isAttemptInProgress || submitLockRef.current) return;

    const now = Date.now();
    if (now - lastIntegrityViolationAtRef.current < 1000) return;
    lastIntegrityViolationAtRef.current = now;
    integrityViolationCountRef.current += 1;

    if (integrityViolationCountRef.current === 1) {
      setAutoSubmitReason(
        warningText ||
          "Warning 1/2: Policy violation detected. On the next violation, your exam will be auto-submitted."
      );
      return;
    }

    handleAutoOrManualSubmit(
      submitText ||
        "Second policy violation detected. Attempt auto-submitted and exam closed."
    );
  }, [handleAutoOrManualSubmit, isAttemptInProgress]);

  useEffect(() => {
    if (isAttemptInProgress) return;
    integrityViolationCountRef.current = 0;
    lastIntegrityViolationAtRef.current = 0;
    missingFaceFrameCountRef.current = 0;
    isFaceMonitoringUnavailableRef.current = false;
  }, [isAttemptInProgress, activeAttempt?._id]);

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
        handleIntegrityViolation(
          "Warning 1/2: Tab switch or minimize detected. Next violation will auto-submit your exam.",
          "Second policy violation detected. Attempt auto-submitted and exam closed."
        );
      }
    };

    const handleWindowBlur = () => {
      window.setTimeout(() => {
        if (document.hidden || document.visibilityState !== "visible" || !document.hasFocus()) {
          handleIntegrityViolation(
            "Warning 1/2: Tab switch or minimize detected. Next violation will auto-submit your exam.",
            "Second policy violation detected. Attempt auto-submitted and exam closed."
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
    handleIntegrityViolation,
    submitAttemptKeepAlive,
  ]);

  useEffect(() => {
    if (!isAttemptInProgress || !activeAttempt?._id) return undefined;

    const handleFullscreenExit = () => {
      if (submitLockRef.current) return;
      if (!getFullscreenElement()) {
        handleIntegrityViolation(
          "Warning 1/2: Fullscreen exited during exam. Next violation will auto-submit your exam.",
          "Second policy violation detected. Attempt auto-submitted and exam closed."
        );
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenExit);
    document.addEventListener("webkitfullscreenchange", handleFullscreenExit);
    document.addEventListener("MSFullscreenChange", handleFullscreenExit);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenExit);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenExit);
      document.removeEventListener("MSFullscreenChange", handleFullscreenExit);
    };
  }, [
    activeAttempt?._id,
    getFullscreenElement,
    handleIntegrityViolation,
    isAttemptInProgress,
  ]);

  useEffect(() => {
    if (!isAttemptInProgress || !activeAttempt?._id) return undefined;

    if (!examViewportBaselineRef.current) {
      examViewportBaselineRef.current =
        window.visualViewport?.width || window.innerWidth || 0;
    }

    const handleViewportResize = () => {
      if (submitLockRef.current) return;
      if (document.hidden || document.visibilityState !== "visible" || !document.hasFocus()) {
        return;
      }
      const currentWidth = window.visualViewport?.width || window.innerWidth || 0;
      if (!currentWidth) return;

      if (!examViewportBaselineRef.current || currentWidth > examViewportBaselineRef.current) {
        examViewportBaselineRef.current = currentWidth;
        return;
      }

      const widthDrop = examViewportBaselineRef.current - currentWidth;
      if (widthDrop >= 180) {
        handleIntegrityViolation(
          "Warning 1/2: Browser side panel or external activity detected. Next violation will auto-submit your exam.",
          "Second policy violation detected. Attempt auto-submitted and exam closed."
        );
      }
    };

    window.addEventListener("resize", handleViewportResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportResize);
    }

    return () => {
      window.removeEventListener("resize", handleViewportResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportResize);
      }
      examViewportBaselineRef.current = 0;
    };
  }, [activeAttempt?._id, handleIntegrityViolation, isAttemptInProgress]);

  useEffect(() => {
    if (!isAttemptInProgress || !activeAttempt?._id) return undefined;
    let cancelled = false;
    let inFlight = false;

    const checkFaceActivity = async () => {
      if (cancelled || inFlight || submitLockRef.current) return;
      const sourceVideo = proctorVideoRef.current || videoRef.current;
      const imageData = captureFrameDataUrl(sourceVideo);
      if (!imageData) {
        missingFaceFrameCountRef.current += 1;
        if (missingFaceFrameCountRef.current >= 2) {
          handleIntegrityViolation(
            "Warning 1/2: Camera feed unavailable during exam. Keep camera active.",
            "Second camera feed failure detected. Attempt auto-submitted."
          );
        }
        return;
      }
      missingFaceFrameCountRef.current = 0;
      inFlight = true;
      const result = await verifyFaceWithBackend({
        imageData,
        attemptId: activeAttempt._id,
      });
      let effectiveResult = result;
      if (!result.ok && result.error === "OPENCV_NOT_AVAILABLE") {
        const fallback = await verifyFaceWithBrowserDetector(sourceVideo);
        effectiveResult = fallback.ok
          ? fallback
          : {
              ...fallback,
              message:
                fallback.message ||
                "Face check failed. Keep camera active and use supported browser.",
            };
      }
      inFlight = false;
      if (cancelled) return;

      if (!effectiveResult.ok) {
        if (
          effectiveResult.error === "BROWSER_FACE_DETECTOR_UNAVAILABLE" ||
          effectiveResult.error === "BROWSER_FACE_DETECTOR_FAILED"
        ) {
          if (!isFaceMonitoringUnavailableRef.current) {
            setAutoSubmitReason(
              "Automatic face monitoring is unavailable on this browser. Tab and focus integrity checks remain active."
            );
            isFaceMonitoringUnavailableRef.current = true;
          }
          if (proctorCheckIntervalRef.current) {
            window.clearInterval(proctorCheckIntervalRef.current);
            proctorCheckIntervalRef.current = null;
          }
          return;
        }
        setAutoSubmitReason(effectiveResult.message || "Face check failed. Keep camera active.");
        return;
      }
      if (!effectiveResult.verified) {
        if (effectiveResult.reason === "EYES_NOT_VISIBLE") {
          handleAutoOrManualSubmit(
            "Eyes not visible on screen during exam monitoring. Attempt auto-submitted."
          );
          return;
        }
        handleIntegrityViolation(
          "Warning 1/2: Face not detected clearly. Keep only your face visible in camera.",
          "Second face verification failure detected. Attempt auto-submitted."
        );
      }
    };

    checkFaceActivity();
    proctorCheckIntervalRef.current = window.setInterval(
      checkFaceActivity,
      PROCTOR_FACE_CHECK_INTERVAL_MS
    );

    return () => {
      cancelled = true;
      if (proctorCheckIntervalRef.current) {
        window.clearInterval(proctorCheckIntervalRef.current);
        proctorCheckIntervalRef.current = null;
      }
    };
  }, [
    activeAttempt?._id,
    captureFrameDataUrl,
    handleAutoOrManualSubmit,
    handleIntegrityViolation,
    isAttemptInProgress,
    verifyFaceWithBrowserDetector,
    verifyFaceWithBackend,
  ]);

  useEffect(() => {
    if (!isAttemptInProgress || !activeAttempt?._id) return undefined;

    const blockAndWarnForAction = (event, warningText, submitText) => {
      if (event?.preventDefault) event.preventDefault();
      if (event?.stopPropagation) event.stopPropagation();
      if (submitLockRef.current) return false;
      handleIntegrityViolation(
        warningText,
        submitText || "Second policy violation detected. Attempt auto-submitted and exam closed."
      );
      return false;
    };

    const onCopy = (event) =>
      blockAndWarnForAction(
        event,
        "Warning 1/2: Copy action detected during exam. Next violation will auto-submit your exam."
      );

    const onCut = (event) =>
      blockAndWarnForAction(
        event,
        "Warning 1/2: Cut action detected during exam. Next violation will auto-submit your exam."
      );

    const onPaste = (event) =>
      blockAndWarnForAction(
        event,
        "Warning 1/2: Paste action detected during exam. Next violation will auto-submit your exam."
      );

    const onKeyDown = (event) => {
      const key = String(event?.key || "").toLowerCase();
      const isModifierCopyCutPaste =
        (event.ctrlKey || event.metaKey) && ["c", "v", "x"].includes(key);
      if (isModifierCopyCutPaste) {
        return blockAndWarnForAction(
          event,
          "Warning 1/2: Copy/Paste shortcut detected during exam. Next violation will auto-submit your exam."
        );
      }

      const isPrintScreenKey = key === "printscreen" || key === "snapshot";
      const isMacScreenshotShortcut =
        event.metaKey && event.shiftKey && ["3", "4", "5"].includes(key);
      const isCtrlShiftScreenshot =
        event.ctrlKey && event.shiftKey && key === "s";

      if (isPrintScreenKey || isMacScreenshotShortcut || isCtrlShiftScreenshot) {
        return blockAndWarnForAction(
          event,
          "Warning 1/2: Screenshot shortcut detected during exam. Next violation will auto-submit your exam."
        );
      }
      return undefined;
    };

    const onKeyUp = (event) => {
      const key = String(event?.key || "").toLowerCase();
      if (key === "printscreen" || key === "snapshot") {
        return blockAndWarnForAction(
          event,
          "Warning 1/2: Screenshot key detected during exam. Next violation will auto-submit your exam."
        );
      }
      return undefined;
    };

    document.addEventListener("copy", onCopy, true);
    document.addEventListener("cut", onCut, true);
    document.addEventListener("paste", onPaste, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);

    return () => {
      document.removeEventListener("copy", onCopy, true);
      document.removeEventListener("cut", onCut, true);
      document.removeEventListener("paste", onPaste, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
    };
  }, [activeAttempt?._id, handleIntegrityViolation, isAttemptInProgress]);

  const resultSummary = useMemo(() => {
    const evaluation = result?.evaluation;
    if (!evaluation) return null;
    const perQuestion = Array.isArray(evaluation?.perQuestion) ? evaluation.perQuestion : [];
    const totalAwarded = perQuestion.length
      ? perQuestion.reduce(
          (sum, item) => sum + (item?.isCorrect ? 1 : 0),
          0
        )
      : Number(evaluation.totalAwarded || 0);
    const totalMax = perQuestion.length || Number(evaluation.totalMax || 0);
    const percentage =
      totalMax > 0 ? Number(((totalAwarded / totalMax) * 100).toFixed(1)) : 0;
    return { totalAwarded, totalMax, percentage };
  }, [result]);

  const resultInsights = useMemo(() => {
    const perQuestion = Array.isArray(result?.evaluation?.perQuestion)
      ? result.evaluation.perQuestion
      : [];
    if (!perQuestion.length || !resultSummary) return null;

    const correctCount = perQuestion.reduce(
      (sum, item) => sum + (item?.isCorrect ? 1 : 0),
      0
    );
    const incorrectCount = perQuestion.length - correctCount;
    const accuracy = Number(
      ((correctCount / Math.max(perQuestion.length, 1)) * 100).toFixed(1)
    );

    const chartWidth = 560;
    const chartHeight = 180;
    const paddingX = 30;
    const paddingY = 16;
    const usableWidth = chartWidth - paddingX * 2;
    const usableHeight = chartHeight - paddingY * 2;
    const points = perQuestion.map((item, index) => {
      const ratio =
        perQuestion.length <= 1 ? 0.5 : index / (perQuestion.length - 1);
      const x = paddingX + ratio * usableWidth;
      const y = paddingY + (item?.isCorrect ? 0 : usableHeight);
      return { x, y, label: `Q${index + 1}`, value: item?.isCorrect ? 100 : 0 };
    });
    const polylinePoints = points.map((pt) => `${pt.x},${pt.y}`).join(" ");

    let remarkTitle = "Keep Practicing";
    let remarkText = "Revise core topics and attempt more practice sets.";
    if (resultSummary.percentage >= 85) {
      remarkTitle = "Good Work!";
      remarkText = "You have a strong grasp of this exam.";
    } else if (resultSummary.percentage >= 60) {
      remarkTitle = "Nice Progress";
      remarkText = "You are doing well. Improve weak questions for a better score.";
    }

    return {
      perQuestion,
      correctCount,
      incorrectCount,
      accuracy,
      points,
      polylinePoints,
      chartWidth,
      chartHeight,
      remarkTitle,
      remarkText,
    };
  }, [result?.evaluation?.perQuestion, resultSummary]);

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
    if (hasLikelyOpenExtensionPanel()) {
      setFaceError(
        "Please close your browser extension/side panel before starting the exam."
      );
      return;
    }
    if (workspaceScheduleInfo.isBeforeStart) {
      setFaceError(
        `Exam not started yet. It will start at ${formatDateTime(
          workspaceExam?.scheduleStart
        )}.`
      );
      return;
    }
    if (workspaceScheduleInfo.isExpired) {
      setFaceError("Your exam has expired.");
      return;
    }
    const fullscreenReady = await enterExamFullscreen();
    if (!fullscreenReady) {
      setFaceError(
        "Fullscreen permission is required to start exam. Please allow fullscreen and try again."
      );
      return;
    }
    examViewportBaselineRef.current =
      window.visualViewport?.width || window.innerWidth || 0;
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
      await exitExamFullscreen();
      stopFaceStream();
    } finally {
      setPendingBlueprintId("");
    }
  };

  const closeWorkspace = () => {
    if (isAttemptInProgress) return;
    exitExamFullscreen();
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

  const openAttemptResultsPage = (blueprintId) => {
    if (!blueprintId) return;
    dispatch(clearStudentExamResult());
    navigate(`/dashboard/exams/results/${blueprintId}`);
  };

  const closeAttemptResultsPage = () => {
    dispatch(clearStudentExamResult());
    navigate("/dashboard/exams");
  };

  const handleSaveCurrentAnswer = async () => {
    if (!apiBase || !activeAttempt?._id || !currentQuestion) return;
    if (!hasCurrentAnswer || isCurrentQuestionLocked) return;
    try {
      await dispatch(
        saveStudentExamAnswer({
          apiBase,
          attemptId: activeAttempt._id,
          questionIndex: currentQuestionIndexKey,
          answerText: isCurrentMcq ? "" : currentDraft.answerText,
          selectedOption: isCurrentMcq ? currentDraft.selectedOption : "",
        })
      ).unwrap();
      setLockedQuestionMap((prev) => ({
        ...prev,
        [String(currentQuestionIndexKey)]: true,
      }));
      const nextOpen = getNavigableIndex(boundedQuestionIndex, 1, true);
      if (nextOpen >= 0) {
        dispatch(setStudentExamQuestionIndex(nextOpen));
      }
    } catch {
      // Save error is already handled by slice state.
    }
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
          <video
            ref={proctorVideoRef}
            muted
            playsInline
            autoPlay
            aria-hidden="true"
            style={{ display: "none" }}
          />

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

              {workspaceScheduleInfo.isBeforeStart && (
                <p className="student-exam-face-subtext">
                  Exam starts at {formatDateTime(workspaceExam?.scheduleStart)} (starts in{" "}
                  {formatTimer(workspaceScheduleInfo.startCountdownMs)}).
                </p>
              )}
              {workspaceScheduleInfo.isExpired && (
                <p className="student-exam-face-error">Your exam has expired.</p>
              )}

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
                  disabled={
                    workspaceScheduleInfo.isBeforeStart ||
                    workspaceScheduleInfo.isExpired ||
                    hasOpenExtensionPanel
                  }
                >
                  <FiCamera />
                  <span>
                    {workspaceScheduleInfo.isExpired
                      ? "Exam Expired"
                      : hasOpenExtensionPanel
                      ? "Close Extension Panel First"
                      : workspaceScheduleInfo.isBeforeStart
                      ? "Exam Not Started"
                      : "Proceed to Face Verification"}
                  </span>
                </button>
              </div>
              {hasOpenExtensionPanel && (
                <p className="student-exam-face-error">
                  Please close your browser extension/side panel before starting the exam.
                </p>
              )}
            </div>
          )}

          {workspaceStep === "face" && (
            <div className="student-exam-face-card">
              <div className="student-exam-preflight-title">
                <FiUserCheck />
                <h5>Face Verification</h5>
              </div>

              <p className="student-exam-face-subtext">
                Allow camera access. The exam will start only after your face is verified.
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
                    <span>Verifying face...</span>
                  </span>
                )}
              </div>

              {faceError && <p className="student-exam-face-error">{faceError}</p>}
              {hasOpenExtensionPanel && (
                <p className="student-exam-face-error">
                  Please close your browser extension/side panel before starting the exam.
                </p>
              )}

              <div className="student-exam-preflight-actions">
                {!isFaceVerified && (
                  <button
                    type="button"
                    className="student-exam-action secondary"
                    onClick={async () => {
                      if (!faceStreamRef.current) return;
                      const imageData = captureFrameDataUrl(videoRef.current);
                      if (!imageData) {
                        setFaceError("Unable to capture camera frame. Keep camera on and retry.");
                        return;
                      }
                      setIsFaceChecking(true);
                      setFaceError("");
                      const result = await verifyFaceWithBackend({ imageData });
                      let effectiveResult = result;
                      if (!result.ok && result.error === "OPENCV_NOT_AVAILABLE") {
                        const fallback = await verifyFaceWithBrowserDetector(videoRef.current);
                        effectiveResult = fallback.ok
                          ? fallback
                          : {
                              ...fallback,
                              message:
                                fallback.message ||
                                "Face verification failed. Keep your face visible and retry.",
                            };
                      }
                      setIsFaceChecking(false);
                      if (!effectiveResult.ok) {
                        const canUseManualFallback =
                          effectiveResult.error === "BROWSER_FACE_DETECTOR_UNAVAILABLE" ||
                          effectiveResult.error === "BROWSER_FACE_DETECTOR_FAILED";
                        if (canUseManualFallback) {
                          const confirmed = window.confirm(
                            "Automatic face verification is unavailable on this device/browser. Continue with manual verification?"
                          );
                          if (confirmed) {
                            setIsFaceVerified(true);
                            setFaceError(
                              "Automatic face verification is unavailable. Manual verification enabled."
                            );
                            return;
                          }
                        }
                        setIsFaceVerified(false);
                        setFaceError(effectiveResult.message || "Face verification failed.");
                        return;
                      }
                      if (!effectiveResult.verified) {
                        setIsFaceVerified(false);
                        setFaceError(
                          effectiveResult.reason === "EYES_NOT_VISIBLE"
                            ? "Eyes are not clearly visible. Look at the screen and keep your eyes visible."
                            : 
                          effectiveResult.reason === "MULTIPLE_FACES"
                            ? "Multiple faces detected. Keep only your face in frame."
                            : "Face not detected. Keep your face visible and retry."
                        );
                        return;
                      }
                      setIsFaceVerified(true);
                      setFaceError("");
                    }}
                    disabled={!isCameraReady || isFaceChecking}
                  >
                    <FiUserCheck />
                    <span>{isFaceChecking ? "Verifying..." : "Verify Face"}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="student-exam-action primary"
                  onClick={handleLaunchAttempt}
                  disabled={
                    workspaceScheduleInfo.isBeforeStart ||
                    workspaceScheduleInfo.isExpired ||
                    hasOpenExtensionPanel ||
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
                  <span>Start Exam</span>
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
                      Proctoring is active: tab/minimize, face-check failures, fullscreen exit,
                      extension side-panel activity, copy/cut/paste, and screenshot attempts
                      trigger one warning; the second violation auto-submits your exam.
                    </span>
                  </div>

                  <div className="student-exam-attempt-body">
                    <aside className="student-question-nav">
                      {questions.map((item, index) => {
                        const isCurrent = index === boundedQuestionIndex;
                        const questionKey = String(item?.questionIndex ?? index);
                        const draft = answerDrafts[questionKey] || {};
                        const locked = isQuestionLocked(item);
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
                            onClick={() => {
                              if (locked) return;
                              dispatch(setStudentExamQuestionIndex(index));
                            }}
                            disabled={locked}
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
                                  disabled={isCurrentQuestionLocked}
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
                          disabled={isCurrentQuestionLocked}
                          rows={currentQuestion?.sectionType === "LONG" ? 8 : 5}
                        />
                      )}

                      <footer className="student-question-actions">
                        <button
                          type="button"
                          className="student-question-btn muted"
                          onClick={() => {
                            if (previousQuestionIndex < 0) return;
                            dispatch(setStudentExamQuestionIndex(previousQuestionIndex));
                          }}
                          disabled={previousQuestionIndex < 0}
                        >
                          <FiChevronLeft />
                          <span>Previous</span>
                        </button>

                        <button
                          type="button"
                          className="student-question-btn save"
                          onClick={handleSaveCurrentAnswer}
                          disabled={
                            !hasCurrentAnswer ||
                            isCurrentQuestionLocked ||
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
                          onClick={() => {
                            if (nextQuestionIndex < 0) return;
                            dispatch(setStudentExamQuestionIndex(nextQuestionIndex));
                          }}
                          disabled={nextQuestionIndex < 0}
                        >
                          <span>Next</span>
                          <FiChevronRight />
                        </button>

                        <button
                          type="button"
                          className="student-question-btn muted"
                          onClick={() => {
                            if (skipQuestionIndex < 0) return;
                            dispatch(setStudentExamQuestionIndex(skipQuestionIndex));
                          }}
                          disabled={skipQuestionIndex < 0}
                        >
                          <FiSkipForward />
                          <span>Skip</span>
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
                    The active exam attempt could not be loaded. Please go back and start the
                    exam again.
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
      ) : isAttemptResultsPage ? (
        <section className="student-exam-attempt-results-page">
          <header className="student-exam-attempt-results-head">
            <div>
              <h4>{selectedResultExam?.title || "Exam Attempts"}</h4>
              <p>
                View marks for each attempt and open any attempt result in detail.
              </p>
            </div>
            <button
              type="button"
              className="student-exam-action secondary"
              onClick={closeAttemptResultsPage}
            >
              <FiArrowLeft />
              <span>Back to Exams</span>
            </button>
          </header>

          <div className="student-exam-attempt-results-table-wrap">
            <table className="student-exam-attempt-results-table">
              <thead>
                <tr>
                  <th>Attempt</th>
                  <th>Marks</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(selectedResultExam?.evaluatedAttempts) &&
                selectedResultExam.evaluatedAttempts.length > 0 ? (
                  selectedResultExam.evaluatedAttempts.map((attemptRow) => {
                    const isLoadingResult =
                      resultLoadState === ADMIN_LOAD_STATES.PENDING &&
                      String(activeResultAttemptId) ===
                        String(attemptRow?.attemptId || "");
                    const totalAwarded = Number(attemptRow?.totalAwarded || 0);
                    const totalMax = Number(attemptRow?.totalMax || 0);
                    return (
                      <tr key={String(attemptRow?.attemptId || attemptRow?.attemptNumber || "")}>
                        <td>Attempt {Number(attemptRow?.attemptNumber || 1)}</td>
                        <td>
                          {totalAwarded} / {totalMax}
                        </td>
                        <td>
                          {attemptRow?.submittedAt
                            ? formatDateTime(attemptRow.submittedAt)
                            : "N/A"}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="student-exam-action secondary student-exam-attempt-view-btn"
                            onClick={() => handleViewResult(attemptRow?.attemptId)}
                            disabled={isLoadingResult}
                          >
                            {isLoadingResult ? (
                              <ClipLoader
                                size={13}
                                color="#0f172a"
                                trackColor="rgba(15,23,42,0.18)"
                              />
                            ) : (
                              <FiCheckCircle />
                            )}
                            <span>View Result</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4}>No evaluated attempts found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="student-exam-grid">
          {examsLoadState === ADMIN_LOAD_STATES.PENDING && exams.length === 0 ? (
            <div className="student-exam-loading-card">
              <BeatLoader size={10} margin={3} color="#2563eb" />
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
              const scheduleStartMs = new Date(exam?.scheduleStart || "").getTime();
              const scheduleEndMs = new Date(exam?.scheduleEnd || "").getTime();
              const hasValidWindow =
                Number.isFinite(scheduleStartMs) && Number.isFinite(scheduleEndMs);
              const isBeforeStart = hasValidWindow && clockNow < scheduleStartMs;
              const isExpired = hasValidWindow && clockNow >= scheduleEndMs;
              const startsInMs = hasValidWindow ? Math.max(scheduleStartMs - clockNow, 0) : 0;
              const endsInMs = hasValidWindow ? Math.max(scheduleEndMs - clockNow, 0) : 0;

              const cardStatus = isExpired
                ? "Expired"
                : exam?.hasActiveAttempt
                ? "In Progress"
                : isBeforeStart
                ? "Upcoming"
                : exam?.canAttempt
                ? "Available"
                : "Locked";
              const cardStatusClass = isExpired || isBeforeStart
                ? "locked"
                : exam?.hasActiveAttempt
                ? "in-progress"
                : exam?.canAttempt
                ? "available"
                : "locked";

              const timeGuardDisabled = isBeforeStart || isExpired;
              const hasAttemptsLeft =
                Number(exam?.attemptsUsed || 0) < Number(exam?.maxAttempts || 10);
              const isAttemptActionAllowed = Boolean(exam?.canAttempt || exam?.hasActiveAttempt);
              const primaryActionDisabled =
                isStartPending || timeGuardDisabled || !isAttemptActionAllowed;

              const scheduleHint = isExpired
                ? "Your exam has expired."
                : isBeforeStart
                ? `Exam starts at ${formatDateTime(exam?.scheduleStart)} (starts in ${formatTimer(
                    startsInMs
                  )}).`
                : !isAttemptActionAllowed
                ? hasAttemptsLeft
                  ? "Start is currently unavailable for this exam."
                  : "Maximum attempts reached for this exam."
                : hasValidWindow
                ? `Exam is live. Ends in ${formatTimer(endsInMs)}.`
                : "";

              const primaryActionLabel = isExpired
                ? "Exam Expired"
                : isBeforeStart
                ? "Exam Not Started"
                : !isAttemptActionAllowed
                ? hasAttemptsLeft
                  ? "Start Unavailable"
                  : "Attempts Completed"
                : exam?.hasActiveAttempt
                ? "Continue Exam"
                : "Start Exam";
              const evaluatedAttempts = Array.isArray(exam?.evaluatedAttempts)
                ? exam.evaluatedAttempts
                : [];

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
                          {Number(exam?.attemptsUsed || 0)} / {Number(exam?.maxAttempts || 10)}
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

                  {scheduleHint && <p className="student-exam-subject">{scheduleHint}</p>}

                  <div className="student-exam-card-actions">
                    <button
                      type="button"
                      className="student-exam-action primary"
                      onClick={() => openExamWorkspace(exam?._id)}
                      disabled={primaryActionDisabled}
                    >
                      {isStartPending ? (
                        <ClipLoader
                          size={14}
                          color="#ffffff"
                          trackColor="rgba(255,255,255,0.28)"
                        />
                      ) : isExpired || isBeforeStart || !isAttemptActionAllowed ? (
                        <FiClock />
                      ) : exam?.hasActiveAttempt ? (
                        <FiPlayCircle />
                      ) : (
                        <FiTarget />
                      )}
                      <span>{primaryActionLabel}</span>
                    </button>

                  </div>

                  {evaluatedAttempts.length > 0 && (
                    <div className="student-exam-attempt-result-list">
                      <label>Attempt {Number(exam?.attemptsUsed || 0)} ({Number(exam?.attemptsUsed || 0)}/{Number(exam?.maxAttempts || 10)})</label>
                      <button
                        type="button"
                        className="student-exam-action secondary student-exam-attempt-result-btn"
                        onClick={() => openAttemptResultsPage(exam?._id)}
                      >
                        <FiCheckCircle />
                        <span>View Results</span>
                      </button>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}

      {!showWorkspace &&
        (resultLoadState === ADMIN_LOAD_STATES.PENDING ||
          Boolean(result?.evaluation)) && (
        <section className="student-exam-result-panel">
          <header className="student-exam-result-header">
            <h4>Exam Result</h4>
          </header>

          {resultLoadState === ADMIN_LOAD_STATES.PENDING ? (
            <div className="student-exam-result-loading">
              <ClipLoader size={18} color="#0f766e" trackColor="rgba(15,118,110,0.2)" />
              <span>Loading result...</span>
            </div>
          ) : (
            <>
              {resultInsights && (
                <div className="student-exam-result-overview-grid">
                  <article className="student-exam-overview-score-card">
                    <div className="student-exam-overview-score-box">
                      <label>Overall Score</label>
                      <strong>
                        {resultSummary?.totalAwarded}/{resultSummary?.totalMax}
                      </strong>
                    </div>
                    <div
                      className="student-exam-overview-gauge"
                      style={{ "--result-value": `${resultSummary?.percentage || 0}` }}
                    >
                      <span>{resultSummary?.percentage}%</span>
                    </div>
                    <h5>{resultInsights.remarkTitle}</h5>
                    <p>{resultInsights.remarkText}</p>
                  </article>

                  <article className="student-exam-overview-breakdown">
                    <h5>Scores by Question Types</h5>
                    <div className="student-exam-breakdown-row">
                      <div>
                        <strong>Correct ({resultInsights.correctCount})</strong>
                      </div>
                      <span>
                        {resultInsights.correctCount}/{resultInsights.perQuestion.length} (
                        {resultInsights.accuracy}%)
                      </span>
                    </div>
                    <div className="student-exam-breakdown-track">
                      <span style={{ width: `${resultInsights.accuracy}%` }} />
                    </div>

                    <div className="student-exam-breakdown-row">
                      <div>
                        <strong>Incorrect ({resultInsights.incorrectCount})</strong>
                      </div>
                      <span>
                        {resultInsights.incorrectCount}/{resultInsights.perQuestion.length} (
                        {Number((100 - resultInsights.accuracy).toFixed(1))}%)
                      </span>
                    </div>
                    <div className="student-exam-breakdown-track wrong">
                      <span
                        style={{
                          width: `${Math.max(0, 100 - resultInsights.accuracy)}%`,
                        }}
                      />
                    </div>
                  </article>

                  <article className="student-exam-overview-chart">
                    <h5>Question wise performance</h5>
                    <svg
                      viewBox={`0 0 ${resultInsights.chartWidth} ${resultInsights.chartHeight}`}
                      role="img"
                      aria-label="Question wise performance chart"
                    >
                      {[0, 25, 50, 75, 100].map((tick) => {
                        const y = 16 + ((100 - tick) / 100) * (resultInsights.chartHeight - 32);
                        return (
                          <g key={`tick-${tick}`}>
                            <line
                              x1="30"
                              y1={y}
                              x2={resultInsights.chartWidth - 30}
                              y2={y}
                              className="student-exam-chart-grid"
                            />
                            <text x="8" y={y + 4} className="student-exam-chart-axis-label">
                              {tick}
                            </text>
                          </g>
                        );
                      })}
                      <polyline
                        points={resultInsights.polylinePoints}
                        className="student-exam-chart-line"
                      />
                      {resultInsights.points.map((pt) => (
                        <g key={`pt-${pt.label}`}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="4"
                            className="student-exam-chart-point"
                          />
                          <text
                            x={pt.x}
                            y={resultInsights.chartHeight - 4}
                            textAnchor="middle"
                            className="student-exam-chart-axis-label"
                          >
                            {pt.label}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </article>
                </div>
              )}

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
                      (() => {
                        const isCorrect = Boolean(item?.isCorrect);
                        return (
                          <tr key={`result-q-${item?.questionIndex}`}>
                            <td>Q{Number(item?.questionIndex || 0) + 1}</td>
                            <td>{isCorrect ? "1 / 1" : "0 / 1"}</td>
                            <td>
                              {isCorrect
                                ? "Correct answer."
                                : "Incorrect answer."}
                            </td>
                          </tr>
                        );
                      })()
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
