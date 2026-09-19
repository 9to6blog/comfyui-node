# 9to6 ComfyUI Nodes

ComfyUI custom nodes by 9to6. 각 기능의 코드는 별도 폴더에 관리합니다.

| 폴더 | 노드 | 기능 |
| --- | --- | --- |
| [prompt_switch](prompt_switch/) | **9to6 Multi Prompt Switcher** | 제목이 있는 프롬프트 카드를 추가·제거하고 한 번에 하나만 선택해 출력 |
| [image_batch](image_batch/) | **9to6 Image Batch Loader** | 파일 다중 선택·폴더 전체 불러오기 → 이미지 목록 출력 |
| [image_batch](image_batch/) | **9to6 Image Grid** | 처리 결과 전체를 그리드로 표시하고 클릭 확대 |
| [image_batch](image_batch/) | **9to6 Image Compare** | 두 이미지를 나란히·슬라이더·차이 열지도로 비교 |

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

한 번 실행하면 선택한 이미지 목록 전체를 처리합니다. 다른 해상도의 이미지를 강제로 같은 크기로 합치지 않습니다. 마지막 그리드는 이미지 목록과 텐서 배치에 포함된 결과를 모두 펼쳐 보여줍니다. Batch Loader의 `filenames`를 Grid의 `labels`에 연결하면 타일 아래에 파일명이 표시됩니다.

**9to6 Image Compare**는 처리 전·후 이미지 두 장을 같은 다크 카드 UI로 비교합니다. `image_a`/`image_b`에 같은 크기의 이미지를 연결하고, 나란히 보기·드래그 슬라이더·차이 열지도(밝을수록 픽셀 차이 큼) 모드를 고릅니다. `labels`로 `원본,결과` 같은 이름을 지정할 수 있습니다.

두 이미지 노드 모두 Multi Prompt Switcher와 같은 9to6 다크 카드 디자인, 고대비 주황 강조색, 인라인 SVG 아이콘을 사용합니다. 노드 높이를 줄이면 이미지 목록·그리드 영역만 내부 스크롤되고, 높이를 늘리면 표시 영역도 함께 커집니다.

[이미지 노드 사용법](image_batch/README.md)과 [예제 워크플로](image_batch/examples/image-batch-to-grid.json)를 참고하세요.

## 9to6 멀티 프롬프트 스위처

```text
ON   masterpiece, best quality
OFF  night background
OFF  soft lighting

출력 → masterpiece, best quality
```

- 기본 3개 카드, 최대 10개까지 추가·제거
- 제목 입력란으로 `인물`, `조명`, `화풍`처럼 용도를 쉽게 구분
- SVG 아이콘과 텍스트 라벨을 함께 사용한 고가독성 UI
- 원본 ComfyUI 입력 위젯은 캔버스 그리기까지 숨겨 카드 뒤로 겹쳐 보이지 않음
- 전역 테마와 관계없이 추가 버튼을 고대비 주황색으로 표시
- 노드를 작게 리사이즈하면 프롬프트 카드 영역만 내부 스크롤
- 한 카드를 ON으로 바꾸면 이전 ON은 자동으로 OFF되는 단일 선택
- 현재 ON을 다시 누르면 전체 OFF 가능
- OFF 항목은 입력 내용을 보존하고 출력에서만 제외
- 기존 `TextToggleSwitchNode`가 워크플로에 있으면 연결과 최대 32개 데이터를 유지한 채 같은 9to6 카드 디자인으로 표시
- 구형 노드의 위·아래 이동과 복제 기능도 SVG 아이콘으로 유지
- `text` → CLIP Text Encode의 텍스트 입력에 연결
- `clip` 입력(선택)에 CLIP 모델을 연결하면 선택한 프롬프트를 노드 안에서 바로 인코딩해 `conditioning` 출력으로 KSampler에 연결 가능. 연결하지 않으면 기존처럼 `text` 출력만 사용
- `active_count` → 선택한 프롬프트가 비어 있지 않으면 1, 아니면 0
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
