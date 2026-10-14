#!/usr/bin/env python3
"""Builds Lightkeeper from src/ and site/ into dist/ (not committed; the Pages workflow runs this on every push):
  dist/lightkeeper.html  one self-contained file (what the Claude artifact publishes; no document wrapper)
  dist/site/             the web site: index.html, app.js, style.css and sw.js generated here, plus a copy of site/
                         (manifest.webmanifest, install.js, icons/)
"""
import hashlib, os, shutil
from datetime import datetime
from zoneinfo import ZoneInfo

os.chdir(os.path.dirname(os.path.abspath(__file__)))
shutil.rmtree('dist/site', ignore_errors=True); shutil.copytree('site', 'dist/site')
read = lambda p: open(p, encoding='utf-8').read()
write = lambda p, s: open(p, 'w', encoding='utf-8').write(s)

head, css, body = read('src/html/head.html'), read('src/css/style.css'), read('src/html/body.html')
order = ['i18n.js', 'util.js', 'audio.js', 'music.js', 'game.js', 'render.js', 'input.js']
js = "(() => {\n'use strict';\n\n" + '\n'.join(read('src/js/' + f) for f in order) + '\n})();\n'

# 1. the single file
write('dist/lightkeeper.html', head + '<style>\n' + css + '</style>\n' + body + '<script>\n' + js + '</script>\n')

# 2. the site
stamp = datetime.now(ZoneInfo('Europe/Warsaw')).strftime('%Y%m%d%H%M')
write('dist/site/app.js', js)
write('dist/site/style.css', css)
version = hashlib.sha1((js + css + head + body).encode('utf-8')).hexdigest()[:10]
q = '?v=' + version
pwa_head = ('<link rel="stylesheet" href="style.css' + q + '">\n'
            '<link rel="manifest" href="manifest.webmanifest">\n'
            '<meta name="theme-color" content="#040b16">\n'
            '<meta name="mobile-web-app-capable" content="yes">\n'
            '<meta name="apple-mobile-web-app-capable" content="yes">\n'
            '<meta name="apple-mobile-web-app-title" content="Lightkeeper">\n'
            '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
            '<link rel="icon" href="icons/icon.svg" type="image/svg+xml">\n'
            '<style>#stage{position:absolute;inset:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);height:auto;width:auto}</style>\n')
body_site = body.replace('<p class="build" id="buildStamp"></p>', '<p class="build" id="buildStamp">build ' + stamp + '</p>', 1)
page = ('<!doctype html>\n<html lang="en">\n<head>\n' + head + pwa_head + '</head>\n<body>\n' + body_site
        + '<script src="app.js' + q + '"></script>\n<script src="install.js' + q + '"></script>\n</body>\n</html>\n')
write('dist/site/index.html', page)
write('dist/site/sw.js', read('src/sw.template.js').replace('__VERSION__', version))
print('dist/lightkeeper.html and dist/site/ rebuilt, build ' + stamp + ', sw.js version ' + version)
