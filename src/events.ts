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
  hasUnsavedBoxChanges,
  setOffsetX,
  setOffsetY,
  setIsDragging,
  setDragStart,
  setCurrentMode,
  setDrawingBox,
  setResizingBox,
  setPreviousModeForMiddleMouse,
  setMode,
  setHasUnsavedBoxChanges,
  toggleImageCheckedStatus,
  markAsModified,
} from "./state.js";
import {
  renderCanvas,
  constrainOffsets,
  zoomIn,
  zoomOut,
  extractBoundingBoxImage,
} from "./canvas.js";
import { loadCurrentImage, handleSave } from "./project.js";
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
  applyBoxEdit,
  updateCoordinateFields,
} from "./boxes.js";
import { updateUI, updateBoxList, updateImageList } from "./ui.js";
import { recognizeTextFromImage } from "./ocr.js";

// Canvas mouse down handler
export function handleCanvasMouseDown(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Middle mouse button for pan (regardless of current mode)
  if (e.button === 1) {
    setPreviousModeForMiddleMouse(currentMode);
    setCurrentMode("pan");
    setIsDragging(true);
    setDragStart(mouseX - offsetX, mouseY - offsetY);
    return;
  }

  if (currentMode === "pan") {
    setIsDragging(true);
    setDragStart(mouseX - offsetX, mouseY - offsetY);
  } else if (currentMode === "select") {
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
  } else if (currentMode === "draw") {
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
    if (currentMode === "pan") {
      setOffsetX(mouseX - dragStart.x);
      setOffsetY(mouseY - dragStart.y);
      constrainOffsets();
      renderCanvas(appState);
    } else if (currentMode === "select" && resizingBox) {
      // Resize box
      const deltaX = mouseX - dragStart.x;
      const deltaY = mouseY - dragStart.y;
      resizeBox(resizingBox.id, resizingBox.handle, deltaX, deltaY);
      setDragStart(mouseX, mouseY);
      renderCanvas(appState);
    } else if (currentMode === "select" && selectedBoxId) {
      // Move box
      const deltaX = mouseX - dragStart.x;
      const deltaY = mouseY - dragStart.y;
      moveBox(selectedBoxId, deltaX, deltaY);
      setDragStart(mouseX, mouseY);
      renderCanvas(appState);
    } else if (currentMode === "draw") {
      setDragStart(mouseX, mouseY);
      renderCanvas(appState);
    }
  }
}

