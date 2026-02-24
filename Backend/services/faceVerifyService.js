import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FACE_VERIFY_SCRIPT = path.resolve(__dirname, "../scripts/face_verify.py");
const PYTHON_BIN = process.env.PYTHON_BIN || "python";

export const verifyFaceWithPython = ({ imageData, timeoutMs = 12000 }) =>
  new Promise((resolve) => {
    const child = spawn(PYTHON_BIN, [FACE_VERIFY_SCRIPT], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const done = (payload) => {
      if (settled) return;
      settled = true;
      resolve(payload);
    };

    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        // Ignore termination errors.
      }
      done({
        ok: false,
        error: "FACE_VERIFY_TIMEOUT",
        message: "Face verification timed out.",
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk || "");
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      done({
        ok: false,
        error: "FACE_VERIFY_PROCESS_ERROR",
        message: error?.message || "Failed to start face verification process.",
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const payloadText = String(stdout || "").trim();
      let parsed = null;
      if (payloadText) {
        try {
          parsed = JSON.parse(payloadText);
        } catch {
          parsed = null;
        }
      }

      if (parsed && typeof parsed === "object") {
        done({
          ...parsed,
          stderr: String(stderr || "").trim(),
        });
        return;
      }

      done({
        ok: false,
        error: "FACE_VERIFY_INVALID_RESPONSE",
        message: `Face verifier exited with code ${code}.`,
        stderr: String(stderr || "").trim(),
      });
    });

    child.stdin.write(
      JSON.stringify({
        imageData: String(imageData || ""),
      })
    );
    child.stdin.end();
  });

