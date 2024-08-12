document.addEventListener('DOMContentLoaded', () => {
    let criteria = [];
    let subCriteria = {};
    let criteriaWeights = [];
    let subCriteriaWeights = {};
    let chartInstance;
    let locations = []; 


    const resultsOutput = document.getElementById('results-output');
    const locationChartCtx = document.getElementById('locationChart').getContext('2d');
    const updateLocationModal = new bootstrap.Modal(document.getElementById('updateModal'));

    function normalizeWeights(weights) {
        const total = weights.reduce((acc, val) => acc + parseFloat(val), 0);
        return weights.map(weight => parseFloat(weight) / total);
    }

    function createPairwiseMatrix(elements, weights) {
        const n = elements.length;
        const matrix = Array(n).fill().map(() => Array(n).fill(0));

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                matrix[i][j] = weights[i] / weights[j];
            }
        }
        return matrix;
    }

    function displayPairwiseMatrix(matrix, containerId, labels) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container element '${containerId}' not found.`);
            return;
        }
        let tableHtml = '<table class="table"><thead><tr><th></th>';
        for (let i = 0; i < labels.length; i++) {
            tableHtml += `<th>${labels[i]}</th>`;
        }
        tableHtml += '</tr></thead><tbody>';

        for (let i = 0; i < matrix.length; i++) {
            tableHtml += `<tr><th>${labels[i]}</th>`;
            for (let j = 0; j < matrix[i].length; j++) {
                tableHtml += `<td>${matrix[i][j].toFixed(4)}</td>`;
            }
            tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table>';

        container.innerHTML = tableHtml;
    }

    // Fungsi untuk memuat data kriteria
    function loadKriteria() {
        fetch('http://127.0.0.1:5000/kriteria')
            .then(response => response.json())
            .then(data => {
                criteria = data.map(row => row.kriteria);
                criteriaWeights = data.map(row => parseFloat(row.bobot));
                console.log('Kriteria data:', data);

                console.log('Loaded Criteria:', criteria);
                console.log('Loaded Criteria Weights:', criteriaWeights);

                const criteriaWeightsTableBody = document.querySelector('#criteria-weights-table tbody');
                if (criteriaWeightsTableBody) {
                    criteria.forEach((criterion, index) => {
                        const row = document.createElement('tr');
                        row.innerHTML = `<td>${criterion}</td><td>${criteriaWeights[index]}</td>`;
                        criteriaWeightsTableBody.appendChild(row);
                    });
                } else {
                    console.error(`tbody element for criteria-weights-table not found.`);
                }

                // Normalisasi bobot kriteria
                const normalizedCriteriaWeights = normalizeWeights(criteriaWeights);
                console.log('Normalized Criteria Weights:', normalizedCriteriaWeights);

                // Buat matriks pairwise
                const criteriaMatrix = createPairwiseMatrix(criteria, normalizedCriteriaWeights);
                console.log('Criteria Matrix:', criteriaMatrix);

                // Tampilkan matriks pairwise
                displayPairwiseMatrix(criteriaMatrix, 'criteria-pairwise-matrix', criteria);

                if (data.length === 0) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal memuat data dari basis data.',
                        text: 'Data kosong atau format tidak sesuai.',
                    });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal memuat data.',
                    text: 'Terjadi kesalahan saat mengambil data dari server.',
                });
            });
    }

    // Fungsi untuk memuat sub-kriteria
    function loadSubKriteria() {
        fetch('http://127.0.0.1:5000/sub-kriteria')
            .then(response => response.json())
            .then(data => {
                subCriteria = {};
                subCriteriaWeights = {};
                console.log('Sub-Kriteria data:', data);

                console.log('Raw Sub-Criteria Data:', data);

                data.forEach(row => {
                    if (!subCriteria[row.kriteria]) {
                        subCriteria[row.kriteria] = [];
                        subCriteriaWeights[row.kriteria] = [];
                    }
                    subCriteria[row.kriteria].push(row.sub_kriteria);
                    subCriteriaWeights[row.kriteria].push(parseFloat(row.bobot));
                });

                // Remove duplicates
                for (let key in subCriteria) {
                    subCriteria[key] = subCriteria[key].filter((v, i, a) => a.indexOf(v) === i);
                    const tbody = document.querySelector('#sub-criteria-weights-table tbody');
                    if (tbody) {
                        subCriteria[key].forEach((subCriterion, index) => {
                            const row = document.createElement('tr');
                            row.innerHTML = `<td>${key}</td><td>${subCriterion}</td><td>${subCriteriaWeights[key][index]}</td>`;
                            tbody.appendChild(row);
                        });
                    } else {
                        console.error(`tbody element for sub-criteria-weights-table not found.`);
                    }

                    // Normalisasi bobot sub-kriteria
                    subCriteriaWeights[key] = normalizeWeights(subCriteriaWeights[key]);
                    
                    // Buat matriks pairwise
                    const subCriteriaMatrix = createPairwiseMatrix(subCriteria[key], subCriteriaWeights[key]);
                    console.log(`Sub-Criteria Matrix for ${key}:`, subCriteriaMatrix);

                    // Tampilkan matriks pairwise
                    displayPairwiseMatrix(subCriteriaMatrix, `sub-criteria-pairwise-matrix-${key.replace(/ /g, '-')}`, subCriteria[key]);
                }

                if (Object.keys(subCriteria).length === 0) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal memuat data dari basis data.',
                        text: 'Data kosong atau format tidak sesuai.',
                    });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal memuat data.',
                    text: 'Terjadi kesalahan saat mengambil data dari server.',
                });
            });
    }

    // Fungsi untuk menghitung total weight
    function calculateTotalWeight(location) {
        let totalWeight = 0;

        console.log('Criteria:', criteria);
        console.log('Sub-Criteria:', subCriteria);
        console.log('Sub-Criteria Weights:', subCriteriaWeights);
        console.log('Criteria Weights:', criteriaWeights);

        criteria.forEach((criterion, index) => {
            const subCriteriaList = subCriteria[criterion] || [];
            const subCriteriaWeightsList = subCriteriaWeights[criterion] || [];
            const criteriaWeight = criteriaWeights[index] || 0;

            console.log(`Processing criterion: ${criterion}`);
            console.log(`Criteria weight: ${criteriaWeight}`);
            
            subCriteriaList.forEach((subCriterion, idx) => {
                const key = subCriterion.toLowerCase().replace(/ /g, '-');
                const value = parseInt(location[key], 10);

                console.log(`Sub-criterion: ${subCriterion}`);
                console.log(`Key: ${key}, Value: ${value}, Sub-criteria weight: ${subCriteriaWeightsList[idx]}`);

                if (!isNaN(value)) {
                    totalWeight += value * subCriteriaWeightsList[idx] * criteriaWeight;
                } else {
                    console.error(`Invalid value for '${subCriterion}'. Key: '${key}', Value: ${value}`);
                }
            });
        });

        // Format total weight to two decimal places
        const formattedTotalWeight = (totalWeight / 10).toFixed(4);

        console.log(`Total Weight: ${formattedTotalWeight}`);
        return parseFloat(formattedTotalWeight);
    }


    // Panggil fungsi loadKriteria dan loadSubKriteria saat halaman dimuat
    loadKriteria();
    loadSubKriteria();
    
    const inputCsv = document.getElementById('input-csv');
    inputCsv.addEventListener('change', handleFileSelect);
    
    let currentCSVFile = null;
    
    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            currentCSVFile = file;
            const reader = new FileReader();
            reader.onload = function(event) {
                const csvData = event.target.result;
                processCSV(csvData);
            };
            reader.readAsText(file);
        }
    }
    
    function processCSV(csvData) {
        Papa.parse(csvData, {
            header: true,
            complete: function(results) {
                const data = results.data;
    
                // Convert CSV data to locations array
                const newLocations = data.map((row) => ({
                    'id': parseInt(row['ID']),
                    'transportasi-umum': parseInt(row['Transportasi Umum']),
                    'kemudahan-akses-jalan': parseInt(row['Kemudahan Akses Jalan']),
                    'kedekatan-dengan-pusat-kota': parseInt(row['Kedekatan dengan Pusat Kota']),
                    'biaya-tanah': parseInt(row['Biaya Tanah']),
                    'biaya-operasional': parseInt(row['Biaya Operasional']),
                    'biaya-perawatan': parseInt(row['Biaya Perawatan']),
                    'keamanan': parseInt(row['Keamanan']),
                    'kebersihan': parseInt(row['Kebersihan']),
                    'kenyamanan': parseInt(row['Kenyamanan'])
                }));
    
                // Remove duplicates and get notifications
                const [uniqueLocations, duplicates] = removeDuplicates(newLocations);
    
                // Notify about duplicates
                if (duplicates.length > 0) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Data duplikat ditemukan!',
                        text: `Data berikut dihapus karena duplikasi: ${duplicates.map(loc => `ID ${loc.id}`).join(', ')}`,
                        showConfirmButton: true
                    }).then(() => {
                        // Notify about successful data load after duplicate warning
                        Swal.fire({
                            icon: 'success',
                            title: 'Data berhasil dimuat!',
                            showConfirmButton: false,
                            timer: 1500
                        });
                    });
                } else {
                    // If no duplicates, just show success message
                    Swal.fire({
                        icon: 'success',
                        title: 'Data berhasil dimuat!',
                        showConfirmButton: false,
                        timer: 1500
                    });
                }
    
                locations = uniqueLocations;

                const totalWeights = locations.map(calculateTotalWeight);
                const bestIndex = totalWeights.indexOf(Math.max(...totalWeights));
                displayResults(locations[bestIndex], totalWeights[bestIndex], bestIndex + 1);
                displayChart(totalWeights, bestIndex);
                populateDataTable(locations, totalWeights);
            },
            error: function(error) {
                console.error('Error parsing CSV:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error loading CSV data',
                    text: 'Please check the CSV file or console for more details.'
                });
            }
        });
    }
    
    function saveCSV() {
        if (!currentCSVFile) {
            Swal.fire({
                icon: 'error',
                title: 'Tidak ada CSV',
                text: 'Belum ada CSV yang di-inputkan.'
            });
            return;
        }
    
        // Calculate total weights
        const totalWeights = locations.map(calculateTotalWeight);
    
        // Add total weight to each location
        const csvData = locations.map((loc, index) => [
            loc.id,
            loc['transportasi-umum'],
            loc['kemudahan-akses-jalan'],
            loc['kedekatan-dengan-pusat-kota'],
            loc['biaya-tanah'],
            loc['biaya-operasional'],
            loc['biaya-perawatan'],
            loc['keamanan'],
            loc['kebersihan'],
            loc['kenyamanan'],
            totalWeights[index].toFixed(4) // Total weight with 4 decimal places
        ]).map(row => row.join(',')).join('\n');
        
        // Add headers
        const csvContent = `ID,Transportasi Umum,Kemudahan Akses Jalan,Kedekatan dengan Pusat Kota,Biaya Tanah,Biaya Operasional,Biaya Perawatan,Keamanan,Kebersihan,Kenyamanan,Total Weight\n${csvData}`;
    
        // Create a FormData object to handle file uploads
        const formData = new FormData();
        formData.append('file', new Blob([csvContent], { type: 'text/csv' }), currentCSVFile.name);
    
        // Send data to the server
        fetch('http://127.0.0.1:5000/upload-csv', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            alert(`Sukses mengupload: ${data.filename}`)
        })
        .catch((error) => {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error uploading file',
                text: 'Please try again or check the console for more details.'
            });
        });
    }
    
    document.getElementById('saveCsvBtn').addEventListener('click', saveCSV);

    function removeDuplicates(newLocations) {
        const uniqueLocations = [];
        const duplicates = [];
    
        newLocations.forEach(newLoc => {
            if (isDuplicate(newLoc, uniqueLocations)) {
                duplicates.push(newLoc);
            } else {
                uniqueLocations.push(newLoc);
            }
        });
    
        return [uniqueLocations, duplicates];
    }
    
    function isDuplicate(newLocation, locations) {
        return locations.some(location =>
            location['transportasi-umum'] === newLocation['transportasi-umum'] &&
            location['kemudahan-akses-jalan'] === newLocation['kemudahan-akses-jalan'] &&
            location['kedekatan-dengan-pusat-kota'] === newLocation['kedekatan-dengan-pusat-kota'] &&
            location['biaya-tanah'] === newLocation['biaya-tanah'] &&
            location['biaya-operasional'] === newLocation['biaya-operasional'] &&
            location['biaya-perawatan'] === newLocation['biaya-perawatan'] &&
            location['keamanan'] === newLocation['keamanan'] &&
            location['kebersihan'] === newLocation['kebersihan'] &&
            location['kenyamanan'] === newLocation['kenyamanan']
        );
    }

    function getLastId(locations) {
        if (locations.length === 0) return 0;
        return Math.max(...locations.map(loc => loc.id));
    }
    
    const newLocationForm = document.getElementById('new-location-form');
    
    newLocationForm.addEventListener('submit', function(event) {
        event.preventDefault();
    
        const newLocation = {
            id: getLastId(locations) + 1, // Assign new ID based on last ID
            'nama': document.getElementById('new-nama').value,
            'transportasi-umum': parseInt(document.getElementById('new-transportasi-umum').value),
            'kemudahan-akses-jalan': parseInt(document.getElementById('new-kemudahan-akses-jalan').value),
            'kedekatan-dengan-pusat-kota': parseInt(document.getElementById('new-kedekatan-dengan-pusat-kota').value),
            'biaya-tanah': parseInt(document.getElementById('new-biaya-tanah').value),
            'biaya-operasional': parseInt(document.getElementById('new-biaya-operasional').value),
            'biaya-perawatan': parseInt(document.getElementById('new-biaya-perawatan').value),
            'keamanan': parseInt(document.getElementById('new-keamanan').value),
            'kebersihan': parseInt(document.getElementById('new-kebersihan').value),
            'kenyamanan': parseInt(document.getElementById('new-kenyamanan').value)
        };
    
        if (isDuplicate(newLocation, locations)) {
            Swal.fire({
                icon: 'error',
                title: 'Gagal menambahkan lokasi',
                text: 'Lokasi ini sudah ada di daftar.',
                showConfirmButton: true
            });
            return;
        }
    
        locations.push(newLocation);
        // Hitung total weight untuk lokasi baru
        const totalWeight = calculateTotalWeight(newLocation);

        // Tambahkan data ke DataTable
        dataTable1.row.add([
            newLocation.id,
            newLocation.nama,
            newLocation['transportasi-umum'],
            newLocation['kemudahan-akses-jalan'],
            newLocation['kedekatan-dengan-pusat-kota'],
            newLocation['biaya-tanah'],
            newLocation['biaya-operasional'],
            newLocation['biaya-perawatan'],
            newLocation['keamanan'],
            newLocation['kebersihan'],
            newLocation['kenyamanan'],
            totalWeight.toFixed(4),
            `<button class="btn btn-info btn-sm" onclick="openDetailModal(${newLocation.id})">Detail</button>
            <button class="btn btn-danger btn-sm" onclick="deleteLocation(${newLocation.id})">Delete</button>`
        ]).draw(false);

        Swal.fire({
            icon: 'success',
            title: 'Lokasi baru berhasil ditambahkan!',
            showConfirmButton: false,
            timer: 1500
        });
    });

    // Fungsi untuk menyimpan data lokasi ke server
    function saveLocation(location) {
        fetch('http://127.0.0.1:5000/save-location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(location),
        })
        .then(response => response.json())
        .then(data => {
            console.log('Response:', data);
            Swal.fire({
                icon: 'success',
                title: 'Data berhasil disimpan',
                text: 'Data lokasi telah disimpan ke database.',
            }).then(() => {
                // Reload halaman setelah menutup notifikasi
                window.location.reload();
            });
        })
        .catch(error => {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Gagal menyimpan data',
                text: 'Terjadi kesalahan saat menyimpan data ke server.',
            });
        });
    }

    // Fungsi untuk menyimpan semua data dari DataTable ke database tanpa ID
    function saveAllLocations() {
        // Ambil semua data dari DataTable
        const tableData = dataTable1.rows().data().toArray();

        // Loop melalui setiap baris data
        tableData.forEach(row => {
            // Buat objek lokasi dari data tabel, tanpa menyertakan ID
            const locationData = {
                nama: row[1],
                transportasi_umum: parseInt(row[2]),
                kemudahan_akses_jalan: parseInt(row[3]),
                kedekatan_pusat_kota: parseInt(row[4]),
                biaya_tanah: parseInt(row[5]),
                biaya_operasional: parseInt(row[6]),
                biaya_perawatan: parseInt(row[7]),
                keamanan: parseInt(row[8]),
                kebersihan: parseInt(row[9]),
                kenyamanan: parseInt(row[10]),
                total_weight: parseFloat(row[11])
            };

            // Panggil fungsi untuk menyimpan lokasi ke server/database
            saveLocation(locationData);
        });

        Swal.fire({
            icon: 'success',
            title: 'Semua data lokasi berhasil disimpan!',
            showConfirmButton: false,
            timer: 1500
        });
    }

    // Tambahkan event listener untuk tombol simpan semua lokasi
    document.getElementById('saveLocationButton').addEventListener('click', saveAllLocations);


    // Fungsi untuk menampilkan hasil dan menampilkan tombol simpan lokasi
    function displayResults(location, totalWeight, locationIndex) {
        let resultsHtml = `<h3>Hasil Analisis Lokasi Terbaik</h3><p>Lokasi Terbaik: Lokasi ${location.id}</p><ul>`;

        for (const [key, value] of Object.entries(location)) {
            resultsHtml += `<li style="text-transform: capitalize;">${key.replace(/-/g, ' ')}: ${value}</li>`;
        }

        resultsHtml += `</ul><p>Total Weight: ${totalWeight.toFixed(4)}</p>`;
        resultsOutput.innerHTML = resultsHtml;

        // Simpan data lokasi dan total weight untuk digunakan saat tombol diklik
        currentLocation = location;
        currentTotalWeight = totalWeight;

        // Tampilkan tombol simpan lokasi
        document.getElementById('saveLocationButton').style.display = 'inline-block';
    }

    function displayChart(locations, weights, bestIndex) {
        if (chartInstance) {
            chartInstance.destroy();
        }
    
        const backgroundColors = weights.map((weight, index) => index === bestIndex ? 'rgba(75, 192, 192, 0.2)' : 'rgba(255, 99, 132, 0.2)');
        const borderColors = weights.map((weight, index) => index === bestIndex ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)');
    
        chartInstance = new Chart(locationChartCtx, {
            type: 'bar',
            data: {
                labels: locations.map(location => `Lokasi ${location.id}`),
                datasets: [{
                    label: 'Total Weight',
                    data: weights,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Initialize DataTable
    const dataTable1 = $('#locationsTable1').DataTable({
        "paging": true,
        "searching": true,
        "ordering": true,
        "info": true,
        "data": [],
        "columns": [
            { "title": "ID" },
            { "title": "Nama" },
            { "title": "Transportasi Umum" },
            { "title": "Kemudahan Akses Jalan" },
            { "title": "Kedekatan Pusat Kota" },
            { "title": "Biaya Tanah" },
            { "title": "Biaya Opera-<br>sional" },
            { "title": "Biaya Perawatan" },
            { "title": "Kea-<br>manan" },
            { "title": "Keber-<br>sihan" },
            { "title": "Kenya-<br>manan" },
            { "title": "Total<br>Bobot" },
            { "title": "Aksi" }
        ]
    });
    const dataTable = $('#locationsTable').DataTable({
        "paging": true,
        "searching": true,
        "ordering": true,
        "info": true,
        "data": [],
        "columns": [
            { "title": "ID" },
            { "title": "Nama" },
            { "title": "Transportasi Umum" },
            { "title": "Kemudahan Akses Jalan" },
            { "title": "Kedekatan Pusat Kota" },
            { "title": "Biaya Tanah" },
            { "title": "Biaya Opera-<br>sional" },
            { "title": "Biaya Perawatan" },
            { "title": "Kea-<br>manan" },
            { "title": "Keber-<br>sihan" },
            { "title": "Kenya-<br>manan" },
            { "title": "Total<br>Bobot" },
            { "title": "Aksi" }
        ]
    });

    function populateDataTable(locations, weights = []) {
        dataTable.clear();
        locations.forEach((location, index) => {
            const row = [
                location['id'] || '',
                location['nama'] || '',
                location['transportasi-umum'] || '',
                location['kemudahan-akses-jalan'] || '',
                location['kedekatan-dengan-pusat-kota'] || '',
                location['biaya-tanah'] || '',
                location['biaya-operasional'] || '',
                location['biaya-perawatan'] || '',
                location['keamanan'] || '',
                location['kebersihan'] || '',
                location['kenyamanan'] || '',
                (weights[index] || 0).toFixed(4), // Use calculated weight if available
                `<button class="btn btn-info btn-sm" onclick="openDetailModal(${location.id})">Detail</button>
                <button class="btn btn-danger btn-sm" onclick="deleteLocation(${location.id})">Delete</button>`
            ];
            dataTable.row.add(row).draw(false);
        });
    }
    

    populateDataTable([], []);

    // Fungsi untuk mengambil lokasi dan menghitung bobotnya
    function fetchLocations() {
        fetch('http://127.0.0.1:5000/locations')
            .then(response => response.json())
            .then(locations => {
                const weights = locations.map(location => location['total-weight']); // Gunakan bobot langsung dari database
                const bestIndex = weights.indexOf(Math.max(...weights));
                
                // Populasikan DataTable dengan data lokasi dan bobot yang dihitung
                populateDataTable(locations, weights);
        
                displayResults(locations[bestIndex], weights[bestIndex], bestIndex + 1);
                displayChart(locations, weights, bestIndex);
            })
            .catch(error => console.error('Error:', error));
    }
    
    // Panggil fetchLocations untuk memulai proses
    fetchLocations();

    window.openDetailModal = async function(locationId) {
        try {
            const response = await fetch(`http://127.0.0.1:5000/locations/${locationId}`);
            if (!response.ok) throw new Error('Network response was not ok');
    
            const location = await response.json();
            if (location) {
                const modalBody = document.getElementById('detailModalBody');
                if (modalBody) {
                    modalBody.innerHTML = ''; // Clear previous content
                    
                    // Create table rows for location details
                    const fields = [
                        { label: 'ID', value: location.id },
                        { label: 'Nama Lokasi', value: location.nama },
                        { label: 'Transportasi Umum', value: location['transportasi-umum'] },
                        { label: 'Akses Jalan', value: location['kemudahan-akses-jalan'] },
                        { label: 'Kedekatan Pusat Kota', value: location['kedekatan-dengan-pusat-kota'] },
                        { label: 'Biaya Tanah', value: location['biaya-tanah'] },
                        { label: 'Biaya Operasional', value: location['biaya-operasional'] },
                        { label: 'Biaya Perawatan', value: location['biaya-perawatan'] },
                        { label: 'Keamanan', value: location['keamanan'] },
                        { label: 'Kebersihan', value: location['kebersihan'] },
                        { label: 'Kenyamanan', value: location['kenyamanan'] },
                        { label: 'Total', value: calculateTotalWeight(location).toFixed(4) }
                    ];
    
                    fields.forEach(field => {
                        const row = document.createElement('tr');
                        row.innerHTML = `<th>${field.label}</th><td>${field.value}</td>`;
                        modalBody.appendChild(row);
                    });
    
                    const updateButton = document.getElementById('updateLocationButton');
                    updateButton.onclick = function() {
                        updateLocationModal.show();
                        openUpdateModal(locationId);
                    };
    
                    // Show the detail modal
                    $('#detailModal').modal('show');
                } else {
                    console.error("Modal body element 'detailModalBody' not found.");
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Lokasi tidak ditemukan',
                    text: `Lokasi dengan ID ${locationId} tidak ditemukan.`,
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Terjadi kesalahan',
                text: error.message,
            });
        }
    };

    window.openUpdateModal = function(locationId) {
        $('#detailModal').modal('hide');
        // Ambil data lokasi dari server
        fetch(`http://127.0.0.1:5000/locations/${locationId}`)
            .then(response => response.json())
            .then(location => {
                if (location) {
                    // Isi modal dengan data lokasi
                    document.getElementById('updateModalLabel').innerText = `Update Location ${location.id}`;
                    document.getElementById('update-transportasi-umum').value = location['transportasi-umum'];
                    document.getElementById('update-kemudahan-akses-jalan').value = location['kemudahan-akses-jalan'];
                    document.getElementById('update-kedekatan-dengan-pusat-kota').value = location['kedekatan-dengan-pusat-kota'];
                    document.getElementById('update-biaya-tanah').value = location['biaya-tanah'];
                    document.getElementById('update-biaya-operasional').value = location['biaya-operasional'];
                    document.getElementById('update-biaya-perawatan').value = location['biaya-perawatan'];
                    document.getElementById('update-keamanan').value = location['keamanan'];
                    document.getElementById('update-kebersihan').value = location['kebersihan'];
                    document.getElementById('update-kenyamanan').value = location['kenyamanan'];
        
                    updateLocationModal.show();
        
                    // Set up save function for when modal is closed
                    updateLocationModal._element.querySelector('form').onsubmit = function(event) {
                        event.preventDefault();
                        const updatedValues = {
                            'transportasi-umum': parseInt(document.getElementById('update-transportasi-umum').value),
                            'kemudahan-akses-jalan': parseInt(document.getElementById('update-kemudahan-akses-jalan').value),
                            'kedekatan-dengan-pusat-kota': parseInt(document.getElementById('update-kedekatan-dengan-pusat-kota').value),
                            'biaya-tanah': parseInt(document.getElementById('update-biaya-tanah').value),
                            'biaya-operasional': parseInt(document.getElementById('update-biaya-operasional').value),
                            'biaya-perawatan': parseInt(document.getElementById('update-biaya-perawatan').value),
                            'keamanan': parseInt(document.getElementById('update-keamanan').value),
                            'kebersihan': parseInt(document.getElementById('update-kebersihan').value),
                            'kenyamanan': parseInt(document.getElementById('update-kenyamanan').value),
                            'total-weight': calculateTotalWeight({
                                'transportasi-umum': parseInt(document.getElementById('update-transportasi-umum').value),
                                'kemudahan-akses-jalan': parseInt(document.getElementById('update-kemudahan-akses-jalan').value),
                                'kedekatan-dengan-pusat-kota': parseInt(document.getElementById('update-kedekatan-dengan-pusat-kota').value),
                                'biaya-tanah': parseInt(document.getElementById('update-biaya-tanah').value),
                                'biaya-operasional': parseInt(document.getElementById('update-biaya-operasional').value),
                                'biaya-perawatan': parseInt(document.getElementById('update-biaya-perawatan').value),
                                'keamanan': parseInt(document.getElementById('update-keamanan').value),
                                'kebersihan': parseInt(document.getElementById('update-kebersihan').value),
                                'kenyamanan': parseInt(document.getElementById('update-kenyamanan').value)
                            }) // Hitung total weight jika diperlukan
                        };
    
                        const { valid, errorMessage } = validateUpdatedValues(updatedValues);
    
                        if (valid) {
                            // Update location data by ID
                            fetch(`http://127.0.0.1:5000/locations/${locationId}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(updatedValues)
                            })
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error('Error updating location');
                                }
                                return response.json();
                            })
                            .then(data => {
                                updateLocationModal.hide();
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Lokasi berhasil diperbarui!',
                                    showConfirmButton: false,
                                    timer: 1500
                                }).then(() => {
                                    // Refresh halaman setelah notifikasi sukses ditutup
                                    window.location.reload();
                                });
                            })                            
                            .catch(error => {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Lokasi gagal diperbarui.',
                                    text: error.message,
                                });
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Lokasi gagal diperbarui.',
                                text: errorMessage,
                            });
                        }
                    };
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Lokasi tidak ditemukan',
                        text: `Lokasi dengan ID ${locationId} tidak ditemukan.`,
                    });
                }
            })
            .catch(error => {
                Swal.fire({
                    icon: 'error',
                    title: 'Terjadi kesalahan',
                    text: error.message,
                });
            });
    };
    
    
    function validateUpdatedValues(updatedValues) {
        const keys = ['transportasi-umum', 'kemudahan-akses-jalan', 'kedekatan-dengan-pusat-kota', 'biaya-tanah', 'biaya-operasional', 'biaya-perawatan', 'keamanan', 'kebersihan', 'kenyamanan'];
        for (const key of keys) {
            if (isNaN(updatedValues[key])) {
                return { valid: false, errorMessage: `Nilai untuk ${key.replace(/-/g, ' ')} harus berupa angka.` };
            }
        }
        return { valid: true };
    }
    

    window.deleteLocation = function(locationId) {
        Swal.fire({
            title: 'Apakah Anda yakin?',
            text: "Anda tidak dapat membatalkan aksi ini!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, hapus!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await fetch(`http://127.0.0.1:5000/locations/${locationId}`, {
                        method: 'DELETE'
                    });
    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Terjadi kesalahan saat menghapus lokasi');
                    }
    
                    const resultData = await response.json();
    
                    // Pastikan 'resultData' memiliki property 'success'
                    if (resultData.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Lokasi berhasil dihapus!',
                            showConfirmButton: false,
                            timer: 1500
                        }).then(() => {
                            // Refresh halaman setelah notifikasi sukses ditutup
                            window.location.reload();
                        });
    
                        // Pastikan lokasi yang dihapus ada di array
                        if (!locations.some(location => location.id === locationId)) {
                            console.log(`Lokasi dengan ID ${locationId} berhasil dihapus.`);
                            // Update data
                            locations = locations.filter(location => location.id !== locationId);
                            const totalWeights = locations.map(calculateTotalWeight);
                            const bestIndex = totalWeights.indexOf(Math.max(...totalWeights));
    
                            if (locations.length > 0) {
                                displayResults(locations[bestIndex], totalWeights[bestIndex], bestIndex + 1);
                                displayChart(totalWeights, bestIndex);
                                populateDataTable(locations, totalWeights);
                            } else {
                                // Handle case when no locations remain
                                console.warn('Tidak ada lokasi yang tersisa untuk ditampilkan.');
                            }
                        } else {
                            console.error(`Lokasi dengan ID ${locationId} tidak ditemukan dalam array locations.`);
                        }
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Gagal menghapus lokasi.',
                            text: resultData.message || 'Tidak ada pesan kesalahan.',
                        });
                    }
                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Terjadi kesalahan',
                        text: error.message,
                    });
                }
            }
        });
    };

    document.getElementById('saveCsvBtn2').addEventListener('click', () => {
        // Unduh data CSV dari server
        fetch('http://127.0.0.1:5000/download-csv')
            .then(response => {
                if (response.ok) {
                    return response.text(); // Mendapatkan data CSV sebagai teks
                }
                throw new Error('Network response was not ok.');
            })
            .then(csvData => {
                // Kirim data CSV ke server
                return fetch('http://127.0.0.1:5000/save-csv', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ csvData })
                });
            })
            .then(response => response.text())
            .then(result => {
                alert(result)
            })
            .catch(error => {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: 'Gagal menyimpan data CSV. Silakan coba lagi.'
                });
                console.error('Error saving CSV:', error);
            });
    });
    

});