/**
 * OCR (Optical Character Recognition) utilities
 * Handles communication with the PaddleOCR server
 */

// Configuration - Update these with your server details
const OCR_SERVER_URL =
  /* process.env.OCR_SERVER_URL || */ "http://192.168.1.197:5000";
const OCR_ENDPOINT = "/recognize";
const TIMEOUT_MS = 30000; // 30 second timeout

/**
 * OCR recognition result with text and orientation
 */
export interface OCRResult {
  text: string;
  orientation: number;
}

/**
 * Send an image to the OCR server and get text recognition results
 * @param imageBlob - The image blob to recognize
 * @param manualOrientation - Optional manual orientation parameter (0, 90, 180, 270)
 * @returns OCR result with text and orientation, or null if failed
 */
export async function recognizeTextFromImage(
  imageBlob: Blob,
  manualOrientation?: number
): Promise<OCRResult | null> {
  try {
    const formData = new FormData();
    formData.append("image", imageBlob, "bounding-box.jpg");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const query =
      manualOrientation !== undefined
        ? `?classify_image_orientation=true&orientation=${manualOrientation}`
        : `?classify_image_orientation=true`;

    const response = await fetch(`${OCR_SERVER_URL}${OCR_ENDPOINT}${query}`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error("OCR server error:", response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.results || data.results.length === 0) {
      console.warn("No text recognized in image");
      return null;
    }

    // Combine all recognized texts from results
    const recognizedTexts = data.results
      .map((result: any) => result.text)
      .filter((text: string) => text && text.trim())
      .join(" ");

    // Extract orientation angle if available, or use manual orientation if provided
    let orientationAngle =
      manualOrientation !== undefined ? manualOrientation : 0;
    if (
      !manualOrientation &&
      data.orientation_classification &&
      data.orientation_classification.detected_orientation
    ) {
      orientationAngle =
        parseInt(data.orientation_classification.detected_orientation, 10) || 0;
    }

    return recognizedTexts
      ? { text: recognizedTexts, orientation: orientationAngle }
      : null;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("OCR request timed out");
      } else {
        console.error("Error communicating with OCR server:", error.message);
      }
    }
    return null;
  }
}

/**
 * Check if the OCR server is reachable
 * @returns true if server is healthy, false otherwise
 */
export async function isOCRServerHealthy(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${OCR_SERVER_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn("OCR server health check failed");
    return false;
  }
}

/**
 * Set the OCR server URL
 * @param url - The base URL of the OCR server
 */
export function setOCRServerURL(url: string) {
  if (url && url.trim()) {
    // Remove trailing slash if present
    const cleanUrl = url.replace(/\/$/, "");
    Object.defineProperty(module.exports, "OCR_SERVER_URL", {
      value: cleanUrl,
      writable: false,
      configurable: true,
    });
  }
}
