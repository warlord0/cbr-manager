/*
 This file isn't used it's here for reference only as pre-coffeescript
*/
const pkg = require('./package.json'),
    configstore = require('configstore'),
    cfg = new configstore(pkg.name);

var pageCount = 0; // TODO: Figure out why we can't get this fron the info: callback

/**
 * Extract images from cbr file into a temporary folder
 * Scan for images and call GetPages() to load them in the html
 * Triggers the eventEmmitter 'loaded' when complete
 *
 * @params string cbrFile = comic book archive file
 */
function LoadPages(cbrFile) {
    const fs = require('fs'),
        path = require('path'),
        tmp = require('tmp')

    tmp.dir({
            prefix: 'cbr_',
            unsafeCleanup: true
        }, function _tempDirCreated(err, tmpPath, cleanupCallback) {
        if (err) {
            console.error(err);
        } else {
            switch (path.extname(cbrFile)) {
                case '.cbz':
                case '.cb7':
                    var n7z = require('node-7z'),
                        cbr = new n7z();
                    cbr.extract(cbrFile, tmpPath)
                        .then(() => {
                            fs.readdir(tmpPath, (err, files) => {
                                if (err) {
                                    console.error(err);
                                }
                                files.forEach(function(file, i) {
                                    switch (path.extname(file)) {
                                        case ".png":
                                        case ".jpg":
                                        case ".jpeg":
                                        case ".gif":
                                            pageCount++;
                                            GetPage(path.join(tmpPath, file));
                                            break;
                                    }
                                });
                                eventEmitter.emit('loaded');
                            });
                        });
                    break;
                case '.cbr':
                    var unrar = require('unrar'),
                        cbr = new unrar(cbrFile);

                    cbr.list((err, entries) => {
                        entries.sort((a, b) => {
                            if (path.basename(a.name) < path.basename(b.name)) {
                                return -1;
                            } else {
                                return 1;
                            }
                        });
                        // console.log(entries);
                        var active = 0; // Used to monitor open streams
                        for (var i=0; i<entries.length; i++) {
                            // console.log(i, path.basename(entries[i].name));
                            var stream = cbr.stream(entries[i].name),
                                writeable = fs.createWriteStream(path.join(tmpPath, path.basename(entries[i].name)));
                            stream.on('error', (err) => {
                                console.error(err);
                            });
                            writeable.on('open', () => {
                                // console.log('writeable open');
                                active++;
                            })
                            writeable.on('close', () => {
                                // console.log('writeable close');
                                active--;
                                if (active == 0) { // If all streams are closed continue
                                    // console.log('all done!');
                                    fs.readdir(tmpPath, (err, files) => {
                                        if (err) {
                                            console.error(err);
                                        }
                                        files.forEach((file) => {
                                            switch (path.extname(file)) {
                                                case ".png":
                                                case ".jpg":
                                                case ".jpeg":
                                                case ".gif":
                                                    pageCount++;
                                                    GetPage(path.join(tmpPath, file));
                                                    break;
                                            }
                                        });
                                        eventEmitter.emit('loaded');
                                    });
                                }
                            })
                            stream.pipe(writeable);
                        }

                    });

                    break;
                }
            $(window).on('unload', () => {
                cleanupCallback();
            })
        }
    });

}

/**
 * Read the image file and add to the pages and thumbnails elements
 *
 * @params string file
 *
 * @returns void()
 */
function GetPage(file) {
    var fs = require('fs'),
        path = require('path'),
        sizeOf = require('image-size'); // Faster than nativeImage ?

    try {
        var dimensions = sizeOf(file),
            ratio = dimensions.width / dimensions.height,
            $pages = $('div#pages'),
            $thumbs = $('div.owl-thumbs');

        $pages.append(
            '<img data-merge="' + ((ratio < 1) ? 1 : 2) + '" class="lazyload" data-src="' +
            file + '" alt="' + path.basename(file) + '">'
        );
        $thumbs.append(
            '<div class="owl-thumb-item"><img src="' + file + '" alt="' + path.basename(file, path.extname(file)) + '"></div>'
        );
    } catch (err) {
        console.error(err);
    }
}

// Handle the click of the show/hide thumbs button
$('#navThumb').on('click', function(e) {
    if ($(this).children('i').first().hasClass('fa-chevron-up')) {
        $(this).children('i').switchClass('fa-chevron-up', 'fa-chevron-down');
    } else {
        $(this).children('i').switchClass('fa-chevron-down', 'fa-chevron-up');
    }
    $('div#owl-thumb-nav').slideToggle({
        direction: 'down'
    });
})

