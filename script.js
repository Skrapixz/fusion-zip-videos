// Initialisation de la librairie
window.onload = () => {
    if (typeof zip !== 'undefined') {
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

const conflictBox = document.getElementById('conflictBox');
const conflictFileName = document.getElementById('conflictFileName');
const overwriteBtn = document.getElementById('overwriteBtn');

let selectedFiles = [];

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(f => {
        if (selectedFiles.length < 5 && f.name.toLowerCase().endsWith('.zip')) {
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
                    // On tente l'ajout
                    await zipWriter.add(entry.filename, new zip.Uint8ArrayReader(data));
                } catch (err) {
                    // Si le fichier existe déjà
                    if (err.message.toLowerCase().includes("exists")) {
                        conflictFileName.textContent = entry.filename;
                        conflictBox.classList.remove('hidden');
                        progressText.textContent = "CONFLIT : En attente de décision...";

                        // PAUSE : On attend ton clic
                        await new Promise(resolve => {
                            overwriteBtn.onclick = () => {
                                conflictBox.classList.add('hidden');
                                resolve();
                            };
                        });

                        // Reprise avec écrasement forcé
                        await zipWriter.add(entry.filename, new zip.Uint8ArrayReader(data), { keepOldFile: false });
                    } else {
                        throw err;
                    }
                }

                processedSize += entry.compressedSize || 0;
                let percent = Math.min(99, Math.floor((processedSize / totalSize) * 100));
                progressBar.style.width = percent + "%";
                progressPercent.textContent = percent + "%";
                progressText.textContent = `Fusion de ${entry.filename}`;
            }
            await reader.close();
        }

        await zipWriter.close();
        const finalBlob = await blobWriter.getData();
        document.getElementById('downloadLink').href = URL.createObjectURL(finalBlob);
        document.getElementById('downloadLink').download = "Archives_Fusionnees.zip";

        progressSection.classList.add('hidden');
        document.getElementById('downloadSection').classList.remove('hidden');

    } catch (err) {
        console.error(err);
        alert("Une erreur est survenue. Le site va redémarrer.");
        location.reload();
    }
});
