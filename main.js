
const { app, BrowserWindow } = require("electron");
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
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
