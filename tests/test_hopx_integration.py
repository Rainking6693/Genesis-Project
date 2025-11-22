import asyncio
import os
from pathlib import Path

import pytest

from infrastructure.hopx_client import HopXClient


@pytest.mark.asyncio
async def test_hopx_mock_environment(tmp_path: Path, monkeypatch):
    """Validate the local mock mode workflow end-to-end."""

    monkeypatch.setenv("HOPX_USE_FAKE", "true")
    client = HopXClient(base_dir=tmp_path)

    env = await client.create_environment("biz_demo", template="python_environment")
    client.upload_files(env.env_id, {"main.py": "print('hopx-test')"})
    result = await client.execute_command(env.env_id, "python main.py")

    assert result.success
    assert "hopx-test" in result.stdout

    await client.destroy_environment(env.env_id)


@pytest.mark.asyncio
async def test_hopx_timeout(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("HOPX_USE_FAKE", "true")
    client = HopXClient(base_dir=tmp_path)
    env = await client.create_environment("biz_demo", template="python_environment")
    client.upload_files(env.env_id, {"wait.py": "import time; time.sleep(2)"})

    with pytest.raises(TimeoutError):
        await client.execute_command(env.env_id, "python wait.py", timeout=0.1)

    await client.destroy_environment(env.env_id)

