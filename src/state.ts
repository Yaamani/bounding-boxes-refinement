import type { AppState } from "./types.js";

// Application State
export const appState: AppState = {
  imageFolder: null,
  jsonFolders: null,
  images: [],
  currentImageIndex: -1,
  currentSaveFile: null,
  isModified: false,
};

// Canvas state
export let canvas: HTMLCanvasElement;
export let ctx: CanvasRenderingContext2D;
export let currentImage: HTMLImageElement | null = null;
export let scale = 1;
export let offsetX = 0;
export let offsetY = 0;
export let isDragging = false;
export let dragStart = { x: 0, y: 0 };
export let currentMode: "select" | "pan" | "draw" = "select";
export let drawingBox: { startX: number; startY: number } | null = null;
export let selectedBoxId: string | null = null;
export let resizingBox: { id: string; handle: string } | null = null;
export let previousModeForMiddleMouse: "select" | "pan" | "draw" | null = null;

// Setters for canvas state
export function setCanvas(
  c: HTMLCanvasElement,
  context: CanvasRenderingContext2D
) {
  canvas = c;
  ctx = context;
}

export function setCurrentImage(img: HTMLImageElement | null) {
  currentImage = img;
}

export function setScale(s: number) {
  scale = s;
}

export function setOffsetX(x: number) {
  offsetX = x;
}

export function setOffsetY(y: number) {
  offsetY = y;
}

export function setIsDragging(dragging: boolean) {
  isDragging = dragging;
}

export function setDragStart(x: number, y: number) {
  dragStart = { x, y };
}

export function setCurrentMode(mode: "select" | "pan" | "draw") {
  currentMode = mode;
}

// Set mode with UI updates
export function setMode(mode: "select" | "pan" | "draw") {
  setCurrentMode(mode);

  // Update button states
  const panBtn = document.getElementById("pan-mode-btn");
  const selectBtn = document.getElementById("select-mode-btn");
  const drawBtn = document.getElementById("draw-mode-btn");

  if (panBtn) panBtn.classList.toggle("btn-active", mode === "pan");
  if (selectBtn) selectBtn.classList.toggle("btn-active", mode === "select");
  if (drawBtn) drawBtn.classList.toggle("btn-active", mode === "draw");

  // Update canvas cursor
  if (canvas) {
    canvas.classList.remove("pan-mode", "select-mode", "draw-mode");
    canvas.classList.add(`${mode}-mode`);
  }
}

export function setDrawingBox(box: { startX: number; startY: number } | null) {
  drawingBox = box;
}

export function setSelectedBoxId(id: string | null) {
  selectedBoxId = id;
}

export function setResizingBox(box: { id: string; handle: string } | null) {
  resizingBox = box;
}

export function setPreviousModeForMiddleMouse(
  mode: "select" | "pan" | "draw" | null
) {
  previousModeForMiddleMouse = mode;
}

// Mark as modified
export function markAsModified() {
  appState.isModified = true;
  // Notify main process about unsaved changes
  if ((window as any).electronAPI?.setUnsavedChanges) {
    (window as any).electronAPI.setUnsavedChanges(true);
  }
}

// Clear modified flag
export function clearModified() {
  appState.isModified = false;
  // Notify main process that changes are saved
  if ((window as any).electronAPI?.setUnsavedChanges) {
    (window as any).electronAPI.setUnsavedChanges(false);
  }
}

// Generate unique ID
export function generateId(): string {
  return `box-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
