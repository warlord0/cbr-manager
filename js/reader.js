
/*
 * cbr-manager - Electron based Comic Book Manager and Reader. Suitable for CBR, CBZ and CB7 Comic Book archives.
 * @version v0.1.0
 * @link https://github.com/warlord0/cbr-manager
 * @license GPL-3.0
 */
'use strict';
var Menu, MenuItem, cfg, configStore, ctxMenu, eventEmitter, events, getPage, makeContextMenu, owl, pageCount, pkg, remote, thumbWidth;

pkg = require('./package.json');

configStore = require('configstore');

cfg = new configStore(pkg.name);

pageCount = 0;

owl = void 0;

window.loadPages = function(cbrFile) {
  var _tempDirCreated, fs, path, tmp;
  fs = require('fs');
  path = require('path');
  tmp = require('tmp');
  tmp.dir({
    prefix: 'cbr_',
    unsafeCleanup: true
  }, _tempDirCreated = function(err, tmpPath, cleanupCallback) {
    var cbr, n7z, unrar;
    if (err) {
      console.error(err);
    } else {
      switch (path.extname(cbrFile)) {
        case '.cbz':
        case '.cb7':
          n7z = require('node-7z');
          cbr = new n7z;
          cbr.extract(cbrFile, tmpPath).then(function() {
            fs.readdir(tmpPath, function(err, files) {
              var file, i, len;
              if (err) {
                console.error(err);
                return;
              }
              for (i = 0, len = files.length; i < len; i++) {
                file = files[i];
                switch (path.extname(file)) {
                  case '.png':
                  case '.jpg':
                  case '.jpeg':
                  case '.gif':
                    pageCount++;
                    getPage(path.join(tmpPath, file));
                }
              }
              eventEmitter.emit('loaded');
            });
          });
          break;
        case '.cbr':
          unrar = require('unrar');
          cbr = new unrar(cbrFile);
          cbr.list(function(err, entries) {
            var active, entry, i, len, stream, writable;
            entries.sort(function(a, b) {
              if (path.basename(a.name) < path.basename(b.name)) {
                return -1;
              } else {
                return 1;
              }
            });
            active = 0;
            for (i = 0, len = entries.length; i < len; i++) {
              entry = entries[i];
              stream = cbr.stream(entry.name);
              writable = fs.createWriteStream(path.join(tmpPath, path.basename(entry.name)));
              stream.on('err', function() {
                console.error(err);
              });
              writable.on('open', function() {
                active++;
              });
              writable.on('close', function() {
                active--;
                if (active === 0) {
                  fs.readdir(tmpPath, function(err, files) {
                    var file, j, len1;
                    if (err) {
                      console.error(err);
                    } else {
                      console.log(files);
                      for (j = 0, len1 = files.length; j < len1; j++) {
                        file = files[j];
                        switch (path.extname(file)) {
                          case '.png':
                          case '.jpg':
                          case '.jpeg':
                          case '.gif':
                            pageCount++;
                            getPage(path.join(tmpPath, file));
                        }
                      }
                      eventEmitter.emit('loaded');
                    }
                  });
                }
              });
              stream.pipe(writable);
            }
          });
      }
      $(window).on('unload', function() {
        cleanupCallback();
      });
    }
  });
};

getPage = function(file) {
  var $pages, $thumbs, dimensions, error, fs, path, ratio, sizeOf;
  fs = require('fs');
  path = require('path');
  sizeOf = require('image-size');
  try {
    dimensions = sizeOf(file);
    ratio = dimensions.width / dimensions.height;
    $pages = $('#pages');
    $thumbs = $('.owl-thumbs');
    $pages.append('<img data-merge="' + (ratio < 1 ? 1 : 2) + '" class="lazyload" data-src="' + file + '" alt="' + path.basename(file) + '">');
    $thumbs.append('<div class="owl-thumb-item"><img src="' + file + '" alt="' + path.basename(file, path.extname(file)) + '"></div>');
  } catch (error1) {
    error = error1;
    console.error(error);
  }
};

events = require('events');

eventEmitter = new events.EventEmitter;

