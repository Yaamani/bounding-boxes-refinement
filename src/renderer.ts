// Imports
import { setCanvas, appState, setMode } from './state.js';
import { renderCanvas, resizeCanvasToContainer, zoomIn, zoomOut, fitToScreen } from './canvas.js';
import { handleNewProject, handleOpenProject, handleSave, handleSaveAs } from './project.js';
import { closeBoxEditor, deleteSelectedBox } from './boxes.js';
import { updateUI, updateBoxList } from './ui.js';
import {
  handleCanvasMouseDown,
  handleCanvasMouseMove,
  handleCanvasMouseUp,
  handleCanvasWheel,
  handleImageSearch,
  handleKeyDown,
  setupDelegatedEventListeners,
  handleApplyBoxEdit
} from './events.js';

// Initialize the application
function init() {
  const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;

  console.log('renderer init — electronAPI present:', !!(window as any).electronAPI);

  // Set canvas in state
  setCanvas(canvas, ctx);

  // Ensure canvas matches container size on startup
  resizeCanvasToContainer();

  setupEventListeners();
  updateUI();

  // Update canvas size when window resizes
  window.addEventListener('resize', () => {
    resizeCanvasToContainer();
    renderCanvas(appState);
  });
}

// Setup all event listeners
function setupEventListeners() {
  // Menu buttons
  document.getElementById('new-project-btn')!.addEventListener('click', handleNewProject);
  document.getElementById('open-project-btn')!.addEventListener('click', handleOpenProject);
  document.getElementById('save-btn')!.addEventListener('click', handleSave);
  document.getElementById('save-as-btn')!.addEventListener('click', handleSaveAs);

  // Welcome screen buttons
  document.getElementById('welcome-new-btn')!.addEventListener('click', handleNewProject);
  document.getElementById('welcome-open-btn')!.addEventListener('click', handleOpenProject);

  // Canvas toolbar
  document.getElementById('zoom-in-btn')!.addEventListener('click', () => {
    zoomIn();
    renderCanvas(appState);
  });
  document.getElementById('zoom-out-btn')!.addEventListener('click', () => {
    zoomOut();
    renderCanvas(appState);
  });
  document.getElementById('zoom-fit-btn')!.addEventListener('click', () => {
    fitToScreen();
    renderCanvas(appState);
  });
  document.getElementById('pan-mode-btn')!.addEventListener('click', () => setMode('pan'));
  document.getElementById('select-mode-btn')!.addEventListener('click', () => setMode('select'));
  document.getElementById('draw-mode-btn')!.addEventListener('click', () => setMode('draw'));

  // Canvas events
  const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
  canvas.addEventListener('mousedown', handleCanvasMouseDown);
  canvas.addEventListener('mousemove', handleCanvasMouseMove);
  canvas.addEventListener('mouseup', handleCanvasMouseUp);
  canvas.addEventListener('wheel', handleCanvasWheel, { passive: false });

  // Box editor
  document.getElementById('add-box-btn')!.addEventListener('click', () => setMode('draw'));
  document.getElementById('close-editor-btn')!.addEventListener('click', closeBoxEditor);
  document.getElementById('apply-box-btn')!.addEventListener('click', handleApplyBoxEdit);

  // Image search
  document.getElementById('image-search')!.addEventListener('input', handleImageSearch);

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyDown);

  // Delegate event handling for dynamically created list items
  setupDelegatedEventListeners();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
