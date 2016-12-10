// Generated by CoffeeScript 1.12.1
(function() {
  var BrowserWindow, Menu, MenuItem, app, cfg, configStore, createWindow, ipcMain, launchReader, mainMenu, path, pkg, reader, ref, url, win;

  ref = require('electron'), app = ref.app, BrowserWindow = ref.BrowserWindow, ipcMain = ref.ipcMain, Menu = ref.Menu, MenuItem = ref.MenuItem;

  path = require('path');

  url = require('url');

  pkg = require('./package.json');

  configStore = require('configstore');

  cfg = new configStore(pkg.name, {
    debug: false,
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

  win = reader = mainMenu = null;

  createWindow = function() {
    win = new BrowserWindow({
      width: cfg.get('browser').width,
      height: cfg.get('browser').height,
      x: cfg.get('browser').x,
      y: cfg.get('browser').y,
      frame: true,
      resizable: true,
      icon: './images/superhero.ico'
    });
    if (cfg.get('browser').maximize === true) {
      win.maximize();
    }
    win.loadURL(url.format({
      pathname: './index.html',
      protocol: 'file:',
      slashes: true
    }));
    if (cfg.get('debug') === true) {
      win.webContents.openDevTools({
        detach: true
      });
    }
    win.on('close', function() {
      if (!win.isMaximized() && !win.isMinimized()) {
        cfg.set('browser', {
          width: win.getSize()[0],
          height: win.getSize()[1],
          x: win.getPosition()[0],
          y: win.getPosition()[1]
        });
      }
      if (win.isMaximized()) {
        cfg.set('browser', {
          maximize: true
        });
      }
    });
    win.on('closed', function() {
      win = null;
    });
  };

  launchReader = function(cbrFile) {
    if (reader === null) {
      reader = new BrowserWindow({
        width: cfg.get('reader').width,
        height: cfg.get('reader').height,
        x: cfg.get('reader').x,
        y: cfg.get('reader').y,
        frame: true,
        resizable: true,
        icon: './images/superhero.ico'
      });
    }
    if (cfg.get('reader').maximize === true) {
      reader.maximize();
    }
    reader.loadURL(url.format({
      pathname: './reader.html',
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
      if (!reader.isMaximized() && !win.isMinimized()) {
        cfg.set('reader', {
          width: reader.getSize()[0],
          height: reader.getSize()[1],
          x: reader.getPosition()[0],
          y: reader.getPosition()[1]
        });
      }
      if (reader.isMaximized) {
        cfg.set('reader', {
          maximize: true
        });
      }
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

}).call(this);

//# sourceMappingURL=main.js.map
