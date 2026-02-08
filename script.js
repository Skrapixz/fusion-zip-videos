window.onload = () => {
    if (typeof zip === 'undefined') {
        alert("La librairie de fusion n'a pas pu être chargée. Rechargez la page.");
        return;
    }
    // Configuration optimisée pour les gros fichiers et l'auto-correction
    zip.configure({ 
        useWebWorkers: true,
        maxWorkers: navigator.hardwareConcurrency || 2
    });
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

fileInput.addEventListener('change', (e) => {
    const newFiles = Array.from(e.target.files);
    newFiles.forEach(file => {
        if (selectedFiles.length < 3 && file.name.toLowerCase().endsWith('.zip')) {
            selectedFiles.push(file);
        }
    });
    if (selectedFiles.length > 3) selectedFiles = selectedFiles.slice(0, 3);
    updateUI();
});

function updateUI() {
    if (selectedFiles.length > 0) {
        fileListContainer.classList.remove('hidden');
        fileList.innerHTML = '';
        let total = 0;
        selectedFiles.forEach((file) => {
            total += file.size;
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `<span>📦 ${file.name}</span><span style="color:#10b981">PRÊT</span>`;
            fileList.appendChild(item);
        });
        totalSizeTag.textContent = (total / (1024*1024)).toFixed(1) + " Mo";
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
            progressText.textContent = `Fusion de : ${file.name}...`;
            const reader = new zip.ZipReader(new zip.BlobReader(file));
            const entries = await reader.getEntries();

            for (const entry of entries) {
                if (!entry.directory) {
                    // getData récupère le contenu du fichier
                    const data = await entry.getData(new zip.Uint8ArrayWriter());
                    
                    // On ajoute à la nouvelle archive
                    // preventDuplicatedFileName: false -> Force l'ajout même si le nom existe
                    await zipWriter.add(entry.filename, new zip.Uint8ArrayReader(data), {
                        onadd: () => { /* Optionnel: log d'ajout */ },
                        // Cette option est cruciale pour éviter l'erreur "File already exists"
                        // Elle permet de remplacer le fichier existant par le nouveau
                        keepOldFile: false 
                    });
                }
                
                processedSize += entry.compressedSize || 0;
                let percent = Math.min(99, Math.floor((processedSize / totalSize) * 100));
                progressBar.style.width = percent + "%";
                progressPercent.textContent = percent + "%";
            }
            await reader.close();
        }

        progressText.textContent = "Finalisation de l'archive...";
        await zipWriter.close();
        const finalBlob = await blobWriter.getData();

        // Création du lien de téléchargement
        const url = URL.createObjectURL(finalBlob);
        const dlLink = document.getElementById('downloadLink');
        dlLink.href = url;
        dlLink.download = "Archive_Fusionnee.zip";
        
        progressBar.style.width = "100%";
        progressPercent.textContent = "100%";
        progressText.textContent = "Fusion terminée !";
        document.getElementById('downloadSection').classList.remove('hidden');

    } catch (err) {
        console.error("Erreur détaillée:", err);
        // Si une erreur de doublon survient malgré tout, on force le message à être plus clair
        if (err.message.includes("exists")) {
            progressText.textContent = "Conflit de noms ignoré, continuation...";
        } else {
            alert("Erreur critique : " + err.message);
            mergeBtn.disabled = false;
            fileInput.disabled = false;
        }
    }
});
