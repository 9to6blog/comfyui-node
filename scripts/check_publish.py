"""Fail early when publishing metadata still contains local-draft placeholders."""

from pathlib import Path
import sys
import tomllib
from urllib.parse import urlparse


def main():
    root = Path(__file__).resolve().parents[1]
    metadata = tomllib.loads((root / "pyproject.toml").read_text(encoding="utf-8"))
    repository = metadata["project"]["urls"]["Repository"]
    publisher = metadata["tool"]["comfy"]["PublisherId"].strip()
    url = urlparse(repository)
    if not publisher or "YOUR_GITHUB" in repository:
        raise SystemExit("Set the real Repository URL and PublisherId in pyproject.toml before publishing.")
    if url.scheme != "https" or url.netloc != "github.com" or len(url.path.strip("/").split("/")) != 2:
        raise SystemExit("Repository must be an HTTPS GitHub owner/repository URL.")
    if len(sys.argv) > 1 and sys.argv[1].startswith("refs/tags/"):
        actual_tag = sys.argv[1].removeprefix("refs/tags/")
        expected_tag = "v" + metadata["project"]["version"]
        if actual_tag != expected_tag:
            raise SystemExit(f"Tag {actual_tag} must match {expected_tag} from pyproject.toml.")
    print("Publishing metadata is configured.")


if __name__ == "__main__":
    main()
