ROOT = '/'

$ ->
    $('#tree').fancytree
        selectMode: 1
        source: (e, data) ->
            nodes = getDir(ROOT)
        lazyLoad: (e, data) ->
            dfd = $.Deferred()
            fs = require('fs')
            path = require('path')
            nodepath = data.node.key
            nodes = []
            data.result = dfd.promise()

            fs.readdir nodepath, (err, files) ->
                if err
                    dfd.resolve []
                    console.error err
                files.map (file) ->
                    file
                .filter (file) ->
                    try
                        fs.statSync(path.join(nodepath, file)).isDirectory()
                    catch err
                        console.error err
                        false
                .forEach (file) ->
                    nodes.push
                        title: file
                        expanded: false
                        folder: true
                        lazy: true
                        key: path.join nodepath, file
                    return
                dfd.resolve nodes
                return
            return

        toggleEffect:
            effect: 'drop'
            options:
                direction: 'left'
            duration: 400

        beforeActivate: (e, data) ->
            $('#innertube').children().remove()
            return

        activate: (e, data) ->
            p = data.node.key
            setWallpaper p
            loadCovers p
            return

        init: (e, data) ->
            ## selectNode 'c:\\mnt\\media\\incoming\\mirc'
            return
    return

selectNode = (p) ->
    path = require 'path'
    os = require 'os'
    branches = p.split path.sep

    if os.platform() is 'win32'
        branches[0] += path.sep

    activeNode = $('#tree').fancytree('getTree').activateKey branches.shift()
    selectChild activeNode, branches

    return

selectChild = (activeNode, branches) ->
    activeNode.setExpanded true
        .then ->
            if activeNode = $('#tree').fancytree.activateKey path.join activeNode.key, branches.shift()
                if branches.length > 0
                    selectChild activeNode, branches
                    return
    return

getWindowsDrives = ->
    os = require 'os'
    childProcess = require 'child_process'
    tableParser = require 'table-parser'

    if os.platform() == 'win32'
        stdout = childProcess.execSync 'wmic logicaldisk get caption'
        drives = tableParser.parse(stdout.toString()).map (caption) ->
            caption.Caption[0]

    drives

getDir = (p) ->
    fs = require 'fs'
    path = require 'path'
    os = require 'os'
    nodes = []

    if p is ROOT and os.platform() is 'win32'
        drives = getWindowsDrives()        
        for drive in drives
            nodes.push
                title: drive + path.sep
                expanded: false
                folder: true
                lazy: true
                key: drive + path.sep
    else
        files = fs.readdirSync p
        for file in files
            try
                if not fs.statSync(path.join(p, file)).isFile()
                    nodes.push
                        title: file
                        expanded: false
                        folder: true
                        lazy: true
                        key: path.join p, file
            catch error
                console.error error
    return nodes

events = require 'events'
eventEmitter = new events.EventEmitter()

eventEmitter.on 'cover', (arg) ->
    nativeImage = require('electron').nativeImage
    path = require 'path'
    $innertube = $('#innertube')
    id = 'id' + (new Date()).getTime()

    $innertube.append '<div class="poster hvr-grow" data-id="' + encodeURI(arg[0]) + '" id="' + id + '""><div class="img"><img class="cover" id="' + path.basename(arg[1]) + '" src="' + arg[1] + '"><p class="caption">' + path.basename(arg[0], path.extname(arg[1])) + '</p></div>'
    tinysort $('div.poster'),
        attr: 'id'

    $('#' + id).on 'dblclick', (e) ->
        launchReaderIpc decodeURI($(this).attr('data-id')).replace(/\\/g, '\/')
        return

    return

$('#innertube').sortable
    revert: true

setWallpaper = (p) ->
    fs = require 'fs'
    path = require 'path'
    wallpapers = ['folder.jpg', 'folder.png']
    for wallpaper in wallpapers
        file = path.join(p, wallpaper)
        try
            fs.accessSync file
            $('#wallpaper')
                .css('background-image', 'url("file:///' + file.replace(/\\/g, '/') + '")')
                .css('background-size', '100% auto')
                .css('opacity', '0.33')
        catch error
            $('#wallpaper')
                .css('background-image', 'url("images/superhero-icon.png")')
                .css('background-size', 'auto')
                .css('opacity', '1.0')

        break

    return

loadCovers = (p) ->
    fs = require 'fs'
    path = require 'path'
    try
        fs.readdir p, (err, files) ->
            if err
                console.error err
                return
            else
                files.sort().forEach (file, i) ->
                    switch path.extname file
                        when '.cbr', '.cbz', '.cb7'
                            getCover path.join(p, file)
                            return
                    return
    catch error
        console.error error
        return

    return

