const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const app = express();
const port = 5000;

// Configure multer to handle file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'csv')); // Save files to the 'csv' directory
    },
    filename: (req, file, cb) => {
        // Save file with the original name
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies

app.post('/upload-csv', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    console.log('Received file:', req.file); // Debugging line

    // Read the file to confirm its content
    fs.readFile(req.file.path, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).json({ success: false, message: 'Error reading file' });
        }
        console.log('File content:', data); // Log file content to ensure it's correct
    });

    res.json({ success: true, message: 'File successfully uploaded', filename: req.file.originalname });
});

app.post('/save-csv', (req, res) => {
    console.log('Received request at /save-csv');
    const { csvData } = req.body;

    if (!csvData) {
        return res.status(400).send('No CSV data provided.');
    }

    const filePath = path.join(__dirname, 'csv', 'locations.csv');
    
    fs.writeFile(filePath, csvData, 'utf8', (err) => {
        if (err) {
            console.error('Error saving CSV:', err);
            return res.status(500).send('Failed to save CSV.');
        }
        res.send('CSV data saved successfully to locations.csv');
    });
});


app.listen(port, () => {
    console.log(`Server running at http://127.0.0.1:${port}`);
});
