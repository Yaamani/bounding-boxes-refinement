import type {
  BoundingBox,
  InputFormat1,
  InputFormat2,
  SaveFileFormat,
} from "./types.js";
import {
  appState,
  generateId,
  setCurrentImage,
  clearModified,
} from "./state.js";
import { renderCanvas, resizeCanvasToContainer } from "./canvas.js";
import { deselectAllBoxes, closeBoxEditor } from "./boxes.js";
import { updateUI, hideWelcomeScreen, showAlert } from "./ui.js";

// Handle new project
export async function handleNewProject() {
  console.log("handleNewProject invoked");
  const imageFolder = await window.electronAPI.selectImageFolder();
  console.log("selected image folder:", imageFolder);
  if (!imageFolder) return;

  const jsonFolders = await window.electronAPI.selectJsonFolders();
  if (!jsonFolders || jsonFolders.length === 0) return;

  appState.imageFolder = imageFolder;
  appState.jsonFolders = jsonFolders;
  appState.currentSaveFile = null;
  clearModified();

  await loadProject();
  hideWelcomeScreen();
  updateUI();

  if (appState.currentImageIndex >= 0) {
    await loadCurrentImage(() => {
      resizeCanvasToContainer();
      renderCanvas(appState);
    });
  }
}

// Handle open existing project
export async function handleOpenProject() {
  const filePath = await window.electronAPI.selectOpenFile();
  if (!filePath) return;

  try {
    await loadProjectFromFile(filePath);
    hideWelcomeScreen();
    updateUI();

    if (appState.currentImageIndex >= 0) {
      await loadCurrentImage(() => {
        resizeCanvasToContainer();
        renderCanvas(appState);
      });
    }
  } catch (error) {
    console.error("Error opening project:", error);
    await showAlert("Failed to open project file.", "Open Error");
  }
}

// Handle save
export async function handleSave() {
  if (appState.currentSaveFile) {
    await saveToFile(appState.currentSaveFile);
  } else {
    await handleSaveAs();
  }
  updateUI();
}

// Handle save as
export async function handleSaveAs() {
  const filePath = await window.electronAPI.selectSaveFile();
  if (!filePath) return;

  await saveToFile(filePath);
  appState.currentSaveFile = filePath;
  updateUI();
}

