const zipInput = document.getElementById('zipInput');
const chooseFolderBtn = document.getElementById('chooseFolder');
const logDiv = document.getElementById('log');

let directoryHandle = null;

function log(msg) {
    logDiv.textContent += msg + "\n";
}

const videoExtensions = ['.mp4', '.mkv', '.mov', '.webm', '.avi', '.m4v'];

function isVideo(name) {
    return videoExtensions.some(ext => name.toLowerCase().endsWith(ext));
}

// Choix du dossier local (iPhone & PC modernes)
chooseFolderBtn.addEventListener('click', async () => {
    try {
        directoryHandle = await window.showDirectoryPicker();
        log("📁 Dossier sélectionné !");
    } catch (e) {
        log("❌ Sélection annulée");
    }
});

zipInput.addEventListener('change', async (e) => {
    if (!directoryHandle) {
        log("⚠️ Choisis d'abord un dossier !");
        return;
    }

    for (let file of e.target.files) {
        log(`📦 Lecture de ${file.name}`);
        const zip = await JSZip.loadAsync(file);

        for (let filename in zip.files) {
            const entry = zip.files[filename];

            if (!entry.dir && isVideo(filename)) {
                log(`🎬 Extraction : ${filename}`);

                const content = await entry.async("blob");

                const fileHandle = await directoryHandle.getFileHandle(
                    filename.split('/').pop(),
                    { create: true }
                );

                const writable = await fileHandle.createWritable();
                await writable.write(content);
                await writable.close();
            }
        }

        log(`✅ ${file.name} terminé\n`);
    }

    log("🎉 Toutes les vidéos sont dans le dossier !");
});
