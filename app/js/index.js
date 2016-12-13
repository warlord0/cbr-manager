
/*
 * cbr-manager - Electron based Comic Book Manager and Reader. Suitable for CBR, CBZ and CB7 Comic Book archives.
 * @version v0.1.0
 * @link https://github.com/warlord0/cbr-manager
 * @license GPL-3.0
 */
'use strict';
var ROOT, app, cfg, configStore, covercache, eventEmitter, events, getCover, getDir, getWindowsDrives, ipcRenderer, launchReaderIpc, loadCovers, makeCover, path, pkg, remote, selectChild, selectNode, setWallpaper, xdgBaseDir;

ROOT = '/';

remote = require('electron').remote;

app = remote.app;

pkg = require('../package.json');

configStore = require('configstore');

cfg = new configStore(pkg.name);

xdgBaseDir = require('xdg-basedir');

path = require('path');

covercache = null;

$(function() {
  var ref;
  $('#tree').fancytree({
    selectMode: 1,
    source: function(e, data) {
      var nodes;
      return nodes = getDir(ROOT);
    },
    lazyLoad: function(e, data) {
      var dfd, fs, nodepath, nodes;
      dfd = $.Deferred();
      fs = require('fs');
      path = require('path');
      nodepath = data.node.key;
      nodes = [];
      data.result = dfd.promise();
      fs.readdir(nodepath, function(err, files) {
        if (err) {
          dfd.resolve([]);
          console.error(err);
        }
        files.map(function(file) {
          return file;
        }).filter(function(file) {
          try {
            return fs.statSync(path.join(nodepath, file)).isDirectory();
          } catch (error1) {
            err = error1;
            console.error(err);
            return false;
          }
        }).forEach(function(file) {
          nodes.push({
            title: file,
            expanded: false,
            folder: true,
            lazy: true,
            key: path.join(nodepath, file)
          });
        });
        dfd.resolve(nodes);
      });
    },
    toggleEffect: {
      effect: 'drop',
      options: {
        direction: 'left'
      },
      duration: 400
    },
    beforeActivate: function(e, data) {
      $('#innertube').children().remove();
    },
    activate: function(e, data) {
      var p;
      p = data.node.key;
      setWallpaper(p);
      loadCovers(p);
    },
    init: function(e, data) {}
  });
  $('#splitter').width('100%').height('100%').split({
    orientation: 'vertical',
    limit: 200,
    position: cfg.get('browser').split
  });
  $(window).on('unload', function(e) {
    var cfgBrowser;
    cfgBrowser = cfg.get('browser');
    cfgBrowser.split = $('#leftSplit').css('width');
    cfg.set('browser', cfgBrowser);
  });
  $(window).on('resize', function(e) {
    return $('#splitter').height('100%');
  });
  covercache = (ref = cfg.get('covercache')) != null ? ref : path.join(xdgBaseDir.data, 'covercache');
  cfg.set({
    covercache: covercache
  });
});

selectNode = function(p) {
  var activeNode, branches, os;
  os = require('os');
  branches = p.split(path.sep);
  if (os.platform() === 'win32') {
    branches[0] += path.sep;
  }
  activeNode = $('#tree').fancytree('getTree').activateKey(branches.shift());
  selectChild(activeNode, branches);
};

selectChild = function(activeNode, branches) {
  activeNode.setExpanded(true).then(function() {
    if (activeNode = $('#tree').fancytree.activateKey(path.join(activeNode.key, branches.shift()))) {
      if (branches.length > 0) {
        selectChild(activeNode, branches);
      }
    }
  });
};

getWindowsDrives = function() {
  var childProcess, drives, os, stdout, tableParser;
  os = require('os');
  childProcess = require('child_process');
  tableParser = require('table-parser');
  if (os.platform() === 'win32') {
    stdout = childProcess.execSync('wmic logicaldisk get caption');
    drives = tableParser.parse(stdout.toString()).map(function(caption) {
      return caption.Caption[0];
    });
  }
  return drives;
};

