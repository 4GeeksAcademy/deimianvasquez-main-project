#!/usr/bin/env python3
"""Inline tailwind.css into index.html and application.html."""
import os

CSS_PATH = 'uis/website/assets/tailwind.css'
HTMLS = ['uis/website/index.html', 'uis/website/application.html']

with open(CSS_PATH) as f:
    css = f.read()

for html_path in HTMLS:
    with open(html_path) as f:
        html = f.read()

    old = '<link rel="stylesheet" href="assets/tailwind.css" />'
    new = f'<style>\n{css}\n</style>'

    if old not in html:
        print(f'WARNING: Could not find marker in {html_path}. Checking alternate...')
        old2 = '<link rel="stylesheet" href="assets/tailwind.css">'
        if old2 in html:
            html = html.replace(old2, new)
        else:
            print(f'ERROR: No match found in {html_path}')
            continue
    else:
        html = html.replace(old, new)

    with open(html_path, 'w') as f:
        f.write(html)

    # Count bytes
    new_size = len(html.encode('utf-8'))
    print(f'✅ {html_path}: inline done. New size: {new_size} bytes ({new_size/1024:.1f} KB)')

print('\nDone!')