// Initialisation
window.onload = () => {
    if (typeof zip === 'undefined') {
        alert("Erreur : La librairie ZIP n'est pas chargée.");
    } else {
        zip.configure({ useWebWorkers: true });
    }
};

const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const fileListContainer = document.getElementById('fileListContainer');
const totalSizeTag = document.getElementById('totalSizeTag');
const mergeBtn = document.getElementById('mergeBtn');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');

// Éléments de conflit
const conflictBox = document.getElementById('conflictBox');
const conflictFileName = document.getElementById('conflictFileName');
const overwriteBtn = document.getElementById('overwriteBtn');

let selectedFiles = [];

// Gestion des fichiers sélectionnés
fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(f => {
        if (selectedFiles.length < 3 && f.name.toLowerCase().endsWith('.zip')) {
            selectedFiles.push(f);
        }
    });
    updateUI();
});

function updateUI() {
    if (selectedFiles.length > 0) {
        fileListContainer.classList.remove('hidden');
        fileList.innerHTML = '';
        let total = 0;
        selectedFiles.forEach(f => {
            total += f.size;
            fileList.innerHTML += `<div class="file-item"><span>📦 ${f.name}</span><span>${(f.size/(1024*1024)).toFixed(1)} Mo</span></div>`;
        });
        totalSizeTag.textContent = (total/(1024*1024)).toFixed(1) + " Mo";
        mergeBtn.disabled = false;
    }
}

// LOGIQUE DE FUSION AVEC PAUSE SUR DOUBLON
mergeBtn.addEventListener('click', async () => {
    mergeBtn.disabled = true;
    fileInput.disabled = true;
    progressSection.classList.remove('hidden');

    try {
        const blobWriter = new zip.BlobWriter("application/zip");
        const zipWriter = new zip.ZipWriter(blobWriter);
        const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
        let processedSize = 0;

        for (const file of selectedFiles) {
            const reader = new zip.ZipReader(new zip.BlobReader(file));
            const entries = await reader.getEntries();

            for (const entry of entries) {
                if (entry.directory) continue;

                const data = await entry.getData(new zip.Uint8ArrayWriter());

                try {
                    // Tentative d'ajout normal
                    await zipWriter.add(entry.filename, new zip.Uint8ArrayReader(data));
                } catch (err) {
                    // Si doublon détecté
                    if (err.message.includes("exists")) {
                        // 1. Afficher l'alerte et le nom du fichier
                        conflictFileName.textContent = entry.filename;
                        conflictBox.classList.remove('hidden');
                        progressText.textContent = "EN PAUSE : Doublon trouvé";

                        // 2. Attendre le clic sur "Écraser et continuer"
                        await new Promise(resolve => {
                            overwriteBtn.onclick = () => {
                                conflictBox.classList.add('hidden');
                                resolve();
                            };
                        });

                        // 3. Forcer l'ajout après le clic
                        await zipWriter.add(entry.filename, new zip.Uint8ArrayReader(data), { keepOldFile: false });
                    } else {
                        throw err;
                    }
                }

                processedSize += entry.compressedSize || 0;
                let percent = Math.min(99, Math.floor((processedSize / totalSize) * 100));
                progressBar.style.width = percent + "%";
                progressPercent.textContent = percent + "%";
                progressText.textContent = `Traitement : ${entry.filename}`;
            }
            await reader.close();
        }

        await zipWriter.close();
        const finalBlob = await blobWriter.getData();
        document.getElementById('downloadLink').href = URL.createObjectURL(finalBlob);
        document.getElementById('downloadLink').download = "Fusion_Archive.zip";

        progressSection.classList.add('hidden');
        document.getElementById('downloadSection').classList.remove('hidden');

    } catch (err) {
        alert("Erreur : " + err.message);
        location.reload();
    }
});
