# Quick Start Guide

## First Time Setup

1. **Install dependencies**:
   ```powershell
   npm install
   ```

2. **Build the project**:
   ```powershell
   npm run build
   ```

3. **Run the application**:
   ```powershell
   npm start
   ```

## Workflow

### Starting a New Project

1. Launch the app
2. Click "New Project"
3. Select your images folder (containing .jpg, .png, etc.)
4. Select your JSON folders (can select multiple with Ctrl+Click)
5. Wait for images and boxes to load

### Working with the Canvas

**Toolbar Modes:**
- 🔍+ / 🔍- : Zoom in/out
- ⬜ : Fit image to screen
- ✋ : Pan mode (drag to move around)
- 🎯 : Select mode (default - click to select boxes)
- ➕ : Draw mode (drag to create new box)
- 🗑️ : Delete selected box

**Mouse Controls:**
- **Select Mode**: Click box to select, drag to move, drag handles to resize
- **Pan Mode**: Click and drag anywhere to pan
- **Draw Mode**: Click and drag to draw a new bounding box
- **Scroll Wheel**: Zoom in/out

### Editing Boxes

1. Click a box (canvas or list) to select it
2. Edit panel appears on the right
3. Change the data/label text
4. Adjust coordinates if needed
5. Click "Apply" to save

### Saving Your Work

- **Save (Ctrl+S)**: Quick save to current file
- **Save As**: Save to a new location

The output is a JSON file you can reopen later or use in your pipeline.

## Tips

- Use arrow keys (←/→) to quickly navigate between images
- Press Escape to deselect or cancel drawing
- Search images by name in the left panel
- The app tracks unsaved changes (shows "modified" in status)
- All coordinates are preserved exactly as drawn

## Troubleshooting

**Images not loading?**
- Check that image paths are correct
- Ensure images are in common formats (.jpg, .png, .bmp, .gif, .webp)

**Boxes not appearing?**
- Verify JSON files match one of the two supported formats
- Check that `input_path` in JSON matches your image filenames

**App won't start?**
- Make sure you ran `npm run build` first
- Check that all dependencies are installed (`npm install`)

## Development Mode

For development with auto-reload:

```powershell
# Terminal 1 - Watch for changes
npm run build:watch

# Terminal 2 - Run Electron
npm start
```

After code changes, just restart the app to see updates.
