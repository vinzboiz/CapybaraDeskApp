from PIL import Image
import numpy as np
from collections import deque
import os

source_path = r'C:\Users\PKUser\.gemini\antigravity-ide\brain\e8e2ff13-0ac2-4e98-82a3-3316340b2282\.user_uploaded\media_1790752457875.png'
out_dir = r'd:\Aquadesktop\assets'
os.makedirs(out_dir, exist_ok=True)

img = Image.open(source_path).convert('RGBA')
w, h = img.size
arr = np.array(img)

# Bounding boxes for each quadrant:
quads = {
    'tl': (50, 80, 480, 460),    # Top-Left (Idle Left)
    'tr': (550, 80, 970, 460),   # Top-Right (Walk Left)
    'bl': (80, 530, 500, 910),   # Bottom-Left (Walk Right 1)
    'br': (570, 530, 980, 910)   # Bottom-Right (Walk Right 2)
}

frames = {}

for name, (x1, y1, x2, y2) in quads.items():
    crop = arr[y1:y2, x1:x2].copy()
    ch, cw, _ = crop.shape
    
    # We want to remove background and shadow.
    # Background: RGB around (68, 81, 100)
    # Shadow: RGB around (45..55, 55..65, 70..85)
    # Capy outline is very dark (R,G,B < 35). Capy fur is warm (R > 120).
    # Flood-fill from borders:
    # A pixel is flood-fillable if:
    # It is NOT part of Capy body/outline.
    # Capy pixels have:
    # - Outline: (R < 40 and G < 40 and B < 40)
    # - Fur/Snout: (R > 100 and R > B + 15) or (R > 80 and G > 50 and B > 50 and R > B)
    
    # Sparkle in BR quadrant: around x > 850 in full image, let's ignore it
    is_capy = ((crop[:, :, 0] < 42) & (crop[:, :, 1] < 42) & (crop[:, :, 2] < 42)) | \
              ((crop[:, :, 0] > 95) & (crop[:, :, 0] > crop[:, :, 2] + 15)) | \
              ((crop[:, :, 0] > 75) & (crop[:, :, 1] > 45) & (crop[:, :, 0] > crop[:, :, 2] + 8))
              
    # Let's use floodfill from (0,0) and borders to mark background
    visited = np.zeros((ch, cw), dtype=bool)
    queue = deque()
    
    for x in range(cw):
        if not is_capy[0, x]: queue.append((0, x)); visited[0, x] = True
        if not is_capy[ch-1, x]: queue.append((ch-1, x)); visited[ch-1, x] = True
    for y in range(ch):
        if not is_capy[y, 0]: queue.append((y, 0)); visited[y, 0] = True
        if not is_capy[y, cw-1]: queue.append((y, cw-1)); visited[y, cw-1] = True
        
    while queue:
        cy, cx = queue.popleft()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < ch and 0 <= nx < cw:
                if not visited[ny, nx] and not is_capy[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))
                    
    # Transparent where visited (background/shadow)
    crop[visited, 3] = 0
    
    # Also trim to tight bbox of non-transparent pixels
    non_empty = crop[:, :, 3] > 0
    y_idx, x_idx = np.where(non_empty)
    if len(y_idx) > 0:
        crop_trimmed = crop[y_idx.min():y_idx.max()+1, x_idx.min():x_idx.max()+1]
        frames[name] = Image.fromarray(crop_trimmed)
        print(f'{name} extracted size:', frames[name].size)

for k, img_frame in frames.items():
    img_frame.save(os.path.join(out_dir, f'frame_{k}.png'))

print('Extracted successfully!')
