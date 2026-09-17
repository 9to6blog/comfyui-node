# 9to6 ComfyUI Nodes

ComfyUI custom nodes by 9to6. 각 기능의 코드는 별도 폴더에 관리합니다.

| 폴더 | 노드 | 기능 |
| --- | --- | --- |
| [prompt_switch](prompt_switch/) | **9to6 Multi Prompt Switcher** | 제목이 있는 프롬프트 카드를 추가·제거하고 ON 항목만 합쳐 출력 |
| [image_batch](image_batch/) | **9to6 Image Batch Loader** | 파일 다중 선택·폴더 전체 불러오기 → 이미지 목록 출력 |
| [image_batch](image_batch/) | **9to6 Image Grid** | 처리 결과 전체를 그리드로 표시하고 클릭 확대 |

## 설치

ComfyUI의 `custom_nodes` 폴더에서 실행합니다.

```powershell
git clone https://github.com/9to6blog/comfyui-node.git
```

ComfyUI를 재시작하고 브라우저를 새로고침한 뒤 노드 검색에서 **9to6**를 검색하세요. 저장소 루트의 `__init__.py`가 하위 폴더의 노드와 프런트엔드 확장을 연결하므로 저장소 전체를 설치하면 됩니다. 추가 pip 설치는 필요 없습니다. 비공개 저장소인 경우 해당 저장소의 접근 권한이 필요합니다.

수동 설치는 저장소 전체를 `ComfyUI/custom_nodes/comfyui-node/`에 복사합니다. 설치 경로 안에 루트 `__init__.py`, `prompt_switch/`, `image_batch/`, `web/`가 함께 있어야 합니다. 하위 폴더를 별도 중복 설치하지 않습니다. 기존 설치는 해당 폴더에서 `git pull` 후 ComfyUI를 재시작하고 브라우저를 새로고침하세요.

## 이미지 다중 선택 → 처리 → 결과 그리드

```text
9to6 Image Batch Loader
  ├─ Select images: 여러 파일 선택
  ├─ Select folder: 브라우저에서 폴더 업로드
  └─ server_folder: ComfyUI 실행 PC의 폴더 경로
                │ images (각 항목은 이미지 1장)
                ▼
       이미지 처리 노드들
                │
                ▼
       9to6 Image Grid
       전체 결과 그리드 → 클릭 확대 / 이전·다음 / 줌
```

한 번 실행하면 선택한 이미지 목록 전체를 처리합니다. 다른 해상도의 이미지를 강제로 같은 크기로 합치지 않습니다. 마지막 그리드는 이미지 목록과 텐서 배치에 포함된 결과를 모두 펼쳐 보여줍니다.

[이미지 노드 사용법](image_batch/README.md)과 [예제 워크플로](image_batch/examples/image-batch-to-grid.json)를 참고하세요.

## 9to6 멀티 프롬프트 스위처

```text
ON   masterpiece, best quality
OFF  night background
ON   soft lighting

출력 → masterpiece, best quality, soft lighting
```

- 기본 3개 카드, 최대 10개까지 추가·제거
- 제목 입력란으로 `인물`, `조명`, `화풍`처럼 용도를 쉽게 구분
- SVG 아이콘과 텍스트 라벨을 함께 사용한 고가독성 UI
- 노드를 작게 리사이즈하면 프롬프트 카드 영역만 내부 스크롤
- 개별 ON/OFF 스위치
- OFF 항목은 입력 내용을 보존하고 출력에서만 제외
- 쉼표 / 줄바꿈 / 공백 구분자
- 빈 칸 제외, 01부터 10까지 순서 유지
- `text` → CLIP Text Encode의 텍스트 입력에 연결
- `active_count` → 실제 포함된 프롬프트 개수
- 전체 OFF → 빈 문자열. 이미지 생성 자체를 중단시키는 기능은 아닙니다.

자세한 사용법과 예제는 [prompt_switch/README.md](prompt_switch/README.md)를 참고하세요.

## 입력창에서 Ctrl+S

이 노드의 입력창에서는 `Ctrl+S` / `Cmd+S`의 **브라우저 HTML 페이지 저장 기본 동작을 차단**합니다. 키 이벤트 전파를 막거나 저장 명령을 별도로 실행하지 않으므로 ComfyUI 기본 워크플로 저장 단축키 처리는 계속 전달됩니다. 워크플로 저장 시 ComfyUI 자체의 이름 입력 또는 저장 UI가 표시되는 것은 HTML 페이지 저장창과 별개입니다.

현재 DOM 위젯과 구버전 `inputEl`을 지원하고, Vue 노드 입력창은 활성 그래프의 노드 ID로 확인합니다. 다른 노드와 일반 입력창, 복사·붙여넣기·실행 취소 단축키는 변경하지 않습니다. 설치 또는 업데이트 후에는 **ComfyUI 재시작과 브라우저 새로고침**이 필요합니다.

## 개발 및 검증

```powershell
python -m unittest discover -s prompt_switch/tests -v
python -m unittest discover -s image_batch/tests -v
npm test
```

Python 3.10 이상, JavaScript 테스트는 Node.js 20 이상을 사용합니다. 이미지 테스트에는 ComfyUI 환경에 포함된 torch, numpy, Pillow가 필요합니다. 노드 실행 자체에 Node.js는 필요 없습니다. CI는 Python 3.10/3.13과 Node.js 24에서 위 검사를 실행합니다.

자동 테스트로 프롬프트 선택·제목 비출력·카드 제거 순서·SVG/스크롤 UI 규칙, 이미지 순서·원본 크기·마스크·캐시 갱신, 그리드 결과, 예제 복원, 브라우저 기본 저장 차단과 이벤트 전달을 확인합니다.

별도 Windows CPU 환경의 **ComfyUI 0.36.0 / Frontend 1.52.7**에서 `Image Batch Loader → Invert Image → Image Grid`를 실제 실행했습니다. 파일 다중 업로드, 폴더 업로드, 서버 폴더 읽기, 순서 변경 후 워크플로 저장·복원, 결과 개수·해상도, 클릭 확대·이전/다음·줌·Esc 닫기를 확인했습니다. 모델을 이용한 이미지 생성과 외부 커스텀 노드별 호환성은 이 검사에 포함하지 않았습니다.

## Comfy Registry

GitHub 업로드와 Manager 검색 등록은 별도입니다. Registry 게시자 ID와 API 키는 아직 설정하지 않았으며 자동 게시하지 않습니다. [게시 절차](PUBLISHING.md)를 확인하세요.

## License

Apache-2.0. 기존 저장소의 [LICENSE](LICENSE)를 따릅니다.
