#!/usr/bin/env python3
"""Regenerate docs/snowfall.gif and docs/snowfall.fr.gif.

    python3 tools/snowfall_gif.py

The winter drawings with and without the falling flakes (winter_snowfall),
side by side. Dark theme on purpose: white flakes on a white card are lost at
README size. CSS animations do not advance under --virtual-time-budget, so
each frame is a separate capture of docs/demo.html pinned with ?phase=<ms>.
Needs Chrome and Pillow.
"""
import functools, http.server, os, socketserver, subprocess, threading
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 8732
FRAMES, STEP_MS, COLORS, PAD = 40, 100, 128, 10


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def shoot(url, out):
    cmd = [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
           f"--user-data-dir=/tmp/dtc-capture-{PORT}", "--force-device-scale-factor=1",
           "--window-size=1340,290", "--virtual-time-budget=3000", f"--screenshot={out}", url]
    for _ in range(3):
        if subprocess.run(cmd, capture_output=True).returncode == 0:
            break
    return Image.open(out).convert("RGB")


def main():
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    try:
        for lang, name in (("en", "snowfall.gif"), ("fr", "snowfall.fr.gif")):
            frames, box = [], None
            for i in range(FRAMES):
                tmp = DOCS / f".frame-{i}.png"
                im = shoot(f"http://127.0.0.1:{PORT}/docs/demo.html?mode=snowfall&theme=dark"
                           f"&width=200&lang={lang}&phase={i * STEP_MS}", str(tmp))
                tmp.unlink()
                if box is None:
                    bg = Image.new("RGB", im.size, im.getpixel((2, 2)))
                    l, t, r, b = ImageChops.difference(im, bg).getbbox()
                    box = (max(0, l - PAD), max(0, t - PAD), min(im.width, r + PAD), min(im.height, b + PAD))
                frames.append(im.crop(box))
            # One palette for every frame, taken from the first, so the flat
            # areas do not shimmer from a palette that shifts frame to frame.
            pal = frames[0].quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT)
            frames = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
            out = DOCS / name
            frames[0].save(out, save_all=True, append_images=frames[1:], duration=STEP_MS, loop=0, optimize=True)
            print(f"  {name}  {frames[0].size[0]}x{frames[0].size[1]}  {os.path.getsize(out) // 1024} KB")
    finally:
        httpd.shutdown()


if __name__ == "__main__":
    main()
