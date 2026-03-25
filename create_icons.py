import os
import shutil
import struct
from pathlib import Path
import zlib

def create_png(width, height, rgba_data=None):
    """创建有效的 PNG 文件"""
    if rgba_data is None:
        # 创建蓝色渐变背景
        rgba_data = bytearray()
        for y in range(height):
            for x in range(width):
                cx, cy = width // 2, height // 2
                dx, dy = x - cx, y - cy
                dist = (dx * dx + dy * dy) ** 0.5
                if dist < width // 3:
                    rgba_data.extend([255, 255, 255, 255])  # 白色圆
                elif dist < width // 2:
                    rgba_data.extend([100, 150, 255, 255])  # 浅蓝
                else:
                    rgba_data.extend([59, 130, 246, 255])   # 蓝色
        rgba_data = bytes(rgba_data)

    def png_chunk(chunk_type, data):
        chunk = chunk_type + data
        crc = zlib.crc32(chunk) & 0xffffffff
        return struct.pack('>I', len(data)) + chunk + struct.pack('>I', crc)

    # PNG 签名
    signature = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr = png_chunk(b'IHDR', ihdr_data)

    # IDAT chunk
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # Filter byte
        for x in range(width):
            i = (y * width + x) * 4
            raw_data += rgba_data[i:i+4]

    compressed = zlib.compress(raw_data, 9)
    idat = png_chunk(b'IDAT', compressed)

    # IEND chunk
    iend = png_chunk(b'IEND', b'')

    return signature + ihdr + idat + iend

# 切换到图标目录
project_root = Path(__file__).resolve().parent
icon_dir = project_root / 'src-tauri' / 'icons'
icon_dir.mkdir(parents=True, exist_ok=True)
os.chdir(icon_dir)

# 删除所有旧文件
for f in os.listdir('.'):
    if f.endswith(('.png', '.icns', '.ico')):
        os.remove(f)

# 创建各种尺寸的 PNG
sizes = [
    ('32x32.png', 32),
    ('128x128.png', 128),
    ('128x128@2x.png', 256),
    ('icon.png', 1024),
]

for filename, size in sizes:
    data = create_png(size, size)
    with open(filename, 'wb') as f:
        f.write(data)
    print(f'Created {filename} ({size}x{size})')

# 创建 .icns 文件 (macOS 图标)
iconset_dir = 'icon.iconset'
os.makedirs(iconset_dir, exist_ok=True)

icns_sizes = [
    (16, 'icon_16x16.png'),
    (32, 'icon_16x16@2x.png'),
    (32, 'icon_32x32.png'),
    (64, 'icon_32x32@2x.png'),
    (128, 'icon_128x128.png'),
    (256, 'icon_128x128@2x.png'),
    (256, 'icon_256x256.png'),
    (512, 'icon_256x256@2x.png'),
    (512, 'icon_512x512.png'),
    (1024, 'icon_512x512@2x.png'),
]

for size, filename in icns_sizes:
    data = create_png(size, size)
    with open(f'{iconset_dir}/{filename}', 'wb') as f:
        f.write(data)
    print(f'Created {iconset_dir}/{filename} ({size}x{size})')

# 当前项目构建仅依赖 PNG 图标，跳过 icns/ico 生成
print('Skipped icon.icns/icon.ico generation')

# 清理临时文件
shutil.rmtree(iconset_dir)

# 列出所有文件
print('\nFinal icon files:')
for f in sorted(os.listdir('.')):
    size = os.path.getsize(f)
    print(f'  {f}: {size} bytes')