const {BrowserWindow, remote} = require('electron');
var reader = remote.getCurrentWindow();

$(document).ready(function() {
});

// Event for handling when the owl carousel is populated and  ready
const events = require('events');
const eventEmitter = new events.EventEmitter();

eventEmitter.on('loaded', () => {
    var owl = $('#pages').owlCarousel({
        thumbs: true,
        //thumbImage: true,
        thumbsPrerendered: true,
        //moveThumbsInside: true,
        // thumbContainerClass: 'owl-thumbs',
        // thumbItemClass: 'owl-thumb-item',
        dotsSpeed: 0, // Go instantly to the page on thumb choice
        nav: true,
        navContainer: '#owl-nav',
        navText: [
            '<button class="btn btn-default" id="navleft"><i class="fa fa-chevron-left"></i></button>',
            '<button class="btn btn-default" id="navright"><i class="fa fa-chevron-right"></i></button>'
        ],
        dots: false,
        //lazyLoad: true, // Use lazyload.js instead or we get missing pages
        merge: true,
        responsiveClass: true,
        responsive: {
            0: {
                items: 1,
                mergeFit: false
            },
            1024: {
                items: 2,
                mergeFit: true,
                slideBy: 1
            },
            1440: {
                items: 3,
                mergeFit: true,
                slideBy: 1
            }
        }
        // onLoadedLazy: function(e) {
        //     console.log('lazyLoaded', e);
        // },
        // onInitialized: function(e) {
        //     console.log('Initialized', e);
        // },
        // onChanged: function(e) {
        //     console.log('changed', e);
        // },
        // info: function(e, f) {
        //     console.log('info', e, f);
        // },
        // onResize: function(e) {
        //     console.log('resize', e);
        // },
        // onResized: function(e) {
        //     console.log('resized', e);
        // }
    });

    /**
     * Calculate the total width of the thumbs in the container
     * and resize the container
     *
     * @returns integer totalWidth
     */
    function ThumbWidth() {
        var totalWidth = 0;
        $('.owl-thumb-item > img').each(function(index, item) {
            totalWidth += item.width;
        });
        if (totalWidth < $(document).width()) {
            totalWidth = $(document).width();
        }
        if ($('div.owl-thumbs').width() != totalWidth) {
            $('div.owl-thumbs').width(totalWidth);
        }
        return totalWidth;
    }

    owl.on('loaded.owl.lazy', function(e) {
        console.log(e);
    });

    // Use the mousewheel - down = scroll forward, up = backwards
    owl.on('mousewheel', '.owl-stage', function(e) {
        e.preventDefault();
        if (e.deltaY > 0) {
            owl.trigger('prev.owl');
        } else {
            owl.trigger('next.owl');
        }
    });

    // Use some accessibility controls for keyboard users
    $(document).keydown(function(e) {
        console.log(pageCount, e);
        e.preventDefault();
        if (e.key == "PageDown" || e.key == "ArrowRight" || e.keyCode == 32) {
            owl.trigger('next.owl');
        } else if (e.key == "PageUp" || e.key == "ArrowLeft") {
            owl.trigger('prev.owl');
        } else if (e.key == "Home") {
            owl.trigger('to.owl', 0);
        } else if (e.key == "End") {
            owl.trigger('to.owl', pageCount);
        } else if (e.key == 'x' || e.key == 'X') {
            window.close();
        }
    });

    window.addEventListener('resize', () => {
        // Keep the thumbs the width of the document
        $('.owl-thumbs').width(ThumbWidth());
    })

    // Handle the thumbnail navigation
    $('#navThumbRight').on('click', function(e) {
        e.preventDefault();
        var thumbs = $('.owl-thumbs'),
            width = ThumbWidth(); //thumbs.width(),
        right = thumbs.position().left + width,
            increment = $(document).width();
        if (right > $(document).width()) {
            if ((right - increment) < $(document).width()) { // Don't scroll past the end
                increment = right - increment;
            }
            thumbs.animate({
                left: '-=' + increment
            });
        } else {
            thumbs.animate({
                left: ($(document).width() - width)
            });
        }
    });

    $('#navThumbLeft').on('click', function(e) {
        e.preventDefault();
        var thumbs = $('.owl-thumbs'),
            left = thumbs.position().left,
            width = ThumbWidth(),
            increment = $(document).width();
        if (left == 0) {} else if ((width - increment) > left && (left - increment) > 0) {
            // Don't scroll past beginning
            thumbs.animate({
                left: "+=" + increment
            });
        } else {
            thumbs.animate({
                left: 0
            });
        }
    });

});