eventEmitter.on('loaded', function() {
  owl = $('#pages').owlCarousel({
    thumbs: true,
    thumbsPrerendered: true,
    dotsSpeed: 0,
    nav: true,
    navContainer: '#owl-nav',
    navText: ['<button class="btn btn-default" id="navleft"><i class="fa fa-chevron-left"></i></button>', '<button class="btn btn-default" id="navright"><i class="fa fa-chevron-right"></i></button>'],
    dots: false,
    merge: true,
    responsiveClass: true,
    responsive: {
      0: {
        items: 1,
        mergeFit: false
      },
      1024: {
        items: 2,
        mergeFit: true
      },
      1440: {
        items: 3,
        mergeFit: true
      }
    }
  });
  owl.on('mousewheel', '.owl-stage', function(e) {
    e.preventDefault();
    if (e.deltaY > 0) {
      owl.trigger('prev.owl');
    } else {
      owl.trigger('next.owl');
    }
  });
});

thumbWidth = function() {
  var totalWidth;
  totalWidth = 0;
  $('.owl-thumb-item > img').each(function(index, item) {
    totalWidth += item.width;
  });
  if (totalWidth < $(document).width()) {
    totalWidth = $(document).width();
  }
  if ($('.owl-thumbs').width() !== totalWidth) {
    $('.owl-thumbs').width(totalWidth);
  }
  return totalWidth;
};

$(document).on('keydown', function(e) {
  e.preventDefault();
  if (e.key === 'PageDown' || e.key === 'ArrowRight' || e.keyCode === 32) {
    owl.trigger('next.owl');
  } else if (e.key === 'PageUp' || e.key === 'ArrowLeft') {
    owl.trigger('prev.owl');
  } else if (e.key === 'Home') {
    owl.trigger('to.owl', 0);
  } else if (e.key === 'End') {
    owl.trigger('to.owl', pageCount);
  } else if (e.key === 'x' || e.key === 'X') {
    window.close();
  }
});

window.addEventListener('resize', function() {
  $('.owl-thumbs').width(thumbWidth());
});

$('#navThumbRight').on('click', function(e) {
  var increment, right, thumbs, width;
  e.preventDefault();
  thumbs = $('.owl-thumbs');
  width = thumbWidth();
  right = thumbs.position().left + width;
  increment = $(document).width();
  if (right > $(document).width()) {
    if ((right - increment) < $(document).width()) {
      increment = right - increment;
    }
    thumbs.animate({
      left: "-=" + increment
    });
  } else {
    thumbs.animate({
      left: $(document).width - width
    });
  }
});

$('#navThumbLeft').on('click', function(e) {
  var increment, left, thumbs, width;
  e.preventDefault();
  thumbs = $('.owl-thumbs');
  left = thumbs.position().left;
  width = thumbWidth();
  increment = $(document).width();
  if (left === 0) {

  } else if (left < 0 && (left + increment) < 0) {
    thumbs.animate({
      left: "+=" + increment
    });
  } else {
    thumbs.animate({
      left: 0
    });
  }
});

remote = require('electron').remote;

Menu = remote.Menu, MenuItem = remote.MenuItem;

ctxMenu = new Menu();

makeContextMenu = function() {
  var i, len, templateItem, templateItems;
  templateItems = [
    {
      label: 'First Page',
      accelerator: 'Home',
      click: function() {
        return owl.trigger('to.owl', 0);
      }
    }, {
      label: 'Previous Page',
      accelerator: 'PageUp',
      click: function() {
        return owl.trigger('prev.owl');
      }
    }, {
      label: 'Next Page',
      accelerator: 'PageDown',
      click: function() {
        return owl.trigger('next.owl');
      }
    }, {
      label: 'Last Page',
      accelerator: 'End',
      click: function() {
        return owl.trigger('to.owl', pageCount);
      }
    }, {
      role: 'separator',
      enabled: false
    }, {
      label: 'Exit',
      accelerator: 'X',
      click: function() {
        return window.close();
      }
    }
  ];
  for (i = 0, len = templateItems.length; i < len; i++) {
    templateItem = templateItems[i];
    ctxMenu.append(new MenuItem(templateItem));
  }
};

makeContextMenu();

addEventListener('contextmenu', function(e) {
  e.preventDefault();
  return ctxMenu.popup(remote.getCurrentWindow());
}, false);

//# sourceMappingURL=reader.js.map
