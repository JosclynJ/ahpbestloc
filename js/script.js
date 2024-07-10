document.addEventListener('DOMContentLoaded', () => {
    let criteria = [];
    let subCriteria = {};
    let criteriaWeights = [];
    let subCriteriaWeights = {};

    const resultsOutput = document.getElementById('results-output');
    const criteriaWeightsTableBody = document.getElementById('criteria-weights-table').querySelector('tbody');
    const subCriteriaWeightsTableBody = document.getElementById('sub-criteria-weights-table').querySelector('tbody');

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

        // Mendapatkan nilai acak untuk setiap input dan memasukkannya ke dalam objek newLocation
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

        // Menetapkan nilai acak ke dalam masing-masing input
        Object.keys(newLocation).forEach(key => {
            document.getElementById(key).value = newLocation[key];
        });

        const totalWeight = calculateTotalWeight(newLocation);
        displayResults(newLocation, totalWeight);
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
                // Mengubah subCriterion menjadi format kunci yang digunakan di newLocation
                const key = subCriterion.toLowerCase().replace(/ /g, '-');
                const value = parseInt(location[key]);

                if (!isNaN(value)) {
                    totalWeight += value * subCriteriaWeightsList[idx] * criteriaWeight;
                } else {
                    console.error(`Nilai '${subCriterion}' tidak valid.`);
                }
            });
        });

        return totalWeight.toFixed(4);
    }

    function displayResults(location, totalWeight) {
        let resultsHtml = `<h3>Hasil Analisis Lokasi Baru</h3><ul>`;

        // for (const [key, value] of Object.entries(location)) {
        //     resultsHtml += `<li>${key.replace(/-/g, ' ')}: ${value}</li>`;
        // }

        resultsHtml += `</ul><p>Total Weight: ${totalWeight}</p>`;
        resultsOutput.innerHTML = resultsHtml;
    }
});
