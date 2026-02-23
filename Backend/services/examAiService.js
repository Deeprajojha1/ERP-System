const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || "").trim();
const GEMINI_MODEL = String(process.env.GEMINI_MODEL || "gemini-1.5-flash").trim();

const normalize = (value = "") => String(value).trim().toLowerCase().replace(/\s+/g, " ");
const normalizeLoose = (value = "") =>
  normalize(value).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "of", "to", "in", "on", "for", "with", "and", "or", "as", "by", "at",
  "from", "into", "that", "this", "these", "those", "it", "its", "their",
  "about", "explain", "discuss", "describe", "write", "answer", "question",
  "unit", "model", "practical", "example", "detail", "details",
]);

const tokenize = (text = "") =>
  normalizeLoose(text)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

const optionTheme = (value = "") => {
  const text = String(value || "");
  const dashIndex = text.lastIndexOf(" - ");
  if (dashIndex === -1) return normalizeLoose(text);
  return normalizeLoose(text.slice(0, dashIndex));
};

const titleCase = (value = "") =>
  String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");

const stripUnitContext = (value = "") =>
  String(value)
    .replace(/\s*\(\s*unit\s*\d+\s*:[^)]+\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildTopicPool = (syllabus = []) => {
  const topics = [];
  syllabus.forEach((item) => {
    const list = Array.isArray(item?.topics) ? item.topics : [];
    list.forEach((topic) => {
      const clean = stripUnitContext(String(topic || "").trim());
      if (!clean) return;
      topics.push(clean);
    });
  });
  return topics;
};

const pickTopic = (pool = [], index = 0, fallback = "Core concepts") => {
  if (!pool.length) return fallback;
  return pool[index % pool.length];
};

const stripCodeFence = (text = "") =>
  String(text)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const extractGeminiText = (data) => {
  const part = data?.candidates?.[0]?.content?.parts?.[0];
  if (!part) return "";
  return String(part.text || "").trim();
};

const callGeminiJson = async (prompt) => {
  if (!GEMINI_API_KEY) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const raw = extractGeminiText(data);
    if (!raw) return null;
    const normalizedText = stripCodeFence(raw);
    return JSON.parse(normalizedText);
  } catch (error) {
    return null;
  }
};

const generatePaperDraftLocal = ({ blueprint }) => {
  const questions = [];
  const topicPool = buildTopicPool(blueprint?.syllabus || []);
  let qIndex = 1;

  (blueprint?.sections || []).forEach((section) => {
    const sectionType = String(section?.type || "").toUpperCase();
    const count = Number(section?.questionCount || 0);
    const marks = Number(section?.marksPerQuestion || 0);

    for (let i = 0; i < count; i += 1) {
      const topic = pickTopic(topicPool, qIndex - 1, blueprint?.subject || "Subject");

      if (sectionType === "MCQ") {
        const options = [
          `${titleCase(topic)} - Definition`,
          `${titleCase(topic)} - Application`,
          `${titleCase(topic)} - Limitation`,
          `${titleCase(topic)} - None of the above`,
        ];
        questions.push({
          sectionType: "MCQ",
          questionText: `Q${qIndex}. Which statement best describes ${topic}?`,
          options,
          correctAnswer: options[1],
          marks,
          rubric: {},
        });
      } else if (sectionType === "SHORT") {
        questions.push({
          sectionType: "SHORT",
          questionText: `Q${qIndex}. Explain ${topic} in 4-6 lines with one practical example.`,
          options: [],
          correctAnswer: `Key points about ${topic}, one practical example, and concise explanation.`,
          marks,
          rubric: { keyPoints: [topic, "definition", "example"] },
        });
      } else {
        questions.push({
          sectionType: "LONG",
          questionText: `Q${qIndex}. Discuss ${topic} in detail with diagram/flow, use-cases, and limitations.`,
          options: [],
          correctAnswer: `Structured explanation of ${topic} with depth, use-cases, and limitations.`,
          marks,
          rubric: { keyPoints: [topic, "architecture", "use-cases", "limitations"] },
        });
      }

      qIndex += 1;
    }
  });

  return questions;
};

