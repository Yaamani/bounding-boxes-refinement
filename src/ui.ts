import { appState, selectedBoxId } from './state.js';

// Update UI
export function updateUI() {
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
export function updateImageList() {
  const listContainer = document.getElementById('image-list')!;
  listContainer.innerHTML = '';

  const searchTerm = (document.getElementById('image-search') as HTMLInputElement).value.toLowerCase();

  appState.images.forEach((image, index) => {
    if (searchTerm && !image.fileName.toLowerCase().includes(searchTerm)) {
      return;
    }

    const item = document.createElement('div');
    item.className = 'btn btn-soft justify-start w-full mb-1 h-min text-start wrap-anywhere';
    if (index === appState.currentImageIndex) {
      item.classList.add('btn-active');
    }
    item.textContent = image.fileName;
    item.title = image.fileName;
    // Event listener will be handled by delegation in renderer.ts
    listContainer.appendChild(item);
  });
}

// Update box list
export function updateBoxList() {
  const listContainer = document.getElementById('box-list')!;
  listContainer.innerHTML = '';

  if (appState.currentImageIndex < 0) return;

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  imageData.boxes.forEach((box, index) => {
    const item = document.createElement('div');
    item.className = 'card bg-base-100 shadow-sm mb-2 hover:shadow-md transition-shadow';
    if (box.isSelected) {
      item.classList.add('ring', 'ring-primary');
    }

    const content = document.createElement('div');
    content.className = 'card-body p-3';

    const label = document.createElement('div');
    label.className = 'card-title text-sm';
    label.textContent = box.data || `Box ${index + 1}`;
    label.title = box.data;

    const coord = document.createElement('div');
    coord.className = 'text-xs opacity-70';
    const [x1, y1, x2, y2] = box.coordinate;
    coord.textContent = `(${Math.round(x1)}, ${Math.round(y1)}) - (${Math.round(x2)}, ${Math.round(y2)})`;

    content.appendChild(label);
    content.appendChild(coord);

    const actions = document.createElement('div');
    actions.className = 'card-actions justify-end mt-2';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-xs btn-primary';
    editBtn.textContent = '✏️';
    editBtn.title = 'Edit';
    // Event listener will be handled by delegation in renderer.ts

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-xs btn-error';
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = 'Delete';
    // Event listener will be handled by delegation in renderer.ts

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    content.appendChild(actions);
    item.appendChild(content);

    listContainer.appendChild(item);
  });
}

// Hide welcome screen
export function hideWelcomeScreen() {
  const welcomeScreen = document.getElementById('welcome-screen')!;
  welcomeScreen.style.display = 'none';
}
