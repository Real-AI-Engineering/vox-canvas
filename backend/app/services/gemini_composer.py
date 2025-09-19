"""Gemini-based card composer implementation."""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone
from typing import Any, Optional

import google.generativeai as genai
from structlog.stdlib import BoundLogger

from .cards import CardComposer, CardContent, CardRequestPayload, CardResult


class GeminiCardComposer(CardComposer):
    """Card composer using Google Gemini API."""

    def __init__(
        self,
        logger: BoundLogger,
        model: str = "gemini-1.5-flash",
        api_key: Optional[str] = None,
    ) -> None:
        self.logger = logger
        self.model_name = model
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")

        if not self.api_key:
            raise ValueError("Gemini API key is required. Set GEMINI_API_KEY environment variable.")

        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(model)
        self.logger.info(event="gemini.initialized", model=model)

    async def compose(
        self,
        request: CardRequestPayload,
        system_prompt: Optional[str] = None,
    ) -> CardResult:
        """Generate a card using Gemini AI."""
        start = datetime.now(timezone.utc)

        # Build the prompt
        full_prompt = self._build_prompt(request.prompt, request.context, system_prompt)

        try:
            # Generate content using Gemini
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.model.generate_content(full_prompt)
            )

            # Parse the response
            content_text = response.text

            # Extract title and content (simple parsing)
            lines = content_text.strip().split('\n')
            title = lines[0].replace('#', '').strip() if lines else "Card"

            # Remove title from content if it starts with #
            if lines and lines[0].startswith('#'):
                content = '\n'.join(lines[1:]).strip()
            else:
                content = content_text.strip()

            content_obj = CardContent(
                title=title,
                markdown=content,
                created_at=start,
            )

            metadata = {
                "mode": "gemini",
                "model": self.model_name,
                "prompt_tokens": len(full_prompt.split()),
                "completion_tokens": len(content_text.split()),
            }

            self.logger.info(
                event="gemini.compose_success",
                model=self.model_name,
                prompt_length=len(full_prompt),
                response_length=len(content_text)
            )

            return CardResult(content=content_obj, raw_prompt=request, metadata=metadata)

        except Exception as exc:
            self.logger.error(event="gemini.compose_error", error=str(exc))
            # Fallback to stub response
            content_obj = CardContent(
                title="Generation Error",
                markdown=f"Failed to generate card: {str(exc)}",
                created_at=start,
            )
            return CardResult(
                content=content_obj,
                raw_prompt=request,
                metadata={"mode": "error", "error": str(exc)}
            )

    def _build_prompt(
        self,
        user_prompt: str,
        context: Optional[str] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        """Build the full prompt for Gemini."""
        parts = []

        if system_prompt:
            parts.append(f"System instruction: {system_prompt}")

        if context:
            parts.append(f"Context: {context}")

        parts.append(f"Task: {user_prompt}")
        parts.append("\nCreate a card in Markdown format. Start with a header (#), then the main content.")

        return "\n\n".join(parts)