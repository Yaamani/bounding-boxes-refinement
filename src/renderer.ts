import type {
  AppState,
  ImageData,
  BoundingBox,
  InputFormat1,
  InputFormat2,
  SaveFileFormat
} from './types.js';

// Application State
const appState: AppState = {
  imageFolder: null,
  jsonFolders: null,
  images: [],
  currentImageIndex: -1,
  currentSaveFile: null,
  isModified: false
};

// Canvas state
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let currentImage: HTMLImageElement | null = null;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let currentMode: 'select' | 'pan' | 'draw' = 'select';
let drawingBox: { startX: number; startY: number } | null = null;
let selectedBoxId: string | null = null;
let resizingBox: { id: string; handle: string } | null = null;

// Initialize the application
function init() {
  canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;

  console.log('renderer init — electronAPI present:', !!(window as any).electronAPI);
  setupEventListeners();
  updateUI();
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
  document.getElementById('zoom-in-btn')!.addEventListener('click', () => zoomIn());
  document.getElementById('zoom-out-btn')!.addEventListener('click', () => zoomOut());
  document.getElementById('zoom-fit-btn')!.addEventListener('click', () => fitToScreen());
  document.getElementById('pan-mode-btn')!.addEventListener('click', () => setMode('pan'));
  document.getElementById('select-mode-btn')!.addEventListener('click', () => setMode('select'));
  document.getElementById('draw-mode-btn')!.addEventListener('click', () => setMode('draw'));
  document.getElementById('delete-box-btn')!.addEventListener('click', deleteSelectedBox);

  // Canvas events
  canvas.addEventListener('mousedown', handleCanvasMouseDown);
  canvas.addEventListener('mousemove', handleCanvasMouseMove);
  canvas.addEventListener('mouseup', handleCanvasMouseUp);
  canvas.addEventListener('wheel', handleCanvasWheel, { passive: false });

  // Box editor
  document.getElementById('add-box-btn')!.addEventListener('click', handleAddBox);
  document.getElementById('close-editor-btn')!.addEventListener('click', closeBoxEditor);
  document.getElementById('apply-box-btn')!.addEventListener('click', applyBoxEdit);

  // Image search
  document.getElementById('image-search')!.addEventListener('input', handleImageSearch);

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyDown);
}

// Handle new project
async function handleNewProject() {
  console.log('handleNewProject invoked');
  const imageFolder = await window.electronAPI.selectImageFolder();
  console.log('selected image folder:', imageFolder);
  if (!imageFolder) return;

  const jsonFolders = await window.electronAPI.selectJsonFolders();
  if (!jsonFolders || jsonFolders.length === 0) return;

  appState.imageFolder = imageFolder;
  appState.jsonFolders = jsonFolders;
  appState.currentSaveFile = null;
  appState.isModified = false;

  await loadProject();
  hideWelcomeScreen();
  updateUI();
}

// Handle open existing project
async function handleOpenProject() {
  const filePath = await window.electronAPI.selectOpenFile();
  if (!filePath) return;

  try {
    const content = await window.electronAPI.readFile(filePath);
    const saveData: SaveFileFormat[] = JSON.parse(content);

    // Get the base directory from the save file
    const baseDir = await window.electronAPI.pathDirname(filePath);

    // Convert save format to internal format
    appState.images = [];
    for (const item of saveData) {
      const fullImagePath = await window.electronAPI.pathJoin(baseDir, item.image_path);
      const fileName = item.image_path.split(/[\\/]/).pop() || item.image_path;

      const boxes: BoundingBox[] = item.polygons.map((poly, idx) => ({
        id: generateId(),
        data: poly.data,
        coordinate: poly.coordinate,
        isSelected: false
      }));

      appState.images.push({
        path: fullImagePath,
        fileName: fileName,
        boxes: boxes
      });
    }

    appState.imageFolder = baseDir;
    appState.jsonFolders = null;
    appState.currentSaveFile = filePath;
    appState.currentImageIndex = appState.images.length > 0 ? 0 : -1;
    appState.isModified = false;

    hideWelcomeScreen();
    updateUI();
    if (appState.currentImageIndex >= 0) {
      loadCurrentImage();
    }
  } catch (error) {
    console.error('Error opening project:', error);
    alert('Failed to open project file.');
  }
}

