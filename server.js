const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const compression = require('compression');
const NodeCache = require('node-cache'); // Tambahkan ini
const Papa = require('papaparse');


const app = express();
const port = 5000;

// Konfigurasi cache
const cache = new NodeCache({ stdTTL: 100, checkperiod: 120 }); // Tambahkan ini

// Konfigurasi koneksi MySQL
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ahploc'
});

connection.connect(err => {
    if (err) throw err;
    console.log('Connected to the database');
});

// Konfigurasi multer untuk menangani unggahan file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'csv')); // Simpan file di direktori 'csv'
    },
    filename: (req, file, cb) => {
        // Simpan file dengan nama asli
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

app.use(cors()); // Aktifkan Cross-Origin Resource Sharing (CORS) untuk semua rute
app.use(compression());
app.use(express.json()); // Parsing body JSON
// Middleware
app.use(bodyParser.json()); // Untuk menangani JSON request

// Middleware untuk cek cache
const checkCache = (req, res, next) => {
    const key = req.originalUrl;
    const cachedData = cache.get(key);

    if (cachedData) {
        return res.json(cachedData);
    } else {
        next();
    }
};

// Rute untuk unggah CSV
app.post('/upload-csv', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    console.log('Received file:', req.file);

    // Baca file untuk memastikan kontennya
    fs.readFile(req.file.path, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).json({ success: false, message: 'Error reading file' });
        }
        console.log('File content:', data);
    });

    res.json({ success: true, message: 'File successfully uploaded', filename: req.file.originalname });
});

// Rute untuk menyimpan CSV
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

// Rute untuk mendapatkan kriteria dan bobotnya
app.get('/kriteria', checkCache, (req, res) => {
    connection.query('SELECT * FROM kriteria', (err, results) => {
        if (err) throw err;
        cache.set(req.originalUrl, results); // Simpan hasil query di cache
        res.json(results);
    });
});

// Rute untuk mendapatkan sub-kriteria dan bobotnya
app.get('/sub-kriteria', checkCache, (req, res) => {
    const sql = `
        SELECT kriteria.kriteria, sub_kriteria.sub_kriteria, sub_kriteria.bobot
        FROM sub_kriteria
        JOIN kriteria ON sub_kriteria.kriteria_id = kriteria.id;    
    `;
    connection.query(sql, (err, results) => {
        if (err) {
            return res.status(500).send(err);
        }
        cache.set(req.originalUrl, results); // Simpan hasil query di cache
        res.json(results);
    });
});

app.get('/locations', checkCache, (req, res) => {
    connection.query('SELECT * FROM lokasi', (error, results) => {
        if (error) throw error;
        cache.set(req.originalUrl, results); // Simpan hasil query di cache
        res.json(results);
    });
});

