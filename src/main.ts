import { app, BrowserWindow, ipcMain, dialog } from "electron";
import * as path from "path";
import * as fs from "fs/promises";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let hasUnsavedChanges = false;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile("index.html");
  mainWindow.webContents.openDevTools(); // For debugging

  // Handle window close event
  mainWindow.on("close", async (e) => {
    if (!hasUnsavedChanges) {
      return; // Allow close if no unsaved changes
    }

    // Prevent the window from closing
    e.preventDefault();

    // Show confirmation dialog
    const choice = await dialog.showMessageBox(mainWindow!, {
      type: "question",
      buttons: ["Save", "Don't Save", "Cancel"],
      defaultId: 0,
      cancelId: 2,
      title: "Unsaved Changes",
      message: "Do you want to save the changes you made?",
      detail: "Your changes will be lost if you don't save them.",
    });

    if (choice.response === 0) {
      // User chose to save
      // Request the renderer to save
      mainWindow!.webContents.send("save-before-close");
    } else if (choice.response === 1) {
      // User chose not to save
      hasUnsavedChanges = false;
      mainWindow!.destroy();
    }
    // If choice.response === 2, do nothing (cancel close)
  });
};

app.whenReady().then(() => {
  createWindow();
  setupIpcHandlers();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function setupIpcHandlers() {
  // Select image folder
  ipcMain.handle("select-image-folder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // Select JSON folders (multiple)
  ipcMain.handle("select-json-folders", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "multiSelections"],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths;
    }
    return null;
  });

  // Select save file location
  ipcMain.handle("select-save-file", async () => {
    const result = await dialog.showSaveDialog({
      filters: [{ name: "JSON Files", extensions: ["json"] }],
      defaultPath: "annotations.json",
    });
    if (!result.canceled && result.filePath) {
      return result.filePath;
    }
    return null;
  });

  // Select open file
  ipcMain.handle("select-open-file", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "JSON Files", extensions: ["json"] }],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // Read directory contents
  ipcMain.handle("read-directory", async (event, dirPath: string) => {
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      return files.filter((file) => file.isFile()).map((file) => file.name);
    } catch (error) {
      console.error("Error reading directory:", error);
      return [];
    }
  });

  // Read file
  ipcMain.handle("read-file", async (event, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return content;
    } catch (error) {
      console.error("Error reading file:", error);
      throw error;
    }
  });

  // Write file
  ipcMain.handle(
    "write-file",
    async (event, filePath: string, content: string) => {
      try {
        await fs.writeFile(filePath, content, "utf-8");
        return true;
      } catch (error) {
        console.error("Error writing file:", error);
        throw error;
      }
    }
  );

  // Get file path join
  ipcMain.handle("path-join", async (event, ...paths: string[]) => {
    return path.join(...paths);
  });

  // Get file path resolve
  ipcMain.handle("path-resolve", async (event, ...paths: string[]) => {
    return path.resolve(...paths);
  });

  // Get directory name
  ipcMain.handle("path-dirname", async (event, filePath: string) => {
    return path.dirname(filePath);
  });

  // Set unsaved changes flag
  ipcMain.handle("set-unsaved-changes", async (event, hasChanges: boolean) => {
    hasUnsavedChanges = hasChanges;
    return true;
  });

  // Notify that save is complete and window can close
  ipcMain.handle("save-complete-close", async () => {
    hasUnsavedChanges = false;
    if (mainWindow) {
      mainWindow.destroy();
    }
    return true;
  });
}
