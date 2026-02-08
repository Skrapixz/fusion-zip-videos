// On importe zip.js directement depuis le web (version moderne ES Module)
import * as zip from "https://cdn.jsdelivr.net/npm/@zip.js/zip.js@2.7.34/index.js";

// --- Configuration ---
const MAX_FILES = 3;
// On active les workers pour ne pas geler le téléphone pendant le calcul
zip.configure({ useWebWorkers: true });

// --- Éléments du DOM ---
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

// --- Utilitaire : Formatter la taille (Ko, Mo, Go) ---
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// --- Étape 1 : Gestion de l'importation ---

// Effet visuel quand on survole la zone
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('active');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('active');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('active');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function handleFiles(files) {
    // Conversion en tableau
    const newFiles = Array.from(files);

    // Vérification basique
    if (newFiles.length === 0) return;
    
    // Vérification nombre de fichiers
    if (newFiles.length > MAX_FILES) {
        alert(`Vous ne pouvez importer que ${MAX_FILES} fichiers maximum.`);
        fileInput.value = ""; // Reset
        return;
    }

    // Vérification extension (simple check nom)
    const validFiles = newFiles.filter(f => f.name.toLowerCase().endsWith('.zip'));
    if (validFiles.length !== newFiles.length) {
        alert("Seuls les fichiers .zip sont autorisés !");
        return;
    }

    selectedFiles = validFiles;
    updateUIWithFiles();
}

function updateUIWithFiles() {
    // Affiche la liste
    fileListContainer.classList.remove('hidden');
    fileList.innerHTML = ''; // Nettoyer liste précédente
    
    let totalSize = 0;

    selectedFiles.forEach(file => {
        totalSize += file.size;
        
        // Création de l'élément visuel
        const div = document.createElement('div');
        div.className = 'file-item';
        div.innerHTML = `
            <div class="f-icon">📦</div>
            <div class="f-info">
                <span class="f-name">${file.name}</span>
                <span class="f-size">${formatBytes(file.size)} - <span style="color:#10b981">Prêt</span></span>
            </div>
            <div class="f-status">✓</div>
        `;
        fileList.appendChild(div);
    });

    totalSizeTag.textContent = formatBytes(totalSize);
    
    // Activer le bouton si on a des fichiers
    mergeBtn.disabled = selectedFiles.length === 0;
    mergeBtn.textContent = `Fusionner ${selectedFiles.length} Archive(s)`;
    
    // Cacher les sections précédentes si on recommence
    downloadSection.classList.add('hidden');
    progressSection.classList.add('hidden');
}

// --- Étape 2 : Le Processus de Fusion (Le coeur du code) ---

mergeBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    // UI : Passage en mode "Travail"
    mergeBtn.disabled = true;
    fileInput.disabled = true;
    progressSection.classList.remove('hidden');
    
    try {
        // 1. Préparation du Writer (le fichier de sortie)
        const blobWriter = new zip.BlobWriter("application/zip");
        const zipWriter = new zip.ZipWriter(blobWriter);

        // Calcul pour la barre de progression globale
        // On estime que le travail total = somme des tailles des fichiers input
        const totalBytesToProcess = selectedFiles.reduce((acc, f) => acc + f.size, 0);
        let currentBytesProcessed = 0;

        // Fonction pour mettre à jour la barre
        const updateProgress = (bytesAdded) => {
            currentBytesProcessed += bytesAdded;
            // On limite à 99% tant que le blob final n'est pas généré
            let percent = Math.min(99, Math.floor((currentBytesProcessed / totalBytesToProcess) * 100));
            progressBar.style.width = `${percent}%`;
            progressPercent.textContent = `${percent}%`;
        };

        progressText.textContent = "Analyse des archives...";

        // 2. Boucle sur chaque fichier ZIP importé
        for (const file of selectedFiles) {
            progressText.textContent = `Traitement de : ${file.name}`;
            
            // On lit le fichier source
            const zipReader = new zip.ZipReader(new zip.BlobReader(file));
            const entries = await zipReader.getEntries();

            // Pour chaque fichier dans le ZIP source
            for (const entry of entries) {
                if (entry.directory) continue;

                // On copie le fichier d'un zip à l'autre
                // On utilise Uint8ArrayWriter pour le transfert direct en mémoire
                // Note : Pour les très gros fichiers, c'est ici que la RAM du mobile peut souffrir
                const entryData = await entry.getData(new zip.Uint8ArrayWriter());
                
                await zipWriter.add(entry.filename, new zip.Uint8ArrayReader(entryData));
                
                // On met à jour la progression (taille compressée approximative)
                updateProgress(entry.compressedSize);
            }
            
            await zipReader.close();
        }

        // 3. Finalisation
        progressText.textContent = "Génération du fichier final...";
        await zipWriter.close(); // Ferme le ZIP
        
        const generatedBlob = await blobWriter.getData(); // Récupère le fichier binaire

        // 4. Succès
        progressBar.style.width = "100%";
        progressPercent.textContent = "100%";
        
        // Création du lien de téléchargement
        const downloadUrl = URL.createObjectURL(generatedBlob);
        downloadLink.href = downloadUrl;
        downloadLink.download = "Archive_Fusionnee_Ultimate.zip";
        
        // Affichage final
        progressSection.classList.add('hidden');
        downloadSection.classList.remove('hidden');
        fileInput.disabled = false;

    } catch (error) {
        console.error(error);
        alert("Erreur lors de la fusion : " + error.message);
        progressText.textContent = "Erreur !";
        progressText.style.color = "red";
        mergeBtn.disabled = false;
        fileInput.disabled = false;
    }
});

// Bouton Recommencer
resetBtn.addEventListener('click', () => {
    location.reload();
});