const sanitizeGeneratedQuestions = (questions = [], blueprint) => {
  const expected = [];
  (blueprint?.sections || []).forEach((section) => {
    const count = Number(section?.questionCount || 0);
    const marks = Number(section?.marksPerQuestion || 0);
    const type = String(section?.type || "").toUpperCase();
    for (let i = 0; i < count; i += 1) expected.push({ sectionType: type, marks });
  });

  if (!Array.isArray(questions) || questions.length !== expected.length) return null;

  const sanitized = questions.map((q, idx) => {
    const exp = expected[idx];
    const sectionType = String(q?.sectionType || exp.sectionType || "").toUpperCase();
    const options = Array.isArray(q?.options)
      ? q.options.map((x) => stripUnitContext(String(x || "").trim())).filter(Boolean)
      : [];
    const questionText = stripUnitContext(String(q?.questionText || "").trim());
    const correctAnswer = stripUnitContext(String(q?.correctAnswer || "").trim());
    const rubric = q?.rubric && typeof q.rubric === "object" ? q.rubric : {};
    if (Array.isArray(rubric?.keyPoints)) {
      rubric.keyPoints = rubric.keyPoints
        .map((x) => stripUnitContext(String(x || "").trim()))
        .filter(Boolean);
    }

    if (!questionText) return null;
    if (sectionType === "MCQ" && options.length < 2) return null;

    return {
      sectionType: exp.sectionType,
      questionText,
      options: exp.sectionType === "MCQ" ? options.slice(0, 6) : [],
      correctAnswer,
      marks: exp.marks,
      rubric,
    };
  });

  if (sanitized.some((x) => !x)) return null;
  return sanitized;
};

export const generatePaperDraft = async ({ blueprint }) => {
  if (!GEMINI_API_KEY) {
    return generatePaperDraftLocal({ blueprint });
  }

  const prompt = `
You are generating an exam paper in strict JSON.
Return JSON object with key "questions" only.

Exam title: ${String(blueprint?.title || "")}
Subject: ${String(blueprint?.subject || "")}
Sections: ${JSON.stringify(blueprint?.sections || [])}
Syllabus: ${JSON.stringify(blueprint?.syllabus || [])}

Rules:
- Keep question count exactly as sections configuration.
- Question types must be MCQ/SHORT/LONG.
- For MCQ include 4 options and one correctAnswer from options.
- For SHORT/LONG provide rubric.keyPoints array and concise model correctAnswer.
- Keep academic quality and syllabus alignment.

JSON schema:
{
  "questions": [
    {
      "sectionType": "MCQ|SHORT|LONG",
      "questionText": "string",
      "options": ["string"],
      "correctAnswer": "string",
      "rubric": {"keyPoints": ["string"]}
    }
  ]
}
`;

  const aiResponse = await callGeminiJson(prompt);
  const aiQuestions = sanitizeGeneratedQuestions(aiResponse?.questions || [], blueprint);
  if (aiQuestions) return aiQuestions;

  return generatePaperDraftLocal({ blueprint });
};

