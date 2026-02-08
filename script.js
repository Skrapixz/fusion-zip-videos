// Configuration simple
const MAX_FILES = 3;

// On vérifie que la librairie est chargée
if (typeof zip === 'undefined') {
    alert("Erreur critique : La librairie ZIP n'est pas chargée. Vérifiez votre connexion internet.");
} else {
    zip.configure({ useWebWorkers: true });
}

// Sélection des éléments
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const fileListContainer = document.getElementById('fileListContainer');
const fileList = document.getElementById('fileList');
const totalSizeTag = document.getElementById('totalSizeTag');
const mergeBtn = document.getElementById('mergeBtn');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');
const downloadSection = document.getElementById('downloadSection');
const downloadLink = document.getElementById('downloadLink');
const resetBtn = document.getElementById('resetBtn');

let selectedFiles = [];

// Utilitaire taille
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

// --- Étape 1 : Gestion Fichiers ---

// Le "change" détecte quand on sélectionne des fichiers (via clic ou drag & drop sur l'input)
fileInput.addEventListener('change', (e) => {
    console.log("Fichiers détectés !");
    handleFiles(e.target.files);
});

function handleFiles(files) {
    const newFiles = Array.from(files);
    
    if (newFiles.length === 0) return;
    if (newFiles.length > MAX_FILES) {
        alert("Maximum 3 fichiers !");
        fileInput.value = ""; 
        return;
    }

    selectedFiles = newFiles;
    updateUI();
}

function updateUI() {
    fileListContainer.classList.remove('hidden');
    fileList.innerHTML = '';
    
    let totalSize = 0;
    selectedFiles.forEach(file => {
        totalSize += file.size;
        const div = document.createElement('div');
        div.className = 'file-item';
        div.innerHTML = `<span>📦 ${file.name}</span><span>${formatBytes(file.size)}</span>`;
        fileList.appendChild(div);
    });

    totalSizeTag.textContent = formatBytes(totalSize);
    
    if (selectedFiles.length > 0) {
        mergeBtn.disabled = false;
        mergeBtn.textContent = `Fusionner (${selectedFiles.length})`;
        mergeBtn.style.opacity = "1";
    }
}

// --- Étape 2 : Fusion ---

mergeBtn.addEventListener('click', async () => {
    console.log("Démarrage fusion...");
    if (selectedFiles.length === 0) return;

    mergeBtn.disabled = true;
    fileInput.disabled = true; // Empêche de changer pendant le chargement
    progressSection.classList.remove('hidden');
    
    try {
        const blobWriter = new zip.BlobWriter("application/zip");
        const zipWriter = new zip.ZipWriter(blobWriter);

        // Calcul total pour progression
        const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
        let processedSize = 0;

        for (const file of selectedFiles) {
            progressText.textContent = `Traitement : ${file.name}`;
            
            const zipReader = new zip.ZipReader(new zip.BlobReader(file));
            const entries = await zipReader.getEntries();

            for (const entry of entries) {
                if (entry.directory) continue;

                // Lecture et écriture en flux
                const data = await entry.getData(new zip.Uint8ArrayWriter());
                await zipWriter.add(entry.filename, new zip.Uint8ArrayReader(data));
                
                // Mise à jour barre
                processedSize += entry.compressedSize; // Approximation
                const percent = Math.min(95, Math.floor((processedSize / totalSize) * 100));
                progressBar.style.width = `${percent}%`;
                progressPercent.textContent = `${percent}%`;
            }
            await zipReader.close();
        }

        progressText.textContent = "Finalisation...";
        await zipWriter.close();
        
        const finalBlob = await blobWriter.getData();
        
        // Succès
        progressBar.style.width = "100%";
        progressPercent.textContent = "100%";
        
        const url = URL.createObjectURL(finalBlob);
        downloadLink.href = url;
        downloadLink.download = "Archive_Complete.zip";
        
        progressSection.classList.add('hidden');
        downloadSection.classList.remove('hidden');
        console.log("Fusion terminée avec succès.");

    } catch (err) {
        console.error(err);
        alert("Erreur : " + err.message);
        mergeBtn.disabled = false;
        fileInput.disabled = false;
    }
});

resetBtn.addEventListener('click', () => location.reload());