// Load project data from folders
async function loadProject() {
  if (!appState.imageFolder || !appState.jsonFolders) return;

  appState.images = [];

  // Read all image files
  const imageFiles = await window.electronAPI.readDirectory(appState.imageFolder);
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp'];
  const validImages = imageFiles.filter(file =>
    imageExtensions.some(ext => file.toLowerCase().endsWith(ext))
  );

  // Create a map to store boxes for each image
  const imageBoxMap = new Map<string, BoundingBox[]>();

  // Read all JSON files from all folders
  for (const jsonFolder of appState.jsonFolders) {
    const jsonFiles = await window.electronAPI.readDirectory(jsonFolder);
    const validJsonFiles = jsonFiles.filter(file => file.toLowerCase().endsWith('.json'));

    for (const jsonFile of validJsonFiles) {
      try {
        const jsonPath = await window.electronAPI.pathJoin(jsonFolder, jsonFile);
        const content = await window.electronAPI.readFile(jsonPath);
        const data = JSON.parse(content);

        // Determine format and extract boxes
        const boxes = parseJsonFormat(data);
        if (boxes && data.input_path) {
          const imageName = data.input_path.split(/[\\/]/).pop();
          if (!imageBoxMap.has(imageName)) {
            imageBoxMap.set(imageName, []);
          }
          imageBoxMap.get(imageName)!.push(...boxes);
        }
      } catch (error) {
        console.error(`Error reading JSON file ${jsonFile}:`, error);
      }
    }
  }

  // Create image data entries
  for (const imageFile of validImages) {
    const fullPath = await window.electronAPI.pathJoin(appState.imageFolder, imageFile);
    appState.images.push({
      path: fullPath,
      fileName: imageFile,
      boxes: imageBoxMap.get(imageFile) || []
    });
  }

  appState.currentImageIndex = appState.images.length > 0 ? 0 : -1;
  if (appState.currentImageIndex >= 0) {
    loadCurrentImage();
  }
}

// Parse JSON format and extract bounding boxes
function parseJsonFormat(data: any): BoundingBox[] {
  const boxes: BoundingBox[] = [];

  // Check for Format 1 (rec_texts and rec_polys)
  if (data.rec_texts && data.rec_polys && Array.isArray(data.rec_texts) && Array.isArray(data.rec_polys)) {
    const format1 = data as InputFormat1;
    for (let i = 0; i < format1.rec_texts.length; i++) {
      if (i < format1.rec_polys.length) {
        const poly = format1.rec_polys[i];
        if (poly) {
          const bbox = polygonToBoundingBox(poly);
          const text = format1.rec_texts[i];
          boxes.push({
            id: generateId(),
            data: text || '',
            coordinate: bbox,
            isSelected: false
          });
        }
      }
    }
  }
  // Check for Format 2 (boxes with label and coordinate)
  else if (data.boxes && Array.isArray(data.boxes)) {
    const format2 = data as InputFormat2;
    for (const box of format2.boxes) {
      if (box.coordinate && box.coordinate.length === 4) {
        boxes.push({
          id: generateId(),
          data: box.label || '',
          coordinate: box.coordinate,
          isSelected: false
        });
      }
    }
  }

  return boxes;
}

// Convert polygon to bounding box
function polygonToBoundingBox(poly: [number, number][]): [number, number, number, number] {
  if (poly.length === 0) return [0, 0, 0, 0];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y] of poly) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return [minX, minY, maxX, maxY];
}

