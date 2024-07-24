document.getElementById('saveCsvBtn').addEventListener('click', saveCsv);

    function saveCsv() {
        if (locations.length === 0) {
            Swal.fire({
                icon: 'error',
                title: 'Tidak ada data untuk disimpan',
                text: 'Silakan tambahkan lokasi terlebih dahulu.'
            });
            return;
        }

        const headers = [
            'ID', 'Transportasi Umum', 'Kemudahan Akses Jalan', 'Kedekatan dengan Pusat Kota',
            'Biaya Tanah', 'Biaya Operasional', 'Biaya Perawatan', 'Keamanan', 'Kebersihan', 'Kenyamanan', 'Total Weight'
        ];

        const rows = locations.map(location => [
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
            calculateTotalWeight(location).toFixed(4)
        ]);

        // Use a library like PapaParse to handle CSV generation
        const csvData = Papa.unparse([headers, ...rows], {
            delimiter: ',',
            newline: '\r\n'
        });

        // Send the CSV data to the server
        fetch('http://127.0.0.1:5000/save-csv', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ csvData })
        })
        .then(response => response.text())
        .then(result => {
            Swal.fire({
                icon: 'success',
                title: 'Sukses',
                text: result
            });
        })
        .catch(error => {
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: 'Gagal menyimpan data CSV. Silakan coba lagi.'
            });
            console.error('Error saving CSV:', error);
        });
    }


    // server.js
    const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 5000;

app.use(cors()); // Mengizinkan semua permintaan CORS
app.use(bodyParser.json());

app.post('/save-csv', (req, res) => {
    const { csvData } = req.body;

    if (!csvData) {
        console.error('No CSV data provided');
        return res.status(400).send('No CSV data provided.');
    }

    // Tambahkan log untuk data CSV yang diterima
    console.log('CSV Data received:', csvData);

    // Pastikan folder `csv` ada sebelum menulis file
    const dir = 'csv';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }

    fs.writeFile(`${dir}/locations.csv`, csvData, 'utf8', (err) => {
        if (err) {
            console.error('Error saving CSV:', err);
            return res.status(500).send('Failed to save CSV.');
        }
        console.log('CSV data saved successfully.');
        res.send('CSV data saved successfully.');
    });
});

// app.listen(port, () => {
//     console.log(`Server is running on http://127.0.0.1:${port}`);
// });
