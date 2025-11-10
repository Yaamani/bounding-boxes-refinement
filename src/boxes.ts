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
  setHasUnsavedBoxChanges,
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
  setHasUnsavedBoxChanges(true);
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
  setHasUnsavedBoxChanges(true);
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
  setHasUnsavedBoxChanges(true);
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

  // Show confirmation modal
  const boxLabel =
    box.data ||
    `Box ${imageData.boxes.findIndex((b) => b.id === selectedBoxId) + 1}`;

  // Update modal with box label
  const labelElement = document.getElementById("box-delete-label");
  if (labelElement) {
    labelElement.textContent = `"${boxLabel}"`;
  }

  // Show the modal
  const modal = document.getElementById(
    "box-delete-modal"
  ) as HTMLDialogElement;
  if (modal) {
    modal.showModal();
  }
}

// Confirm box deletion
export function confirmBoxDeletion() {
  if (appState.currentImageIndex < 0 || !selectedBoxId) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  const index = imageData.boxes.findIndex((b) => b.id === selectedBoxId);

  if (index >= 0) {
    imageData.boxes.splice(index, 1);
    setSelectedBoxId(null);
    markAsModified();
    setHasUnsavedBoxChanges(true);
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

// Update coordinate input fields with current box coordinates
export function updateCoordinateFields(boxId: string) {
  if (appState.currentImageIndex < 0) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  const box = imageData.boxes.find((b) => b.id === boxId);
  if (!box) return;

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
  setHasUnsavedBoxChanges(true);
}

// Check if two bounding boxes collide (overlap)
export function doBoxesCollide(box1: BoundingBox, box2: BoundingBox): boolean {
  const [x1a, y1a, x2a, y2a] = box1.coordinate;
  const [x1b, y1b, x2b, y2b] = box2.coordinate;

  // Check if boxes overlap
  return !(x2a < x1b || x2b < x1a || y2a < y1b || y2b < y1a);
}

// Get all boxes that collide with a given box
export function getCollidingBoxes(boxId: string): BoundingBox[] {
  if (appState.currentImageIndex < 0) return [];

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return [];

  const targetBox = imageData.boxes.find((b) => b.id === boxId);
  if (!targetBox) return [];

  const collidingBoxes: BoundingBox[] = [];
  for (const box of imageData.boxes) {
    if (box.id !== boxId && doBoxesCollide(targetBox, box)) {
      collidingBoxes.push(box);
    }
  }

  return collidingBoxes;
}

// Check if a box has any collisions
export function hasCollision(boxId: string): boolean {
  return getCollidingBoxes(boxId).length > 0;
}
