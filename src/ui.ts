import {
  appState,
  selectedBoxId,
  getSelectedBoxIds,
  isBoxSelected,
} from "./state.js";

// Update UI
export function updateUI() {
  const hasProject = appState.images.length > 0;

  // Update menu buttons
  (document.getElementById("save-btn") as HTMLButtonElement).disabled =
    !hasProject;
  (document.getElementById("save-as-btn") as HTMLButtonElement).disabled =
    !hasProject;

  // Update project status
  const statusText = hasProject
    ? `${appState.images.length} images${
        appState.isModified ? " (modified)" : ""
      }`
    : "No project loaded";
  document.getElementById("project-status")!.textContent = statusText;

  // Update lists
  updateImageList();
  updateBoxList();
}

// Update image list
export function updateImageList() {
  const listContainer = document.getElementById("image-list")!;
  listContainer.innerHTML = "";

  const searchTerm = (
    document.getElementById("image-search") as HTMLInputElement
  ).value.toLowerCase();

  appState.images.forEach((image, index) => {
    if (searchTerm && !image.fileName.toLowerCase().includes(searchTerm)) {
      return;
    }

    const item = document.createElement("div");
    item.className =
      "btn btn-soft justify-start w-full mb-1 h-min text-start wrap-anywhere";
    item.id = `image-${index}`;
    if (index === appState.currentImageIndex) {
      item.classList.add("btn-active");
    }

    // Create a container for the checkbox and filename
    const container = document.createElement("div");
    container.className = "flex items-center gap-2 w-full";

    // Add checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "checkbox checkbox-sm";
    checkbox.checked = image.checked;
    checkbox.onclick = (e) => {
      e.stopPropagation();
    };
    checkbox.dataset.imageIndex = index.toString();

    // Add filename
    const filename = document.createElement("span");
    filename.textContent = image.fileName;
    filename.title = image.fileName;
    filename.className = "flex-1";

    container.appendChild(checkbox);
    container.appendChild(filename);
    item.appendChild(container);

    // Event listener will be handled by delegation in renderer.ts
    listContainer.appendChild(item);
  });

  // Scroll to current image if exists
  const currentImageItem = document.getElementById(
    `image-${appState.currentImageIndex}`
  );
  if (currentImageItem) {
    currentImageItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

// Update box list
export function updateBoxList() {
  const listContainer = document.getElementById("box-list")!;
  listContainer.innerHTML = "";

  if (appState.currentImageIndex < 0) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  imageData.boxes.forEach((box, index) => {
    const item = document.createElement("div");
    item.className =
      "card bg-base-100 shadow-sm mb-2 hover:shadow-md transition-shadow";
    item.id = `box-${box.id}`;

    // Highlight if box is selected (supports multi-selection)
    if (isBoxSelected(box.id)) {
      item.classList.add("ring", "ring-primary");
    }

    const content = document.createElement("div");
    content.className = "card-body p-3";

    const label = document.createElement("div");
    label.className = "card-title text-sm";
    label.textContent = box.data || `Box ${index + 1}`;
    label.title = box.data;

    const coord = document.createElement("div");
    coord.className = "text-xs opacity-70";
    const [x1, y1, x2, y2] = box.coordinate;
    coord.textContent = `(${Math.round(x1)}, ${Math.round(y1)}) - (${Math.round(
      x2
    )}, ${Math.round(y2)})`;

    const orientation = document.createElement("div");
    orientation.className = "text-xs opacity-70";
    orientation.textContent = `Orientation: ${box.orientation}°`;

    content.appendChild(label);
    content.appendChild(coord);
    content.appendChild(orientation);

    const actionsTop = document.createElement("div");
    actionsTop.className = "flex items-center justify-between mt-3";

    const actionsTopLabel = document.createElement("div");
    actionsTopLabel.className = "text-xs font-semibold opacity-70";
    actionsTopLabel.textContent = "Manage";

    const actionsTopButtons = document.createElement("div");
    actionsTopButtons.className = "card-actions justify-end";

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-xs btn-primary";
    editBtn.textContent = "✏️";
    editBtn.title = "Edit";
    // Event listener will be handled by delegation in renderer.ts

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-xs btn-error";
    deleteBtn.textContent = "🗑️";
    deleteBtn.title = "Delete";
    // Event listener will be handled by delegation in renderer.ts

    actionsTopButtons.appendChild(editBtn);
    actionsTopButtons.appendChild(deleteBtn);

    actionsTop.appendChild(actionsTopLabel);
    actionsTop.appendChild(actionsTopButtons);

    const actionsBottom = document.createElement("div");
    actionsBottom.className = "flex items-center justify-between mt-2";

    const actionsBottomLabel = document.createElement("div");
    actionsBottomLabel.className = "text-xs font-semibold opacity-70";
    actionsBottomLabel.textContent = "OCR";

    const actionsBottomButtons = document.createElement("div");
    actionsBottomButtons.className = "card-actions justify-end";

    const ocrBtn = document.createElement("button");
    ocrBtn.className = "btn btn-xs btn-primary ocr-btn";
    ocrBtn.setAttribute("data-box-id", box.id);
    ocrBtn.textContent = "🔤";
    ocrBtn.title = "Recognize text with OCR";
    // Event listener will be handled by delegation in renderer.ts

    const manualOcrBtn = document.createElement("button");
    manualOcrBtn.className = "btn btn-xs btn-secondary manual-ocr-btn";
    manualOcrBtn.setAttribute("data-box-id", box.id);
    manualOcrBtn.textContent = "🔤🔧";
    manualOcrBtn.title = "Recognize text with manual orientation";
    // Event listener will be handled by delegation in renderer.ts

    actionsBottomButtons.appendChild(ocrBtn);
    actionsBottomButtons.appendChild(manualOcrBtn);

    actionsBottom.appendChild(actionsBottomLabel);
    actionsBottom.appendChild(actionsBottomButtons);

    content.appendChild(actionsTop);
    content.appendChild(actionsBottom);
    item.appendChild(content);

    listContainer.appendChild(item);
  });

  // Scroll to selected box if exists
  const selectedIds = getSelectedBoxIds();
  if (selectedIds.length > 0) {
    const firstSelectedItem = document.getElementById(`box-${selectedIds[0]}`);
    if (firstSelectedItem) {
      firstSelectedItem.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }
}

// Update editor panel to show single or multi-box editor
export function updateEditorPanel() {
  const selectedIds = getSelectedBoxIds();
  const boxEditor = document.getElementById("box-editor")!;
  const multiBoxEditor = document.getElementById("multi-box-editor")!;

  if (selectedIds.length === 0) {
    // No selection - hide both editors
    boxEditor.style.display = "none";
    multiBoxEditor.style.display = "none";
  } else if (selectedIds.length === 1) {
    // Single selection - show single box editor
    boxEditor.style.display = "block";
    multiBoxEditor.style.display = "none";
  } else {
    // Multi selection - show multi-box editor
    boxEditor.style.display = "none";
    multiBoxEditor.style.display = "block";

    // Update count display
    const countElement = document.getElementById("multi-box-count")!;
    countElement.textContent = selectedIds.length.toString();
  }
}

// Hide welcome screen
export function hideWelcomeScreen() {
  const welcomeScreen = document.getElementById("welcome-screen")!;
  welcomeScreen.style.display = "none";
}

// Show confirmation modal
export function showConfirmationModal(
  title: string,
  message: string,
  confirmationButton: { label: string; class: string }
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    // Create modal dialog element
    const modal = document.createElement("dialog");
    modal.className = "modal";
    modal.id = "dynamic-confirmation-modal";

    // Create modal box
    const modalBox = document.createElement("div");
    modalBox.className = "modal-box";

    // Create title
    const titleElement = document.createElement("h3");
    titleElement.className = "font-bold text-lg mb-4";
    titleElement.textContent = title;

    // Create message
    const messageElement = document.createElement("p");
    messageElement.className = "py-2";
    messageElement.textContent = message;

    // Create modal action container
    const modalAction = document.createElement("div");
    modalAction.className = "modal-action";

    // Create form for buttons
    const form = document.createElement("form");
    form.method = "dialog";

    // Create cancel button
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
      cleanup();
      resolve(false);
    });

    // Create confirmation button
    const confirmBtn = document.createElement("button");
    confirmBtn.className = confirmationButton.class;
    confirmBtn.textContent = confirmationButton.label;
    confirmBtn.addEventListener("click", () => {
      cleanup();
      resolve(true);
    });

    // Create backdrop form
    const backdropForm = document.createElement("form");
    backdropForm.method = "dialog";
    backdropForm.className = "modal-backdrop";

    const backdropBtn = document.createElement("button");
    backdropBtn.textContent = "Close";
    backdropBtn.addEventListener("click", () => {
      cleanup();
      resolve(false);
    });

    // Assemble the modal
    backdropForm.appendChild(backdropBtn);
    form.appendChild(cancelBtn);
    form.appendChild(confirmBtn);
    modalAction.appendChild(form);
    modalBox.appendChild(titleElement);
    modalBox.appendChild(messageElement);
    modalBox.appendChild(modalAction);
    modal.appendChild(modalBox);
    modal.appendChild(backdropForm);

    // Add modal to body
    document.body.appendChild(modal);

    // Cleanup function
    const cleanup = () => {
      modal.close();
      setTimeout(() => {
        document.body.removeChild(modal);
      }, 100);
    };

    // Show modal
    modal.showModal();
  });
}

