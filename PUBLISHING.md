# Comfy Registry 게시

저장소: https://github.com/9to6blog/comfyui-node

기능 코드는 `prompt_switch/`에 있고 루트 `__init__.py`가 노드를 불러옵니다. Registry에는 **저장소 전체를 하나의 노드 팩**으로 게시합니다. GitHub의 하위 폴더마다 Manager에 별도 등록되는 구조는 아닙니다.

## 준비

1. Comfy Registry에서 게시자 계정을 생성하고 실제 게시자 ID를 `pyproject.toml`의 `PublisherId`에 넣습니다.
2. 패키지 이름 `ninetosix-prompt-switch`의 사용 가능 여부를 확인합니다. 이름은 첫 게시 후 바꿀 수 없습니다.
3. GitHub 저장소가 공개 상태인지 확인합니다. 저장소 URL은 이미 설정되어 있습니다.
4. Registry 게시용 API 키를 GitHub Actions secret `REGISTRY_ACCESS_TOKEN`으로 등록합니다.
5. 실제 ComfyUI에 저장소 전체를 설치하고 스위치 출력, 워크플로 재불러오기, Ctrl+S 동작을 확인합니다.

## 게시

GitHub Actions에서 **Publish to Comfy Registry → Run workflow**를 실행하거나, `pyproject.toml` 버전과 일치하는 `v0.1.1` 태그를 push합니다. 워크플로는 게시 정보와 테스트를 확인한 다음 Registry에 업로드합니다. 일반 `main` push에서는 테스트만 실행합니다.

또는 comfy-cli가 설치된 환경에서 저장소 루트에서 `comfy node publish`를 실행합니다.

API 키는 소스에 넣지 않습니다. 이미 게시한 버전은 덮어쓸 수 없으므로 수정 배포 시 버전을 올립니다. Registry 처리 상태와 Manager에서의 검색·설치를 별도로 확인하세요.

## 공식 문서

- https://docs.comfy.org/registry/publishing
- https://docs.comfy.org/registry/specifications
- https://docs.comfy.org/custom-nodes/js/javascript_overview
