const { app, BrowserWindow, dialog } = require("electron");
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
//--------------------------------------------------

function checkForUpdates(mainWindow) {
    if (!app.isPackaged) return;

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

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});