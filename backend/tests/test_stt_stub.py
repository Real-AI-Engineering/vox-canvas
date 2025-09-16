import asyncio

import pytest
import structlog

from app.services import TranscriptEventType, create_stt_adapter, queue_stream


@pytest.mark.asyncio
async def test_stub_adapter_emits_partial_and_final_events():
    adapter = create_stt_adapter(
        engine="google",
        language="ru-RU",
        logger=structlog.get_logger("test"),
    )

    queue: asyncio.Queue[bytes | None] = asyncio.Queue()
    await queue.put(b"chunk-1")
    await queue.put(b"chunk-2")
    await queue.put(None)

    events = []
    async for event in adapter.run(queue_stream(queue)):
        events.append(event)

    assert len(events) == 3
    assert events[0].type is TranscriptEventType.PARTIAL
    assert events[1].type is TranscriptEventType.PARTIAL
    assert events[2].type is TranscriptEventType.FINAL
    assert events[0].raw["chunk_index"] == 1
    assert events[-1].raw["chunks"] == 2
