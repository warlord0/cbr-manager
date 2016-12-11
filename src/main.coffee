'use strict'

{app, BrowserWindow, ipcMain, Menu, MenuItem} = require 'electron'
path = require 'path'
url = require 'url'
pkg = require './package.json'
configStore = require 'configstore'

# Setup a configuration file
cfg = new configStore pkg.name
    # debug: false
    # browser:
    #     width: 800
    #     height: 600
    #     x: 0
    #     y: 0
    #     maximize: false
    #     split: '25%'
    # reader:
    #     width: 800
    #     height: 600
    #     x: 0
    #     y: 0
    #     maximize: false

win = reader = mainMenu = null

# Create the main BrowserWindow
createWindow = ->
    cfgBrowser = cfg.get 'browser'
    win = new BrowserWindow
        width: cfgBrowser.width
        height: cfgBrowser.height
        x: cfgBrowser.x
        y: cfgBrowser.y
        frame: true
        resizable: true
        icon: './images/superhero.ico'

    win.maximize() if cfgBrowser.maximize is true

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
        cfgBrowser = cfg.get 'browser'
        cfgBrowser.width = win.getSize()[0]
        cfgBrowser.height = win.getSize()[1]
        cfgBrowser.x = win.getPosition()[0]
        cfgBrowser.y = win.getPosition()[1]
        cfgBrowser.split = cfg.get 'browser'
            .split
        if not win.isMaximized() and not win.isMinimized()
            cfgBrowser.maximize = false
        if win.isMaximized()
            cfgBrowser.maximize = true
        cfg.set 'browser', cfgBrowser
        return

    win.on 'closed', ->
        win = null
        return

    return

# Launch a Comic Book Reader Window
launchReader = (cbrFile) ->
    cfgReader = cfg.get 'reader'
    if reader is null
        reader = new BrowserWindow
            width: cfgReader.width
            height: cfgReader.height
            x: cfgReader.x
            y: cfgReader.y
            frame: true
            resizable: true
            icon: './images/superhero.ico'

    reader.maximize() if cfgReader.maximize is true

    reader.loadURL url.format
        pathname: './reader.html'
        protocol: 'file:'
        slashes: true

    if cfg.get('debug') is true
        reader.webContents.openDevTools
            detach: true

    reader.webContents.executeJavaScript "loadPages('#{cbrFile}');" # Tell the new window to load the comic book TODO: Is there a better way?

    reader.on 'close', ->
        cfgReader = cfg.get 'reader'
        cfgReader.width = reader.getSize()[0]
        cfgReader.height = reader.getSize()[1]
        cfgReader.x = reader.getPosition()[0]
        cfgReader.y = reader.getPosition()[1]
        if not reader.isMaximized() and not win.isMinimized()
            cfgReader.maximize = false
        if reader.isMaximized()
            cfgReader.maximize = true
        cfg.set 'reader', cfgReader
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
