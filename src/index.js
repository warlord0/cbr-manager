    // glyph_opts = {
    //     map: {
    //         doc: "glyphicon glyphicon-file",
    //         docOpen: "glyphicon glyphicon-file",
    //         checkbox: "glyphicon glyphicon-unchecked",
    //         checkboxSelected: "glyphicon glyphicon-check",
    //         checkboxUnknown: "glyphicon glyphicon-share",
    //         dragHelper: "glyphicon glyphicon-play",
    //         dropMarker: "glyphicon glyphicon-arrow-right",
    //         error: "glyphicon glyphicon-warning-sign",
    //         expanderClosed: "glyphicon glyphicon-menu-right",
    //         expanderLazy: "glyphicon glyphicon-plus-sign",
    //         expanderOpen: "glyphicon glyphicon-menu-down",
    //         folder: "glyphicon glyphicon-folder-close",
    //         folderOpen: "glyphicon glyphicon-folder-open",
    //         loading: "glyphicon glyphicon-refresh glyphicon-spin"
    //     }
    // };

    const ROOT = '/';
    $(function() {
        // Initialize Fancytree
        $("#tree").fancytree({
            //extensions: ["wide"],
            //extensions: ["dnd", "edit", "glyph", "wide"],
            //checkbox: true,
            // dnd: {
            //     focusOnClick: true,
            //     dragStart: function(node, data) {
            //         return true;
            //     },
            //     dragEnter: function(node, data) {
            //         return false;
            //     },
            //     dragDrop: function(node, data) {
            //         data.otherNode.copyTo(node, data.hitMode);
            //     }
            // },
            //glyph: glyph_opts,
            selectMode: 1,

            source: (e, data) => {
                var nodes = GetDir(ROOT);
                //console.log(nodes);
                return nodes;
            },
            lazyLoad: function(event, data) {
                var dfd = $.Deferred(),
                    fs = require('fs'),
                    path = require('path'),
                    nodepath = data.node.key;
                nodes = [];

                data.result = dfd.promise(); // Use a promise so we can use readdir asynchronously

                fs.readdir(nodepath, (err, files) => {
                    if (err) {
                        // throw the error last so we can complete the promise
                        dfd.resolve([]);
                        console.error(err);
                    }
                    // .map an array so we can filter it
                    files.map((file) => {
                        return file;
                    }).filter((file) => {
                        // Make sure it's a folder
                        try {
                            return fs.statSync(path.join(nodepath, file)).isDirectory();
                        } catch (err) {
                            console.error(err);
                            return false;
                        }
                    }).forEach((file) => {
                        // Build array of node objects
                        nodes.push({
                            "title": file,
                            "expanded": false,
                            "folder": true,
                            "lazy": true,
                            "key": path.join(nodepath, file)
                        });
                    });
                    //console.log(nodes);
                    dfd.resolve(nodes);
                });
            },
            toggleEffect: {
                effect: "drop",
                options: {
                    direction: "left"
                },
                duration: 400
            },
            // wide: {
            //     iconWidth: "1em", // Adjust this if @fancy-icon-width != "16px"
            //     iconSpacing: "0.5em", // Adjust this if @fancy-icon-spacing != "3px"
            //     levelOfs: "1.5em" // Adjust this if ul padding != "16px"
            // },
            icon: (e, data) => {
                // if( data.node.isFolder() ) {
                //   return "glyphicon glyphicon-book";
                // }
            },
            beforeActivate: (e, data) => {
                $('#innertube').children().remove();
            },
            activate: (e, data) => {
                var p = data.node.key;
                SetWallpaper(p);
                LoadCovers(p);
            },
            init: (e, data) => {
                // Tree is loaded
                SelectNode('C:\\mnt\\media\\incoming\\mirc'); //\\2016 Week 48');
            }
        });

    });

    /**
     * Select and Activate a node in the tree.
     * The node may be lazy laoaded so we need to expand it and ensure the lazy loads get laoaded
     *
     * @param string p - a unique node key (or file system path)
     */
    function SelectNode(p) {
        const path = require('path'),
            os = require('os');

        var branches = p.split(path.sep);

        if (os.platform() == 'win32') { // The drive letter needs a trailing \ added in Windows
            branches[0] += path.sep;
        }

        var activeNode = $("#tree").fancytree("getTree").activateKey(branches.shift());
        SelectChild(activeNode, branches);

    }

    /**
     * Because .setExpanded is an async $.Promise we have to ask it to call the next child once it
     * has populated the current node. So it must call itself until exhausted.
     *
     * @param FancyTreeNode activeNode the currently selected and active node
     * @param [] branches the remainder, or relative path left to fetch
     */
    function SelectChild(activeNode, branches) {
        activeNode.setExpanded(true)
            .then(() => {
                if (activeNode = $("#tree").fancytree("getTree").activateKey(path.join(activeNode.key, branches.shift()))) {
                    if (branches.length > 0) {
                        SelectChild(activeNode, branches);
                    }
                }
            });
    }

    /**
     * Get the specified directory contents synchronously
     * Done as readdirSync as this is a one time deal at first load
     * Future calls are made as a lazyload asynchronously
     *
     * @param string p path to retrieve
     */
    function GetDir(p) {
        var fs = require('fs'),
            path = require('path'),
            os = require('os');

        let nodes = [];

        // Fetch the root directory OR drive letters if on Windows
        if (p == ROOT && os.platform() == 'win32') {
            var drives = GetWindowsDrives();

            for (i = 0; i < drives.length; i++) {
                nodes.push({
                    "title": drives[i] + path.sep,
                    "expanded": false,
                    "folder": true,
                    "lazy": true,
                    "key": drives[i] + path.sep
                });
            }
        } else {
            var files = fs.readdirSync(p);
            //console.log(files);
            for (i = 0; i < files.length; i++) {
                try {
                    if (!fs.statSync(path.join(p, files[i])).isFile()) {
                        //console.log({"title": file, "expanded": false, "folder": true, "lazy": true});
                        nodes.push({
                            "title": files[i],
                            "expanded": false,
                            "folder": true,
                            "lazy": true,
                            "key": path.join(p, files[i])
                        });
                    } else {
                        /* In this instance we only want folders */
                        //nodes.push({"title": files[i]});
                    }
                } catch (err) {}
            }
        }
        return nodes;
    }

    /**
     * If we're running on Windows we'll need to start by getting the drive letters
     * For this we'll have to call out a child process exec
     *
     * @return array drives
     */
    function GetWindowsDrives() {
        const os = require('os'),
            childProcess = require('child_process'),
            tableParser = require('table-parser');

        var drives = [];
        if (os.platform() == 'win32') {
            const stdout = childProcess.execSync('wmic logicaldisk get caption');
            //console.log(stdout);
            drives = tableParser.parse(stdout.toString()).map((caption) => {
                return caption.Caption[0];
            });
        }
        return drives;
    }

    const events = require('events');
    const eventEmitter = new events.EventEmitter();

    eventEmitter.on('cover', (arg) => {
        var nativeImage = require('electron').nativeImage,
            path = require('path'),
            $innertube = $('div#innertube'),
            id = 'id' + (new Date()).getTime();

        $innertube.append(
            '<div class="poster hvr-grow" data-id="' + encodeURI(arg[0]) + '" id="' + id + '""><div class="img"><img class="cover" id="' + path.basename(arg[1]) + '" src="' + arg[1] +
            '"><p class="caption">' + path.basename(arg[0], path.extname(arg[1])) + '</p></div>'
        );
        tinysort($('div.poster'), {
            attr: 'id'
        }); // Sort the divs by their ID so the files appear in order
        $('#' + id).on('dblclick', function() { // Attache double click event
            LaunchReaderIpc(decodeURI($(this).attr('data-id')).replace(/\\/g, '\/'));
        })
    });

    $('#innertube').sortable({ // Use the sortable plugin so files can be dragged and rearranged
        revert: true
    });

    /**
     * Set the background-mage of the cover brwwser to either folder.jpg or folder.png if they exist in the chosen path
     *
     * @param string p = path of the wallpaper iamge to look for
     */
    function SetWallpaper(p) {
        const fs = require('fs'),
            path = require('path');

        var wallpapers = ['folder.jpg', 'folder.png']; // Look for these files
        for (var i = 0; i < wallpapers.length; i++) {
            var file = path.join(p, wallpapers[i]);
            try {
                fs.accessSync(file); // This will throw an error if it doesn't exist
                $('#wallpaper').css('background-image', 'url("file:///' + file.replace(/\\/g, '/') + '")')
                    .css('background-size', '100% auto')
                    .css('opacity', '0.33');
                break; // OK we found one let's stop looking for more
            } catch (err) {
                $('#wallpaper').css('background-image', 'url(images/superhero-icon.png)')
                    .css('background-size', 'auto')
                    .css('opacity', '1.0'); // Set it to the defaul if nothing found
                //console.error(err); // No need to throw an erro we expected this
            }
        }
    }

    /**
     * Load the cover images from the specified path
     *
     * @param p path to retrieve images for
     */
    function LoadCovers(p) {
        const fs = require('fs'),
            path = require('path');
        var files = [];

        try {
            fs.readdir(p, (err, files) => {
                if (err) {
                    console.error(err);
                } else {
                    files.sort().forEach(function(file, i) {
                        switch (path.extname(file)) {
                            case '.cbr':
                            case '.cbz':
                            case '.cb7':
                                GetCover(path.join(p, file));
                                break;
                        }
                    });
                    //$('#progress').hide();
                }
            });
        } catch (err) {
            console.error(err);
        }
    }

    const path = require('path');

    /*
     * Get the specified cover from the file
     *
     * @param string file - archive to get the cover from
     *
     * @return emits a 'cover' event with a nativeImage and path to the cover
     */
    function GetCover(cbrFile) {
        var fs = require('fs'),
            path = require('path'),
            crypto = require('crypto'),
            filehash = crypto.createHash('md5').update(path.basename(cbrFile)).digest('hex'),
            nativeImage = require('electron').nativeImage

        var coverImg = nativeImage.createFromPath(path.join(__dirname, 'covercache', filehash.substring(0, 2), filehash + ".png"));
        if (!coverImg.isEmpty()) { // If we already have a cover in the cache use it
            eventEmitter.emit('cover', [cbrFile, path.join('covercache', filehash.substring(0, 2), filehash + ".png")]); // Trigger the cover event
        } else {
            switch (path.extname(cbrFile)) {
                /*
                Due to 7-zip limitation of only being able to use v9 as that's all that's available on Linux as p7zip-full we can't Handle
                newer RAR file formats as it fails. So we must resort to using the unrar program instead.
                */
                case '.cbr':
                    var unrar = require('unrar'),
                        fs = require('fs'),
                        path = require('path'),
                        cbr = new unrar(cbrFile);
                    var tmp = require('tmp'); // Create a unique temp dir because we don't want clashing async filenames

                    tmpDir = tmp.dir({
                        prefix: 'cbr_',
                        //dir: path.join(__dirname, 'temp'), // Put them somewhere other than system temp
                        unsafeCleanup: true
                    }, function _tempDirCreated(err, tmpPath, cleanupCallback) {

                        cbr.list((err, entries) => {
                            entries.sort((a, b) => { // Sort the entries by name
                                if (path.basename(a.name) < path.basename(b.name)) {
                                    return -1;
                                } else {
                                    return 1;
                                }
                            });
                            // Remove the non-images from the start of the array, if any.
                            while (path.extname(entries[0].name) == '' || '.jpg.jpeg.gif.png'.indexOf(path.extname(entries[0].name)) == -1) {
                                entries.shift();
                            }
                            var stream = cbr.stream(entries[0].name);
                            stream.on('error', (err) => {
                                //console.error(err);
                                throw err;
                            });
                            stream.on('end', () => { // This happens async so we can only offer an event trigger
                                makeCover(cbrFile, filehash, path.join(tmpPath, path.basename(entries[0].name)));
                            });
                            var writeable = require('fs').createWriteStream(path.join(tmpPath, path.basename(entries[0].name)))
                            writeable.on('close', () => { // Ensure we tidy up after the file is closed
                                cleanupCallback();
                            })
                            stream.pipe(writeable);
                        });

                    });
                    break;
                case '.cbz':
                    //case '.zip':
                case '.cb7':
                    //case '.rar':
                    var n7z = require('node-7z'), // WARNING: Node7z requires "Extracting  " message in stdout use 7za renamed 7z from v^9.38 - NOT v^15.
                        imageFiles = [], // The array of compressed files
                        cbr = new n7z();

                    cbr.list(cbrFile) // First lets get the first image file from the compressed file
                        .progress(function(compressedFiles) {
                            imageFiles = imageFiles.concat(compressedFiles);
                        })
                        .then(function(spec) { // Now we have finished the list extract the imageFiles
                            var tmp = require('tmp'); // Create a unique temp dir because we don't want clashing async filenames
                            tmpDir = tmp.dir({
                                prefix: 'cbz_',
                                //dir: path.join(__dirname, 'temp'), // Put them somewhere other than system temp
                                unsafeCleanup: true
                            }, function _tempDirCreated(err, tmpPath, cleanupCallback) {
                                if (err) throw err;
                                if (imageFiles.length > 0) {
                                    imageFiles.sort((a, b) => {
                                        if (path.basename(a.name) < path.basename(b.name)) {
                                            return -1;
                                        } else {
                                            return 1;
                                        }
                                    }); // Sort the file array as they may not be stored in order
                                    while (path.extname(imageFiles[0].name) == '' || '.jpg.jpeg.gif.png'.indexOf(path.extname(imageFiles[0].name)) == -1) {
                                        imageFiles.shift();
                                    }
                                    var extractedFiles = [];
                                    cbr.extract(cbrFile, tmpPath, {
                                                wildcards: imageFiles[0].name
                                            } // we only want the first file
                                        )
                                        .progress((files) => {
                                            extractedFiles = extractedFiles.concat(files);
                                        })
                                        .then(() => {
                                            if (extractedFiles) {
                                                makeCover(cbrFile, filehash, path.join(tmpPath, path.basename(extractedFiles[0])).replace('\r', ''));
                                            } else {
                                                console.error('Unable to extract files from ' + cbrFile);
                                            }
                                            cleanupCallback();
                                        });
                                } else {
                                    eventEmitter.emit('cover', [cbrFile, path.join('images', 'nocover.png')]); // Trigger the cover event
                                }
                            });
                        })
                        .catch(function(err) {
                            console.error('Can\'t handle file ' + cbrFile);
                            // Probably a RAR format not supported by 7-zip
                            eventEmitter.emit('cover', [cbrFile, path.join('images', 'nocover.png')]); // Trigger the cover event
                        });
                    break;
            }
        }
    }

    /**
     * Read the cover from the temporary file and create a resized version in the cover cache
     * Once created trigger the 'cover' event sending details of the new cover
     *
     * @param string cbrFile = file name to be reported to the event
     * @param string filehash = MD5 hash of the filename used to place the cover image in the cache
     * @param string tmpFile = full path of the temporary image file to use as the cover
     */
    function makeCover(cbrFile, filehash, tmpFile) {
        try {
            // Use createFromPath as it's synchronous if we use an async read like readFile we move out of the thread and all
            // kinds of weird stuff happens as variables get updated by other async processes
            var nativeImage = require('electron').nativeImage,
                fs = require('fs'),
                coverImg = nativeImage.createFromPath(tmpFile), // Load the image
                buffer = coverImg.resize({
                    height: 240
                });
            //console.log('here!', cbrFile, path.join(tmpPath, extractedFiles[0].replace('\r', '')), coverImg.isEmpty(), buffer.isEmpty());
            if (buffer.isEmpty()) { // TODO: Something not right here... animated gif?
                eventEmitter.emit('cover', [cbrFile, path.join('images', 'nocover.png')]); // Trigger the cover event
                //return path.join('images', 'nocover.png');
            } else {
                //console.log('Caching', cbrFile);
                var mkdirp = require('mkdirp');

                mkdirp(path.join(__dirname, 'covercache', filehash.substring(0, 2)), function(err) {
                    if (err) {
                        console.error(err);
                    } else {
                        // Save the buffer to a file as a png (.toPng) format
                        var png = buffer.toPng();
                        fs.writeFile(path.join(__dirname, 'covercache', filehash.substring(0, 2), filehash + '.png'), png,
                            (err) => {
                                if (err) {
                                    console.error(err);
                                } else {
                                    //return path.join('covercache', filehash.substring(0, 2), filehash) + '.png';
                                    eventEmitter.emit('cover', [cbrFile, path.join('covercache', filehash.substring(0, 2), filehash) + '.png']); // Trigger the cover event
                                }
                            }
                        )
                    }
                });
            }
        } catch (err) {
            console.error(err);
            eventEmitter.emit('cover', [cbrFile, path.join('images', 'nocover.png')]); // Trigger the cover event
        }
    }

    /* NOT USED */
    function CacheImage(file, buffer) {
        // Create the folder if it doesn't exist
        var fs = require('fs'),
            mkdirp = require('mkdirp'),
            crypto = require('crypto'),
            filehash = crypto.createHash('md5').update(path.basename(file)).digest('hex');

        mkdirp(path.join(__dirname, 'covercache', filehash.substring(0, 2)), function(err) {
            if (err) {
                console.error(err);
            } else {
                // Save the buffer to a file as a png (.toPng) format
                var png = buffer.toPng();
                fs.writeFile(path.join(__dirname, 'covercache', filehash.substring(0, 2), filehash + '.png'), png,
                    function(err) {
                        if (err) {
                            console.error(err);
                        } else {
                            cleanupCallback(); // Now the files written cleanup the temp dir
                            //console.log('non-cached image ' + file)
                            eventEmitter.emit('cover', [file, path.join('covercache', filehash.substring(0, 2), filehash) + '.png']); // Trigger the cover event
                        }
                    }
                )
            }
        });
    }

    const {
        ipcRenderer
    } = require('electron');

    function LaunchReaderIpc(cbr) {
        ipcRenderer.send('LaunchReader', cbr);
    }

    function favouriteAddFolder() {
        console.log($('#tree').fancytree('getTree').focusNode);
        if ($('#tree').fancytree('getTree').focusNode) {
            var node = $('#tree').fancytree('getTree').focusNode;
            ipcRenderer.send('favouriteAddFolder', node.key);
        }
    }
