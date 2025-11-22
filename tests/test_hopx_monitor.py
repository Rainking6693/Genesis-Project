from infrastructure.hopx_monitor import HopXMonitor


def test_detect_stuck_marks_environment(tmp_path):
    monitor = HopXMonitor(log_dir=tmp_path / "hopx_envs")
    monitor.record_created("env_stuck", "biz_stuck", "nodejs_environment")
    record = monitor._active["env_stuck"]
    record.created_at -= 7200

    stuck = list(monitor.detect_stuck(max_age_seconds=3600))

    assert len(stuck) == 1
    assert stuck[0].status == "stuck"
    assert record.status == "stuck"
    assert list(monitor.detect_stuck(max_age_seconds=3600)) == []