// Load project data from folders
export async function loadProject() {
  if (!appState.imageFolder || !appState.jsonFolders) return;

  appState.images = [];

  // Read all image files
  const imageFiles = await window.electronAPI.readDirectory(
    appState.imageFolder
  );
  const imageExtensions = [".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp"];
  const validImages = imageFiles.filter((file) =>
    imageExtensions.some((ext) => file.toLowerCase().endsWith(ext))
  );

  // Create a map to store boxes for each image
  const imageBoxMap = new Map<string, BoundingBox[]>();

  // Read all JSON files from all folders
  for (const jsonFolder of appState.jsonFolders) {
    const jsonFiles = await window.electronAPI.readDirectory(jsonFolder);
    const validJsonFiles = jsonFiles.filter((file) =>
      file.toLowerCase().endsWith(".json")
    );

    for (const jsonFile of validJsonFiles) {
      try {
        const jsonPath = await window.electronAPI.pathJoin(
          jsonFolder,
          jsonFile
        );
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
    const fullPath = await window.electronAPI.pathJoin(
      appState.imageFolder,
      imageFile
    );
    appState.images.push({
      path: fullPath,
      fileName: imageFile,
      boxes: imageBoxMap.get(imageFile) || [],
      checked: false,
    });
  }

  appState.currentImageIndex = appState.images.length > 0 ? 0 : -1;
}

// Parse JSON format and extract bounding boxes
function parseJsonFormat(data: any): BoundingBox[] {
  const boxes: BoundingBox[] = [];

  // Check for Format 1 (rec_texts and rec_polys)
  if (
    data.rec_texts &&
    data.rec_polys &&
    Array.isArray(data.rec_texts) &&
    Array.isArray(data.rec_polys)
  ) {
    const format1 = data as InputFormat1;
    for (let i = 0; i < format1.rec_texts.length; i++) {
      if (i < format1.rec_polys.length) {
        const poly = format1.rec_polys[i];
        if (poly) {
          const bbox = polygonToBoundingBox(poly);
          // const bbox = polygonToBoundingBoxSimple(poly);
          const text = format1.rec_texts[i];
          // Extract orientation angle, default to 0 if not available
          const orientation =
            data.textline_orientation_angles &&
            i < data.textline_orientation_angles.length
              ? data.textline_orientation_angles[i]
              : 0;
          boxes.push({
            id: generateId(),
            data: text || "",
            coordinate: bbox,
            orientation: orientation,
            isSelected: false,
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
          data: box.label || "",
          coordinate: box.coordinate,
          orientation: 0, // Format 2 doesn't have orientation, default to 0
          isSelected: false,
        });
      }
    }
  }

  return boxes;
}

// Get the first 4 coordinates of a polygon as bounding box
function polygonToBoundingBoxSimple(
  poly: [number, number][]
): [number, number, number, number] {
  if (poly.length < 2) return [0, 0, 0, 0];
  const x1 = poly[0]![0];
  const y1 = poly[0]![1];
  const x2 = poly[1]![0];
  const y2 = poly[1]![1];
  return [x1, y1, x2, y2];
}

// Convert polygon to bounding box
function polygonToBoundingBox(
  poly: [number, number][]
): [number, number, number, number] {
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

// Load current image
export async function loadCurrentImage(onLoad: () => void) {
  if (
    appState.currentImageIndex < 0 ||
    appState.currentImageIndex >= appState.images.length
  ) {
    return;
  }

  const imageData = appState.images[appState.currentImageIndex];
  if (!imageData) return;

  const img = new Image();

  img.onload = () => {
    setCurrentImage(img);
    onLoad();
  };

  img.onerror = () => {
    console.error("Failed to load image:", imageData.path);
    showAlert(
      "Failed to load image: " + imageData.fileName,
      "Image Load Error"
    );
  };

  // Convert file path to file:// URL for loading
  img.src = "file:///" + imageData.path.replace(/\\/g, "/");
}

// Load project from save file
export async function loadProjectFromFile(filePath: string): Promise<void> {
  const content = await window.electronAPI.readFile(filePath);
  const saveData: SaveFileFormat[] = JSON.parse(content);

  // Get the base directory from the save file
  const baseDir = await window.electronAPI.pathDirname(filePath);

  // Convert save format to internal format
  appState.images = [];
  for (const item of saveData) {
    const fullImagePath = await window.electronAPI.pathJoin(
      baseDir,
      item.image_path
    );
    const fileName = item.image_path.split(/[\\/]/).pop() || item.image_path;

    const boxes: BoundingBox[] = item.polygons.map((poly, idx) => ({
      id: generateId(),
      data: poly.data,
      coordinate: poly.coordinate,
      orientation: poly.orientation || 0,
      isSelected: false,
    }));

    appState.images.push({
      path: fullImagePath,
      fileName: fileName,
      boxes: boxes,
      checked: item.checked || false,
    });
  }

  appState.imageFolder = baseDir;
  appState.jsonFolders = null;
  appState.currentSaveFile = filePath;
  appState.currentImageIndex = appState.images.length > 0 ? 0 : -1;
  clearModified();
}

// Save to file
export async function saveToFile(filePath: string) {
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
      checked: image.checked,
      polygons: image.boxes.map((box) => ({
        data: box.data,
        coordinate: box.coordinate,
        orientation: box.orientation,
      })),
    });
  }

  const content = JSON.stringify(saveData, null, 2);
  await window.electronAPI.writeFile(filePath, content);

  clearModified();
  console.log("Project saved successfully");
}
