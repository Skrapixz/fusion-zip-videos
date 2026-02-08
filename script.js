const zipInput = document.getElementById('zipInput');
const startBtn = document.getElementById('startBtn');
const chooseFolderBtn = document.getElementById('chooseFolderBtn');
const logDiv = document.getElementById('log');
const progressBar = document.getElementById('progressBar');

let directoryHandle = null;
let allFiles = [];
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

function log(msg) {
    logDiv.textContent += msg + "\n";
}

function updateProgress(p) {
    progressBar.style.width = p + "%";
}

chooseFolderBtn.addEventListener('click', async () => {
    try {
        directoryHandle = await window.showDirectoryPicker();
        log("Dossier choisi !");
    } catch {}
});

startBtn.addEventListener('click', async () => {
    const files = zipInput.files;
    if (files.length === 0) {
        log("Ajoute des ZIP !");
        return;
    }

    log("Lecture des ZIP...");
    let totalEntries = 0;

    // 1) Lire tous les zips et compter
    for (let file of files) {
        const zip = await JSZip.loadAsync(file);
        totalEntries += Object.keys(zip.files).length;
    }

    let processed = 0;

    // 2) Extraction
    for (let file of files) {
        log("Ouverture : " + file.name);
        const zip = await JSZip.loadAsync(file);

        for (let name in zip.files) {
            const entry = zip.files[name];
            if (entry.dir) continue;

            const blob = await entry.async("blob");

            if (isMobile) {
                if (!directoryHandle) {
                    log("Choisis un dossier !");
                    return;
                }

                const fileHandle = await directoryHandle.getFileHandle(
                    name.split('/').pop(),
                    { create: true }
                );
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                allFiles.push({ name: name.split('/').pop(), blob });
            }

            processed++;
            updateProgress(Math.round((processed / totalEntries) * 100));
        }
    }

    // 3) PC : créer le ZIP final
    if (!isMobile) {
        log("Création du ZIP final...");
        const finalZip = new JSZip();

        allFiles.forEach((f, i) => {
            finalZip.file(i + "_" + f.name, f.blob);
        });

        const content = await finalZip.generateAsync({ type: "blob" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(content);
        a.download = "fusion_finale.zip";
        a.click();
    }

    log("Terminé !");
});
