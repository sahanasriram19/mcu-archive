const { app, BrowserWindow, dialog, shell, net } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        fullscreen: true,
        frame: false,
        icon: path.join(__dirname, "assets", "app-icon.ico"),
        autoHideMenuBar: true,
        backgroundColor: "#000000",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.loadFile("index.html");

    return mainWindow;
}

//--------------------------------------------------
// AUTO-UPDATE
//
// On launch, the installed app checks the GitHub
// Releases page (the "publish" setting in package.json)
// for a newer version. If there is one, it downloads it
// quietly in the background, then asks whether to
// restart now. Choosing "Later" installs it the next
// time the app is closed.
//
// Each release needs latest.yml uploaded alongside the
// installer: that's the file this reads to see what the
// newest version is.
//
// Only runs in the installed app, not with "npm start".
//
// On a Mac the app can't install updates itself (that
// needs an Apple Developer certificate), so instead it
// asks GitHub for the newest release and, if it's newer,
// offers to open the download page (checkForMacUpdate).
//--------------------------------------------------

const RELEASES = "https://github.com/sahanasriram19/mcu-archive/releases/latest";
const LATEST_API = "https://api.github.com/repos/sahanasriram19/mcu-archive/releases/latest";

// Is version a ("1.2.0") newer than b?
function isNewer(a, b) {
    const pa = a.split(".").map(Number), pb = b.split(".").map(Number);

    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const x = pa[i] || 0, y = pb[i] || 0;

        if (x !== y) return x > y;
    }

    return false;
}

async function checkForMacUpdate(mainWindow) {
    try {
        const res = await net.fetch(LATEST_API, { headers: { Accept: "application/vnd.github+json" } });

        if (!res.ok) return;

        const latest = String((await res.json()).tag_name || "").replace(/^v/, "");

        if (!latest || !isNewer(latest, app.getVersion())) return;

        const { response } = await dialog.showMessageBox(mainWindow, {
            type: "info",
            title: "Update available",
            message: `MCU Archive ${latest} is out`,
            detail: `You have ${app.getVersion()}. Download the new version and drag it into Applications to replace this one.`,
            buttons: ["Download", "Later"],
            defaultId: 0,
            cancelId: 1
        });

        if (response === 0) shell.openExternal(RELEASES);
    } catch {
        // No internet, GitHub down…: just carry on.
    }
}

function checkForUpdates(mainWindow) {
    if (!app.isPackaged) return;

    if (process.platform === "darwin") {
        checkForMacUpdate(mainWindow);
        return;
    }

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on("update-downloaded", async info => {
        const { response } = await dialog.showMessageBox(mainWindow, {
            type: "info",
            title: "Update ready",
            message: `MCU Archive ${info.version} is ready to install`,
            detail: "Restart now to update, or it will install the next time you close the app.",
            buttons: ["Restart now", "Later"],
            defaultId: 0,
            cancelId: 1
        });

        if (response === 0) autoUpdater.quitAndInstall();
    });

    // No internet, GitHub down…: just carry on with this version.
    autoUpdater.on("error", err => {
        console.error("Update check failed:", err);
    });

    autoUpdater.checkForUpdates().catch(() => {});
}

app.whenReady().then(() => {
    const mainWindow = createWindow();

    checkForUpdates(mainWindow);
});

// Mac: clicking the Dock icon with no window open opens
// one again (apps there keep running when you close the
// window).
app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});