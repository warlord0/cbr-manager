'use strict'

ROOT = '/'

pkg = require './package.json'
configStore = require 'configstore'
cfg = new configStore(pkg.name)

$ -> # jQuery on ready
    $('#tree').fancytree
        selectMode: 1
        source: (e, data) ->
            nodes = getDir(ROOT)
        lazyLoad: (e, data) ->
            dfd = $.Deferred() # Use a promise to lazyload
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
                .filter (file) -> # We only want directories
                    try
                        fs.statSync(path.join(nodepath, file)).isDirectory()
                    catch err
                        console.error err
                        false
                .forEach (file) ->
                    nodes.push # Build the tree nodes
                        title: file
                        expanded: false
                        folder: true
                        lazy: true
                        key: path.join nodepath, file
                    return
                dfd.resolve nodes # Resolve the promise
                return
            return

        toggleEffect:
            effect: 'drop'
            options:
                direction: 'left'
            duration: 400

        beforeActivate: (e, data) ->
            # Clear all the existing covers, ready for the new
            $('#innertube').children().remove()
            return

        activate: (e, data) ->
            # Get the wallpaper and covers of the new directory
            p = data.node.key
            setWallpaper p
            loadCovers p
            return

        init: (e, data) ->
            ## selectNode 'c:\\mnt\\media\\incoming\\mirc'
            return

    $ '#splitter'
        .width '100%'
        .height '100%'
        .split
            orientation:'vertical'
            limit:200
            position: cfg.get('browser').split

    $ window
        .on 'unload', (e) -> # Save the split position to the config
            cfgBrowser = cfg.get 'browser'
            cfgBrowser.split = $('#leftSplit').css 'width'
            cfg.set 'browser', cfgBrowser
            return

    $ window
        .on 'resize', (e) -> # Make sure the splitter div stays the full window height
            $ '#splitter'
                .height '100%'

    return

# Find and select/activate the specified node
# @param string p = path of the node (key). Should match the OS path.
selectNode = (p) ->
    path = require 'path'
    os = require 'os'
    branches = p.split path.sep

    if os.platform() is 'win32'
        branches[0] += path.sep # Handle the drives because it's windows

    activeNode = $('#tree').fancytree('getTree').activateKey branches.shift()
    selectChild activeNode, branches

    return

# Select and make active the specified node and iterate through
# the specified braches until they are exhausted.
# Used by selectNode(p) to lazyLoad the tree down through the
# specified branches.
# @param fancyTreeNode activeNode = the current node
# @param string[] branches = the remaining relative paths to
#        expand along
selectChild = (activeNode, branches) ->
    activeNode.setExpanded true
        .then ->
            if activeNode = $('#tree').fancytree.activateKey path.join activeNode.key, branches.shift()
                if branches.length > 0
                    selectChild activeNode, branches
                    return
    return

# If this is a windows systems get an array of drive letters
# Best way to do whis seems to be cal la shell 'wmic'
# @return string[] drives = active windows drive letters
getWindowsDrives = ->
    os = require 'os'
    childProcess = require 'child_process'
    tableParser = require 'table-parser'

    if os.platform() == 'win32'
        stdout = childProcess.execSync 'wmic logicaldisk get caption'
        drives = tableParser.parse(stdout.toString()).map (caption) ->
            caption.Caption[0]

    drives

# One time synchronous process to populate the first level ot the tree
# @param string p = path to begin the tree from, usually ROOT
# @return fancyTreeNode[] nodes = nodes to put on the tree
getDir = (p) ->
    fs = require 'fs'
    path = require 'path'
    os = require 'os'
    nodes = []

    # Set the initial nodes as drive letters if windows
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

# Use an events emitter to asyncronously deal with 'cover' events
events = require 'events'
eventEmitter = new events.EventEmitter()

# We have a new cover so put it into the #innertube
eventEmitter.on 'cover', (arg) ->
    nativeImage = require('electron').nativeImage
    path = require 'path'
    $innertube = $('#innertube')
    id = 'id' + (new Date()).getTime() # Random ID

    $innertube.append '<div class="poster hvr-grow" data-id="' + encodeURI(arg[0]) + '" id="' + id + '""><div class="img"><img class="cover" id="' + path.basename(arg[1]) + '" src="' + arg[1] + '"><p class="caption">' + path.basename(arg[0], path.extname(arg[1])) + '</p></div>'
    tinysort $('div.poster'),
        attr: 'data-id' # Sort the content by data-id. TODO: probably use a better index

    # Use IPC to tell main.js to launch a reader for the selected document
    $('#' + id).on 'dblclick', (e) ->
        launchReaderIpc decodeURI($(this).attr('data-id')).replace(/\\/g, '\/')
        return

    return

# Make #innertube sortable by dragging stuff around
# TODO: Remeber the order? Is this necessary?
$('#innertube').sortable
    revert: true

