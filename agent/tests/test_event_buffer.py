from endpoint_agent.events import EventBuffer, EventIdentity


def make_event(event_type: str, value: int) -> dict:
    identity = EventIdentity("exam", "student", "session")
    return identity.build(event_type, {"value": value})


def test_pending_duplicates_are_coalesced() -> None:
    buffer = EventBuffer(capacity=4)
    first = make_event("connectivity_changed", 1)
    duplicate = make_event("connectivity_changed", 1)

    assert buffer.put(first) is True
    assert buffer.put(duplicate) is False
    assert len(buffer) == 1


def test_full_buffer_drops_oldest_and_remains_bounded() -> None:
    buffer = EventBuffer(capacity=2)
    first = make_event("state", 1)
    second = make_event("state", 2)
    third = make_event("state", 3)

    buffer.put(first)
    buffer.put(second)
    buffer.put(third)

    assert buffer.snapshot() == [second, third]
    assert len(buffer) == 2
    assert buffer.dropped_count == 1


def test_unacknowledged_head_survives_reconnect_attempt() -> None:
    buffer = EventBuffer(capacity=3)
    first = make_event("foreground_application_changed", 1)
    second = make_event("foreground_application_changed", 2)
    buffer.put(first)
    buffer.put(second)

    attempted = buffer.peek()
    assert attempted == first
    assert buffer.peek() == first
    assert len(buffer) == 2

    assert buffer.acknowledge(attempted) is True
    assert buffer.peek() == second


def test_wrong_acknowledgement_cannot_consume_queue_head() -> None:
    buffer = EventBuffer(capacity=2)
    first = make_event("agent_started", 1)
    buffer.put(first)

    assert buffer.acknowledge(make_event("agent_started", 2)) is False
    assert buffer.peek() == first
