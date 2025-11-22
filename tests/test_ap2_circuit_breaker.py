import time

import pytest

from infrastructure.ap2_circuit_breaker import CircuitBreaker, CircuitState


def test_breaker_opens_after_failures():
    breaker = CircuitBreaker(failures_to_open=2, half_open_timeout_seconds=10, time_fn=time.time)
    breaker.record_failure()
    assert breaker.state == CircuitState.CLOSED
    breaker.record_failure()
    assert breaker.state == CircuitState.OPEN


def test_breaker_half_open_after_timeout(monkeypatch):
    fake_time = [0]

    def time_fn():
        return fake_time[0]

    breaker = CircuitBreaker(failures_to_open=1, half_open_timeout_seconds=5, time_fn=time_fn)
    breaker.record_failure()
    fake_time[0] = 6
    assert breaker.allow() is True
    assert breaker.state == CircuitState.HALF_OPEN


def test_breaker_closes_after_success():
    breaker = CircuitBreaker(failures_to_open=1)
    breaker.record_failure()
    assert breaker.state == CircuitState.OPEN
    breaker.record_success()
    assert breaker.state == CircuitState.CLOSED