getDir = function(p) {
  var drive, drives, error, file, files, fs, j, k, len, len1, nodes, os;
  fs = require('fs');
  os = require('os');
  nodes = [];
  if (p === ROOT && os.platform() === 'win32') {
    drives = getWindowsDrives();
    for (j = 0, len = drives.length; j < len; j++) {
      drive = drives[j];
      nodes.push({
        title: drive + path.sep,
        expanded: false,
        folder: true,
        lazy: true,
        key: drive + path.sep
      });
    }
  } else {
    files = fs.readdirSync(p);
    for (k = 0, len1 = files.length; k < len1; k++) {
      file = files[k];
      try {
        if (!fs.statSync(path.join(p, file)).isFile()) {
          nodes.push({
            title: file,
            expanded: false,
            folder: true,
            lazy: true,
            key: path.join(p, file)
          });
        }
      } catch (error1) {
        error = error1;
        console.error(error);
      }
    }
  }
  return nodes;
};

events = require('events');

eventEmitter = new events.EventEmitter();

eventEmitter.on('cover', function(arg) {
  var $innertube, id, nativeImage;
  nativeImage = require('electron').nativeImage;
  $innertube = $('#innertube');
  id = 'id' + (new Date()).getTime();
  $innertube.append('<div class="poster hvr-grow" data-id="' + encodeURI(arg[0]) + '" id="' + id + '""><div class="img"><img class="cover" id="' + path.basename(arg[1]) + '" src="' + arg[1] + '"><p class="caption">' + path.basename(arg[0], path.extname(arg[1])) + '</p></div>');
  tinysort($('div.poster'), {
    attr: 'data-id'
  });
  $('#' + id).on('dblclick', function(e) {
    launchReaderIpc(decodeURI($(this).attr('data-id')).replace(/\\/g, '\/'));
  });
});

$('#innertube').sortable({
  revert: true
});

setWallpaper = function(p) {
  var error, file, fs, j, len, wallpaper, wallpapers;
  fs = require('fs');
  wallpapers = ['folder.jpg', 'folder.png'];
  for (j = 0, len = wallpapers.length; j < len; j++) {
    wallpaper = wallpapers[j];
    file = path.join(p, wallpaper);
    try {
      fs.accessSync(file);
      $('#wallpaper').css('background-image', 'url("file:///' + file.replace(/\\/g, '/') + '")').css('background-size', '100% auto').css('opacity', '0.33');
    } catch (error1) {
      error = error1;
      $('#wallpaper').css('background-image', 'url("images/superhero-icon.png")').css('background-size', 'auto').css('opacity', '1.0');
    }
    break;
  }
};

loadCovers = function(p) {
  var error, fs;
  fs = require('fs');
  try {
    fs.readdir(p, function(err, files) {
      if (err) {
        console.error(err);
      } else {
        return files.sort().forEach(function(file, i) {
          switch (path.extname(file)) {
            case '.cbr':
            case '.cbz':
            case '.cb7':
              getCover(path.join(p, file));
              return;
          }
        });
      }
    });
  } catch (error1) {
    error = error1;
    console.error(error);
    return;
  }
};

