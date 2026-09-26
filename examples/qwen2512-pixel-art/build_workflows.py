"""Build new Qwen 2512 graphs without opening any existing user workflows."""
import argparse
import json
from pathlib import Path
import urllib.request
import uuid

OUT = Path('outputs')
SCHEMAS = {}
POSITIVE = (
    'Pixel art of a single majestic fire phoenix, a fantasy RPG boss monster sprite. '
    'Full body in a dynamic three-quarter battle pose, facing left, wings spread, '
    'with every wing tip and tail feather fully inside the frame and generous empty margins. '
    'Authentic hand-pixelled late-1990s 16-bit arcade game art. '
    'Crisp deliberate square pixel clusters, clean dark outline, strong readable silhouette, '
    'rich red, orange and gold feathers, a restrained color palette, stepped highlights and shadows. '
    'One isolated character centered on a completely plain pure white background. '
    'No text, no UI, no border, no ground plane, no cast shadow.'
)
NEGATIVE = (
    'Photograph, 3D rendering, smooth vector illustration, soft airbrush shading, blur, '
    'anti-aliased edges, smooth gradients, noisy scattered pixels, illegible silhouette, '
    'cropped wings, cut-off tail, multiple characters, sprite sheet, detailed background, '
    'text, watermark, logo, grid, checkerboard background.'
)

def make_graph(fast):
    name = 'lightning4' if fast else 'quality'
    graph = {}
    def add(i, kind, title, **inputs):
        graph[str(i)] = {'class_type': kind, 'inputs': inputs, '_meta': {'title': title}}
    add(1, 'UnetLoaderGGUF', '01 · Qwen Image 2512 · 16GB GPU', unet_name='qwen-image-2512-Q4_K_M.gguf')
    add(2, 'CLIPLoaderGGUF', '02 · Qwen 2.5 VL · 메모리 절약', clip_name='Qwen2.5-VL-7B-Instruct-UD-Q4_K_XL.gguf', type='qwen_image')
    add(3, 'VAELoader', '03 · Qwen Image VAE', vae_name='qwen_image_vae.safetensors')
    add(4, 'CLIPTextEncode', '프롬프트 · 피사체를 바꿔 사용', text=POSITIVE, clip=['2', 0])
    add(5, 'CLIPTextEncode', '제외할 표현' + (' · CFG 1에서는 영향 없음' if fast else ''), text=NEGATIVE, clip=['2', 0])
    add(6, 'EmptySD3LatentImage', '생성 크기 · 배치 크기 1', width=1024, height=1024, batch_size=1)
    model = ['1', 0]
    if fast:
        add(17, 'LoraLoaderModelOnly', '2512 전용 Lightning · 4 steps', model=model, lora_name='Qwen-Image-2512-Lightning-4steps-V1.0-fp32.safetensors', strength_model=1.0)
        model = ['17', 0]
    add(7, 'ModelSamplingAuraFlow', 'Qwen Flow Sampling', model=model, shift=3.0 if fast else 3.1, sampling='flow')
    add(8, 'KSampler', '4스텝 초안' if fast else '품질 생성 · 30 steps / CFG 4', model=['7', 0], seed=20260926, steps=4 if fast else 30, cfg=1.0 if fast else 4.0, sampler_name='euler', scheduler='simple', positive=['4', 0], negative=['5', 0], latent_image=['6', 0], denoise=1.0)
    add(9, 'VAEDecodeTiled', '타일 디코드 · VRAM 절약', samples=['8', 0], vae=['3', 0], tile_size=512, overlap=64, temporal_size=64, temporal_overlap=8)
    add(10, 'SaveImage', '원본 저장 · 후처리 전', images=['9', 0], filename_prefix=f'Qwen2512PixelArt/{name}/raw')
    add(11, 'ImageScale', '픽셀 캔버스 · 64 / 128 / 256', image=['9', 0], upscale_method='nearest-exact', width=128, height=128, crop='disabled')
    add(12, 'ImageQuantize', '최대 32색 · 디더링 없음', image=['11', 0], colors=32, dither='none')
    add(13, 'SaveImage', '픽셀 원본 저장 · 128px / 32색', images=['12', 0], filename_prefix=f'Qwen2512PixelArt/{name}/sprite')
    add(14, 'ImageScaleBy', '픽셀 유지 · 8배 확대', image=['12', 0], upscale_method='nearest-exact', scale_by=8.0)
    add(15, 'SaveImage', '확대본 저장 · 1024px', images=['14', 0], filename_prefix=f'Qwen2512PixelArt/{name}/preview')
    return graph

