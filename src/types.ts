// Input JSON Format 1 - OCR with polygons
export interface InputFormat1 {
  input_path: string;
  rec_texts: string[];
  rec_polys: [number, number][][];
}

// Input JSON Format 2 - Boxes with labels
export interface InputFormat2 {
  input_path: string;
  boxes: {
    label: string;
    coordinate: [number, number, number, number];
  }[];
}

// Save file format - normalized format
export interface SaveFileFormat {
  image_path: string;
  checked?: boolean;
  polygons: {
    data: string;
    coordinate: [number, number, number, number];
    orientation: number;
  }[];
}

// Internal representation for a bounding box
export interface BoundingBox {
  id: string;
  data: string;
  coordinate: [number, number, number, number]; // [x1, y1, x2, y2]
  orientation: number; // Orientation angle in degrees (0-360)
  isSelected: boolean;
}

// Image data with its bounding boxes
export interface ImageData {
  path: string;
  fileName: string;
  boxes: BoundingBox[];
  checked: boolean;
}

// Application state
export interface AppState {
  imageFolder: string | null;
  jsonFolders: string[] | null;
  images: ImageData[];
  currentImageIndex: number;
  currentSaveFile: string | null;
  isModified: boolean;
}

// Electron API interface
export interface ElectronAPI {
  selectImageFolder: () => Promise<string | null>;
  selectJsonFolders: () => Promise<string[] | null>;
  selectSaveFile: () => Promise<string | null>;
  selectOpenFile: () => Promise<string | null>;
  readDirectory: (dirPath: string) => Promise<string[]>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  pathJoin: (...paths: string[]) => Promise<string>;
  pathResolve: (...paths: string[]) => Promise<string>;
  pathDirname: (filePath: string) => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
