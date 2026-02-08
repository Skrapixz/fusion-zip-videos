// On attend que la page et la bibliothèque soient chargées
window.onload = () => {
    if (typeof zip === 'undefined') {
        alert("La bibliothèque de fusion n'a pas pu être chargée. Rechargez la page.");
        return;
    }
    zip.configure({ useWebWorkers: true });
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

let selectedFiles = [];

// Fonction pour ajouter des fichiers à la liste existante
fileInput.addEventListener('change', (e) => {
    const newFiles = Array.from(e.target.files);
    
    // On ajoute les nouveaux fichiers sans dépasser 3 au total
    newFiles.forEach(file => {
        if (selectedFiles.length < 3 && file.name.toLowerCase().endsWith('.zip')) {
            selectedFiles.push(file);
        }
    });

    if (selectedFiles.length > 3) {
        alert("Seuls les 3 premiers fichiers ZIP ont été conservés.");
        selectedFiles = selectedFiles.slice(0, 3);
    }

    updateUI();
});

function updateUI() {
    if (selectedFiles.length > 0) {
        fileListContainer.classList.remove('hidden');
        fileList.innerHTML = '';
        let total = 0;

        selectedFiles.forEach((file, index) => {
            total += file.size;
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <span>📦 ${file.name}</span>
                <span style="color:#10b981">PRÊT (${(file.size / (1024*1024)).toFixed(1)} Mo)</span>
            `;
            fileList.appendChild(item);
        });

        totalSizeTag.textContent = (total / (1024*1024)).toFixed(1) + " Mo";
        mergeBtn.disabled = false;
        mergeBtn.textContent = `Fusionner les ${selectedFiles.length} fichiers`;
    }
}

mergeBtn.addEventListener('click', async () => {
    mergeBtn.disabled = true;
    progressSection.classList.remove('hidden');
    
    try {
        const blobWriter = new zip.BlobWriter("application/zip");
        const zipWriter = new zip.ZipWriter(blobWriter);

        // Progression réelle basée sur la taille traitée
        const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
        let processedSize = 0;

        for (const file of selectedFiles) {
            progressText.textContent = `Lecture de ${file.name}...`;
            const reader = new zip.ZipReader(new zip.BlobReader(file));
            const entries = await reader.getEntries();

            for (const entry of entries) {
                if (!entry.directory) {
                    // Extraction et ajout direct
                    const data = await entry.getData(new zip.Uint8ArrayWriter());
                    await zipWriter.add(entry.filename, new zip.Uint8ArrayReader(data));
                }
                // Mise à jour de la barre réelle
                processedSize += entry.compressedSize || 0;
                let percent = Math.min(98, Math.floor((processedSize / totalSize) * 100));
                progressBar.style.width = percent + "%";
                progressPercent.textContent = percent + "%";
            }
            await reader.close();
        }

        progressText.textContent = "Création du fichier final...";
        await zipWriter.close();
        const finalBlob = await blobWriter.getData();

        // Affichage du lien de téléchargement
        const url = URL.createObjectURL(finalBlob);
        document.getElementById('downloadLink').href = url;
        document.getElementById('downloadLink').download = "fusion_fichiers.zip";
        
        progressBar.style.width = "100%";
        progressPercent.textContent = "100%";
        progressText.textContent = "Fusion réussie !";
        document.getElementById('downloadSection').classList.remove('hidden');

    } catch (err) {
        alert("Erreur lors de la fusion : " + err.message);
        mergeBtn.disabled = false;
    }
});

document.getElementById('resetBtn').onclick = () => location.reload();
