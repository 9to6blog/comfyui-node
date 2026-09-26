# Qwen Image 2512 픽셀 아트

E:\ComfyUI\ComfyUI에 설치하는 Qwen Image **2512 텍스트→이미지** 워크플로우입니다.
기존 사용자 워크플로우를 열거나 복사하지 않고 새로 작성했습니다.

## 열기

ComfyUI에서 `Qwen2512_PixelArt_Quality.json`을 드래그해 열고, 녹색 프롬프트의 피사체를 바꾼 다음 Run을 누르세요.
설치 위치: `E:\ComfyUI\ComfyUI\user\default\workflows\Qwen2512PixelArt\`.
`.api.json`은 API 실행용이고, 화면에서 열 파일은 일반 `.json`입니다.

| 파일 | 용도 | 기본값 |
| --- | --- | --- |
| Qwen2512_PixelArt_Quality.json | 최종 이미지 후보 | 30 steps, CFG 4, Euler/simple, shift 3.1 |
| Qwen2512_PixelArt_Lightning4.json | 빠른 구도·프롬프트 확인 | 4 steps, CFG 1, 전용 Lightning LoRA 1.0, shift 3.0 |

Lightning은 품질·스타일이 다를 수 있습니다. 미세한 묘사는 Quality에서 확인하고 필요하면 40~50스텝으로 올리세요.
Lightning의 CFG 1에서는 부정 프롬프트가 결과를 유도하지 않습니다. 원하는 제한은 긍정 프롬프트에도 적으세요.

## 픽셀 크기와 색상

기본 흐름은 **1024×1024 생성 → 128×128 최근접 축소 → 최대 32색 → 최근접 8배 확대**입니다.
후처리 전 원본, 실제 128px 이미지, 1024px 확대본이 모두 PNG로 저장됩니다.

| 용도 | ImageScale 크기 | ImageQuantize colors | ImageScaleBy scale_by |
| --- | --- | --- | --- |
| 작은 필드 캐릭터 | 64×64 | 16 또는 32 | 8 |
| 기본 몬스터 | 128×128 | 32 | 8 |
| 세밀한 보스 | 256×256 | 32 또는 64 | 4 |

확대 방식은 `nearest-exact`, dither는 `none`이 기본입니다.
이 과정은 일정한 픽셀 격자와 색상 상한을 만들지만, 수작업 픽셀 정리·자동 격자 검출·프레임 간 공통 팔레트를 보장하지는 않습니다.
원본의 세부 묘사를 더 남기려면 256px / 64색을 쓰세요.
정사각형이 아닌 이미지는 생성 크기와 ImageScale의 가로·세로 비율을 맞추세요.

흰 배경의 **RGB PNG**입니다. 투명 배경 PNG가 필요하면 배경 제거 또는 Aseprite 등의 마무리 작업이 필요합니다.

## 저장 위치

일반 ComfyUI 실행 기준:

```text
E:\ComfyUI\ComfyUI\output\Qwen2512PixelArt\
  quality\raw_*.png       # 생성 원본
  quality\sprite_*.png    # 픽셀 원본
  quality\preview_*.png   # 정수배 확대본
  lightning4\...          # 빠른 초안
```

한 번의 생성에서 세 PNG는 같은 이미지의 버전입니다.
여러 후보를 만들려면 `batch_size=1`을 유지하고 실행 횟수를 늘리세요.
시드는 기본 `increment`이며, 같은 결과를 비교·재현할 때는 `fixed`로 바꾸세요.

## 모델과 노드

RTX 5070 Ti 16GB / RAM 32GB에 맞춰 확산 모델은 Unsloth GGUF Q4_K_M을 사용합니다.
BF16 원본과 동일한 수치 정밀도는 아니며, 양자화에 따른 차이가 있을 수 있습니다.
텍스트 인코더는 Comfy-Org FP8, VAE는 Comfy-Org 배포본입니다.

| 폴더 | 파일 |
| --- | --- |
| models/unet | qwen-image-2512-Q4_K_M.gguf |
| models/text_encoders | qwen_2.5_vl_7b_fp8_scaled.safetensors |
| models/vae | qwen_image_vae.safetensors |
| models/loras | Qwen-Image-2512-Lightning-4steps-V1.0-fp32.safetensors |

기존 설치된 **ComfyUI-GGUF**와 ComfyUI 기본 노드만 필요합니다.
Qwen 2.1용 Qwen3-VL 인코더나 2.1 VAE로 바꾸면 안 됩니다.
추가 다운로드는 약 24.33GB이며 기존 Qwen Image VAE는 SHA-256 확인 후 재사용합니다.
모든 파일의 고정 리비전·용량·SHA-256은 `model-manifest.json`에 기록합니다.

VRAM 부족 시 다른 GPU 작업을 닫고 생성 크기를 768×768로 낮추세요.
배치 크기는 1, 타일 VAE 디코드는 512를 유지하세요.
테스트 서버는 기존 사용자 설정과 분리하여 GGUF와 기본 노드만 로드합니다.

## 복구 및 재생성

`download_models.py --comfy-root E:\ComfyUI\ComfyUI`는 고정 리비전에서 다운로드하고 SHA-256을 확인합니다.
기존 파일이 다르면 덮어쓰지 않고 중단합니다. 중단된 다운로드는 `.download`에서 이어 받습니다.
ComfyUI가 실행 중일 때 `build_workflows.py --url http://127.0.0.1:8188 --output .`으로 새 그래프를 다시 만들 수 있습니다.
두 스크립트 모두 모델/노드 스키마만 사용하며 기존 사용자 워크플로우를 읽지 않습니다.

## 참고

- [사용자 제공 B4C 글](https://b4c.jp/qwen-image-2-1/): 작성자의 2512 픽셀 아트 선호를 참고했습니다. 특정 품질을 보장하는 벤치마크로 사용하지 않았습니다.
- [ComfyUI 공식 2512 안내](https://docs.comfy.org/tutorials/image/qwen/qwen-image-2512)
- [Unsloth 2512 GGUF](https://huggingface.co/unsloth/Qwen-Image-2512-GGUF)
- [Comfy-Org 인코더와 VAE](https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI)
- [2512 전용 Lightning](https://huggingface.co/lightx2v/Qwen-Image-2512-Lightning)