getCover = function(cbrFile) {
  var _tempDirCreated, cbr, coverImg, crypto, err, filehash, fs, imageFiles, n7z, nativeImage, tmp, tmpDir, unrar;
  try {
    fs = require('fs');
    crypto = require('crypto');
    nativeImage = require('electron').nativeImage;
    filehash = crypto.createHash('md5').update(path.basename(cbrFile)).digest('hex');
    coverImg = nativeImage.createFromPath(path.join(covercache, filehash.substring(0, 2), filehash + '.png'));
    if (!coverImg.isEmpty()) {
      eventEmitter.emit('cover', [cbrFile, path.join(covercache, filehash.substring(0, 2), filehash + '.png')]);
      return;
    } else {
      switch (path.extname(cbrFile)) {
        case '.cbr':
          unrar = require('unrar');
          cbr = new unrar(cbrFile);
          tmp = require('tmp');
          tmpDir = tmp.dir({
            prefix: 'cbr_',
            unsafeCleanup: true,
            dir: app.getPath('temp')
          }, _tempDirCreated = function(err, tmpPath, cleanupCallback) {
            cbr.list(function(err, entries) {
              var stream, writable;
              entries.sort(function(a, b) {
                if (path.basename(a.name) < path.basename(b.name)) {
                  return -1;
                } else {
                  return 1;
                }
              });
              while (path.extname(entries[0].name) === '' || '.jpg.jpeg.gif.png'.indexOf(path.extname(entries[0].name)) === -1) {
                entries.shift();
              }
              stream = cbr.stream(entries[0].name);
              stream.on('error', function(err) {
                console.error(err);
              });
              stream.on('end', function() {
                makeCover(cbrFile, filehash, path.join(tmpPath, path.basename(entries[0].name)));
              });
              writable = fs.createWriteStream(path.join(tmpPath, path.basename(entries[0].name)));
              writable.on('close', function() {
                cleanupCallback();
              });
              stream.pipe(writable);
            });
          });
          break;
        case '.cbz':
        case '.cb7':
          n7z = require('node-7z');
          cbr = new n7z;
          imageFiles = [];
          cbr.list(cbrFile).progress(function(compressedFiles) {
            imageFiles = imageFiles.concat(compressedFiles);
          }).then(function(spec) {
            tmp = require('tmp');
            tmpDir = tmp.dir({
              prefix: 'cbz_',
              unsafeCleanup: true,
              dir: app.getPath('temp')
            }, _tempDirCreated = function(err, tmpPath, cleanupCallback) {
              var extractedFiles;
              if (err) {
                console.error(err);
              } else {
                extractedFiles = [];
                if (imageFiles.length > 0) {
                  imageFiles.sort(function(a, b) {
                    if (path.basename(a.name) < path.basename(b.name)) {
                      return -1;
                    } else {
                      return 1;
                    }
                  });
                  while (path.extname(imageFiles[0].name) === '' || '.jpg.jpeg.gif.png'.indexOf(path.extname(imageFiles[0].name)) === -1) {
                    imageFiles.shift();
                  }
                  cbr.extract(cbrFile, tmpPath, {
                    wildcards: imageFiles[0].name
                  }).progress(function(files) {
                    extractedFiles = extractedFiles.concat(files);
                  }).then(function() {
                    if (extractedFiles[0] != null) {
                      makeCover(cbrFile, filehash, path.join(tmpPath, path.basename(extractedFiles[0])).replace('\r', ''));
                    } else {
                      console.error('Unable to extract files from ' + cbrFile);
                    }
                    cleanupCallback();
                  });
                } else {
                  eventEmitter.emit('cover', [cbrFile, path.join('images', 'nocover.png')]);
                }
              }
            });
          })["catch"](function(err) {
            console.error('Can\'t handle file ' + cbrFile);
            eventEmitter.emit('cover', [cbrFile, path.join('images', 'nocover.png')]);
          });
      }
    }
  } catch (error1) {
    err = error1;
    return console.error(err);
  }
};

makeCover = function(cbrFile, filehash, tmpFile) {
  var buffer, coverImg, error, fs, mkdirp, nativeImage;
  try {
    nativeImage = require('electron').nativeImage;
    fs = require('fs');
    coverImg = nativeImage.createFromPath(tmpFile);
    buffer = coverImg.resize({
      height: 240
    });
    if (buffer.isEmpty()) {
      eventEmitter.emit('cover', [cbrFile, path.join('images', 'nocover.png')]);
    } else {
      mkdirp = require('mkdirp');
      mkdirp(path.join(covercache, filehash.substring(0, 2)), function(err) {
        var png;
        if (err) {
          console.error(err);
        } else {
          png = buffer.toPng();
          fs.writeFile(path.join(covercache, filehash.substring(0, 2), filehash + '.png'), png, function(err) {
            if (err) {
              return console.error(err);
            } else {
              return eventEmitter.emit('cover', [cbrFile, path.join(covercache, filehash.substring(0, 2), filehash) + '.png']);
            }
          });
        }
      });
    }
  } catch (error1) {
    error = error1;
    console.error(error);
    eventEmitter.emit('cover', [cbrFile, path.join('images', 'nocover.png')]);
  }
};

ipcRenderer = require('electron').ipcRenderer;

launchReaderIpc = function(cbrFile) {
  return ipcRenderer.send('LaunchReader', cbrFile);
};

//# sourceMappingURL=index.js.map
