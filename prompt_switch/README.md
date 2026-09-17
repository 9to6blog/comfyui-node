# 9to6 Prompt Switch

Write multiple prompts, keep them in your workflow, and output only the ones switched ON.

여러 프롬프트를 작성해 두고 **ON으로 켠 항목만 하나의 텍스트로 출력**하는 ComfyUI 커스텀 노드입니다.

## 동작 예시

| 스위치 | 프롬프트 | 출력 포함 |
| --- | --- | --- |
| ON | `masterpiece` | 포함 |
| OFF | `night background` | 제외, 입력 내용은 유지 |
| ON | `soft lighting` | 포함 |

출력: `masterpiece, soft lighting`

- 첫 버전은 **프롬프트 10칸**과 각 칸의 개별 ON/OFF 스위치를 제공합니다.
- ON인 항목을 01 → 10 순서로 합칩니다. 여러 이미지의 개별 실행 기능은 포함하지 않습니다.
- 구분자는 `comma`(쉼표+공백), `newline`(줄바꿈), `space`(공백) 중 선택합니다.
- 빈 칸과 공백만 있는 칸은 건너뜁니다. 각 칸의 앞뒤 공백만 제거하고 내부 줄바꿈·가중치·문법은 유지합니다.
- OFF로 바꿔도 입력 내용은 지워지지 않으며 워크플로를 저장하면 함께 보관됩니다.
- 모든 칸이 OFF이거나 비어 있으면 `text`는 빈 문자열, `active_count`는 0입니다.
- 빈 문자열을 출력하는 것이므로 **후속 이미지 생성의 중단을 의미하지는 않습니다.**
- 중복 문구를 자동 제거하지 않으며 `{red|blue}` 같은 문법도 이 노드에서는 그대로 출력합니다.
- 기본 ComfyUI 위젯과 Python 표준 기능을 사용합니다. 별도 pip 패키지는 필요 없습니다.
- 함께 제공되는 프런트엔드 확장이 이 노드의 입력창에서 `Ctrl+S` / `Cmd+S`의 HTML 페이지 저장 기본 동작을 차단합니다. 이벤트는 ComfyUI의 워크플로 저장 처리에 계속 전달합니다.

## 설치

저장소: https://github.com/9to6blog/comfyui-node . Comfy Registry에는 아직 게시하지 않았습니다.

1. 저장소 전체를 `ComfyUI/custom_nodes/comfyui-node/`에 설치합니다. [루트 설치 안내](../README.md)를 참고하세요.
2. 루트 `__init__.py`, `prompt_switch/`, `image_batch/`, `web/`를 포함한 저장소 전체를 설치합니다. 프런트엔드 확장은 버전 0.2.0부터 공통 `web/` 폴더에서 관리합니다.
3. ComfyUI를 재시작하고 브라우저를 새로고침합니다.
4. 노드 검색에서 **9to6 Multi Prompt Switch**를 추가합니다. 메뉴 경로는 `9to6 / Prompt`입니다.

## 연결 방법

```text
9to6 Multi Prompt Switch · text
                │
                ▼
CLIP Text Encode · text
                │
                ▼
KSampler · positive 또는 negative
```

`CLIP Text Encode`의 `text`가 입력 소켓으로 보이지 않으면 노드의 우클릭 메뉴에서 해당 위젯을 입력으로 전환합니다. 실제 메뉴 표기는 ComfyUI 프런트엔드 버전에 따라 다를 수 있습니다.

긍정·부정 프롬프트를 모두 관리하려면 이 노드를 두 개 사용하여 각각의 텍스트 인코더에 연결하면 됩니다. `active_count`는 출력에 포함된 비어 있지 않은 프롬프트의 개수이며 연결하지 않아도 됩니다.

`examples/prompt-switch.json`을 ComfyUI로 끌어 놓으면 ON/OFF 예제가 들어 있는 노드가 열립니다. 이 파일에는 노드 하나만 들어 있으므로 실제 실행하려면 기존 워크플로의 텍스트 입력에 연결해야 합니다.

스위치는 이 노드의 텍스트 포함 여부를 제어합니다. 다른 노드의 출력을 프롬프트 입력에 연결하는 경우, OFF가 상위 노드의 실행까지 차단하는 것은 아닙니다.

## 검증

저장소 루트에서 실행합니다. 추가 패키지 설치는 필요하지 않습니다.

```powershell
python -m unittest discover -s prompt_switch/tests -v
node --test prompt_switch/tests/shortcut_guard.test.mjs
```

테스트는 OFF 제외, ON 복구, 입력 보존, 전체 OFF, 빈 칸, 숫자 순서, 구분자, 한글·프롬프트 문법, 중복 보존, 잘못된 타입, 예제 위젯 값의 복원을 확인합니다.

프롬프트 결합 로직과 단축키 처리는 위 자동 테스트로 확인합니다. 별도 ComfyUI 테스트 환경에서 노드 팩 로딩과 이미지 노드의 화면·실행은 확인했으며, 프롬프트를 모델의 이미지 생성에 연결하는 검사는 포함하지 않았습니다.

## GitHub / Manager 게시

[PUBLISHING.md](../PUBLISHING.md)에 Comfy Registry 등록 절차를 정리했습니다. 루트 `pyproject.toml`의 저장소 URL은 설정했으며 게시자 ID는 아직 설정하지 않았습니다. 실제 값으로 채운 뒤 게시해야 합니다. 패키지 이름의 Registry 사용 가능 여부도 게시 전에 확인해야 합니다.

## English

This ComfyUI node joins up to ten prompt fragments in numeric order. Every fragment has a native ON/OFF switch. Disabled text stays in the saved workflow. Blank fragments are skipped; leading and trailing whitespace is trimmed. Internal text and prompt syntax remain literal. Output `text` is a single STRING, and `active_count` is the number of included non-empty fragments. All OFF returns an empty string, not an execution blocker. No additional dependencies are required.

Install the repository under `ComfyUI/custom_nodes/comfyui-node`, restart ComfyUI, refresh the browser, and search for **9to6 Multi Prompt Switch**. Connect `text` to your text encoder's text input. The included extension prevents browser Save Page from Ctrl/Cmd+S in this node's inputs without stopping propagation to ComfyUI. Comfy Registry publication and live ComfyUI image-generation integration testing are pending.

## License

Apache-2.0, matching the repository license. See [LICENSE](LICENSE).
