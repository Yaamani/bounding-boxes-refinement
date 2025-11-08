// Imports
import { setCanvas, appState, setMode } from "./state.js";
import {
  renderCanvas,
  resizeCanvasToContainer,
  zoomIn,
  zoomOut,
  fitToScreen,
} from "./canvas.js";
import {
  handleNewProject,
  handleOpenProject,
  handleSave,
  handleSaveAs,
} from "./project.js";
import { closeBoxEditor, deleteSelectedBox } from "./boxes.js";
import { updateUI, updateBoxList } from "./ui.js";
import {
  handleCanvasMouseDown,
  handleCanvasMouseMove,
  handleCanvasMouseUp,
  handleCanvasWheel,
  handleImageSearch,
  handleKeyDown,
  setupDelegatedEventListeners,
  handleInstantBoxEdit,
} from "./events.js";

// Initialize the application
function init() {
  const canvas = document.getElementById("main-canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;

  console.log(
    "renderer init — electronAPI present:",
    !!(window as any).electronAPI
  );

  // Set canvas in state
  setCanvas(canvas, ctx);

  // Ensure canvas matches container size on startup
  resizeCanvasToContainer();

  setupEventListeners();
  updateUI();

  // Update canvas size when window resizes
  window.addEventListener("resize", () => {
    resizeCanvasToContainer();
    renderCanvas(appState);
  });

  // Listen for save-before-close event from main process
  if ((window as any).electronAPI?.onSaveBeforeClose) {
    (window as any).electronAPI.onSaveBeforeClose(async () => {
      await handleSaveBeforeClose();
    });
  }
}

// Handle save before close
async function handleSaveBeforeClose() {
  try {
    await handleSave();
    // Notify main process that save is complete and window can close
    if ((window as any).electronAPI?.saveCompleteClose) {
      await (window as any).electronAPI.saveCompleteClose();
    }
  } catch (error) {
    console.error("Error saving before close:", error);
    alert("Failed to save the project.");
  }
}

// Setup all event listeners
function setupEventListeners() {
  // Menu buttons
  document
    .getElementById("new-project-btn")!
    .addEventListener("click", handleNewProject);
  document
    .getElementById("open-project-btn")!
    .addEventListener("click", handleOpenProject);
  document.getElementById("save-btn")!.addEventListener("click", handleSave);
  document
    .getElementById("save-as-btn")!
    .addEventListener("click", handleSaveAs);

  // Welcome screen buttons
  document
    .getElementById("welcome-new-btn")!
    .addEventListener("click", handleNewProject);
  document
    .getElementById("welcome-open-btn")!
    .addEventListener("click", handleOpenProject);

  // Canvas toolbar
  document.getElementById("zoom-in-btn")!.addEventListener("click", () => {
    zoomIn();
    renderCanvas(appState);
  });
  document.getElementById("zoom-out-btn")!.addEventListener("click", () => {
    zoomOut();
    renderCanvas(appState);
  });
  document.getElementById("zoom-fit-btn")!.addEventListener("click", () => {
    fitToScreen();
    renderCanvas(appState);
  });
  document
    .getElementById("pan-mode-btn")!
    .addEventListener("click", () => setMode("pan"));
  document
    .getElementById("select-mode-btn")!
    .addEventListener("click", () => setMode("select"));
  document
    .getElementById("draw-mode-btn")!
    .addEventListener("click", () => setMode("draw"));

  // Canvas events
  const canvas = document.getElementById("main-canvas") as HTMLCanvasElement;
  canvas.addEventListener("mousedown", handleCanvasMouseDown);
  canvas.addEventListener("mousemove", handleCanvasMouseMove);
  canvas.addEventListener("mouseup", handleCanvasMouseUp);
  canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });

  // Box editor - attach instant update listeners
  document
    .getElementById("add-box-btn")!
    .addEventListener("click", () => setMode("draw"));
  document
    .getElementById("close-editor-btn")!
    .addEventListener("click", closeBoxEditor);

  // Add event listeners for instant updates on box editor inputs
  const boxDataInput = document.getElementById(
    "box-data-input"
  ) as HTMLTextAreaElement;
  const coordX1 = document.getElementById("coord-x1") as HTMLInputElement;
  const coordY1 = document.getElementById("coord-y1") as HTMLInputElement;
  const coordX2 = document.getElementById("coord-x2") as HTMLInputElement;
  const coordY2 = document.getElementById("coord-y2") as HTMLInputElement;
  const orientationInput = document.getElementById(
    "orientation-input"
  ) as HTMLSelectElement;

  if (boxDataInput)
    boxDataInput.addEventListener("input", handleInstantBoxEdit);
  if (coordX1) coordX1.addEventListener("change", handleInstantBoxEdit);
  if (coordY1) coordY1.addEventListener("change", handleInstantBoxEdit);
  if (coordX2) coordX2.addEventListener("change", handleInstantBoxEdit);
  if (coordY2) coordY2.addEventListener("change", handleInstantBoxEdit);
  if (orientationInput)
    orientationInput.addEventListener("change", handleInstantBoxEdit);

  // Image search
  document
    .getElementById("image-search")!
    .addEventListener("input", handleImageSearch);

  // Keyboard shortcuts
  // document.addEventListener("keydown", handleKeyDown);

  // Delegate event handling for dynamically created list items
  setupDelegatedEventListeners();
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", init);
