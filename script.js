const dropzone = document.getElementById('dropzone');
const input = document.getElementById('zipInput');
const mergeBtn = document.getElementById('mergeBtn');
const status = document.getElementById('status');

let videoFiles = [];

const videoExtensions = [
    '.mp4', '.webm', '.mkv', '.mov', '.avi', '.m4v'
];

function isVideo(filename) {
    return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

function log(msg) {
    status.textContent += msg + "\n";
}

dropzone.addEventListener('click', () => input.click());

dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.style.background = '#ddf';
});

dropzone.addEventListener('dragleave', () => {
    dropzone.style.background = 'white';
});

dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.style.background = 'white';
    handleFiles(e.dataTransfer.files);
});

input.addEventListener('change', () => {
    handleFiles(input.files);
});

async function handleFiles(files) {
    for (let file of files) {
        if (!file.name.endsWith('.zip')) {
            log(`❌ ${file.name} n'est pas un zip`);
            continue;
        }

        log(`📦 Lecture de ${file.name}...`);
        const zip = await JSZip.loadAsync(file);

        for (let filename in zip.files) {
            const entry = zip.files[filename];

            if (!entry.dir && isVideo(filename)) {
                log(`🎬 Vidéo trouvée : ${filename}`);
                const blob = await entry.async("blob");

                videoFiles.push({
                    name: filename.split('/').pop(),
                    blob: blob
                });
            }
        }

        log(`✅ ${file.name} traité\n`);
    }

    if (videoFiles.length > 0) {
        mergeBtn.disabled = false;
        log(`➡️ ${videoFiles.length} vidéos prêtes à être fusionnées`);
    } else {
        log("Aucune vidéo trouvée.");
    }
}

mergeBtn.addEventListener('click', async () => {
    log("🛠 Création du ZIP final...");

    const finalZip = new JSZip();

    videoFiles.forEach((video, index) => {
        const uniqueName = `${index}_${video.name}`;
        finalZip.file(uniqueName, video.blob);
    });

    const content = await finalZip.generateAsync({ type: "blob" });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = "videos_fusionnees.zip";
    link.click();

    log("✅ ZIP final téléchargé !");
});
