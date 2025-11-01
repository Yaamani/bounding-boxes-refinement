# Test Data

This folder contains sample data to test the application.

## Structure

- `images/` - Place your test images here (jpg, png, etc.)
- `json-format1/` - Contains sample JSON files in Format 1 (rec_texts and rec_polys)
- `json-format2/` - Contains sample JSON files in Format 2 (boxes with labels)

## Testing the App

1. Add some test images to the `images/` folder
2. Make sure the JSON files have matching `input_path` values
3. In the app, select:
   - Image folder: `test-data/images`
   - JSON folder: `test-data/json-format1` or `test-data/json-format2`

## Sample JSON Formats

### Format 1 (sample1.json)
Uses OCR-style polygons that get converted to bounding boxes.

### Format 2 (sample2.json)
Uses direct bounding box coordinates with labels.
