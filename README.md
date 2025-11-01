# OCR Bounding Box Refinement Tool

A desktop application built with Electron for refining and editing bounding boxes from OCR pipeline outputs.

## Features

- **Multiple Input Formats**: Supports two JSON input formats
  - Format 1: OCR with polygons (`rec_texts` and `rec_polys`)
  - Format 2: Boxes with labels (`boxes` with `label` and `coordinate`)
  
- **Visual Canvas Editor**:
  - Draw new bounding boxes
  - Move existing boxes by dragging
  - Resize boxes using corner handles
  - Zoom in/out and pan around images
  
- **Image Management**:
  - Browse through multiple images
  - Search/filter images by name
  - Navigate with keyboard shortcuts (Arrow keys)
  
- **Box Editing**:
  - Edit box labels/data
  - Manually adjust coordinates
  - Delete unwanted boxes
  - View all boxes for current image

- **Project Management**:
  - Create new projects from image and JSON folders
  - Open previously saved projects
  - Save and Save As functionality
  - Track modification state

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the TypeScript files:
   ```bash
   npm run build
   ```

3. Start the application:
   ```bash
   npm start
   ```

## Development

Run in development mode with auto-rebuild:
```bash
npm run dev
```

Or use separate terminals for watching and running:
```bash
npm run build:watch  # Terminal 1
npm start            # Terminal 2
```

## Usage

### Creating a New Project

1. Click "New Project" on the welcome screen
2. Select the folder containing your images
3. Select one or more folders containing JSON files with bounding box data
4. The app will load all images and their corresponding bounding boxes

### Opening an Existing Project

1. Click "Open Project" on the welcome screen
2. Select a previously saved `.json` project file
3. The app will load all images and boxes from the project

### Canvas Controls

- **Select Mode** (🎯): Click and drag boxes to move them, click handles to resize
- **Pan Mode** (✋): Click and drag to pan around the image
- **Draw Mode** (➕): Click and drag to draw a new bounding box
- **Zoom**: Use zoom buttons or mouse wheel to zoom in/out
- **Fit to Screen**: Automatically scale image to fit the canvas

### Editing Boxes

1. Click on a box in the canvas or box list to select it
2. The box editor panel will appear on the right
3. Edit the label/data text
4. Adjust coordinates if needed
5. Click "Apply" to save changes
6. Or use the delete button to remove the box

### Keyboard Shortcuts

- **Ctrl/Cmd + S**: Save project
- **Delete**: Delete selected box
- **Escape**: Deselect box or exit draw mode
- **Arrow Left/Right**: Navigate between images

### Saving Your Work

- **Save**: Saves to the current project file
- **Save As**: Choose a new location and filename

The saved file format:
```json
[
  {
    "image_path": "image1.jpg",
    "polygons": [
      {
        "data": "Label or text",
        "coordinate": [x1, y1, x2, y2]
      }
    ]
  }
]
```

## Input JSON Formats

### Format 1: OCR with Polygons
```json
{
  "input_path": "path/to/image.jpg",
  "rec_texts": ["text1", "text2"],
  "rec_polys": [
    [[x1, y1], [x2, y2], [x3, y3], [x4, y4]],
    [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
  ]
}
```

### Format 2: Boxes with Labels
```json
{
  "input_path": "path/to/image.jpg",
  "boxes": [
    {
      "label": "Label text",
      "coordinate": [x1, y1, x2, y2]
    }
  ]
}
```

## Project Structure

```
bounding-boxes-refinement/
├── src/
│   ├── main.ts          # Electron main process
│   ├── preload.ts       # Preload script for IPC
│   ├── renderer.ts      # Renderer process logic
│   └── types.ts         # TypeScript type definitions
├── build/               # Compiled JavaScript output
├── index.html           # Main HTML file
├── styles.css           # Application styles
├── package.json         # Node.js dependencies
└── tsconfig.json        # TypeScript configuration
```

## License

ISC
