import time

import pytest

from infrastructure.hopx_monitor import HopXEnvironmentRecord, HopXMonitor
from infrastructure.hopx_watchdog import find_stuck_environments, notify_stuck_environments


class DummyDiscord:
    def __init__(self):
        self.calls = []

    async def hopx_environment_stuck(self, env_id: str, age_hours: float) -> None:
        self.calls.append((env_id, age_hours))

    async def close(self) -> None:
        pass


def test_find_stuck_returns_records(tmp_path):
    monitor = HopXMonitor(log_dir=tmp_path / "hopx_envs")
    monitor.record_created("env_watchdog", "biz_watchdog", "python_environment")
    monitor._active["env_watchdog"].created_at -= 7200

    stuck = find_stuck_environments(max_age_seconds=3600, monitor=monitor)

    assert len(stuck) == 1
    assert stuck[0].status == "stuck"


@pytest.mark.asyncio
async def test_notify_stuck_environments(monkeypatch):
    env = HopXEnvironmentRecord(
        env_id="env_captured",
        business_id="biz_captured",
        template="fullstack_environment",
        created_at=time.time() - 7200,
        last_seen_at=time.time() - 7200,
    )
    discord = DummyDiscord()

    records = await notify_stuck_environments([env], discord=discord)

    assert records == [env]
    assert discord.calls[0][0] == "env_captured"
    assert discord.calls[0][1] == pytest.approx(2.0, rel=0.01)