const evaluateTextLocal = ({ question, answer }) => {
  const maxMarks = Number(question?.marks || 0);
  const studentAnswer = String(answer || "").trim();
  const expected = String(question?.correctAnswer || "").trim();
  const rubricPoints = Array.isArray(question?.rubric?.keyPoints)
    ? question.rubric.keyPoints.map((x) => String(x || "").trim()).filter(Boolean)
    : [];

  if (!studentAnswer) {
    return {
      awardedMarks: 0,
      isCorrect: false,
      feedback: "No answer submitted.",
      expectedAnswer: expected,
    };
  }

  const conceptText = [
    expected,
    String(question?.questionText || ""),
    ...rubricPoints,
  ].join(" ");
  const expectedTokens = new Set(tokenize(conceptText));
  const answerTokens = tokenize(studentAnswer);

  const uniqueAnswerTokens = Array.from(new Set(answerTokens));
  const tokenHits = uniqueAnswerTokens.filter((token) => expectedTokens.has(token)).length;
  const tokenCoverage = expectedTokens.size ? tokenHits / expectedTokens.size : 0;

  let rubricHitCount = 0;
  rubricPoints.forEach((point) => {
    const pointNorm = normalizeLoose(point);
    if (!pointNorm) return;
    if (normalizeLoose(studentAnswer).includes(pointNorm)) rubricHitCount += 1;
  });
  const rubricCoverage = rubricPoints.length ? rubricHitCount / rubricPoints.length : 0.5;

  const lengthTarget = String(question?.sectionType || "").toUpperCase() === "LONG" ? 80 : 30;
  const lengthScore = Math.min(1, tokenize(studentAnswer).length / lengthTarget);

  const ratio = Math.min(1, Math.max(0, tokenCoverage * 0.45 + rubricCoverage * 0.4 + lengthScore * 0.15));
  const awardedMarks = Math.max(0, Math.min(maxMarks, Number((maxMarks * ratio).toFixed(2))));

  return {
    awardedMarks,
    isCorrect: ratio >= 0.7,
    feedback:
      ratio >= 0.7
        ? "Good conceptual coverage with relevant points."
        : ratio >= 0.4
          ? "Partially correct. Add more key concepts and examples."
          : "Answer is too limited. Cover core concepts, structure, and examples.",
    expectedAnswer: expected,
  };
};

export const evaluateQuestion = async ({ question, answer }) => {
  const sectionType = String(question?.sectionType || "").toUpperCase();
  const maxMarks = Number(question?.marks || 0);

  if (sectionType === "MCQ") {
    const expected = String(question?.correctAnswer || "").trim();
    const selected = String(answer?.selectedOption || "").trim();
    const expectedNorm = normalizeLoose(expected);
    const selectedNorm = normalizeLoose(selected);
    const isExact = expectedNorm && expectedNorm === selectedNorm;
    const sameTheme = optionTheme(expected) && optionTheme(expected) === optionTheme(selected);
    const awardedMarks = isExact ? maxMarks : sameTheme ? Number((maxMarks * 0.5).toFixed(2)) : 0;
    const isCorrect = isExact;
    return {
      awardedMarks,
      isCorrect,
      feedback: isExact
        ? "Correct option selected."
        : sameTheme
          ? "Partially correct concept, but selected the wrong option statement."
          : "Incorrect option selected.",
      expectedAnswer: expected,
      studentAnswer: selected,
    };
  }

  if (!GEMINI_API_KEY) {
    const textResult = evaluateTextLocal({
      question,
      answer: answer?.answerText || "",
    });
    return {
      ...textResult,
      studentAnswer: String(answer?.answerText || "").trim(),
    };
  }

  const prompt = `
Evaluate a student's ${sectionType} answer and return strict JSON.

Question: ${String(question?.questionText || "")}
Max marks: ${maxMarks}
Expected answer: ${String(question?.correctAnswer || "")}
Rubric: ${JSON.stringify(question?.rubric || {})}
Student answer: ${String(answer?.answerText || "")}

Scoring rules:
- awardedMarks must be between 0 and max marks.
- isCorrect should be true for high quality answers only.
- feedback must be concise and specific.
- expectedAnswer should be short model answer.

JSON schema:
{
  "awardedMarks": 0,
  "isCorrect": false,
  "feedback": "string",
  "expectedAnswer": "string"
}
`;

  const aiResponse = await callGeminiJson(prompt);
  if (aiResponse && Number.isFinite(Number(aiResponse.awardedMarks))) {
    const awardedMarks = Math.max(0, Math.min(maxMarks, Number(aiResponse.awardedMarks)));
    return {
      awardedMarks: Number(awardedMarks.toFixed(2)),
      isCorrect: Boolean(aiResponse.isCorrect),
      feedback: String(aiResponse.feedback || ""),
      expectedAnswer: String(aiResponse.expectedAnswer || question?.correctAnswer || ""),
      studentAnswer: String(answer?.answerText || "").trim(),
    };
  }

  const textResult = evaluateTextLocal({
    question,
    answer: answer?.answerText || "",
  });

  return {
    ...textResult,
    studentAnswer: String(answer?.answerText || "").trim(),
  };
};