// Show alert modal
export function showAlert(
  message: string,
  title: string = "Alert"
): Promise<void> {
  return new Promise<void>((resolve) => {
    // Create modal dialog element
    const modal = document.createElement("dialog");
    modal.className = "modal";
    modal.id = "dynamic-alert-modal";

    // Create modal box
    const modalBox = document.createElement("div");
    modalBox.className = "modal-box";

    // Create title
    const titleElement = document.createElement("h3");
    titleElement.className = "font-bold text-lg mb-4";
    titleElement.textContent = title;

    // Create message with support for newlines
    const messageElement = document.createElement("p");
    messageElement.className = "py-2 whitespace-pre-wrap";
    messageElement.textContent = message;

    // Create modal action container
    const modalAction = document.createElement("div");
    modalAction.className = "modal-action";

    // Create form for buttons
    const form = document.createElement("form");
    form.method = "dialog";

    // Create OK button
    const okBtn = document.createElement("button");
    okBtn.className = "btn btn-primary";
    okBtn.textContent = "OK";
    okBtn.addEventListener("click", () => {
      cleanup();
      resolve();
    });

    // Create backdrop form
    const backdropForm = document.createElement("form");
    backdropForm.method = "dialog";
    backdropForm.className = "modal-backdrop";

    const backdropBtn = document.createElement("button");
    backdropBtn.textContent = "Close";
    backdropBtn.addEventListener("click", () => {
      cleanup();
      resolve();
    });

    // Assemble the modal
    backdropForm.appendChild(backdropBtn);
    form.appendChild(okBtn);
    modalAction.appendChild(form);
    modalBox.appendChild(titleElement);
    modalBox.appendChild(messageElement);
    modalBox.appendChild(modalAction);
    modal.appendChild(modalBox);
    modal.appendChild(backdropForm);

    // Add modal to body
    document.body.appendChild(modal);

    // Cleanup function
    const cleanup = () => {
      modal.close();
      setTimeout(() => {
        document.body.removeChild(modal);
      }, 100);
    };

    // Show modal
    modal.showModal();
  });
}
