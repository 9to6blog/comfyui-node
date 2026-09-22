# Windows 재설치 후 복원

이 저장소는 ComfyUI에 추가하는 노드 팩이다. ComfyUI 본체, Python 환경, 모델과 사용자 데이터는 별도로 준비한다. 이 안내는 `1e87fa9a81b6e432d75bb24b55f2627e5d49e086`의 README, 패키지 정의와 테스트 명령을 기준으로 작성했다.

## 포맷 전에 보관할 것

- 수정한 소스가 있다면 `git status --short`로 확인하고 커밋 또는 별도 백업으로 보관한다.
- 워크플로 JSON, 입력 이미지, 출력 결과, 모델, ComfyUI의 사용자 설정과 실행 스크립트를 별도로 보관한다. 이 노드 저장소를 clone하는 것으로 호스트의 데이터가 복원되지는 않는다.
- 현재 ComfyUI와 frontend 버전, 사용한 Python 실행 파일 경로를 기록한다. 노드 팩을 복원하기 위해 기존 호스트의 `models`, `input`, `output`, `user`, 다른 `custom_nodes`를 덮어쓰거나 삭제하지 않는다.

## 노드 설치

먼저 ComfyUI가 단독으로 실행되는 환경과 Git을 준비한다. PowerShell에서 아래 예시 경로를 실제 ComfyUI 소스 경로로 바꾼다.

```powershell
$comfyRoot = 'C:\Tools\ComfyUI\ComfyUI'
Set-Location (Join-Path $comfyRoot 'custom_nodes')
git clone https://github.com/9to6blog/comfyui-node.git
```

이미 `custom_nodes\comfyui-node`가 있다면 새로 clone하거나 덮어쓰기 전에 해당 폴더의 origin, HEAD와 변경 상태를 확인한다. 개발용 checkout과 실제 ComfyUI에 설치한 checkout이 별개라면 어느 쪽을 수정하고 실행하는지 함께 기록한다.

설치 폴더 바로 아래에 `__init__.py`, `prompt_switch`, `image_batch`, `web`가 있어야 한다. 저장소 전체를 하나의 노드 팩으로 설치하며 하위 기능 폴더를 중복 설치하지 않는다. 추가 pip 설치나 frontend 빌드는 필요 없다. Python 의존성은 ComfyUI 환경의 torch, numpy, Pillow를 사용하며, Node.js는 노드 실행에 필요 없다. 비공개 저장소라면 clone할 계정에 접근 권한이 있어야 한다.

## 시작과 브라우저 확인

1. 진행 중인 ComfyUI 작업이 끝난 뒤 기존 호스트의 정상 종료·실행 절차로 한 번 재시작한다. 같은 포트에 두 번째 서버를 열지 않는다.
2. 그 서버 주소를 열고 브라우저를 새로고침한다. 이전 확장 UI가 남으면 `Ctrl+Shift+R`로 강력 새로고침한다.
3. 노드 검색에서 `9to6`를 검색한다. Multi Prompt Switcher, Image Batch Loader, Image Grid, Image Compare가 보이는지 확인한다.
4. 모델 없이 `Image Batch Loader → Invert Image → Image Grid`를 실행해 이미지 개수·순서·크기를 확인한다. 프롬프트 카드 선택, 워크플로 저장·재열기, 입력창의 `Ctrl+S` 전달과 결과 확대도 확인한다.

노드 목록이 없으면 실행한 ComfyUI의 `custom_nodes` 경로와 시작 로그의 import 오류를 먼저 확인한다. Python import 오류는 브라우저 새로고침만으로 해결되지 않는다. 반대로 JavaScript 수정 후 이전 화면이 남는 경우에는 서버 재시작과 브라우저 캐시 갱신을 구분해서 확인한다.

## 개발과 검사

Python 3.10 이상과 Node.js 20 이상을 사용한다. 이미지 Python 테스트는 ComfyUI와 같은 환경에서 실행한다. 아래 예시는 Windows portable 환경이며 `$comfyRoot`의 부모에 `python_embeded`가 있는 구조다. venv 설치라면 `$comfyPython`을 그 환경의 실행 파일로 바꾼다.

```powershell
$comfyRoot = 'C:\Tools\ComfyUI\ComfyUI'
$comfyPython = Join-Path (Split-Path $comfyRoot -Parent) 'python_embeded\python.exe'
Set-Location (Join-Path $comfyRoot 'custom_nodes\comfyui-node')
& $comfyPython -m unittest discover -s prompt_switch/tests -v
& $comfyPython -m unittest discover -s image_batch/tests -v
npm.cmd test
```

JavaScript 테스트는 Node.js 내장 test runner를 사용하며 package.json에 외부 npm 의존성은 없다. 자동 검사 통과와 실제 ComfyUI 화면 확인은 별도로 기록한다. README의 기존 UI 검증 환경은 ComfyUI 0.36.0 / Frontend 1.52.7이며, 다른 호스트 버전에서는 실제 설치 환경을 다시 확인한다.

## 업데이트

실제 설치 checkout에서 `git status --short`로 로컬 변경을 확인한다. 변경을 보관하고 작업이 끝난 상태에서 업데이트한다.

```powershell
git pull --ff-only
git rev-parse HEAD
```

fast-forward가 불가능하면 로컬 작업과 원격 변경을 검토한다. 업데이트 후에는 앞의 재시작·브라우저 확인 절차를 반복한다. Registry 등록과 GitHub 업로드는 별도이며, 현재 `PublisherId`가 비어 있으므로 복원 기준은 이 문서의 Git 설치 경로다. Registry 게시가 필요하면 [PUBLISHING.md](PUBLISHING.md)와 실제 `pyproject.toml` 버전을 함께 확인한다.
