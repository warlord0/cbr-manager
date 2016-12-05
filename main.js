const {
    app,
    BrowserWindow
} = require('electron'),
    path = require('path'),
    url = require('url'),
    pkg = require('./package.json'),
    configstore = require('configstore'),
    cfg = new configstore(pkg.name, { // Set some defaults
        browser: {
            width: 800,
            height: 600,
            x: 0,
            y: 0,
            maximize: false
        },
        reader: {
            width: 800,
            height: 600,
            x: 0,
            y: 0,
            maximize: false
        }
    });

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let reader = null;

function createWindow() {

    // Create the browser window.
    win = new BrowserWindow({
        width: cfg.get('browser').width,
        height: cfg.get('browser').height,
        x: cfg.get('browser').x,
        y: cfg.get('browser').y,
        frame: true,
        resizable: true,
        icon: path.join(__dirname, 'superhero.ico')
    });


    // and load the index.html of the app.
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    if (cfg.get('browser').maximize) win.maximize();

    // Open the DevTools.
    win.webContents.openDevTools({
        detach: true
    });

    win.on('close', () => {
        // Save settings
        if (!win.isMaximized() && !win.isMinimized()) {
            cfg.set('browser', {
                width: win.getSize()[0],
                height: win.getSize()[1],
                x: win.getPosition()[0],
                y: win.getPosition()[1]
            });
        }
        if (win.isMaximized()) cfg.set('browser', {
            maximize: true
        });
    });

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const {
    ipcMain
} = require('electron');

ipcMain.on('LaunchReader', (args) => {
    LaunchReader(args);
});

function LaunchReader() {
    if (reader === null) {
        reader = new BrowserWindow({
            width: cfg.get('reader').width,
            height: cfg.get('reader').height,
            x: cfg.get('reader').x,
            y: cfg.get('reader').y,
            frame: true,
            resizable: true,
            icon: path.join(__dirname, 'superhero.ico')
                // parent: win,
                // modal: true
        });
    }

    // and load the index.html of the app.
    reader.loadURL(url.format({
        pathname: path.join(__dirname, 'readerOwl.html'),
        protocol: 'file:',
        slashes: true
    }));

    if (cfg.get('reader').maximize) reader.maximize();

    // Open the DevTools.
    reader.webContents.openDevTools({
        detach: true
    });

    reader.on('close', () => {
        // Save settings
        if (!reader.isMaximized() && !reader.isMinimized()) {
            cfg.set('reader', {
                width: reader.getSize()[0],
                height: reader.getSize()[1],
                x: reader.getPosition()[0],
                y: reader.getPosition()[1]
            });
        }
        if (reader.isMaximized()) cfg.set('reader', {
            maximize: true
        });
    });

    // Emitted when the window is closed.
    reader.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        reader = null
    });

}
