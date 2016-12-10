'use strict'

pkg = require './package.json'
configStore = require 'configstore'
cfg = new configStore(pkg.name)
pageCount = 0 # TODO: Figure out why we can't get this from the info: callback
owl = undefined

window.loadPages = (cbrFile) -> # Needs to be a window. function or can't call it from main.js
    fs = require 'fs'
    path = require 'path'
    tmp = require 'tmp'

    tmp.dir
        prefix: 'cbr_'
        unsafeCleanup: true # So it deletes any files within
    , _tempDirCreated = (err, tmpPath, cleanupCallback) ->
        if err
            console.error err
            return
        else
            switch path.extname cbrFile
                when '.cbz', '.cb7'
                    n7z = require 'node-7z'
                    cbr = new n7z
                    cbr.extract cbrFile, tmpPath
                    .then ->
                        fs.readdir tmpPath, (err, files) ->
                            if err
                                console.error err
                                return
                            # files.forEach (file, i) ->
                            for file in files
                                switch path.extname file
                                    when '.png', '.jpg', '.jpeg', '.gif'
                                        pageCount++
                                        getPage path.join(tmpPath, file)
                            eventEmitter.emit 'loaded'
                            return
                        return
                    break;
                when '.cbr'
                    unrar = require 'unrar'
                    cbr = new unrar cbrFile

                    cbr.list (err, entries) ->
                        entries.sort (a, b) ->
                            if path.basename(a.name) < path.basename(b.name)
                                -1
                            else
                                1
                        active = 0 # Keep track of open streams TODO: Better way?
                        for entry in entries
                            stream = cbr.stream entry.name
                            writable = fs.createWriteStream path.join(tmpPath, path.basename(entry.name))
                            stream.on 'err', ->
                                console.error err
                                return
                            writable.on 'open', ->
                                active++
                                return
                            writable.on 'close', ->
                                active--
                                if active is 0
                                    fs.readdir tmpPath, (err, files) ->
                                        if err
                                            console.error err
                                            return
                                        else
                                            console.log files
                                            for file in files
                                                switch path.extname(file)
                                                    when '.png', '.jpg', '.jpeg', '.gif'
                                                        pageCount++
                                                        getPage path.join(tmpPath, file)
                                            eventEmitter.emit 'loaded'
                                            return
                                    return
                            stream.pipe writable # Write the compressed file to temp file
                        return
            $(window).on 'unload', -> # Tidy up when the window closes
                cleanupCallback()
                return
            return
    return

# Get a page from a temporary file
# @param string file = full path of file to use
getPage = (file) ->
    fs = require 'fs'
    path = require 'path'
    sizeOf = require 'image-size'

    try
      dimensions = sizeOf file
      ratio = dimensions.width / dimensions.height
      $pages = $ '#pages'
      $thumbs = $ '.owl-thumbs'

      $pages.append '<img data-merge="' + (if ratio < 1 then 1 else  2) + '" class="lazyload" data-src="' + file + '" alt="' + path.basename(file) + '">'
      $thumbs.append '<div class="owl-thumb-item"><img src="' + file + '" alt="' + path.basename(file, path.extname(file)) + '"></div>'
    catch error
        console.error error
    return

# Show/hide toggle the thumb navigation when the button is clicked
# No longer used as it's moved to a CSS transition
# $('#navThumb').on 'click', (e) ->
#     toggleThumbnails()
#     return

# toggleThumbnails = ->
#     if $('#navThumb').children('i').first().hasClass('fa-chevron-up')
#         $('#navThumb').children('i').first().switchClass('fa-chevron-up', 'fa-chevron-down')
#         $('.owl-thumbs,#navThumbLeft,#navThumbRight').css
#             transition: '1s'
#             transform: 'translateY(-240px)'
#     else
#         $('#navThumb').children('i').first().switchClass('fa-chevron-down', 'fa-chevron-up')
#         $('.owl-thumbs,#navThumbLeft,#navThumbRight').css
#             transition: '1s'
#             transform: 'translateY(0px)'
#     # $('#owl-thumb-nav').toggle 'clip',
#     #     direction: 'down'
#     return

# For triggering an events once all pages are loaded
events = require 'events'
eventEmitter = new events.EventEmitter

