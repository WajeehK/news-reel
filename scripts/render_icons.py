from playwright.sync_api import sync_playwright
svg=open('icon.svg').read()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    for name,size,pad in [('icon-192.png',192,0),('icon-512.png',512,0),('apple-touch-icon.png',180,0),('icon-maskable-512.png',512,60)]:
        pg=b.new_page(viewport={'width':size,'height':size})
        pg.set_content(f'<body style="margin:0;background:#000"><div style="width:{size}px;height:{size}px;display:grid;place-items:center"><div style="width:{size-2*pad*size//512}px;height:{size-2*pad*size//512}px">{svg.replace("<svg ","<svg width=100% height=100% ")}</div></div></body>')
        pg.screenshot(path=name)
    b.close()
