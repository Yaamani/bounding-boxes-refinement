import type { BoundingBox } from "./types.js";
import {
  appState,
  canvas,
  currentImage,
  scale,
  offsetX,
  offsetY,
  selectedBoxId,
  setSelectedBoxId,
  markAsModified,
  generateId,
} from "./state.js";

// Get box at position
export function getBoxAtPosition(x: number, y: number): BoundingBox | null {
  if (appState.currentImageIndex < 0 || !currentImage) return null;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return null;

  const imgWidth = currentImage.width * scale;
  const imgHeight = currentImage.height * scale;
  const imgX = offsetX + (canvas.width - imgWidth) / 2;
  const imgY = offsetY + (canvas.height - imgHeight) / 2;

  // Check in reverse order (top to bottom)
  for (let i = imageData.boxes.length - 1; i >= 0; i--) {
    const box = imageData.boxes[i];
    if (!box) continue;
    const [x1, y1, x2, y2] = box.coordinate;
    const canvasX1 = imgX + x1 * scale;
    const canvasY1 = imgY + y1 * scale;
    const canvasX2 = imgX + x2 * scale;
    const canvasY2 = imgY + y2 * scale;

    if (x >= canvasX1 && x <= canvasX2 && y >= canvasY1 && y <= canvasY2) {
      return box;
    }
  }

  return null;
}

// Get resize handle at position
export function getResizeHandle(
  x: number,
  y: number
): { id: string; handle: string } | null {
  if (appState.currentImageIndex < 0 || !currentImage || !selectedBoxId)
    return null;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return null;

  const box = imageData.boxes.find((b) => b.id === selectedBoxId);
  if (!box) return null;

  const imgWidth = currentImage.width * scale;
  const imgHeight = currentImage.height * scale;
  const imgX = offsetX + (canvas.width - imgWidth) / 2;
  const imgY = offsetY + (canvas.height - imgHeight) / 2;

  const [x1, y1, x2, y2] = box.coordinate;
  const canvasX1 = imgX + x1 * scale;
  const canvasY1 = imgY + y1 * scale;
  const canvasX2 = imgX + x2 * scale;
  const canvasY2 = imgY + y2 * scale;

  const handleSize = 8;
  const threshold = handleSize;

  if (
    Math.abs(x - canvasX1) <= threshold &&
    Math.abs(y - canvasY1) <= threshold
  ) {
    return { id: box.id, handle: "tl" };
  }
  if (
    Math.abs(x - canvasX2) <= threshold &&
    Math.abs(y - canvasY1) <= threshold
  ) {
    return { id: box.id, handle: "tr" };
  }
  if (
    Math.abs(x - canvasX1) <= threshold &&
    Math.abs(y - canvasY2) <= threshold
  ) {
    return { id: box.id, handle: "bl" };
  }
  if (
    Math.abs(x - canvasX2) <= threshold &&
    Math.abs(y - canvasY2) <= threshold
  ) {
    return { id: box.id, handle: "br" };
  }

  return null;
}

// Normalize box coordinates (ensure x1 < x2 and y1 < y2)
export function normalizeBoxCoordinates(box: BoundingBox) {
  const [x1, y1, x2, y2] = box.coordinate;
  box.coordinate = [
    Math.min(x1, x2),
    Math.min(y1, y2),
    Math.max(x1, x2),
    Math.max(y1, y2),
  ];
}

// Resize box
export function resizeBox(
  boxId: string,
  handle: string,
  deltaX: number,
  deltaY: number
) {
  if (appState.currentImageIndex < 0 || !currentImage) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  const box = imageData.boxes.find((b) => b.id === boxId);
  if (!box) return;

  const [x1, y1, x2, y2] = box.coordinate;
  const deltaImgX = deltaX / scale;
  const deltaImgY = deltaY / scale;

  switch (handle) {
    case "tl":
      box.coordinate = [x1 + deltaImgX, y1 + deltaImgY, x2, y2];
      break;
    case "tr":
      box.coordinate = [x1, y1 + deltaImgY, x2 + deltaImgX, y2];
      break;
    case "bl":
      box.coordinate = [x1 + deltaImgX, y1, x2, y2 + deltaImgY];
      break;
    case "br":
      box.coordinate = [x1, y1, x2 + deltaImgX, y2 + deltaImgY];
      break;
  }

  // Ensure coordinates are in correct order
  normalizeBoxCoordinates(box);
  markAsModified();
}