// Canvas mouse up handler
export function handleCanvasMouseUp(e: MouseEvent) {
  if (currentMode === "draw" && drawingBox) {
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
        // Switch to select mode after drawing a box
        setMode("select");
      }
    }

    setDrawingBox(null);
  }

  setIsDragging(false);

  // Update coordinate fields only after resize/move is complete
  if (resizingBox) {
    updateBoxList();
    updateCoordinateFields(resizingBox.id);
  } else if (selectedBoxId) {
    updateBoxList();
    updateCoordinateFields(selectedBoxId);
  }

  setResizingBox(null);

  // Restore previous mode if middle mouse pan was used
  if (previousModeForMiddleMouse) {
    setCurrentMode(previousModeForMiddleMouse);
    setPreviousModeForMiddleMouse(null);
    // Update button states
    document
      .getElementById("pan-mode-btn")!
      .classList.toggle("btn-active", currentMode === "pan");
    document
      .getElementById("select-mode-btn")!
      .classList.toggle("btn-active", currentMode === "select");
    document
      .getElementById("draw-mode-btn")!
      .classList.toggle("btn-active", currentMode === "draw");
    canvas.classList.toggle("pan-mode", currentMode === "pan");
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
    setOffsetX(offsetX + (e.deltaY > 0 ? -panSpeed : panSpeed));
    constrainOffsets();
    renderCanvas(appState);
  } else {
    // Default wheel => pan vertically
    setOffsetY(offsetY + (e.deltaY > 0 ? -panSpeed : panSpeed));
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
  if (e.key === "Delete" && selectedBoxId) {
    deleteSelectedBox();
    closeBoxEditor();
    updateBoxList();
    renderCanvas(appState);
  }
  // Escape key
  else if (e.key === "Escape") {
    if (currentMode === "draw") {
      setMode("select");
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
  else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    if (appState.images.length > 0) {
      handleSave();
    }
  }
  // // Arrow keys for navigation
  // else if (e.key === "ArrowLeft" && appState.currentImageIndex > 0) {
  //   appState.currentImageIndex--;
  //   deselectAllBoxes();
  //   closeBoxEditor();
  //   loadCurrentImage(() => {
  //     renderCanvas(appState);
  //   });
  //   updateUI();
  // } else if (
  //   e.key === "ArrowRight" &&
  //   appState.currentImageIndex < appState.images.length - 1
  // ) {
  //   appState.currentImageIndex++;
  //   deselectAllBoxes();
  //   closeBoxEditor();
  //   loadCurrentImage(() => {
  //     renderCanvas(appState);
  //   });
  //   updateUI();
  // }
  // Mode shortcuts
  else if (e.key === "p") {
    setMode("pan");
  } else if (e.key === "s" && !e.ctrlKey && !e.metaKey) {
    setMode("select");
  }
}

// Handle image list item click
export function handleImageItemClick(index: number) {
  // If we have unsaved changes and switching to a different image
  if (
    hasUnsavedBoxChanges &&
    index !== appState.currentImageIndex &&
    !appState.images[appState.currentImageIndex]?.checked
  ) {
    const previousIndex = appState.currentImageIndex;

    // Show the checked status modal
    const modal = document.getElementById(
      "checked-status-modal"
    ) as HTMLDialogElement;
    if (modal) {
      modal.dataset.targetIndex = index.toString();
      modal.dataset.previousIndex = previousIndex.toString();
      modal.showModal();
      return; // Don't navigate yet
    }
  }

  // Normal navigation
  performImageNavigation(index);
}

// Perform the actual image navigation
export function performImageNavigation(index: number) {
  appState.currentImageIndex = index;
  deselectAllBoxes();
  closeBoxEditor();
  setHasUnsavedBoxChanges(false);
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
  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  const box = imageData.boxes.find((b) => b.id === boxId);
  if (!box) return;

  // Show confirmation dialog
  if (
    !confirm(
      `Are you sure you want to delete the bounding box "${
        box.data ||
        `Box ${imageData.boxes.findIndex((b) => b.id === boxId) + 1}`
      }"?\n\nThis action cannot be undone.`
    )
  )
    return;

  selectBox(boxId);
  deleteSelectedBox();
  closeBoxEditor();
  updateBoxList();
  renderCanvas(appState);
}

// Apply box edit instantly on any change
export function handleInstantBoxEdit() {
  applyBoxEdit();
  updateBoxList();
  renderCanvas(appState);
}

// Handle OCR recognition for a box
export async function handleBoxOCR(boxId: string) {
  if (appState.currentImageIndex < 0) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  const box = imageData.boxes.find((b) => b.id === boxId);
  if (!box || !currentImage) return;

  // Show loading state
  const ocrBtn = document.querySelector(
    `.ocr-btn[data-box-id="${boxId}"]`
  ) as HTMLButtonElement;
  if (ocrBtn) {
    ocrBtn.disabled = true;
    ocrBtn.textContent = "⏳";
    ocrBtn.title = "Recognizing text...";
  }

  try {
    // Extract the bounding box image
    const imageBlob = await extractBoundingBoxImage(box);
    if (!imageBlob) {
      throw new Error("Failed to extract bounding box image");
    }

    // Send to OCR server
    const ocrResult = await recognizeTextFromImage(imageBlob);

    if (ocrResult) {
      // Update the box data with recognized text and orientation
      box.data = ocrResult.text;
      box.orientation = ocrResult.orientation;
      appState.isModified = true;
      setHasUnsavedBoxChanges(true);

      // Update UI
      updateBoxList();
      renderCanvas(appState);

      // Update box editor if it's currently open for this box
      if (selectedBoxId === boxId) {
        showBoxEditor(boxId);
      }

      // Show success message
      if (ocrBtn) {
        ocrBtn.textContent = "✅";
        ocrBtn.title = "Text recognized successfully!";
        setTimeout(() => {
          ocrBtn.textContent = "🔤";
          ocrBtn.title = "Recognize text with OCR";
        }, 2000);
      }
    } else {
      throw new Error("No text recognized in image");
    }
  } catch (error) {
    console.error("OCR error:", error);
    alert(
      `OCR failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }\n\nMake sure the PaddleOCR server is running`
    );
  } finally {
    // Reset button state
    if (ocrBtn && ocrBtn.textContent !== "✅") {
      ocrBtn.disabled = false;
      ocrBtn.textContent = "🔤";
      ocrBtn.title = "Recognize text with OCR";
    }
  }
}

// Handle manual OCR with orientation selection
export function handleBoxManualOCR(boxId: string) {
  const modal = document.getElementById(
    "orientation-modal"
  ) as HTMLDialogElement;
  if (!modal) return;

  // Store the current boxId for use when orientation is selected
  modal.dataset.boxId = boxId;

  // Show the modal
  modal.showModal();
}

// Handle orientation selection and perform OCR
export async function performManualOCR(
  boxId: string,
  orientation: number | "auto"
) {
  if (appState.currentImageIndex < 0) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  const box = imageData.boxes.find((b) => b.id === boxId);
  if (!box || !currentImage) return;

  // Show loading state
  const manualOcrBtn = document.querySelector(
    `.manual-ocr-btn[data-box-id="${boxId}"]`
  ) as HTMLButtonElement;
  if (manualOcrBtn) {
    manualOcrBtn.disabled = true;
    manualOcrBtn.textContent = "⏳";
    manualOcrBtn.title = "Recognizing text...";
  }

  try {
    // Extract the bounding box image
    const imageBlob = await extractBoundingBoxImage(box);
    if (!imageBlob) {
      throw new Error("Failed to extract bounding box image");
    }

    // Send to OCR server with selected orientation option
    // "auto" means tell server to classify orientation
    // number means tell server to use that specific orientation
    const ocrResult = await recognizeTextFromImage(imageBlob, orientation);

    if (ocrResult) {
      // Update the box data with recognized text and orientation
      box.data = ocrResult.text;
      box.orientation = ocrResult.orientation;
      appState.isModified = true;
      setHasUnsavedBoxChanges(true);

      // Update UI
      updateBoxList();
      renderCanvas(appState);

      // Update box editor if it's currently open for this box
      if (selectedBoxId === boxId) {
        showBoxEditor(boxId);
      }

      // Show success message
      if (manualOcrBtn) {
        manualOcrBtn.textContent = "✅";
        manualOcrBtn.title = "Text recognized successfully!";
        setTimeout(() => {
          manualOcrBtn.textContent = "↻";
          manualOcrBtn.title = "Recognize text with manual orientation";
        }, 2000);
      }
    } else {
      throw new Error("No text recognized in image");
    }
  } catch (error) {
    console.error("Manual OCR error:", error);
    alert(
      `OCR failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }\n\nMake sure the PaddleOCR server is running`
    );
  } finally {
    // Reset button state
    if (manualOcrBtn && manualOcrBtn.textContent !== "✅") {
      manualOcrBtn.disabled = false;
      manualOcrBtn.textContent = "↻";
      manualOcrBtn.title = "Recognize text with manual orientation";
    }
  }
}

// Setup delegated event listeners for dynamically created elements
export function setupDelegatedEventListeners() {
  // Image list click delegation
  document.getElementById("image-list")!.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;

    // Skip checkbox clicks, they're handled by change event
    if (
      target.tagName === "INPUT" &&
      (target as HTMLInputElement).type === "checkbox"
    ) {
      return;
    }

    const item = target.closest(".btn");
    if (item) {
      const index = Array.from(item.parentElement!.children).indexOf(item);
      if (index >= 0) {
        handleImageItemClick(index);
      }
    }
  });

  // Image list checkbox change delegation
  document.getElementById("image-list")!.addEventListener("change", (e) => {
    const target = e.target as HTMLElement;

    // Handle checkbox changes
    if (
      target.tagName === "INPUT" &&
      (target as HTMLInputElement).type === "checkbox"
    ) {
      const checkbox = target as HTMLInputElement;
      const imageIndex = parseInt(checkbox.dataset.imageIndex || "-1", 10);
      if (imageIndex >= 0 && imageIndex < appState.images.length) {
        const image = appState.images[imageIndex];
        if (image) {
          image.checked = checkbox.checked;
          markAsModified();
        }
      }
    }
  });

  // Box list click delegation
  document.getElementById("box-list")!.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;

    // Handle OCR button (must check before btn-primary since OCR button has btn-primary class)
    if (
      target.classList.contains("ocr-btn") ||
      target.textContent === "🔤" ||
      target.textContent === "⏳" ||
      target.textContent === "✅"
    ) {
      e.stopPropagation();
      const boxId = target.getAttribute("data-box-id");
      if (boxId) {
        handleBoxOCR(boxId);
      }
      return;
    }

    // Handle manual OCR button
    if (target.classList.contains("manual-ocr-btn")) {
      e.stopPropagation();
      const boxId = target.getAttribute("data-box-id");
      if (boxId) {
        handleBoxManualOCR(boxId);
      }
      return;
    }

    // Handle edit button
    if (
      target.classList.contains("btn-primary") ||
      target.textContent === "✏️"
    ) {
      e.stopPropagation();
      const card = target.closest(".card");
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
    if (target.classList.contains("btn-error") || target.textContent === "🗑️") {
      e.stopPropagation();
      const card = target.closest(".card");
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
    const card = target.closest(".card");
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

  // Orientation selection modal delegation
  const orientationModal = document.getElementById(
    "orientation-modal"
  ) as HTMLDialogElement;
  if (orientationModal) {
    const recognizeBtn = document.getElementById("recognize-btn");
    if (recognizeBtn) {
      recognizeBtn.addEventListener("click", (e) => {
        e.preventDefault(); // Prevent form submission
        const selectedRadio = orientationModal.querySelector(
          'input[name="orientation"]:checked'
        ) as HTMLInputElement;
        if (selectedRadio) {
          const selectedValue = selectedRadio.value;
          const orientation: number | "auto" =
            selectedValue === "auto" ? "auto" : parseInt(selectedValue, 10);
          const boxId = orientationModal.dataset.boxId;
          if (boxId) {
            performManualOCR(boxId, orientation);
            orientationModal.close();
          }
        }
      });
    }
  }

  // Checked status modal delegation
  const checkedModal = document.getElementById(
    "checked-status-modal"
  ) as HTMLDialogElement;
  if (checkedModal) {
    const yesBtn = document.getElementById("checked-yes-btn");
    const noBtn = document.getElementById("checked-no-btn");

    if (yesBtn) {
      yesBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const previousIndex = parseInt(
          checkedModal.dataset.previousIndex || "-1",
          10
        );
        const targetIndex = parseInt(
          checkedModal.dataset.targetIndex || "-1",
          10
        );

        if (previousIndex >= 0) {
          toggleImageCheckedStatus(previousIndex);
        }

        checkedModal.close();
        if (targetIndex >= 0) {
          performImageNavigation(targetIndex);
        }
      });
    }

    if (noBtn) {
      noBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const targetIndex = parseInt(
          checkedModal.dataset.targetIndex || "-1",
          10
        );

        checkedModal.close();
        if (targetIndex >= 0) {
          performImageNavigation(targetIndex);
        }
      });
    }
  }
}
