import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(r'E:\ComfyUI\ComfyUI\models')
MODELS = [
    ('unsloth/Qwen-Image-2512-GGUF', '1626d7531f84b4d2ea1cd6d2e69f41ec027dd354', 'qwen-image-2512-Q4_K_M.gguf', 'unet', 13244758560, 'b2a5f6249eb58ee10c9e2ce8cb1114b89897db23de2fdf7dc49140800aa928fc'),
    ('Comfy-Org/Qwen-Image_ComfyUI', '1f12b17be14c89b026c51a91d67c32f84bb047bc', 'split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors', 'text_encoders', 9384670680, 'cb5636d852a0ea6a9075ab1bef496c0db7aef13c02350571e388aea959c5c0b4'),
    ('Comfy-Org/Qwen-Image_ComfyUI', '1f12b17be14c89b026c51a91d67c32f84bb047bc', 'split_files/vae/qwen_image_vae.safetensors', 'vae', 253806246, 'a70580f0213e67967ee9c95f05bb400e8fb08307e017a924bf3441223e023d1f'),
    ('lightx2v/Qwen-Image-2512-Lightning', 'a52649c9d0f6e1a248bff13f0df33bb8a2abdb52', 'Qwen-Image-2512-Lightning-4steps-V1.0-fp32.safetensors', 'loras', 1698951104, 'ad12117461cb41e2ea637fec8df6392ce8e8550c47fbe2b829ed3deb98262066'),
]

def digest(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()

def download(model):
    repo, revision, filename, folder, size, sha256 = model
    target = ROOT / folder / Path(filename).name
    url = f'https://huggingface.co/{repo}/resolve/{revision}/{filename}'
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        if target.stat().st_size != size or digest(target) != sha256:
            raise RuntimeError(f'Existing file differs; kept untouched: {target}')
        print(f'VERIFIED existing {target.name}', flush=True)
    else:
        partial = target.with_name(target.name + '.download')
        print(f'DOWNLOADING {target.name} ({size / 1e9:.2f} GB)', flush=True)
        subprocess.run(['curl.exe', '--fail', '--location', '--retry', '8', '--retry-delay', '3', '--connect-timeout', '30', '--speed-limit', '1024', '--speed-time', '120', '--continue-at', '-', '--silent', '--show-error', '--output', str(partial), url], check=True)
        if partial.stat().st_size != size or digest(partial) != sha256:
            raise RuntimeError(f'Integrity check failed: {partial}')
        partial.rename(target)
        print(f'VERIFIED downloaded {target.name}', flush=True)
    return {'repository': repo, 'revision': revision, 'source': url, 'relative_path': f'{folder}/{target.name}', 'bytes': size, 'sha256': sha256, 'verified': True}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Download and SHA-256 verify only the Qwen 2512 pixel-art model files.')
    parser.add_argument('--comfy-root', type=Path, default=Path(r'E:\ComfyUI\ComfyUI'))
    parser.add_argument('--manifest', type=Path, default=Path(__file__).resolve().parent / 'model-manifest.json')
    args = parser.parse_args()
    ROOT = args.comfy_root / 'models'
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(download, MODELS))
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.write_text(json.dumps({'models': results}, indent=2) + '\n', encoding='utf-8')
    print('ALL MODEL FILES VERIFIED', flush=True)
