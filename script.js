// Configuration de zip.js
// Important : permet d'utiliser les workers pour ne pas figer la page
zip.configure({
    useWebWorkers: true
});

const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const mergeBtn = document.getElementById('mergeBtn');
const statusSection = document.getElementById('statusSection');
const progressBar = document.getElementById('progressBar');
const logWindow = document.getElementById('logWindow');
const downloadSection = document.getElementById('downloadSection');
const downloadLink = document.getElementById('downloadLink');

let selectedFiles = [];

// Gestion de la sélection des fichiers
fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length > 3) {
        alert("Maximum 3 fichiers ZIP autorisés.");
        fileInput.value = ""; // Reset
        selectedFiles = [];
        renderFileList();
        return;
    }

    selectedFiles = files;
    renderFileList();
    
    if (selectedFiles.length > 0) {
        mergeBtn.disabled = false;
        mergeBtn.textContent = `Fusionner ${selectedFiles.length} Archives`;
    } else {
        mergeBtn.disabled = true;
    }
});

function renderFileList() {
    fileList.innerHTML = '';
    selectedFiles.forEach(file => {
        const div = document.createElement('div');
        div.className = 'file-item';
        // Affiche le nom et la taille en Mo/Go
        const size = (file.size / (1024 * 1024)).toFixed(2);
        div.textContent = `${file.name} (${size} MB)`;
        fileList.appendChild(div);
    });
}

function log(message) {
    const p = document.createElement('div');
    p.className = 'log-entry';
    // Ajout de l'heure
    const time = new Date().toLocaleTimeString();
    p.innerHTML = `<span style="color: #58a6ff">[${time}]</span> ${message}`;
    logWindow.appendChild(p);
    logWindow.scrollTop = logWindow.scrollHeight; // Auto-scroll vers le bas
}

mergeBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    // UI Updates
    mergeBtn.disabled = true;
    fileInput.disabled = true;
    statusSection.classList.remove('hidden');
    downloadSection.classList.add('hidden');
    log("Démarrage du processus...");

    try {
        // Création du writer (le fichier de sortie)
        const blobWriter = new zip.BlobWriter("application/zip");
        const zipWriter = new zip.ZipWriter(blobWriter);

        let totalFilesProcessed = 0;

        // Boucle sur chaque fichier ZIP importé
        for (const file of selectedFiles) {
            log(`Analyse de l'archive : ${file.name}`);
            
            // Création du reader pour lire l'archive source
            const zipReader = new zip.ZipReader(new zip.BlobReader(file));
            const entries = await zipReader.getEntries();
            
            log(`--> Trouvé ${entries.length} fichiers dans ${file.name}`);

            for (const entry of entries) {
                if (entry.directory) continue; // On ignore les dossiers vides, ils se créent auto

                // Mise à jour de la barre de progression (visuelle, approximative)
                progressBar.style.width = "50%"; // Indique qu'on est en cours de traitement
                
                log(`Extraction & Ajout: ${entry.filename}`);

                // Le cœur de la magie : Piping
                // On prend les données de l'entrée source et on les passe directement au writer
                // Sans tout charger en RAM d'un coup.
                const writerStream = new zip.Uint8ArrayWriter(); 
                // Note: Pour une optimisation maximale avec 10Go, l'idéal est le Stream,
                // mais le BlobReader/Writer est le plus stable sur tous les navigateurs mobiles actuels.
                
                const fileData = await entry.getData(new zip.Uint8ArrayWriter());
                await zipWriter.add(entry.filename, new zip.Uint8ArrayReader(fileData));
            }
            
            await zipReader.close();
            totalFilesProcessed++;
            log(`Terminé avec ${file.name}`);
        }

        log("Finalisation du nouveau fichier ZIP...");
        progressBar.style.width = "90%";
        
        // Fermeture du fichier final et génération du lien
        await zipWriter.close();
        const generatedBlob = await blobWriter.getData();
        
        log("Génération terminée !");
        progressBar.style.width = "100%";

        // Création de l'URL de téléchargement
        const downloadUrl = URL.createObjectURL(generatedBlob);
        downloadLink.href = downloadUrl;
        downloadLink.download = "archive_fusionnee.zip";
        
        // Affichage du bouton de téléchargement
        downloadSection.classList.remove('hidden');
        log(`Taille finale : ${(generatedBlob.size / (1024 * 1024)).toFixed(2)} MB`);

    } catch (error) {
        console.error(error);
        log(`ERREUR CRITIQUE: ${error.message}`);
        alert("Une erreur est survenue. Vérifiez la mémoire de votre appareil ou la corruption des fichiers.");
        mergeBtn.disabled = false;
    }
});