// Fungsi untuk menyimpan lokasi ke database
app.post('/save-location', (req, res) => {
    const location = req.body;

    const query = `
    INSERT INTO lokasi (
        \`nama\`,
        \`transportasi-umum\`,
        \`kemudahan-akses-jalan\`,
        \`kedekatan-dengan-pusat-kota\`,
        \`biaya-tanah\`,
        \`biaya-operasional\`,
        \`biaya-perawatan\`,
        \`keamanan\`,
        \`kebersihan\`,
        \`kenyamanan\`,
        \`total-weight\`
    ) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

    const values = [
        location.nama,
        location.transportasi_umum,
        location.kemudahan_akses_jalan,
        location.kedekatan_pusat_kota,
        location.biaya_tanah,
        location.biaya_operasional,
        location.biaya_perawatan,
        location.keamanan,
        location.kebersihan,
        location.kenyamanan,
        location.total_weight
    ];

    connection.query(query, values, (error, results) => {
        if (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Error saving location to database' });
        } else {
            // Hapus cache terkait dengan data lokasi setelah ada perubahan
            cache.del('/locations');
            res.status(200).json({ message: 'Location saved successfully', locationId: results.insertId });
        }
    });
});

// Rute untuk mendapatkan detail lokasi berdasarkan ID
app.get('/locations/:id', checkCache, (req, res) => {
    const locationId = req.params.id;
    connection.query('SELECT * FROM lokasi WHERE id = ?', [locationId], (error, results) => {
        if (error) return res.status(500).send(error);
        if (results.length === 0) return res.status(404).json({ message: 'Location not found' });
        cache.set(req.originalUrl, results[0]); // Simpan hasil query di cache
        res.json(results[0]);
    });
});

// Rute untuk menghapus lokasi berdasarkan ID
app.delete('/locations/:id', (req, res) => {
    const locationId = req.params.id;

    const query = 'DELETE FROM lokasi WHERE id = ?';
    connection.query(query, [locationId], (error, results) => {
        if (error) {
            console.error('Error deleting location:', error);
            return res.status(500).json({ success: false, message: 'Error deleting location' });
        }
        
        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Location not found' });
        }

        // Hapus cache terkait dengan data lokasi setelah ada perubahan
        cache.del('/locations');
        res.json({ success: true });
    });
});

// Rute untuk memperbarui lokasi
app.put('/locations/:id', (req, res) => {
    const locationId = req.params.id;
    const updatedLocation = req.body;

    const query = `
        UPDATE lokasi
        SET
            \`transportasi-umum\` = ?,
            \`kemudahan-akses-jalan\` = ?,
            \`kedekatan-dengan-pusat-kota\` = ?,
            \`biaya-tanah\` = ?,
            \`biaya-operasional\` = ?,
            \`biaya-perawatan\` = ?,
            \`keamanan\` = ?,
            \`kebersihan\` = ?,
            \`kenyamanan\` = ?,
            \`total-weight\` = ?
        WHERE id = ?
    `;

    const values = [
        updatedLocation['transportasi-umum'],
        updatedLocation['kemudahan-akses-jalan'],
        updatedLocation['kedekatan-dengan-pusat-kota'],
        updatedLocation['biaya-tanah'],
        updatedLocation['biaya-operasional'],
        updatedLocation['biaya-perawatan'],
        updatedLocation['keamanan'],
        updatedLocation['kebersihan'],
        updatedLocation['kenyamanan'],
        updatedLocation['total-weight'],
        locationId
    ];

    connection.query(query, values, (error, results) => {
        if (error) {
            console.error('Error:', error);
            res.status(500).json({ message: 'Error updating location in database' });
        } else {
            // Hapus cache terkait dengan data lokasi setelah ada perubahan
            cache.del('/locations');
            res.status(200).json({ message: 'Location updated successfully' });
        }
    });
});

app.get('/download-csv', (req, res) => {
    connection.query('SELECT * FROM lokasi', (error, results) => {
        if (error) {
            console.error('Error fetching data:', error);
            return res.status(500).send('Error fetching data.');
        }

        // Format data sebagai CSV
        const headers = [
            'ID', 'Transportasi Umum', 'Kemudahan Akses Jalan', 'Kedekatan dengan Pusat Kota',
            'Biaya Tanah', 'Biaya Operasional', 'Biaya Perawatan', 'Keamanan', 'Kebersihan', 'Kenyamanan', 'Total Weight'
        ];

        const rows = results.map(location => [
            location.id,
            location['transportasi-umum'],
            location['kemudahan-akses-jalan'],
            location['kedekatan-dengan-pusat-kota'],
            location['biaya-tanah'],
            location['biaya-operasional'],
            location['biaya-perawatan'],
            location['keamanan'],
            location['kebersihan'],
            location['kenyamanan'],
            location['total-weight']
        ]);

        const csvData = Papa.unparse([headers, ...rows], {
            delimiter: ',',
            newline: '\r\n'
        });

        // Kirim CSV sebagai response
        res.header('Content-Type', 'text/csv');
        res.attachment('locations.csv');
        res.send(csvData);
    });
});


// Mulai server
app.listen(port, () => {
    console.log(`Server running at http://127.0.0.1:${port}`);
});
