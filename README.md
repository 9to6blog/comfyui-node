# 9to6 ComfyUI Nodes

ComfyUI custom nodes by 9to6. 각 기능의 코드는 별도 폴더에 관리합니다.

| 폴더 | 노드 | 기능 |
| --- | --- | --- |
| [prompt_switch](prompt_switch/) | **9to6 Multi Prompt Switch** | 10개 프롬프트 중 ON인 항목만 합쳐 출력 |

## 설치

ComfyUI의 `custom_nodes` 폴더에서 실행합니다.

```powershell
git clone https://github.com/9to6blog/comfyui-node.git
```

ComfyUI를 재시작하고 브라우저를 새로고침한 뒤 **9to6 Multi Prompt Switch**를 검색하세요. 저장소 루트의 `__init__.py`가 하위 폴더의 노드와 프런트엔드 확장을 연결하므로 저장소 전체를 설치하면 됩니다. 추가 pip 설치는 필요 없습니다. 비공개 저장소인 경우 해당 저장소의 접근 권한이 필요합니다.

수동 설치는 저장소 전체를 `ComfyUI/custom_nodes/comfyui-node/`에 복사합니다. 설치 경로 안에 `__init__.py`와 `prompt_switch/`가 함께 있어야 합니다. 저장소 전체와 `prompt_switch/` 폴더를 동시에 별도 설치하면 같은 노드가 중복 등록되므로 둘 중 하나만 설치합니다.

## 프롬프트 스위치

```text
ON   masterpiece, best quality
OFF  night background
ON   soft lighting

출력 → masterpiece, best quality, soft lighting
```

- 프롬프트 10칸 + 개별 ON/OFF 스위치
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
node --test prompt_switch/tests/shortcut_guard.test.mjs
```

Python 3.10 이상, JavaScript 테스트는 Node.js 20 이상을 사용합니다. 노드 실행 자체에 Node.js는 필요 없습니다. CI는 Python 3.10/3.13과 Node.js 24에서 위 검사를 실행합니다.

테스트는 프롬프트 선택 로직, 예제 복원, 루트/하위 폴더 로더, 브라우저 기본 저장 차단 및 이벤트 전달을 확인합니다. 실제 사용자의 ComfyUI 환경에서 이미지 생성까지 검증한 것은 아닙니다.

## Comfy Registry

GitHub 업로드와 Manager 검색 등록은 별도입니다. Registry 게시자 ID와 API 키는 아직 설정하지 않았으며 자동 게시하지 않습니다. [게시 절차](PUBLISHING.md)를 확인하세요.

## License

Apache-2.0. 기존 저장소의 [LICENSE](LICENSE)를 따릅니다.
