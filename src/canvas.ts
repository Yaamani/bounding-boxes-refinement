import type { BoundingBox } from "./types.js";
import {
  canvas,
  ctx,
  currentImage,
  scale,
  offsetX,
  offsetY,
  drawingBox,
  selectionBox,
  dragStart,
  currentMode,
  setOffsetX,
  setOffsetY,
  setScale,
  showBoxLabels,
  isBoxSelected,
} from "./state.js";
import { hasCollision } from "./boxes.js";

// Render canvas
export function renderCanvas(appState: any) {
  if (!currentImage || !ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw image
  const imgWidth = currentImage.width * scale;
  const imgHeight = currentImage.height * scale;
  const x = offsetX + (canvas.width - imgWidth) / 2;
  const y = offsetY + (canvas.height - imgHeight) / 2;

  ctx.drawImage(currentImage, x, y, imgWidth, imgHeight);

  // Draw bounding boxes
  if (appState.currentImageIndex >= 0) {
    const imageData = appState.images[appState.currentImageIndex];
    if (imageData) {
      for (const box of imageData.boxes) {
        drawBoundingBox(box, x, y, scale);
      }
    }
  }

  // Draw drawing box
  if (drawingBox && currentMode === "draw") {
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    const width = dragStart.x - drawingBox.startX;
    const height = dragStart.y - drawingBox.startY;
    ctx.strokeRect(drawingBox.startX, drawingBox.startY, width, height);
    ctx.setLineDash([]);
  }

  // Draw selection box
  if (selectionBox && currentMode === "select") {
    ctx.strokeStyle = "#ffaa00";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    const width = dragStart.x - selectionBox.startX;
    const height = dragStart.y - selectionBox.startY;
    ctx.strokeRect(selectionBox.startX, selectionBox.startY, width, height);
    ctx.setLineDash([]);
  }
}

// Draw a bounding box
function drawBoundingBox(
  box: BoundingBox,
  imgX: number,
  imgY: number,
  imgScale: number
) {
  const [x1, y1, x2, y2] = box.coordinate;
  const canvasX1 = imgX + x1 * imgScale;
  const canvasY1 = imgY + y1 * imgScale;
  const canvasX2 = imgX + x2 * imgScale;
  const canvasY2 = imgY + y2 * imgScale;

  // Calculate box dimensions to determine color
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  const isPortrait = height > width;

  // Check if box has collisions
  const hasBoxCollision = hasCollision(box.id);

  // Check if this box is selected (supports multi-selection)
  const isSelected = isBoxSelected(box.id);

  // Draw box - use different colors for portrait vs landscape
  if (isSelected) {
    ctx.strokeStyle = "#00ff00"; // Keep selected boxes green
  } else {
    ctx.strokeStyle = isPortrait ? "#0099ff" : "#ff0000"; // Blue for portrait (height > width), Red for landscape
  }

  // Use thicker line width for colliding boxes
  if (hasBoxCollision) {
    ctx.lineWidth = isSelected ? 10 : 7;
  } else {
    ctx.lineWidth = isSelected ? 3 : 2;
  }

  ctx.strokeRect(canvasX1, canvasY1, canvasX2 - canvasX1, canvasY2 - canvasY1);

  // Draw resize handles if selected
  if (isSelected) {
    const handleSize = hasBoxCollision ? 15 : 10;
    ctx.fillStyle = "#00ff00";
    ctx.fillStyle = "#00ff00";
    ctx.fillStyle = "#00ff00";
    // Top-left
    ctx.fillRect(
      canvasX1 - handleSize / 2,
      canvasY1 - handleSize / 2,
      handleSize,
      handleSize
    );
    // Top-right
    ctx.fillRect(
      canvasX2 - handleSize / 2,
      canvasY1 - handleSize / 2,
      handleSize,
      handleSize
    );
    // Bottom-left
    ctx.fillRect(
      canvasX1 - handleSize / 2,
      canvasY2 - handleSize / 2,
      handleSize,
      handleSize
    );
    // Bottom-right
    ctx.fillRect(
      canvasX2 - handleSize / 2,
      canvasY2 - handleSize / 2,
      handleSize,
      handleSize
    );
  }

  // Draw label
  if (box.data && showBoxLabels) {
    // Use same color logic for label background as box outline
    if (isSelected) {
      ctx.fillStyle = "#00ff00";
    } else {
      ctx.fillStyle = isPortrait ? "#0099ff" : "#ff0000";
    }
    ctx.font = "12px sans-serif";
    const text =
      box.data.substring(0, 20) + (box.data.length > 20 ? "..." : "");
    const textWidth = ctx.measureText(text).width;
    ctx.fillRect(canvasX1, canvasY1 - 18, textWidth + 8, 18);
    ctx.fillStyle = "#000000";
    ctx.fillText(text, canvasX1 + 4, canvasY1 - 5);
  }
}

// Resize canvas element to fill the available container space
export function resizeCanvasToContainer() {
  if (!canvas) return;
  const container = canvas.parentElement;
  if (!container) return;

  // Compute canvas width as viewport width minus left and right sidebar widths
  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth;
  const leftSidebar = document.getElementById("left-sidebar");
  const rightSidebar = document.getElementById("right-sidebar");
  const leftWidth = leftSidebar ? leftSidebar.offsetWidth : 0;
  const rightWidth = rightSidebar ? rightSidebar.offsetWidth : 0;
  const containerWidth = Math.max(0, viewportWidth - leftWidth - rightWidth);

  // Height: use the canvas parent's height
  const containerHeight = container.clientHeight;

  // Resize canvas to match calculated dimensions
  canvas.width = containerWidth;
  canvas.height = containerHeight;
}

// Zoom functions
export function zoomIn(mouseX?: number, mouseY?: number) {
  zoomAtPoint(1.2, mouseX, mouseY);
}

export function zoomOut(mouseX?: number, mouseY?: number) {
  zoomAtPoint(1 / 1.2, mouseX, mouseY);
}

function zoomAtPoint(scaleFactor: number, mouseX?: number, mouseY?: number) {
  if (!currentImage) return;

  const oldScale = scale;
  const newScale = Math.max(0.1, Math.min(10, oldScale * scaleFactor));

  if (mouseX !== undefined && mouseY !== undefined) {
    // Calculate image position under mouse before zoom
    const imgWidth = currentImage.width * oldScale;
    const imgHeight = currentImage.height * oldScale;
    const imgX = offsetX + (canvas.width - imgWidth) / 2;
    const imgY = offsetY + (canvas.height - imgHeight) / 2;

    const imageX = (mouseX - imgX) / oldScale;
    const imageY = (mouseY - imgY) / oldScale;

    // Apply zoom
    setScale(newScale);

    // Calculate new image position
    const newImgWidth = currentImage.width * newScale;
    const newImgHeight = currentImage.height * newScale;
    const newImgX = (canvas.width - newImgWidth) / 2;
    const newImgY = (canvas.height - newImgHeight) / 2;

    // Adjust offset so mouse stays over same image point
    setOffsetX(mouseX - (newImgX + imageX * newScale));
    setOffsetY(mouseY - (newImgY + imageY * newScale));
  } else {
    setScale(newScale);
  }

  constrainOffsets();
  document.getElementById("zoom-level")!.textContent =
    Math.round(newScale * 100) + "%";
}

export function constrainOffsets() {
  if (!currentImage) return;

  const imgWidth = currentImage.width * scale;
  const imgHeight = currentImage.height * scale;

  // Calculate image bounds on canvas
  const imgLeft = offsetX + (canvas.width - imgWidth) / 2;
  const imgTop = offsetY + (canvas.height - imgHeight) / 2;
  const imgRight = imgLeft + imgWidth;
  const imgBottom = imgTop + imgHeight;

  // Ensure at least some part of the image is visible
  const minVisible = 50;

  // Constrain horizontal position
  if (imgWidth > minVisible) {
    if (imgRight < minVisible) {
      setOffsetX(offsetX + minVisible - imgRight);
    } else if (imgLeft > canvas.width - minVisible) {
      setOffsetX(offsetX - (imgLeft - (canvas.width - minVisible)));
    }
  }

  // Constrain vertical position
  if (imgHeight > minVisible) {
    if (imgBottom < minVisible) {
      setOffsetY(offsetY + minVisible - imgBottom);
    } else if (imgTop > canvas.height - minVisible) {
      setOffsetY(offsetY - (imgTop - (canvas.height - minVisible)));
    }
  }
}

export function fitToScreen() {
  if (!currentImage || !canvas) return;

  const container = canvas.parentElement;
  if (!container) return;
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  const scaleX = containerWidth / currentImage.width;
  const scaleY = containerHeight / currentImage.height;
  const newScale = Math.min(scaleX, scaleY, 1) * 0.9; // 90% to add some padding

  setScale(newScale);
  setOffsetX(0);
  setOffsetY(0);

  document.getElementById("zoom-level")!.textContent =
    Math.round(newScale * 100) + "%";
}

// Extract the image region inside a bounding box and return as a blob
export async function extractBoundingBoxImage(
  box: BoundingBox
): Promise<Blob | null> {
  if (!currentImage) return null;

  const [x1, y1, x2, y2] = box.coordinate;
  const width = x2 - x1;
  const height = y2 - y1;

  // Create an off-screen canvas for the extracted region
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) return null;

  // Draw the extracted region from the original image
  tempCtx.drawImage(
    currentImage,
    x1,
    y1, // Source position (in image coordinates)
    width,
    height, // Source dimensions
    0,
    0, // Destination position
    width,
    height // Destination dimensions
  );

  // Convert canvas to blob
  return new Promise((resolve) => {
    tempCanvas.toBlob((blob) => {
      resolve(blob);
      // For debugging
      // if (blob) {
      //   const url = URL.createObjectURL(blob);
      //   const a = document.createElement('a');
      //   a.href = url;
      //   a.download = `bounding-box-${Date.now()}.png`;
      //   document.body.appendChild(a);
      //   a.click();
      //   document.body.removeChild(a);
      //   URL.revokeObjectURL(url);
      // }
    }, "image/png");
  });
}
