const zipInput = document.getElementById('zipInput');
const importBtn = document.getElementById('importBtn');
const startBtn = document.getElementById('startBtn');
const folderBtn = document.getElementById('folderBtn');
const progressBar = document.getElementById('progressBar');
const logBox = document.getElementById('log');

let selectedZips = [];
let directoryHandle = null;
let filesForFinalZip = [];

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

function log(msg) {
    logBox.textContent += msg + "\n";
}

function setProgress(p) {
    progressBar.style.width = p + "%";
}

importBtn.onclick = () => zipInput.click();

zipInput.onchange = (e) => {
    selectedZips = [...e.target.files];
    log(selectedZips.length + " ZIP importés.");
};

folderBtn.onclick = async () => {
    try {
        directoryHandle = await window.showDirectoryPicker();
        log("Dossier sélectionné.");
    } catch {}
};

startBtn.onclick = async () => {
    if (selectedZips.length === 0) {
        log("Importe des ZIP.");
        return;
    }

    let totalFiles = 0;
    let processed = 0;

    // Compter fichiers
    for (let zipFile of selectedZips) {
        const zip = await JSZip.loadAsync(zipFile);
        totalFiles += Object.values(zip.files).filter(f => !f.dir).length;
    }

    for (let zipFile of selectedZips) {
        log("Ouverture " + zipFile.name);
        const zip = await JSZip.loadAsync(zipFile);

        for (let name in zip.files) {
            const entry = zip.files[name];
            if (entry.dir) continue;

            const blob = await entry.async("blob");

            if (isMobile) {
                if (!directoryHandle) {
                    log("Choisis un dossier !");
                    return;
                }

                const handle = await directoryHandle.getFileHandle(
                    name.split('/').pop(),
                    { create: true }
                );
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                filesForFinalZip.push({
                    name: name.split('/').pop(),
                    blob
                });
            }

            processed++;
            setProgress(Math.floor((processed / totalFiles) * 100));
        }
    }

    if (!isMobile) {
        log("Création ZIP final...");
        const finalZip = new JSZip();

        filesForFinalZip.forEach((f, i) => {
            finalZip.file(i + "_" + f.name, f.blob);
        });

        const content = await finalZip.generateAsync({ type: "blob" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(content);
        a.download = "ZIP_FUSION_FINAL.zip";
        a.click();
    }

    log("Terminé.");
};
