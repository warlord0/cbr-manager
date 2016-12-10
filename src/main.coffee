{app, BrowserWindow, ipcMain, Menu, MenuItem} = require 'electron'
path = require 'path'
url = require 'url'
pkg = require './package.json'
configStore = require 'configstore'

# Setup a default configuration
cfg = new configStore pkg.name,
    debug: false
    browser:
        width: 800
        height: 600
        x: 0
        y: 0
        maximize: false
    reader:
        width: 800
        height: 600
        x: 0
        y: 0
        maximize: false

win = reader = mainMenu = null

# Create the main BrowserWindow
createWindow = ->
    win = new BrowserWindow
        width: cfg.get('browser').width
        height: cfg.get('browser').height
        x: cfg.get('browser').x
        y: cfg.get('browser').y
        frame: true
        resizable: true
        icon: './images/superhero.ico'

    win.maximize() if cfg.get('browser').maximize is true

    win.loadURL url.format
        pathname: './index.html'
        protocol: 'file:'
        slashes: true

    # Show the developer tools if using debug
    if cfg.get('debug') is true
        win.webContents.openDevTools
            detach: true

    # Save the window settings for next time
    win.on 'close', ->
        if not win.isMaximized() and not win.isMinimized()
            cfg.set 'browser',
                width: win.getSize()[0]
                height: win.getSize()[1]
                x: win.getPosition()[0]
                y: win.getPosition()[1]
        if win.isMaximized() then cfg.set 'browser',
            maximize: true
        return

    win.on 'closed', ->
        win = null
        return

    return

# Launch a Comic Book Reader Window
launchReader = (cbrFile) ->
    if reader is null
        reader = new BrowserWindow
            width: cfg.get('reader').width
            height: cfg.get('reader').height
            x: cfg.get('reader').x
            y: cfg.get('reader').y
            frame: true
            resizable: true
            icon: './images/superhero.ico'

    reader.maximize() if cfg.get('reader').maximize is true

    reader.loadURL url.format
        pathname: './reader.html'
        protocol: 'file:'
        slashes: true

    if cfg.get('debug') is true
        reader.webContents.openDevTools
            detach: true

    reader.webContents.executeJavaScript "loadPages('#{cbrFile}');" # Tell the new window to load the comic book TODO: Is there a better way?

    reader.on 'close', ->
        if not reader.isMaximized() and not win.isMinimized()
            cfg.set 'reader',
                width: reader.getSize()[0]
                height: reader.getSize()[1]
                x: reader.getPosition()[0]
                y: reader.getPosition()[1]
        if reader.isMaximized then cfg.set 'reader',
            maximize: true
        return

    reader.on 'closed', ->
        reader = null # Reset the window to null or the garbage collector destroys it
        return

    return


# App Events
app.on 'ready', createWindow

app.on 'activate', ->
    createWindow if win?
    return

app.on 'windows-all-closed', ->
    app.quit()
    return

# IPC Listener
ipcMain.on 'LaunchReader', (e, cbrFile) ->
    launchReader cbrFile
    return
