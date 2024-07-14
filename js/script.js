document.addEventListener('DOMContentLoaded', () => {
    let criteria = [];
    let subCriteria = {};
    let criteriaWeights = [];
    let subCriteriaWeights = {};
    let chartInstance;
    let locations = [];

    const resultsOutput = document.getElementById('results-output');
    const criteriaWeightsTableBody = document.getElementById('criteria-weights-table').querySelector('tbody');
    const subCriteriaWeightsTableBody = document.getElementById('sub-criteria-weights-table').querySelector('tbody');
    const locationChartCtx = document.getElementById('locationChart').getContext('2d');
    const locationsTableBody = document.getElementById('locationsTable').querySelector('tbody');

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
            console.error(`Container element '${containerId}' tidak ditemukan.`);
            return;
        }

        let tableHtml = '<table><thead><tr><th></th>';

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
            subCriteria[key] = subCriteria[key].filter((v, i, a) => a.indexOf(v) === i); // Menghapus duplikat sub-kriteria
            const tbody = document.querySelector(`#sub-criteria-weights-table tbody`);
            if (tbody) {
                subCriteria[key].forEach((subCriterion, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `<td>${key}</td><td>${subCriterion}</td><td>${subCriteriaWeights[key][index]}</td>`;
                    tbody.appendChild(row);
                });
            } else {
                console.error(`Elemen tbody untuk sub-criteria-weights-table tidak ditemukan.`);
            }

            subCriteriaWeights[key] = normalizeWeights(subCriteriaWeights[key]);
            const subCriteriaMatrix = createPairwiseMatrix(subCriteria[key], subCriteriaWeights[key]);
            displayPairwiseMatrix(subCriteriaMatrix, `sub-criteria-pairwise-matrix-${key.replace(/ /g, '-')}`, subCriteria[key]);
        }
    });

    const addLocationForm = document.getElementById('add-location-form');

    addLocationForm.addEventListener('submit', function(event) {
        event.preventDefault();

        locations = [];
        for (let i = 0; i < 100; i++) {
            const newLocation = {
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
                    console.error(`Nilai '${subCriterion}' tidak valid.`);
                }
            });
        });

        return totalWeight;
    }

    function displayResults(location, totalWeight, locationIndex) {
        let resultsHtml = `<h3>Hasil Analisis Lokasi Terbaik</h3><p>Lokasi Terbaik: Lokasi ${locationIndex}</p><ul>`;

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
                labels: weights.map((_, index) => `Lokasi ${index + 1}`),
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
        // Hancurkan DataTable sebelumnya jika ada
        if ($.fn.DataTable.isDataTable('#locationsTable')) {
            $('#locationsTable').DataTable().clear().destroy();
        }
    
        locationsTableBody.innerHTML = '';
    
        // Urutkan data sebelum memasukkan ke dalam tabel
        locations.sort((a, b) => a.index - b.index);
    
        locations.forEach((location, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>Lokasi ${index + 1}</td>
                <td>${location['transportasi-umum']}</td>
                <td>${location['kemudahan-akses-jalan']}</td>
                <td>${location['kedekatan-dengan-pusat-kota']}</td>
                <td>${location['biaya-tanah']}</td>
                <td>${location['biaya-operasional']}</td>
                <td>${location['biaya-perawatan']}</td>
                <td>${location['keamanan']}</td>
                <td>${location['kebersihan']}</td>
                <td>${location['kenyamanan']}</td>
                <td>${weights[index].toFixed(4)}</td>
            `;
            locationsTableBody.appendChild(row);
        });

        const updateLocationForm = document.getElementById('update-location-form');

updateLocationForm.addEventListener('submit', function(event) {
    event.preventDefault();

    const locationId = parseInt(document.getElementById('location-id').value) - 1;
    if (locationId < 0 || locationId >= locations.length) {
        alert('ID lokasi tidak valid.');
        return;
    }

    const updatedLocation = {
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

    // Memperbarui lokasi
    locations[locationId] = updatedLocation;

    // Menghitung ulang total bobot dan memperbarui grafik
    const totalWeights = locations.map(calculateTotalWeight);
    const bestIndex = totalWeights.indexOf(Math.max(...totalWeights));

    displayResults(locations[bestIndex], totalWeights[bestIndex], bestIndex + 1);
    displayChart(totalWeights, bestIndex);
    populateDataTable(locations, totalWeights);
});


    
        // Inisialisasi DataTable baru dengan pengaturan yang diperbarui
        $('#locationsTable').DataTable({
            "scrollX": true,
            "order": [[0, 'asc']],
            "columnDefs": [{
                "targets": 0,
                "type": "natural"
            }]
        });
    }
});