def make_workflow(graph, fast):
    positions = {1:(40,80),2:(40,290),3:(40,520),4:(430,80),5:(430,390),6:(430,650),7:(40,730),8:(980,80),9:(980,480),10:(1370,80),11:(1370,560),12:(1750,560),13:(2140,80),14:(1750,780),15:(2140,590),17:(40,600)}
    if fast:
        positions[3]=(40,480)
        positions[7]=(40,820)
    widths = {1:340,2:340,3:340,4:480,5:480,6:340,7:340,8:330,9:330,10:330,11:320,12:320,13:360,14:320,15:360,17:340}
    heights = {1:120,2:155,3:110,4:260,5:220,6:140,7:130,8:325,9:220,10:390,11:200,12:130,13:400,14:130,15:400,17:150}
    nodes, links = [], []
    lookup = {}
    for key, data in graph.items():
        i = int(key)
        schema = SCHEMAS[data['class_type']]
        inputs, widgets = [], []
        for section in ['required','optional']:
            for inp in schema.get('input_order', {}).get(section, []):
                if inp not in data['inputs']:
                    continue
                value = data['inputs'][inp]
                spec = schema['input'][section][inp]
                if isinstance(value, list):
                    inputs.append({'name':inp, 'type':spec[0], 'link':None})
                else:
                    widgets.append(value)
                    if isinstance(spec[-1],dict) and spec[-1].get('control_after_generate'):
                        widgets.append('increment')
        node = {'id':i, 'type':data['class_type'], 'pos':list(positions[i]), 'size':[widths[i],heights[i]], 'flags':{}, 'order':len(nodes), 'mode':0, 'inputs':inputs, 'outputs':[{'name':name,'type':kind,'links':[], 'slot_index':j} for j,(name,kind) in enumerate(zip(schema.get('output_name',schema['output']),schema['output']))], 'properties':{'Node name for S&R':data['class_type']}, 'widgets_values':widgets, 'title':data['_meta']['title']}
        if i == 4:
            node.update(color='#233b31', bgcolor='#294a3b')
        if i == 5:
            node.update(color='#41272b', bgcolor='#53353a')
        nodes.append(node)
        lookup[key] = node
    for key,data in graph.items():
        node = lookup[key]
        for socket, inp in enumerate(node['inputs']):
            source,slot = data['inputs'][inp['name']]
            link_id = len(links)+1
            links.append([link_id,int(source),slot,int(key),socket,inp['type']])
            inp['link'] = link_id
            lookup[source]['outputs'][slot]['links'].append(link_id)
    note = (
        'QWEN IMAGE 2512 / PIXEL ART\n\n'
        '1. 녹색 프롬프트에서 피사체를 바꾸고 Run.\n'
        '2. 기본: 1024px 생성 → 128px, 최대 32색 → 8배 확대.\n'
        '3. 원본 / 픽셀 원본 / 확대본 세 가지를 저장합니다.\n'
        '4. 작은 스프라이트: ImageScale 64×64, scale_by 8.\n'
        '5. 큰 보스: ImageScale 256×256, scale_by 4.\n'
        '6. 여러 장: batch_size=1 유지, Run 횟수 증가.\n'
        '7. seed는 increment. 재현/비교 시 fixed로 변경.\n'
        '8. RGB 흰 배경입니다. 실제 투명 PNG는 별도 배경 제거가 필요합니다.\n\n'
        + ('Lightning 4 steps / CFG 1 / LoRA 1.0.\n빠른 구도 확인용. 최종 이미지는 quality 파일에서 생성.' if fast else '기본 30 steps / CFG 4 / Euler / simple.\n세부 묘사 부족 시 steps를 40~50으로 조정.')
        + '\n\nComfyUI-GGUF + 기본 노드만 사용.\n기존 사용자 워크플로우를 읽거나 복사하지 않고 신규 작성.'
    )
    nodes.append({'id':16,'type':'Note','pos':[40,1080],'size':[870,420],'flags':{},'order':len(nodes),'mode':0,'inputs':[],'outputs':[],'properties':{},'widgets_values':[note],'title':'사용법 / 설정 가이드','color':'#293746','bgcolor':'#35465a'})
    groups=[{'id':1,'title':'1 · 모델 로드','bounding':[10,10,390,1020],'color':'#37667a','font_size':24,'flags':{}},{'id':2,'title':'2 · 프롬프트 / 생성 크기','bounding':[410,10,520,850],'color':'#3c765b','font_size':24,'flags':{}},{'id':3,'title':'3 · 생성 / 디코드','bounding':[950,10,390,850],'color':'#826343','font_size':24,'flags':{}},{'id':4,'title':'4 · 원본 + 픽셀 변환 / 저장','bounding':[1350,10,1190,1030],'color':'#6b557c','font_size':24,'flags':{}}]
    return {'id':str(uuid.uuid5(uuid.NAMESPACE_URL, 'qwen2512-pixel-art/' + ('lightning4' if fast else 'quality'))),'revision':0,'last_node_id':max(n['id'] for n in nodes),'last_link_id':len(links),'nodes':nodes,'links':links,'groups':groups,'config':{},'extra':{'ds':{'scale':0.55,'offset':[40,70]},'frontendVersion':'1.53.6'},'version':0.4}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8188')
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parent)
    args = parser.parse_args()
    OUT = args.output
    for kind in {v['class_type'] for v in make_graph(True).values()}:
        with urllib.request.urlopen(args.url.rstrip('/')+'/object_info/'+kind, timeout=15) as response:
            SCHEMAS[kind] = json.load(response)[kind]
    OUT.mkdir(parents=True, exist_ok=True)
    for fast in [False,True]:
        name = 'Qwen2512_PixelArt_' + ('Lightning4' if fast else 'Quality')
        graph = make_graph(fast)
        workflow = make_workflow(graph,fast)
        for suffix,data in [('.json',workflow),('.api.json',graph)]:
            (OUT/(name+suffix)).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(name, len(graph), 'nodes', len(workflow['links']), 'links')
