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

    function readCSV(filePath, callback) {
        Papa.parse(filePath, {
            download: true,
            header: true,
            complete: function(results) {
                callback(results.data);
            },
            error: function(error) {
                console.error('Error parsing CSV:', error);
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
            subCriteria[key] = subCriteria[key].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicate sub-criteria
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
    });

    const addLocationForm = document.getElementById('add-location-form');
    const updateLocationModal = new bootstrap.Modal(document.getElementById('updateModal'));

    addLocationForm.addEventListener('submit', function(event) {
        event.preventDefault();

        // Contoh inisialisasi lokasi, gantilah dengan logika atau data sesuai kebutuhan Anda
        locations = [];
        for (let i = 0; i < 100; i++) {
            const newLocation = {
                id: i + 1, // Menambahkan ID pada setiap lokasi baru
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
                labels: locations.map(loc => `Lokasi ${loc.id}`), // Menggunakan ID lokasi yang sesuai
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

    function populateDataTable(locations, weights) {
        const dataTable = $('#locationsTable').DataTable();
        
        // Hancurkan DataTable jika sudah ada sebelumnya
        if ($.fn.DataTable.isDataTable('#locationsTable')) {
            dataTable.clear();
        }
    
        locations.forEach((location, index) => {
            const row = [
                location['id'],
                `Lokasi ${location.id}`, // Menampilkan ID lokasi
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
                `<button class="btn btn-primary btn-sm" onclick="openUpdateModal(${location.id})">Update</button>
                <button class="btn btn-danger btn-sm" onclick="deleteLocation(${location.id})">Delete</button>`
            ];
            dataTable.row.add(row).draw(false);
        });
    }

    // Fungsi untuk membuka modal update lokasi
    window.openUpdateModal = function(locationId) {
        const location = locations.find(loc => loc.id === locationId);
        if (location) {
            // Mengisi nilai modal dengan data lokasi yang ada
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

            // Membuka modal
            updateLocationModal.show();

            // Mengatur fungsi untuk menyimpan perubahan setelah modal ditutup
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
                    // Memperbarui nilai lokasi berdasarkan ID
                    location['transportasi-umum'] = updatedValues['transportasi-umum'];
                    location['kemudahan-akses-jalan'] = updatedValues['kemudahan-akses-jalan'];
                    location['kedekatan-dengan-pusat-kota'] = updatedValues['kedekatan-dengan-pusat-kota'];
                    location['biaya-tanah'] = updatedValues['biaya-tanah'];
                    location['biaya-operasional'] = updatedValues['biaya-operasional'];
                    location['biaya-perawatan'] = updatedValues['biaya-perawatan'];
                    location['keamanan'] = updatedValues['keamanan'];
                    location['kebersihan'] = updatedValues['kebersihan'];
                    location['kenyamanan'] = updatedValues['kenyamanan'];

                    // Menutup modal
                    updateLocationModal.hide();

                    // Memperbarui tabel dan grafik
                    const totalWeights = locations.map(calculateTotalWeight);
                    const bestIndex = totalWeights.indexOf(Math.max(...totalWeights));
                    displayResults(locations[bestIndex], totalWeights[bestIndex], bestIndex + 1);
                    displayChart(totalWeights, bestIndex);
                    populateDataTable(locations, totalWeights);
                } else {
                    alert(errorMessage);
                }
            };
        } else {
            alert(`Location with ID ${locationId} not found.`);
        }
    };

    function validateUpdatedValues(updatedValues) {
        const keys = ['transportasi-umum', 'kemudahan-akses-jalan', 'kedekatan-dengan-pusat-kota', 'biaya-tanah', 'biaya-operasional', 'biaya-perawatan', 'keamanan', 'kebersihan', 'kenyamanan'];
        for (const key of keys) {
            if (isNaN(updatedValues[key])) {
                return { valid: false, errorMessage: `Invalid value for '${key.replace(/-/g, ' ')}'. Please enter a valid number.` };
            }
        }
        return { valid: true };
    }

    // Fungsi untuk menghapus lokasi berdasarkan ID
    window.deleteLocation = function(locationId) {
        locations = locations.filter(location => location.id !== locationId);
        const totalWeights = locations.map(calculateTotalWeight);
        const bestIndex = totalWeights.indexOf(Math.max(...totalWeights));
        
        displayResults(locations[bestIndex], totalWeights[bestIndex], bestIndex + 1);
        displayChart(totalWeights, bestIndex);
        populateDataTable(locations, totalWeights);
    };

});