# Set the wallpaper/background-image of the cover view
# Will look for a file called folder.jpg or .png to use
# @param string p = full path of the folder
setWallpaper = (p) ->
    fs = require 'fs'
    path = require 'path'
    wallpapers = ['folder.jpg', 'folder.png']
    for wallpaper in wallpapers
        file = path.join(p, wallpaper)
        try
            fs.accessSync file
            $('#wallpaper') # Set the wallpaper and make it transparent
                .css('background-image', 'url("file:///' + file.replace(/\\/g, '/') + '")')
                .css('background-size', '100% auto')
                .css('opacity', '0.33')
        catch error
            $('#wallpaper') # Return to the default wallpaper
                .css('background-image', 'url("images/superhero-icon.png")')
                .css('background-size', 'auto')
                .css('opacity', '1.0')

        break # We found one, no need to look for more

    return

# Load the covers for the selected path
# @param string p = full path to find the covers for
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

# Read the cover from the covercache or get it an put it in the cache
# Files are store in the covercahce using an MD5 hash of the filename
# @param string cbrFile = full path to the selected file
# @return triggers an emit 'cover' event
getCover = (cbrFile) ->
    fs = require 'fs'
    path = require 'path'
    crypto = require 'crypto'
    nativeImage = require('electron').nativeImage
    filehash = crypto.createHash('md5').update(path.basename(cbrFile)).digest('hex')
    coverImg = nativeImage.createFromPath(path.join(__dirname, 'covercache', filehash.substring(0, 2), filehash + '.png'))

    if not coverImg.isEmpty() # We found a cover in the cache so use it
        #console.log path.join('covercache', filehash.substring(0, 2), filehash + '.png')
        eventEmitter.emit 'cover', [cbrFile, path.join('covercache', filehash.substring(0, 2), filehash + '.png')]
        return
    else
        # Extract the first page from the document and store it in the covercache
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
                        # Strip any non-image files from the beginning of the array
                        while path.extname(entries[0].name) is '' or '.jpg.jpeg.gif.png'.indexOf(path.extname(entries[0].name)) is -1
                            entries.shift()
                        stream = cbr.stream entries[0].name # This is the file we want to extract
                        stream.on 'error', (err) ->
                            console.error err
                            return
                        stream.on 'end', -> # Now we've read the file make it into a cover
                            makeCover cbrFile, filehash, path.join(tmpPath, path.basename(entries[0].name))
                            return
                        # Create a temp file to write the cover into
                        writable = fs.createWriteStream path.join(tmpPath, path.basename(entries[0].name))
                        writable.on 'close', -> # Tidy up the temporary folder
                            cleanupCallback()
                            return
                        stream.pipe writable # Write the compressed file into the temp file and leave the rest to the event handlers

                        return

                    return
            when '.cbz', '.cb7'
                n7z = require 'node-7z'
                cbr = new n7z
                path = require 'path'
                imageFiles = []
                cbr.list cbrFile
                    .progress (compressedFiles) ->
                        # Gather the list of contained files
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
                                extractedFiles = [] # Create the array to populate with what we extract
                                if imageFiles.length > 0
                                    imageFiles.sort (a, b) ->
                                        if path.basename(a.name) < path.basename(b.name)
                                            -1
                                        else
                                            1
                                    # Strip the non-image files from the beginning of the array
                                    while path.extname(imageFiles[0].name) is '' or '.jpg.jpeg.gif.png'.indexOf(path.extname(imageFiles[0].name)) is -1
                                        imageFiles.shift()
                                    cbr.extract cbrFile, tmpPath,
                                        wildcards: imageFiles[0].name # Extract only the first image file in our array
                                    .progress (files) ->
                                        extractedFiles = extractedFiles.concat(files) # Update what we extracted, should only be one file
                                        return
                                    .then ->
                                        if extractedFiles # If we got an image make it into a cover
                                            # 7-zip seems to leave trailing carriage returns. I guess it was tested mainly in *nix
                                            makeCover cbrFile, filehash, path.join(tmpPath, path.basename(extractedFiles[0])).replace('\r', '')
                                        else
                                            console.error 'Unable to extract files from ' + cbrFile
                                        cleanupCallback() # Tidy up the temporay folder
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

# Create a cover by resizing the tmpFile as storing it into the covercache
# Then trigger the 'cover' event to show it in the covers browser
# @param string cbrFile = full path of the file the cover is for
# @param string filehash = MD5 hash of the file name used to put it into the covercache
# @param string tmpFile = full path of the tmpFile to read the image from
makeCover = (cbrFile, filehash, tmpFile) ->
    try
        nativeImage = require('electron').nativeImage
        path = require 'path'
        fs = require 'fs'
        coverImg = nativeImage.createFromPath tmpFile
        buffer = coverImg.resize
            height: 240 # Specify only height and width is auto bassed on aspect ratio

        if buffer.isEmpty() # Something unexpected means we don't have a cover image
            eventEmitter.emit 'cover', [cbrFile, path.join('images', 'nocover.png')]
        else
            mkdirp = require 'mkdirp' # Make the directory and put the resized image into the covercache
            mkdirp path.join(__dirname, 'covercache', filehash.substring(0, 2)), (err) ->
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

# Use IPC to call main.js and launch the reader
{ipcRenderer} = require 'electron'

launchReaderIpc = (cbrFile) ->
    ipcRenderer.send 'LaunchReader', cbrFile