// Move box
export function moveBox(boxId: string, deltaX: number, deltaY: number) {
  if (appState.currentImageIndex < 0 || !currentImage) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  const box = imageData.boxes.find((b) => b.id === boxId);
  if (!box) return;

  const deltaImgX = deltaX / scale;
  const deltaImgY = deltaY / scale;

  const [x1, y1, x2, y2] = box.coordinate;
  box.coordinate = [
    x1 + deltaImgX,
    y1 + deltaImgY,
    x2 + deltaImgX,
    y2 + deltaImgY,
  ];
  markAsModified();
}

// Create new box
export function createNewBox(coordinate: [number, number, number, number]) {
  if (appState.currentImageIndex < 0) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  const newBox: BoundingBox = {
    id: generateId(),
    data: "",
    coordinate: coordinate,
    orientation: 0,
    isSelected: false,
  };

  normalizeBoxCoordinates(newBox);
  imageData.boxes.push(newBox);
  selectBox(newBox.id);
  markAsModified();
}

// Select box
export function selectBox(boxId: string) {
  if (appState.currentImageIndex < 0) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  imageData.boxes.forEach((box) => {
    box.isSelected = box.id === boxId;
  });

  setSelectedBoxId(boxId);
}

// Deselect all boxes
export function deselectAllBoxes() {
  if (appState.currentImageIndex < 0) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  imageData.boxes.forEach((box) => {
    box.isSelected = false;
  });

  setSelectedBoxId(null);
}

// Delete selected box
export function deleteSelectedBox() {
  if (appState.currentImageIndex < 0 || !selectedBoxId) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  const box = imageData.boxes.find((b) => b.id === selectedBoxId);
  if (!box) return;

  // Show confirmation dialog
  const boxLabel =
    box.data ||
    `Box ${imageData.boxes.findIndex((b) => b.id === selectedBoxId) + 1}`;
  if (
    !confirm(
      `Are you sure you want to delete the bounding box "${boxLabel}"?\n\nThis action cannot be undone.`
    )
  )
    return;

  const index = imageData.boxes.findIndex((b) => b.id === selectedBoxId);

  if (index >= 0) {
    imageData.boxes.splice(index, 1);
    setSelectedBoxId(null);
    markAsModified();
  }
}

// Show box editor
export function showBoxEditor(boxId: string) {
  if (appState.currentImageIndex < 0) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  const box = imageData.boxes.find((b) => b.id === boxId);
  if (!box) return;

  const editor = document.getElementById("box-editor")!;
  editor.style.display = "block";

  (document.getElementById("box-data-input") as HTMLTextAreaElement).value =
    box.data;
  (document.getElementById("coord-x1") as HTMLInputElement).value = Math.round(
    box.coordinate[0]
  ).toString();
  (document.getElementById("coord-y1") as HTMLInputElement).value = Math.round(
    box.coordinate[1]
  ).toString();
  (document.getElementById("coord-x2") as HTMLInputElement).value = Math.round(
    box.coordinate[2]
  ).toString();
  (document.getElementById("coord-y2") as HTMLInputElement).value = Math.round(
    box.coordinate[3]
  ).toString();
  (document.getElementById("orientation-input") as HTMLSelectElement).value =
    box.orientation.toString();
}

// Close box editor
export function closeBoxEditor() {
  document.getElementById("box-editor")!.style.display = "none";
}

// Apply box edit
export function applyBoxEdit() {
  if (appState.currentImageIndex < 0 || !selectedBoxId) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  const box = imageData.boxes.find((b) => b.id === selectedBoxId);
  if (!box) return;

  box.data = (
    document.getElementById("box-data-input") as HTMLTextAreaElement
  ).value;
  box.coordinate = [
    parseFloat(
      (document.getElementById("coord-x1") as HTMLInputElement).value
    ) || 0,
    parseFloat(
      (document.getElementById("coord-y1") as HTMLInputElement).value
    ) || 0,
    parseFloat(
      (document.getElementById("coord-x2") as HTMLInputElement).value
    ) || 0,
    parseFloat(
      (document.getElementById("coord-y2") as HTMLInputElement).value
    ) || 0,
  ];
  box.orientation =
    parseFloat(
      (document.getElementById("orientation-input") as HTMLSelectElement).value
    ) || 0;

  normalizeBoxCoordinates(box);
  markAsModified();
}
