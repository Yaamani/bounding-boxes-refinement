import {
  appState,
  canvas,
  currentImage,
  scale,
  offsetX,
  offsetY,
  isDragging,
  dragStart,
  currentMode,
  drawingBox,
  selectedBoxId,
  resizingBox,
  previousModeForMiddleMouse,
  setOffsetX,
  setOffsetY,
  setIsDragging,
  setDragStart,
  setCurrentMode,
  setDrawingBox,
  setResizingBox,
  setPreviousModeForMiddleMouse,
  setMode
} from './state.js';
import { renderCanvas, constrainOffsets, zoomIn, zoomOut } from './canvas.js';
import { loadCurrentImage, handleSave } from './project.js';
import {
  getBoxAtPosition,
  getResizeHandle,
  resizeBox,
  moveBox,
  createNewBox,
  selectBox,
  deselectAllBoxes,
  deleteSelectedBox,
  showBoxEditor,
  closeBoxEditor,
  applyBoxEdit
} from './boxes.js';
import { updateUI, updateBoxList, updateImageList } from './ui.js';

// Canvas mouse down handler
export function handleCanvasMouseDown(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Middle mouse button for pan (regardless of current mode)
  if (e.button === 1) {
    setPreviousModeForMiddleMouse(currentMode);
    setCurrentMode('pan');
    setIsDragging(true);
    setDragStart(mouseX - offsetX, mouseY - offsetY);
    return;
  }

  if (currentMode === 'pan') {
    setIsDragging(true);
    setDragStart(mouseX - offsetX, mouseY - offsetY);
  } else if (currentMode === 'select') {
    // Check if clicking on a resize handle
    const handle = getResizeHandle(mouseX, mouseY);
    if (handle) {
      setResizingBox(handle);
      setIsDragging(true);
      setDragStart(mouseX, mouseY);
    } else {
      // Check if clicking on a box
      const clickedBox = getBoxAtPosition(mouseX, mouseY);
      if (clickedBox) {
        selectBox(clickedBox.id);
        showBoxEditor(clickedBox.id);
        updateBoxList();
        renderCanvas(appState);
        setIsDragging(true);
        setDragStart(mouseX, mouseY);
      } else {
        deselectAllBoxes();
        closeBoxEditor();
        updateBoxList();
        renderCanvas(appState);
      }
    }
  } else if (currentMode === 'draw') {
    setIsDragging(true);
    setDrawingBox({ startX: mouseX, startY: mouseY });
    setDragStart(mouseX, mouseY);
  }
}

// Canvas mouse move handler
export function handleCanvasMouseMove(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (isDragging) {
    if (currentMode === 'pan') {
      setOffsetX(mouseX - dragStart.x);
      setOffsetY(mouseY - dragStart.y);
      constrainOffsets();
      renderCanvas(appState);
    } else if (currentMode === 'select' && resizingBox) {
      // Resize box
      const deltaX = mouseX - dragStart.x;
      const deltaY = mouseY - dragStart.y;
      resizeBox(resizingBox.id, resizingBox.handle, deltaX, deltaY);
      setDragStart(mouseX, mouseY);
      renderCanvas(appState);
      updateBoxList();
    } else if (currentMode === 'select' && selectedBoxId) {
      // Move box
      const deltaX = mouseX - dragStart.x;
      const deltaY = mouseY - dragStart.y;
      moveBox(selectedBoxId, deltaX, deltaY);
      setDragStart(mouseX, mouseY);
      renderCanvas(appState);
      updateBoxList();
    } else if (currentMode === 'draw') {
      setDragStart(mouseX, mouseY);
      renderCanvas(appState);
    }
  }
}

// Canvas mouse up handler
export function handleCanvasMouseUp(e: MouseEvent) {
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
        const boxes = appState.images[appState.currentImageIndex]?.boxes;
        if (boxes && boxes.length > 0) {
          const newBox = boxes[boxes.length - 1];
          if (newBox) {
            showBoxEditor(newBox.id);
          }
        }
        updateBoxList();
      }
    }

    setDrawingBox(null);
  }

  setIsDragging(false);
  setResizingBox(null);

  // Restore previous mode if middle mouse pan was used
  if (previousModeForMiddleMouse) {
    setCurrentMode(previousModeForMiddleMouse);
    setPreviousModeForMiddleMouse(null);
    // Update button states
    document.getElementById('pan-mode-btn')!.classList.toggle('btn-active', currentMode === 'pan');
    document.getElementById('select-mode-btn')!.classList.toggle('btn-active', currentMode === 'select');
    document.getElementById('draw-mode-btn')!.classList.toggle('btn-active', currentMode === 'draw');
    canvas.classList.toggle('pan-mode', currentMode === 'pan');
  }

  renderCanvas(appState);
}

