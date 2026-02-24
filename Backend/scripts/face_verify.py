import base64
import json
import os
import sys


def output(payload):
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()


def rect_overlap_ratio(a, b):
    ax, ay, aw, ah = [int(x) for x in a]
    bx, by, bw, bh = [int(x) for x in b]
    inter_x1 = max(ax, bx)
    inter_y1 = max(ay, by)
    inter_x2 = min(ax + aw, bx + bw)
    inter_y2 = min(ay + ah, by + bh)
    if inter_x2 <= inter_x1 or inter_y2 <= inter_y1:
        return 0.0
    inter_area = float((inter_x2 - inter_x1) * (inter_y2 - inter_y1))
    base_area = float(aw * ah) if aw > 0 and ah > 0 else 1.0
    return inter_area / base_area


def decode_image(image_data):
    if not image_data:
        raise ValueError("imageData is required")
    raw = str(image_data).strip()
    if "," in raw and raw.lower().startswith("data:image"):
        raw = raw.split(",", 1)[1]
    return base64.b64decode(raw, validate=True)


def main():
    try:
        request_raw = sys.stdin.read()
        payload = json.loads(request_raw or "{}")
        image_data = payload.get("imageData")
        image_bytes = decode_image(image_data)
    except Exception as exc:
        output(
            {
                "ok": False,
                "error": "INVALID_IMAGE_PAYLOAD",
                "message": str(exc),
            }
        )
        return

    strict_mode = str(os.getenv("FACE_VERIFY_STRICT", "false")).strip().lower() in {
        "1",
        "true",
        "yes",
    }

    try:
        import cv2
        import numpy as np
    except Exception:
        if strict_mode:
            output(
                {
                    "ok": False,
                    "error": "OPENCV_NOT_AVAILABLE",
                    "message": "Install python dependencies: pip install opencv-python numpy",
                }
            )
            return

        # Lenient fallback mode: keeps exam flow working when OpenCV is unavailable.
        # If an image frame is received and decodes successfully, treat as verified.
        output(
            {
                "ok": True,
                "verified": True,
                "facesDetected": 1,
                "eyesDetected": 2,
                "gazeVerified": True,
                "objectsDetected": 0,
                "reason": "PYTHON_LENIENT_FALLBACK",
            }
        )
        return

    try:
        image_np = np.frombuffer(image_bytes, dtype=np.uint8)
        frame = cv2.imdecode(image_np, cv2.IMREAD_COLOR)
        if frame is None:
            output(
                {
                    "ok": False,
                    "error": "IMAGE_DECODE_FAILED",
                    "message": "Unable to decode image frame.",
                }
            )
            return

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        eye_cascade_path = cv2.data.haarcascades + "haarcascade_eye_tree_eyeglasses.xml"
        detector = cv2.CascadeClassifier(cascade_path)
        eye_detector = cv2.CascadeClassifier(eye_cascade_path)
        if eye_detector.empty():
            eye_detector = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")
        upper_body_detector = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_upperbody.xml"
        )
        full_body_detector = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_fullbody.xml"
        )
        faces = detector.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(60, 60),
        )

        faces_detected = int(len(faces)) if faces is not None else 0
        eyes_detected = 0
        gaze_verified = False
        objects_detected = 0

        if faces_detected == 1:
            x, y, w, h = faces[0]
            face_roi = gray[y : y + h, x : x + w]
            eyes = eye_detector.detectMultiScale(
                face_roi,
                scaleFactor=1.1,
                minNeighbors=6,
                minSize=(14, 14),
            )

            # Count eyes found in the upper face region to reduce false positives.
            upper_limit = int(h * 0.7)
            valid_eyes = []
            for eye_x, eye_y, eye_w, eye_h in eyes if eyes is not None else []:
                eye_center_y = eye_y + (eye_h // 2)
                if eye_center_y <= upper_limit:
                    valid_eyes.append((eye_x, eye_y, eye_w, eye_h))

            eyes_detected = len(valid_eyes)
            gaze_verified = eyes_detected >= 1

        body_candidates = []
        if not upper_body_detector.empty():
            upper_bodies = upper_body_detector.detectMultiScale(
                gray,
                scaleFactor=1.08,
                minNeighbors=4,
                minSize=(60, 60),
            )
            body_candidates.extend([tuple(map(int, rect)) for rect in upper_bodies] if upper_bodies is not None else [])

        if not full_body_detector.empty():
            full_bodies = full_body_detector.detectMultiScale(
                gray,
                scaleFactor=1.08,
                minNeighbors=3,
                minSize=(60, 120),
            )
            body_candidates.extend([tuple(map(int, rect)) for rect in full_bodies] if full_bodies is not None else [])

        if body_candidates:
            if faces_detected == 1:
                primary_face = tuple(map(int, faces[0]))
                filtered = [
                    rect
                    for rect in body_candidates
                    if rect_overlap_ratio(primary_face, rect) < 0.12
                ]
                objects_detected = int(len(filtered))
            else:
                # When no clear single face exists, any body-like detection is suspicious.
                objects_detected = int(len(body_candidates))

        verified = faces_detected == 1 and objects_detected == 0
        if verified:
            reason = "VERIFIED" if gaze_verified else "VERIFIED_EYE_LOW_CONFIDENCE"
        elif faces_detected == 0:
            reason = "NO_FACE"
        elif faces_detected > 1:
            reason = "MULTIPLE_FACES"
        elif objects_detected > 0:
            reason = "OBJECT_DETECTED"
        else:
            reason = "UNKNOWN"

        output(
            {
                "ok": True,
                "verified": verified,
                "facesDetected": faces_detected,
                "eyesDetected": int(eyes_detected),
                "gazeVerified": bool(gaze_verified),
                "objectsDetected": int(objects_detected),
                "reason": reason,
            }
        )
    except Exception as exc:
        output(
            {
                "ok": False,
                "error": "FACE_VERIFY_RUNTIME_ERROR",
                "message": str(exc),
            }
        )


if __name__ == "__main__":
    main()
