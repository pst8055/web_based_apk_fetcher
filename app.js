import { AdbDaemonWebUsb } from "https://esm.sh/@yume-chan/adb-daemon-webusb";
import { Adb } from "https://esm.sh/@yume-chan/adb";

let adb = null;
let allApps = [];

const connectBtn = document.getElementById('connectBtn');
const statusText = document.getElementById('statusText');
const appSection = document.getElementById('appSection');
const refreshBtn = document.getElementById('refreshBtn');
const searchBox = document.getElementById('searchBox');
const appList = document.getElementById('appList');
const loading = document.getElementById('loading');
const errorMsg = document.getElementById('errorMsg');

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
    setTimeout(() => {
        errorMsg.style.display = 'none';
    }, 5000);
}

async function connect() {
    try {
        const device = await AdbDaemonWebUsb.requestDevice();
        const connection = await device.connect();

        // CredentialStore is optional for newer ADB versions or if we don't need to save keys, 
        // but often required for authentication. 
        // For simplicity in this demo, we'll try to use the default empty credential store 
        // or let the library handle key generation if possible.
        // The library usually handles the RSA key handshake.

        adb = await Adb.open(connection);

        statusText.textContent = `Connected: ${device.serial}`;
        statusText.className = 'status-text status-connected';
        connectBtn.disabled = true;
        connectBtn.textContent = "Connected";
        appSection.style.display = 'block';

        loadApps();

    } catch (e) {
        console.error(e);
        showError(`Connection failed: ${e.message}`);
        if (e.message.includes("No device selected")) {
            // User cancelled picker, ignore
        }
    }
}

async function loadApps() {
    if (!adb) return;

    loading.style.display = 'block';
    appList.innerHTML = '';
    allApps = [];
    searchBox.disabled = true;

    try {
        // Run: pm list packages -f -3
        // Output format: package:/data/app/~~.../base.apk=com.example.app
        const output = await runShellCommand('pm list packages -f -3');

        const lines = output.split('\n');
        for (const line of lines) {
            if (line.startsWith('package:')) {
                const cleanLine = line.substring(8).trim(); // Remove 'package:'
                const parts = cleanLine.rsplit('=', 1); // Split by last '='
                if (parts.length === 2) {
                    allApps.push({
                        path: parts[0],
                        id: parts[1]
                    });
                }
            }
        }

        allApps.sort((a, b) => a.id.localeCompare(b.id));
        renderApps(allApps);
        searchBox.disabled = false;

    } catch (e) {
        console.error(e);
        showError("Failed to list apps. Make sure device is authorized.");
    } finally {
        loading.style.display = 'none';
    }
}

async function runShellCommand(command) {
    const process = await adb.subprocess.spawn(command);
    let output = '';

    // Read stdout
    const reader = process.stdout.getReader();
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            output += new TextDecoder().decode(value);
        }
    } finally {
        reader.releaseLock();
    }

    return output;
}

// Helper to split string by last occurrence of delimiter
String.prototype.rsplit = function (sep, maxsplit) {
    const split = this.split(sep);
    return maxsplit ? [split.slice(0, -maxsplit).join(sep)].concat(split.slice(-maxsplit)) : split;
}

function renderApps(apps) {
    appList.innerHTML = '';
    apps.forEach(app => {
        const li = document.createElement('li');
        li.className = 'app-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'app-name';
        nameSpan.textContent = app.id;

        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Download';
        downloadBtn.onclick = () => downloadApp(app);

        li.appendChild(nameSpan);
        li.appendChild(downloadBtn);
        appList.appendChild(li);
    });
}

async function downloadApp(app) {
    if (!adb) return;

    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = "Downloading...";
    btn.disabled = true;

    try {
        // We need to sync the file from device to browser
        const sync = await adb.sync();

        // Read the file content
        // Note: For large APKs, reading entirely into memory (Blob) might crash the tab.
        // But for a simple tool, we'll try to read it as a Blob.
        // A better approach for large files is using StreamSaver.js, but let's keep it simple first.

        const content = await sync.read(app.path);

        // Create a blob and download it
        // The `read` method returns a ReadableStream. We need to consume it.
        // Actually, @yume-chan/adb sync.read returns a ReadableStream<Uint8Array>

        const chunks = [];
        const reader = content.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }

        const blob = new Blob(chunks, { type: 'application/vnd.android.package-archive' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${app.id}.apk`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        sync.dispose();

    } catch (e) {
        console.error(e);
        showError(`Download failed: ${e.message}`);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function filterApps() {
    const query = searchBox.value.toLowerCase();
    const filtered = allApps.filter(app => app.id.toLowerCase().includes(query));
    renderApps(filtered);
}

connectBtn.addEventListener('click', connect);
refreshBtn.addEventListener('click', loadApps);
searchBox.addEventListener('keyup', filterApps);