# Build the carousel once all the pages are loaded
eventEmitter.on 'loaded', ->
    owl = $('#pages').owlCarousel
        thumbs: true
        thumbsPrerendered: true
        dotsSpeed: 0
        nav: true
        navContainer: '#owl-nav' # Put nav buttons in this div
        navText: [ # Use this as the buttons for the navigation
            '<button class="btn btn-default" id="navleft"><i class="fa fa-chevron-left"></i></button>',
            '<button class="btn btn-default" id="navright"><i class="fa fa-chevron-right"></i></button>'
        ]
        dots: false
        merge: true # Allow double with pages
        responsiveClass: true
        responsive: # Dynamically set number of pages in reader based on width
            0:
                items: 1
                mergeFit: false
            1024:
                items: 2
                mergeFit: true
            1440:
                items: 3
                mergeFit: true

    # Use the mosewheel to scroll backwards and forwards
    owl.on 'mousewheel', '.owl-stage', (e) ->
        e.preventDefault()
        if e.deltaY > 0
            owl.trigger 'prev.owl'
        else
            owl.trigger 'next.owl'
        return

    return

# Figure out how wide the thumb items are and resize the thumb nav div to suit
# @return int totalWidth = width of all the thumbnail images
thumbWidth = ->
    totalWidth = 0
    $('.owl-thumb-item > img').each (index, item) ->
        totalWidth += item.width
        return
    if totalWidth < $(document).width()
        totalWidth = $(document).width()
    if $('.owl-thumbs').width() isnt totalWidth
        $('.owl-thumbs').width(totalWidth)
    return totalWidth

# Use some accessibility controls for keyboard
$(document) .on 'keydown', (e) ->
    e.preventDefault()
    if e.key is 'PageDown' or e.key is 'ArrowRight' or e.keyCode is 32
        owl.trigger 'next.owl'
    else if e.key is 'PageUp' or e.key is 'ArrowLeft'
        owl.trigger 'prev.owl'
    else if e.key is 'Home'
        owl.trigger 'to.owl', 0
    else if e.key is 'End'
        owl.trigger 'to.owl', pageCount
    # else if e.key is 't' or e.key is 'T'
    #     toggleThumbnails()
    else if e.key is 'x' or e.key is 'X'
        window.close()
    return

# Make sure the thumbs stay the right width when resized
window.addEventListener 'resize' , ->
    $('.owl-thumbs').width thumbWidth()
    return

# Scroll the thumbs to the left and make sure they stay on the page
$('#navThumbRight').on 'click', (e) ->
    e.preventDefault()
    thumbs = $('.owl-thumbs')
    width = thumbWidth()
    right = thumbs.position().left + width
    increment = $(document).width()
    if right > $(document).width() # Make sure the last thumb stops at the width of the page
        if (right - increment) < $(document).width()
            increment = right - increment
        thumbs.animate
            left: "-=#{increment}"
    else
        thumbs.animate
            left: $(document).width - width
    return

# Scroll the thumbs to the right and make sure they stay on the page
$('#navThumbLeft').on 'click', (e) ->
    e.preventDefault()
    thumbs = $('.owl-thumbs')
    left = thumbs.position().left
    width = thumbWidth()
    increment = $(document).width()
    if left is 0 # Don't let the thumbs move past zero
        # do nothing
    else if left < 0 and (left + increment) < 0
        thumbs.animate
            left: "+=#{increment}"
    else
        thumbs.animate
            left: 0
    return

# Context Menu needs to be global
{remote} = require 'electron'
{Menu, MenuItem} = remote
ctxMenu = new Menu()

makeContextMenu = -> # Create an array of menuItem objects that can build the menu
    templateItems = [
            {
                label: 'First Page'
                accelerator: 'Home'
                click: ->
                    owl.trigger 'to.owl', 0
            }
            {
                label: 'Previous Page'
                accelerator: 'PageUp'
                click: ->
                    owl.trigger 'prev.owl'
            }
            {
                label: 'Next Page'
                accelerator: 'PageDown'
                click: ->
                    owl.trigger 'next.owl'
            }
            {
                label: 'Last Page'
                accelerator: 'End'
                click: ->
                    owl.trigger 'to.owl', pageCount
            }
            {
                role: 'separator'
                enabled: false
            }
            # {
            #     label: 'Toggle Thumbnails'
            #     accelerator: 'T'
            #     click: ->
            #         toggleThumbnails()
            # }
            # {
            #     role: 'separator'
            #     enabled: false
            # }
            {
                label: 'Exit'
                accelerator: 'X'
                click: ->
                    window.close()
            }
        ]

    for templateItem in templateItems # Build the context menu
        ctxMenu.append new MenuItem(templateItem)

    return

makeContextMenu() # Call the menu creation

addEventListener 'contextmenu', (e) -> # trigger the context menu on right click
    e.preventDefault()
    ctxMenu.popup remote.getCurrentWindow()
, false