getCover = (cbrFile) ->
    fs = require 'fs'
    path = require 'path'
    crypto = require 'crypto'
    nativeImage = require('electron').nativeImage
    filehash = crypto.createHash('md5').update(path.basename(cbrFile)).digest('hex')
    coverImg = nativeImage.createFromPath(path.join(__dirname, 'covercache', filehash.substring(0, 2), filehash + '.png'))

    if not coverImg.isEmpty()
        console.log path.join('covercache', filehash.substring(0, 2), filehash + '.png')
        eventEmitter.emit 'cover', [cbrFile, path.join('covercache', filehash.substring(0, 2), filehash + '.png')]
        return
    else
        switch path.extname(cbrFile)
            when '.cbr'
                unrar = require 'unrar'
                cbr = new unrar(cbrFile)
                tmp = require 'tmp'
                tmpDir = tmp.dir
                    prefix: 'cbr_'
                    unsafeCleanup: true
                , _tempDirCreated = (err, tmpPath, cleanupCallback) ->
                    cbr.list (err, entries) ->
                        entries.sort (a, b) ->
                            if path.basename(a.name) < path.basename(b.name)
                                -1
                            else
                                1
                            return
                        while path.extname(entries[0].name) is '' or '.jpg.jpeg.gif.png'.indexOf(path.extname(entries[0].name)) is -1
                            entries.shift()
                        stream = cbr.stream entries[0].name
                        stream.on 'error', (err) ->
                            console.error err
                            return
                        stream.on 'end', ->
                            makeCover cbrFile, filehash, path.join(tmpPath, path.basename(entries[0].name))
                            return
                        writable = fs.createWriteStream path.join(tmpPath, path.basename(entries[0].name))
                        writable.on 'close', ->
                            cleanupCallback()
                            return
                        stream.pipe writable

                        return

                    return
            when '.cbz', '.cb7'
                n7z = require 'node-7z'
                cbr = new n7z
                cbr.list cbrFile
                    .progress (compressedFiles) ->
                        imageFiles = imageFiles.concat compressedFiles
                        return
                    .then (spec) ->
                        tmp = require 'tmp'
                        tmpDir = tmp.dir
                            prefix: 'cbz_'
                            unsafeCleanup: true
                        , _tempDirCreated = (err, tmpPath, cleanupCallback) ->
                            if err
                                console.error err
                                return
                            else
                                if imageFiles.length > 0
                                    imageFiles.sort (a, b) ->
                                        if path.basename(a.name) < path.basename(b.name)
                                            -1
                                        else
                                            1
                                    while path.extname(imageFiles[0].name) is '' or '.jpg.jpeg.gif.png'.indexOf(path.extname(imageFiles[0].name)) is -1
                                        imageFiles.shift()
                                    cbr.extract cbrFile, tmpPath,
                                        wildcards: imageFiles[0].name
                                    .progress (files) ->
                                        extractedFiles = extractedFiles.concat(files)
                                        return
                                    .then ->
                                        if extractedFiles
                                            makeCover cbrFile, filehas, hpath.join(tmpPath, path.basename(extractedFiles[0])).replace('\r', '')
                                        else
                                            console.error 'Unable to extract files from ' + cbrFile
                                        cleanupCallback()
                                        return
                                    return
                                else
                                    eventEmitter.emit 'cover', [cbrFile, path.join('images', 'nocover.png')]
                                    return
                        return
                    .catch (err) ->
                        console.error 'Can\'t handle file ' + cbrFile
                        eventEmitter.emit 'cover', [cbrFile, path.join('images', 'nocover.png')]
                        return

        return

makeCover = (cbrFile, filehash, tmpFile) ->
    try
        nativeImage = require('electron').nativeImage
        fs = require 'fs'
        coverImg = nativeImage.createFromPath tmpFile
        buffer = coverImg.resize
            height: 240

        if buffer.isEmpty()
            eventEmitter.emit 'cover', [cbrFile, path.join('images', 'nocover.png')]
        else
            mkdirp = require 'mkdirp'
            mkdirp path.join__dirname, 'covercache', filehash.substring(0, 2), (err) ->
                if err
                    console.error err
                else
                    png = buffer.toPng()
                    fs.writeFile path.join(__dirname, 'covercache', filehash.substring(0, 2), filehash + '.png'), png, (err) ->
                        if err
                            console.error err
                        else
                            eventEmitter.emit 'cover', [cbrFile, path.join('covercache', filehash.substring(0, 2), filehash) + '.png']
                return
    catch error
        console.error error
        eventEmitter.emit 'cover', [cbrFile, path.join('images', 'nocover.png')]
    return

###
Use IPC to call main.js and launch the reader
###
{ipcRenderer} = require 'electron'

launchReaderIpc = (cbrFile) ->
    ipcRenderer.send 'LaunchReader', cbrFile