// Generate unique ID
function generateId(): string {
  return `box-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Load current image
async function loadCurrentImage() {
  if (appState.currentImageIndex < 0 || appState.currentImageIndex >= appState.images.length) {
    return;
  }

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  currentImage = new Image();
  
  currentImage.onload = () => {
    fitToScreen();
    renderCanvas();
  };

  currentImage.onerror = () => {
    console.error('Failed to load image:', imageData.path);
    alert('Failed to load image: ' + imageData.fileName);
  };

  // Convert file path to file:// URL for loading
  currentImage.src = 'file:///' + imageData.path.replace(/\\/g, '/');
}

// Render canvas
function renderCanvas() {
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
  if (drawingBox && currentMode === 'draw') {
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    const width = dragStart.x - drawingBox.startX;
    const height = dragStart.y - drawingBox.startY;
    ctx.strokeRect(drawingBox.startX, drawingBox.startY, width, height);
    ctx.setLineDash([]);
  }
}

// Draw a bounding box
function drawBoundingBox(box: BoundingBox, imgX: number, imgY: number, imgScale: number) {
  const [x1, y1, x2, y2] = box.coordinate;
  const canvasX1 = imgX + x1 * imgScale;
  const canvasY1 = imgY + y1 * imgScale;
  const canvasX2 = imgX + x2 * imgScale;
  const canvasY2 = imgY + y2 * imgScale;

  // Draw box
  ctx.strokeStyle = box.isSelected ? '#00ff00' : '#ff0000';
  ctx.lineWidth = box.isSelected ? 3 : 2;
  ctx.strokeRect(canvasX1, canvasY1, canvasX2 - canvasX1, canvasY2 - canvasY1);

  // Draw resize handles if selected
  if (box.isSelected) {
    const handleSize = 8;
    ctx.fillStyle = '#00ff00';
    // Top-left
    ctx.fillRect(canvasX1 - handleSize / 2, canvasY1 - handleSize / 2, handleSize, handleSize);
    // Top-right
    ctx.fillRect(canvasX2 - handleSize / 2, canvasY1 - handleSize / 2, handleSize, handleSize);
    // Bottom-left
    ctx.fillRect(canvasX1 - handleSize / 2, canvasY2 - handleSize / 2, handleSize, handleSize);
    // Bottom-right
    ctx.fillRect(canvasX2 - handleSize / 2, canvasY2 - handleSize / 2, handleSize, handleSize);
  }

  // Draw label
  if (box.data) {
    ctx.fillStyle = box.isSelected ? '#00ff00' : '#ff0000';
    ctx.font = '12px sans-serif';
    const text = box.data.substring(0, 20) + (box.data.length > 20 ? '...' : '');
    const textWidth = ctx.measureText(text).width;
    ctx.fillRect(canvasX1, canvasY1 - 18, textWidth + 8, 18);
    ctx.fillStyle = '#000000';
    ctx.fillText(text, canvasX1 + 4, canvasY1 - 5);
  }
}

// Canvas mouse down handler
function handleCanvasMouseDown(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (currentMode === 'pan') {
    isDragging = true;
    dragStart = { x: mouseX - offsetX, y: mouseY - offsetY };
  } else if (currentMode === 'select') {
    // Check if clicking on a resize handle
    const handle = getResizeHandle(mouseX, mouseY);
    if (handle) {
      resizingBox = handle;
      isDragging = true;
      dragStart = { x: mouseX, y: mouseY };
    } else {
      // Check if clicking on a box
      const clickedBox = getBoxAtPosition(mouseX, mouseY);
      if (clickedBox) {
        selectBox(clickedBox.id);
        isDragging = true;
        dragStart = { x: mouseX, y: mouseY };
      } else {
        deselectAllBoxes();
        closeBoxEditor();
      }
    }
  } else if (currentMode === 'draw') {
    isDragging = true;
    drawingBox = { startX: mouseX, startY: mouseY };
    dragStart = { x: mouseX, y: mouseY };
  }
}

// Canvas mouse move handler
function handleCanvasMouseMove(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (isDragging) {
    if (currentMode === 'pan') {
      offsetX = mouseX - dragStart.x;
      offsetY = mouseY - dragStart.y;
      renderCanvas();
    } else if (currentMode === 'select' && resizingBox) {
      // Resize box
      const deltaX = mouseX - dragStart.x;
      const deltaY = mouseY - dragStart.y;
      resizeBox(resizingBox.id, resizingBox.handle, deltaX, deltaY);
      dragStart = { x: mouseX, y: mouseY };
      renderCanvas();
      updateBoxList();
    } else if (currentMode === 'select' && selectedBoxId) {
      // Move box
      const deltaX = mouseX - dragStart.x;
      const deltaY = mouseY - dragStart.y;
      moveBox(selectedBoxId, deltaX, deltaY);
      dragStart = { x: mouseX, y: mouseY };
      renderCanvas();
      updateBoxList();
    } else if (currentMode === 'draw') {
      dragStart = { x: mouseX, y: mouseY };
      renderCanvas();
    }
  }
}

// Canvas mouse up handler
function handleCanvasMouseUp(e: MouseEvent) {
  if (currentMode === 'draw' && drawingBox) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert canvas coordinates to image coordinates
    if (currentImage) {
      const imgWidth = currentImage.width * scale;
      const imgHeight = currentImage.height * scale;
      const imgX = offsetX + (canvas.width - imgWidth) / 2;
      const imgY = offsetY + (canvas.height - imgHeight) / 2;

      const x1 = Math.min(drawingBox.startX, mouseX);
      const y1 = Math.min(drawingBox.startY, mouseY);
      const x2 = Math.max(drawingBox.startX, mouseX);
      const y2 = Math.max(drawingBox.startY, mouseY);

      // Convert to image coordinates
      const imgCoordX1 = (x1 - imgX) / scale;
      const imgCoordY1 = (y1 - imgY) / scale;
      const imgCoordX2 = (x2 - imgX) / scale;
      const imgCoordY2 = (y2 - imgY) / scale;

      // Only create box if it has reasonable size
      if (Math.abs(x2 - x1) > 10 && Math.abs(y2 - y1) > 10) {
        createNewBox([imgCoordX1, imgCoordY1, imgCoordX2, imgCoordY2]);
      }
    }

    drawingBox = null;
  }

  isDragging = false;
  resizingBox = null;
  renderCanvas();
}

// Canvas wheel handler (zoom)
function handleCanvasWheel(e: WheelEvent) {
  e.preventDefault();
  
  if (e.deltaY < 0) {
    zoomIn();
  } else {
    zoomOut();
  }
}

// Get box at position
function getBoxAtPosition(x: number, y: number): BoundingBox | null {
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
function getResizeHandle(x: number, y: number): { id: string; handle: string } | null {
  if (appState.currentImageIndex < 0 || !currentImage || !selectedBoxId) return null;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return null;

  const box = imageData.boxes.find(b => b.id === selectedBoxId);
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

  if (Math.abs(x - canvasX1) <= threshold && Math.abs(y - canvasY1) <= threshold) {
    return { id: box.id, handle: 'tl' };
  }
  if (Math.abs(x - canvasX2) <= threshold && Math.abs(y - canvasY1) <= threshold) {
    return { id: box.id, handle: 'tr' };
  }
  if (Math.abs(x - canvasX1) <= threshold && Math.abs(y - canvasY2) <= threshold) {
    return { id: box.id, handle: 'bl' };
  }
  if (Math.abs(x - canvasX2) <= threshold && Math.abs(y - canvasY2) <= threshold) {
    return { id: box.id, handle: 'br' };
  }

  return null;
}

// Resize box
function resizeBox(boxId: string, handle: string, deltaX: number, deltaY: number) {
  if (appState.currentImageIndex < 0 || !currentImage) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  const box = imageData.boxes.find(b => b.id === boxId);
  if (!box) return;

  const [x1, y1, x2, y2] = box.coordinate;
  const deltaImgX = deltaX / scale;
  const deltaImgY = deltaY / scale;

  switch (handle) {
    case 'tl':
      box.coordinate = [x1 + deltaImgX, y1 + deltaImgY, x2, y2];
      break;
    case 'tr':
      box.coordinate = [x1, y1 + deltaImgY, x2 + deltaImgX, y2];
      break;
    case 'bl':
      box.coordinate = [x1 + deltaImgX, y1, x2, y2 + deltaImgY];
      break;
    case 'br':
      box.coordinate = [x1, y1, x2 + deltaImgX, y2 + deltaImgY];
      break;
  }

  // Ensure coordinates are in correct order
  normalizeBoxCoordinates(box);
  markAsModified();
}

// Move box
function moveBox(boxId: string, deltaX: number, deltaY: number) {
  if (appState.currentImageIndex < 0 || !currentImage) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  const box = imageData.boxes.find(b => b.id === boxId);
  if (!box) return;

  const deltaImgX = deltaX / scale;
  const deltaImgY = deltaY / scale;

  const [x1, y1, x2, y2] = box.coordinate;
  box.coordinate = [x1 + deltaImgX, y1 + deltaImgY, x2 + deltaImgX, y2 + deltaImgY];
  markAsModified();
}

// Normalize box coordinates (ensure x1 < x2 and y1 < y2)
function normalizeBoxCoordinates(box: BoundingBox) {
  const [x1, y1, x2, y2] = box.coordinate;
  box.coordinate = [
    Math.min(x1, x2),
    Math.min(y1, y2),
    Math.max(x1, x2),
    Math.max(y1, y2)
  ];
}

// Create new box
function createNewBox(coordinate: [number, number, number, number]) {
  if (appState.currentImageIndex < 0) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  const newBox: BoundingBox = {
    id: generateId(),
    data: '',
    coordinate: coordinate,
    isSelected: false
  };

  normalizeBoxCoordinates(newBox);
  imageData.boxes.push(newBox);
  selectBox(newBox.id);
  markAsModified();
  updateBoxList();
  renderCanvas();
}

// Select box
function selectBox(boxId: string) {
  if (appState.currentImageIndex < 0) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  imageData.boxes.forEach(box => {
    box.isSelected = box.id === boxId;
  });

  selectedBoxId = boxId;
  showBoxEditor(boxId);
  updateBoxList();
  renderCanvas();
}

// Deselect all boxes
function deselectAllBoxes() {
  if (appState.currentImageIndex < 0) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  imageData.boxes.forEach(box => {
    box.isSelected = false;
  });

  selectedBoxId = null;
  renderCanvas();
  updateBoxList();
}

// Delete selected box
function deleteSelectedBox() {
  if (appState.currentImageIndex < 0 || !selectedBoxId) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  const index = imageData.boxes.findIndex(b => b.id === selectedBoxId);
  
  if (index >= 0) {
    imageData.boxes.splice(index, 1);
    selectedBoxId = null;
    closeBoxEditor();
    markAsModified();
    updateBoxList();
    renderCanvas();
  }
}

// Show box editor
function showBoxEditor(boxId: string) {
  if (appState.currentImageIndex < 0) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  const box = imageData.boxes.find(b => b.id === boxId);
  if (!box) return;

  const editor = document.getElementById('box-editor')!;
  editor.style.display = 'block';

  (document.getElementById('box-data-input') as HTMLTextAreaElement).value = box.data;
  (document.getElementById('coord-x1') as HTMLInputElement).value = Math.round(box.coordinate[0]).toString();
  (document.getElementById('coord-y1') as HTMLInputElement).value = Math.round(box.coordinate[1]).toString();
  (document.getElementById('coord-x2') as HTMLInputElement).value = Math.round(box.coordinate[2]).toString();
  (document.getElementById('coord-y2') as HTMLInputElement).value = Math.round(box.coordinate[3]).toString();
}

// Close box editor
function closeBoxEditor() {
  document.getElementById('box-editor')!.style.display = 'none';
}

// Apply box edit
function applyBoxEdit() {
  if (appState.currentImageIndex < 0 || !selectedBoxId) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  const box = imageData.boxes.find(b => b.id === selectedBoxId);
  if (!box) return;

  box.data = (document.getElementById('box-data-input') as HTMLTextAreaElement).value;
  box.coordinate = [
    parseFloat((document.getElementById('coord-x1') as HTMLInputElement).value) || 0,
    parseFloat((document.getElementById('coord-y1') as HTMLInputElement).value) || 0,
    parseFloat((document.getElementById('coord-x2') as HTMLInputElement).value) || 0,
    parseFloat((document.getElementById('coord-y2') as HTMLInputElement).value) || 0
  ];

  normalizeBoxCoordinates(box);
  markAsModified();
  updateBoxList();
  renderCanvas();
}

// Handle add box
function handleAddBox() {
  setMode('draw');
}

// Set mode
function setMode(mode: 'select' | 'pan' | 'draw') {
  currentMode = mode;

  // Update button states
  document.getElementById('pan-mode-btn')!.classList.toggle('active', mode === 'pan');
  document.getElementById('select-mode-btn')!.classList.toggle('active', mode === 'select');
  document.getElementById('draw-mode-btn')!.classList.toggle('active', mode === 'draw');

  // Update canvas cursor
  canvas.classList.toggle('pan-mode', mode === 'pan');
}

// Zoom functions
function zoomIn() {
  scale = Math.min(scale * 1.2, 10);
  document.getElementById('zoom-level')!.textContent = Math.round(scale * 100) + '%';
  renderCanvas();
}

function zoomOut() {
  scale = Math.max(scale / 1.2, 0.1);
  document.getElementById('zoom-level')!.textContent = Math.round(scale * 100) + '%';
  renderCanvas();
}

function fitToScreen() {
  if (!currentImage) return;

  const containerWidth = canvas.parentElement!.clientWidth;
  const containerHeight = canvas.parentElement!.clientHeight - 40; // Subtract toolbar height

  canvas.width = containerWidth;
  canvas.height = containerHeight;

  const scaleX = containerWidth / currentImage.width;
  const scaleY = containerHeight / currentImage.height;
  scale = Math.min(scaleX, scaleY, 1) * 0.9; // 90% to add some padding

  offsetX = 0;
  offsetY = 0;

  document.getElementById('zoom-level')!.textContent = Math.round(scale * 100) + '%';
  renderCanvas();
}

// Update UI
function updateUI() {
  const hasProject = appState.images.length > 0;

  // Update menu buttons
  (document.getElementById('save-btn') as HTMLButtonElement).disabled = !hasProject;
  (document.getElementById('save-as-btn') as HTMLButtonElement).disabled = !hasProject;
  (document.getElementById('delete-box-btn') as HTMLButtonElement).disabled = !selectedBoxId;

  // Update project status
  const statusText = hasProject
    ? `${appState.images.length} images${appState.isModified ? ' (modified)' : ''}`
    : 'No project loaded';
  document.getElementById('project-status')!.textContent = statusText;

  // Update lists
  updateImageList();
  updateBoxList();
}

// Update image list
function updateImageList() {
  const listContainer = document.getElementById('image-list')!;
  listContainer.innerHTML = '';

  const searchTerm = (document.getElementById('image-search') as HTMLInputElement).value.toLowerCase();

  appState.images.forEach((image, index) => {
    if (searchTerm && !image.fileName.toLowerCase().includes(searchTerm)) {
      return;
    }

    const item = document.createElement('div');
    item.className = 'list-item';
    if (index === appState.currentImageIndex) {
      item.classList.add('active');
    }
    item.textContent = image.fileName;
    item.title = image.fileName;
    item.addEventListener('click', () => {
      appState.currentImageIndex = index;
      deselectAllBoxes();
      closeBoxEditor();
      loadCurrentImage();
      updateUI();
    });
    listContainer.appendChild(item);
  });
}

// Update box list
function updateBoxList() {
  const listContainer = document.getElementById('box-list')!;
  listContainer.innerHTML = '';

  if (appState.currentImageIndex < 0) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  imageData.boxes.forEach((box, index) => {
    const item = document.createElement('div');
    item.className = 'list-item box-item';
    if (box.isSelected) {
      item.classList.add('active');
    }

    const content = document.createElement('div');
    content.className = 'box-item-content';

    const label = document.createElement('div');
    label.className = 'box-item-label';
    label.textContent = box.data || `Box ${index + 1}`;
    label.title = box.data;

    const coord = document.createElement('div');
    coord.className = 'box-item-coord';
    const [x1, y1, x2, y2] = box.coordinate;
    coord.textContent = `(${Math.round(x1)}, ${Math.round(y1)}) - (${Math.round(x2)}, ${Math.round(y2)})`;

    content.appendChild(label);
    content.appendChild(coord);

    const actions = document.createElement('div');
    actions.className = 'box-item-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'box-item-btn';
    editBtn.textContent = '✏️';
    editBtn.title = 'Edit';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectBox(box.id);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'box-item-btn';
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectBox(box.id);
      deleteSelectedBox();
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(content);
    item.appendChild(actions);

    item.addEventListener('click', () => {
      selectBox(box.id);
    });

    listContainer.appendChild(item);
  });
}

// Handle image search
function handleImageSearch() {
  updateImageList();
}

// Handle save
async function handleSave() {
  if (appState.currentSaveFile) {
    await saveToFile(appState.currentSaveFile);
  } else {
    await handleSaveAs();
  }
}

// Handle save as
async function handleSaveAs() {
  const filePath = await window.electronAPI.selectSaveFile();
  if (!filePath) return;

  await saveToFile(filePath);
  appState.currentSaveFile = filePath;
  updateUI();
}

// Save to file
async function saveToFile(filePath: string) {
  try {
    const baseDir = await window.electronAPI.pathDirname(filePath);
    
    const saveData: SaveFileFormat[] = [];
    for (const image of appState.images) {
      // Make image path relative to save file location
      let relativePath = image.path;
      if (appState.imageFolder) {
        const imageName = image.fileName;
        relativePath = imageName;
      }

      saveData.push({
        image_path: relativePath,
        polygons: image.boxes.map(box => ({
          data: box.data,
          coordinate: box.coordinate
        }))
      });
    }

    const content = JSON.stringify(saveData, null, 2);
    await window.electronAPI.writeFile(filePath, content);
    
    appState.isModified = false;
    updateUI();
    console.log('Project saved successfully');
  } catch (error) {
    console.error('Error saving project:', error);
    alert('Failed to save project.');
  }
}

// Mark as modified
function markAsModified() {
  appState.isModified = true;
  updateUI();
}

// Hide welcome screen
function hideWelcomeScreen() {
  document.getElementById('welcome-screen')!.classList.add('hidden');
}

// Handle keyboard shortcuts
function handleKeyDown(e: KeyboardEvent) {
  // Delete key
  if (e.key === 'Delete' && selectedBoxId) {
    deleteSelectedBox();
  }
  // Escape key
  else if (e.key === 'Escape') {
    if (currentMode === 'draw') {
      setMode('select');
      drawingBox = null;
      renderCanvas();
    } else {
      deselectAllBoxes();
      closeBoxEditor();
    }
  }
  // Ctrl+S or Cmd+S for save
  else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (appState.images.length > 0) {
      handleSave();
    }
  }
  // Arrow keys for navigation
  else if (e.key === 'ArrowLeft' && appState.currentImageIndex > 0) {
    appState.currentImageIndex--;
    deselectAllBoxes();
    closeBoxEditor();
    loadCurrentImage();
    updateUI();
  }
  else if (e.key === 'ArrowRight' && appState.currentImageIndex < appState.images.length - 1) {
    appState.currentImageIndex++;
    deselectAllBoxes();
    closeBoxEditor();
    loadCurrentImage();
    updateUI();
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
