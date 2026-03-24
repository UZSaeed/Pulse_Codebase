import sys
import subprocess

try:
    from PIL import Image
except ImportError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'Pillow'])
    from PIL import Image

from collections import Counter

try:
    img = Image.open(r"C:\Users\uzair\Desktop\Pulse\Pulse_Codebase\logo.png").convert("RGB")
    # Resize to speed up extraction
    img.thumbnail((200, 200))
    pixels = list(img.getdata())
    
    # Filter out dark background (adjust threshold as needed)
    filtered_pixels = [p for p in pixels if sum(p) > 150 and max(p) - min(p) > 20] 
    
    # Optional: group similar colors to avoid 10 shades of the exact same blue
    def quantize(p, step=15):
        return (p[0]//step*step, p[1]//step*step, p[2]//step*step)
        
    quantized = [quantize(p) for p in filtered_pixels]
    counts = Counter(quantized)
    
    print("Top extracted colors:")
    for p, c in counts.most_common(12):
        print(f"#{p[0]:02x}{p[1]:02x}{p[2]:02x} - count {c}")
except Exception as e:
    print(f"Error extracting colors: {e}")
