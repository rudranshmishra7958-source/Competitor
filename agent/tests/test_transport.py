from endpoint_agent.transport import ReconnectPolicy


def test_reconnect_delay_is_exponential_and_capped() -> None:
    policy = ReconnectPolicy(initial_seconds=1, maximum_seconds=30)

    assert [policy.delay(attempt) for attempt in range(7)] == [1, 2, 4, 8, 16, 30, 30]
