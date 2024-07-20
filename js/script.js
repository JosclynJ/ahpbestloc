document.addEventListener('DOMContentLoaded', () => {
    let criteria = [];
    let subCriteria = {};
    let criteriaWeights = [];
    let subCriteriaWeights = {};
    let chartInstance;
    let locations = []; // Inisialisasi locations dengan array kosong

    const resultsOutput = document.getElementById('results-output');
    const criteriaWeightsTableBody = document.getElementById('criteria-weights-table').querySelector('tbody');
    const subCriteriaWeightsTableBody = document.getElementById('sub-criteria-weights-table').querySelector('tbody');
    const locationChartCtx = document.getElementById('locationChart').getContext('2d');
    const updateLocationModal = new bootstrap.Modal(document.getElementById('updateModal'));
    const detailModal = new bootstrap.Modal(document.getElementById('detailModal'));

    function readCSV(filePath, callback) {
        Papa.parse(filePath, {
            download: true,
            header: true,
            complete: function(results) {
                callback(results.data);
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

    readCSV('csv/criteria_weights.csv', function(data) {
        criteria = data.map(row => row.Kriteria);
        criteriaWeights = data.map(row => parseFloat(row.Bobot));

        criteria.forEach((criterion, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${criterion}</td><td>${criteriaWeights[index]}</td>`;
            criteriaWeightsTableBody.appendChild(row);
        });

        const normalizedCriteriaWeights = normalizeWeights(criteriaWeights);
        criteriaWeights = normalizedCriteriaWeights;

        const criteriaMatrix = createPairwiseMatrix(criteria, criteriaWeights);
        displayPairwiseMatrix(criteriaMatrix, 'criteria-pairwise-matrix', criteria);
        if (data.length === 0) {
            Swal.fire({
                icon: 'error',
                title: 'Gagal memuat data CSV untuk bobot kriteria.',
                text: 'File CSV kosong atau format tidak sesuai.',
            });
        }
    });

    readCSV('csv/sub_criteria_weights.csv', function(data) {
        data.forEach(row => {
            if (!subCriteria[row.Kriteria]) {
                subCriteria[row.Kriteria] = [];
                subCriteriaWeights[row.Kriteria] = [];
            }
            subCriteria[row.Kriteria].push(row['Sub-Kriteria']);
            subCriteriaWeights[row.Kriteria].push(parseFloat(row.Bobot));
        });

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

            subCriteriaWeights[key] = normalizeWeights(subCriteriaWeights[key]);
            const subCriteriaMatrix = createPairwiseMatrix(subCriteria[key], subCriteriaWeights[key]);
            displayPairwiseMatrix(subCriteriaMatrix, `sub-criteria-pairwise-matrix-${key.replace(/ /g, '-')}`, subCriteria[key]);
        }
        if (Object.keys(subCriteria).length === 0) {
            Swal.fire({
                icon: 'error',
                title: 'Gagal memuat data CSV untuk bobot sub-kriteria.',
                text: 'File CSV kosong atau format tidak sesuai.',
            });
        }
    });

    const inputCsv = document.getElementById('input-csv');
    inputCsv.addEventListener('change', handleFileSelect);

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
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

                // Update locations array
                locations = data.map((row) => ({
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

                // Calculate total weights
                const totalWeights = locations.map(calculateTotalWeight);
                const bestIndex = totalWeights.indexOf(Math.max(...totalWeights));

                // Display results and chart
                displayResults(locations[bestIndex], totalWeights[bestIndex], bestIndex + 1);
                displayChart(totalWeights, bestIndex);

                // Populate data table
                populateDataTable(locations, totalWeights);

                Swal.fire({
                    icon: 'success',
                    title: 'Data berhasil dimuat!',
                    showConfirmButton: false,
                    timer: 1500
                });
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
    };

    const addLocationForm = document.getElementById('add-location-form');

    addLocationForm.addEventListener('submit', function(event) {
        event.preventDefault();

        locations = [];
        for (let i = 0; i < 100; i++) {
            const newLocation = {
                id: i + 1,
                'transportasi-umum': getRandomInt(1, 9),
                'kemudahan-akses-jalan': getRandomInt(1, 9),
                'kedekatan-dengan-pusat-kota': getRandomInt(1, 9),
                'biaya-tanah': getRandomInt(1, 9),
                'biaya-operasional': getRandomInt(1, 9),
                'biaya-perawatan': getRandomInt(1, 9),
                'keamanan': getRandomInt(1, 9),
                'kebersihan': getRandomInt(1, 9),
                'kenyamanan': getRandomInt(1, 9)
            };
            locations.push(newLocation);
        }

        const totalWeights = locations.map(calculateTotalWeight);
        const bestIndex = totalWeights.indexOf(Math.max(...totalWeights));
        
        displayResults(locations[bestIndex], totalWeights[bestIndex], bestIndex + 1);
        displayChart(totalWeights, bestIndex);
        populateDataTable(locations, totalWeights);
        Swal.fire({
            icon: 'success',
            title: 'Lokasi berhasil ditambahkan!',
            showConfirmButton: false,
            timer: 1500
        });
    });

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function calculateTotalWeight(location) {
        let totalWeight = 0;

        criteria.forEach((criterion, index) => {
            const subCriteriaList = subCriteria[criterion];
            const subCriteriaWeightsList = subCriteriaWeights[criterion];
            const criteriaWeight = criteriaWeights[index];

            subCriteriaList.forEach((subCriterion, idx) => {
                const key = subCriterion.toLowerCase().replace(/ /g, '-');
                const value = parseInt(location[key]);

                if (!isNaN(value)) {
                    totalWeight += value * subCriteriaWeightsList[idx] * criteriaWeight;
                } else {
                    console.error(`Invalid value for '${subCriterion}'.`);
                }
            });
        });

        return totalWeight;
    }

    function displayResults(location, totalWeight, locationIndex) {
        let resultsHtml = `<h3>Hasil Analisis Lokasi Terbaik</h3><p>Lokasi Terbaik: Lokasi ${location.id}</p><ul>`;

        for (const [key, value] of Object.entries(location)) {
            resultsHtml += `<li style="text-transform: capitalize;">${key.replace(/-/g, ' ')}: ${value}</li>`;
        }

        resultsHtml += `</ul><p>Total Weight: ${totalWeight.toFixed(4)}</p>`;
        resultsOutput.innerHTML = resultsHtml;
    }

    function displayChart(weights, bestIndex) {
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

    // Function to populate DataTable
    function populateDataTable(locations, weights) {
        dataTable.clear();
        locations.forEach((location, index) => {
            const row = [
                location['id'],
                `Lokasi ${location.id}`, // Displaying the location ID
                location['transportasi-umum'],
                location['kemudahan-akses-jalan'],
                location['kedekatan-dengan-pusat-kota'],
                location['biaya-tanah'],
                location['biaya-operasional'],
                location['biaya-perawatan'],
                location['keamanan'],
                location['kebersihan'],
                location['kenyamanan'],
                weights[index].toFixed(4),
                `<button class="btn btn-primary btn-sm" onclick="openDetailModal(${location.id})">Detail</button>
                <button class="btn btn-danger btn-sm" onclick="deleteLocation(${location.id})">Delete</button>`
            ];
            dataTable.row.add(row).draw(false);
        });
    }

    // Initialize with empty data
    populateDataTable([], []);

    // Function to open update modal
    window.openUpdateModal = function(locationId) {
        $('#detailModal').modal('hide');
        const location = locations.find(loc => loc.id === locationId);
        if (location) {
            // Fill modal with location data
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

            // Open modal
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
                    'kenyamanan': parseInt(document.getElementById('update-kenyamanan').value)
                };

                const { valid, errorMessage } = validateUpdatedValues(updatedValues);

                if (valid) {
                    // Update location data by ID
                    location['transportasi-umum'] = updatedValues['transportasi-umum'];
                    location['kemudahan-akses-jalan'] = updatedValues['kemudahan-akses-jalan'];
                    location['kedekatan-dengan-pusat-kota'] = updatedValues['kedekatan-dengan-pusat-kota'];
                    location['biaya-tanah'] = updatedValues['biaya-tanah'];
                    location['biaya-operasional'] = updatedValues['biaya-operasional'];
                    location['biaya-perawatan'] = updatedValues['biaya-perawatan'];
                    location['keamanan'] = updatedValues['keamanan'];
                    location['kebersihan'] = updatedValues['kebersihan'];
                    location['kenyamanan'] = updatedValues['kenyamanan'];

                    // Close modal
                    updateLocationModal.hide();

                    // Update table and chart
                    const totalWeights = locations.map(calculateTotalWeight);
                    const bestIndex = totalWeights.indexOf(Math.max(...totalWeights));
                    displayResults(locations[bestIndex], totalWeights[bestIndex], bestIndex + 1);
                    displayChart(totalWeights, bestIndex);
                    populateDataTable(locations, totalWeights);

                    // Show success alert
                    Swal.fire({
                        icon: 'success',
                        title: 'Lokasi berhasil diperbarui!',
                        showConfirmButton: false,
                        timer: 1500
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

    // Function to open detail modal
    window.openDetailModal = function(locationId) {
        const location = locations.find(loc => loc.id === locationId);
        if (location) {
            const modalBody = document.getElementById('detailModalBody');
            if (modalBody) {
                modalBody.innerHTML = ''; // Clear previous content
                
                // Create table rows for location details
                const fields = [
                    { label: 'ID', value: location.id },
                    { label: 'Nama', value: `Lokasi ${location.id}` },
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

                // Set up "Update" button in the modal
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
    };

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
        }).then((result) => {
            if (result.isConfirmed) {
                const initialLength = locations.length;

                locations = locations.filter(location => location.id !== locationId);
                if (locations.length === initialLength) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal menghapus lokasi.',
                        text: `Lokasi dengan ID ${locationId} tidak ditemukan.`,
                    });
                    return;
                }

                const totalWeights = locations.map(calculateTotalWeight);
                const bestIndex = totalWeights.indexOf(Math.max(...totalWeights));

                // Show success alert
                Swal.fire({
                    icon: 'success',
                    title: 'Lokasi berhasil dihapus!',
                    showConfirmButton: false,
                    timer: 1500
                });

                displayResults(locations[bestIndex], totalWeights[bestIndex], bestIndex + 1);
                displayChart(totalWeights, bestIndex);
                populateDataTable(locations, totalWeights);
            }
        });
    };

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

        Swal.fire({
            title: 'Masukkan nama file',
            input: 'text',
            inputLabel: 'Nama file',
            inputPlaceholder: 'locations.csv',
            showCancelButton: true,
            confirmButtonText: 'Simpan',
            cancelButtonText: 'Batal',
            inputValidator: (value) => {
                if (!value) {
                    return 'Nama file tidak boleh kosong!';
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const fileName = result.value.endsWith('.csv') ? result.value : `${result.value}.csv`;

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
                const csvData = [headers, ...rows];
                const csv = Papa.unparse(csvData, {
                    delimiter: ',',
                    newline: '\r\n'
                });

                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);

                link.setAttribute('href', url);
                link.setAttribute('download', fileName);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });
    }
});
