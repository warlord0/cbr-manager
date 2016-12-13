
/*
 * cbr-manager - Electron based Comic Book Manager and Reader. Suitable for CBR, CBZ and CB7 Comic Book archives.
 * @version v0.1.0
 * @link https://github.com/warlord0/cbr-manager
 * @license GPL-3.0
 */
'use strict';
var BrowserWindow, Menu, MenuItem, app, cfg, configStore, createWindow, ipcMain, launchReader, mainMenu, path, pkg, reader, ref, url, win;

ref = require('electron'), app = ref.app, BrowserWindow = ref.BrowserWindow, ipcMain = ref.ipcMain, Menu = ref.Menu, MenuItem = ref.MenuItem;

path = require('path');

url = require('url');

pkg = require('../package.json');

configStore = require('configstore');

cfg = new configStore(pkg.name);

win = reader = mainMenu = null;

createWindow = function() {
  var cfgBrowser;
  cfgBrowser = cfg.get('browser');
  win = new BrowserWindow({
    width: cfgBrowser.width,
    height: cfgBrowser.height,
    x: cfgBrowser.x,
    y: cfgBrowser.y,
    frame: true,
    resizable: true,
    icon: path.join(__dirname, 'images/superhero.ico')
  });
  if (cfgBrowser.maximize === true) {
    win.maximize();
  }
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));
  if (cfg.get('debug') === true) {
    win.webContents.openDevTools({
      detach: true
    });
  }
  win.on('close', function() {
    cfgBrowser = cfg.get('browser');
    cfgBrowser.width = win.getSize()[0];
    cfgBrowser.height = win.getSize()[1];
    cfgBrowser.x = win.getPosition()[0];
    cfgBrowser.y = win.getPosition()[1];
    cfgBrowser.split = cfg.get('browser').split;
    if (!win.isMaximized() && !win.isMinimized()) {
      cfgBrowser.maximize = false;
    }
    if (win.isMaximized()) {
      cfgBrowser.maximize = true;
    }
    cfg.set('browser', cfgBrowser);
  });
  win.on('closed', function() {
    win = null;
  });
};

launchReader = function(cbrFile) {
  var cfgReader;
  cfgReader = cfg.get('reader');
  if (reader === null) {
    reader = new BrowserWindow({
      width: cfgReader.width,
      height: cfgReader.height,
      x: cfgReader.x,
      y: cfgReader.y,
      frame: true,
      resizable: true,
      icon: path.join(__dirname, 'images/superhero.ico')
    });
  }
  if (cfgReader.maximize === true) {
    reader.maximize();
  }
  reader.loadURL(url.format({
    pathname: path.join(__dirname, 'reader.html'),
    protocol: 'file:',
    slashes: true
  }));
  if (cfg.get('debug') === true) {
    reader.webContents.openDevTools({
      detach: true
    });
  }
  reader.webContents.executeJavaScript("loadPages('" + cbrFile + "');");
  reader.on('close', function() {
    cfgReader = cfg.get('reader');
    cfgReader.width = reader.getSize()[0];
    cfgReader.height = reader.getSize()[1];
    cfgReader.x = reader.getPosition()[0];
    cfgReader.y = reader.getPosition()[1];
    if (!reader.isMaximized() && !win.isMinimized()) {
      cfgReader.maximize = false;
    }
    if (reader.isMaximized()) {
      cfgReader.maximize = true;
    }
    cfg.set('reader', cfgReader);
  });
  reader.on('closed', function() {
    reader = null;
  });
};

app.on('ready', createWindow);

app.on('activate', function() {
  if (win != null) {
    createWindow;
  }
});

app.on('windows-all-closed', function() {
  app.quit();
});

ipcMain.on('LaunchReader', function(e, cbrFile) {
  launchReader(cbrFile);
});

//# sourceMappingURL=main.js.map