// Canvas wheel handler (pan/zoom)
export function handleCanvasWheel(e: WheelEvent) {
  e.preventDefault();

  const panSpeed = 50;

  if (e.ctrlKey) {
    // Ctrl + wheel => zoom centered around mouse
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (e.deltaY < 0) {
      zoomIn(mouseX, mouseY);
    } else {
      zoomOut(mouseX, mouseY);
    }
    renderCanvas(appState);
  } else if (e.shiftKey) {
    // Shift + wheel => pan horizontally
    setOffsetX(offsetX + (e.deltaY > 0 ? panSpeed : -panSpeed));
    constrainOffsets();
    renderCanvas(appState);
  } else {
    // Default wheel => pan vertically
    setOffsetY(offsetY + (e.deltaY > 0 ? panSpeed : -panSpeed));
    constrainOffsets();
    renderCanvas(appState);
  }
}

// Handle image search
export function handleImageSearch() {
  updateImageList();
}

// Handle keyboard shortcuts
export function handleKeyDown(e: KeyboardEvent) {
  // Delete key
  if (e.key === 'Delete' && selectedBoxId) {
    deleteSelectedBox();
    closeBoxEditor();
    updateBoxList();
    renderCanvas(appState);
  }
  // Escape key
  else if (e.key === 'Escape') {
    if (currentMode === 'draw') {
      setMode('select');
      setDrawingBox(null);
      renderCanvas(appState);
    } else {
      deselectAllBoxes();
      closeBoxEditor();
      updateBoxList();
      renderCanvas(appState);
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
    loadCurrentImage(() => {
      renderCanvas(appState);
    });
    updateUI();
  } else if (e.key === 'ArrowRight' && appState.currentImageIndex < appState.images.length - 1) {
    appState.currentImageIndex++;
    deselectAllBoxes();
    closeBoxEditor();
    loadCurrentImage(() => {
      renderCanvas(appState);
    });
    updateUI();
  }
  // Mode shortcuts
  else if (e.key === 'p') {
    setMode('pan');
  } else if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
    setMode('select');
  }
}

// Handle image list item click
export function handleImageItemClick(index: number) {
  appState.currentImageIndex = index;
  deselectAllBoxes();
  closeBoxEditor();
  loadCurrentImage(() => {
    renderCanvas(appState);
  });
  updateUI();
}

// Handle box list item click
export function handleBoxItemClick(boxId: string) {
  selectBox(boxId);
  showBoxEditor(boxId);
  updateBoxList();
  renderCanvas(appState);
}

// Handle box delete from list
export function handleBoxDeleteFromList(boxId: string) {
  selectBox(boxId);
  deleteSelectedBox();
  closeBoxEditor();
  updateBoxList();
  renderCanvas(appState);
}

// Apply box edit wrapper
export function handleApplyBoxEdit() {
  applyBoxEdit();
  updateBoxList();
  renderCanvas(appState);
}

// Setup delegated event listeners for dynamically created elements
export function setupDelegatedEventListeners() {
  // Image list click delegation
  document.getElementById('image-list')!.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const item = target.closest('.btn');
    if (item) {
      const index = Array.from(item.parentElement!.children).indexOf(item);
      if (index >= 0) {
        handleImageItemClick(index);
      }
    }
  });

  // Box list click delegation
  document.getElementById('box-list')!.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Handle edit button
    if (target.classList.contains('btn-primary') || target.textContent === '✏️') {
      e.stopPropagation();
      const card = target.closest('.card');
      if (card) {
        const index = Array.from(card.parentElement!.children).indexOf(card);
        if (index >= 0 && appState.currentImageIndex >= 0) {
          const imageData = appState.images[appState.currentImageIndex];
          if (imageData && imageData.boxes[index]) {
            handleBoxItemClick(imageData.boxes[index].id);
          }
        }
      }
      return;
    }
    
    // Handle delete button
    if (target.classList.contains('btn-error') || target.textContent === '🗑️') {
      e.stopPropagation();
      const card = target.closest('.card');
      if (card) {
        const index = Array.from(card.parentElement!.children).indexOf(card);
        if (index >= 0 && appState.currentImageIndex >= 0) {
          const imageData = appState.images[appState.currentImageIndex];
          if (imageData && imageData.boxes[index]) {
            handleBoxDeleteFromList(imageData.boxes[index].id);
          }
        }
      }
      return;
    }
    
    // Handle card click
    const card = target.closest('.card');
    if (card) {
      const index = Array.from(card.parentElement!.children).indexOf(card);
      if (index >= 0 && appState.currentImageIndex >= 0) {
        const imageData = appState.images[appState.currentImageIndex];
        if (imageData && imageData.boxes[index]) {
          handleBoxItemClick(imageData.boxes[index].id);
        }
      }
    }
  });
}

