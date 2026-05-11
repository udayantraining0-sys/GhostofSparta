from __future__ import annotations

import uuid
import asyncio
import logging
from typing import Optional, AsyncIterator
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class BrowserAction(str, Enum):
    NAVIGATE = "navigate"
    CLICK = "click"
    TYPE = "type"
    SCREENSHOT = "screenshot"
    EXTRACT = "extract"
    SCROLL = "scroll"
    WAIT = "wait"
    GO_BACK = "go_back"


@dataclass
class BrowserState:
    current_url: str = ""
    page_title: str = ""
    screenshot_b64: str = ""
    dom_text: str = ""
    cookies: list[dict] = field(default_factory=list)
    navigation_history: list[str] = field(default_factory=list)


class BrowserAgent:
    def __init__(self):
        self._sessions: dict[str, BrowserState] = {}
        self._browser_active: bool = False

    async def create_session(self) -> str:
        session_id = str(uuid.uuid4())
        self._sessions[session_id] = BrowserState()
        logger.info(f"Browser session created: {session_id}")
        return session_id

    async def navigate(self, session_id: str, url: str) -> BrowserState:
        state = self._get_state(session_id)

        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                await page.goto(url, wait_until="networkidle", timeout=30000)

                state.current_url = page.url
                state.page_title = await page.title()
                state.navigation_history.append(url)

                screenshot = await page.screenshot(type="png")
                import base64
                state.screenshot_b64 = base64.b64encode(screenshot).decode()

                state.dom_text = await page.inner_text("body")

                await browser.close()

            logger.info(f"Browser navigated to: {url}")
            return state

        except ImportError:
            logger.warning("Playwright not installed - using simulated browser")
            state.current_url = url
            state.page_title = f"Simulated: {url}"
            state.navigation_history.append(url)
            state.dom_text = f"Simulated page content for {url}"
            state.screenshot_b64 = ""
            return state

        except Exception as e:
            logger.error(f"Browser navigation failed: {e}")
            state.current_url = url
            state.page_title = f"Error: {e}"
            return state

    async def execute_action(
        self, session_id: str, action: BrowserAction, params: dict
    ) -> BrowserState:
        state = self._get_state(session_id)

        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()

                if state.current_url:
                    await page.goto(state.current_url, timeout=30000)

                if action == BrowserAction.CLICK:
                    selector = params.get("selector", "")
                    if selector:
                        await page.click(selector, timeout=10000)

                elif action == BrowserAction.TYPE:
                    selector = params.get("selector", "")
                    text = params.get("text", "")
                    if selector and text:
                        await page.fill(selector, text, timeout=10000)

                elif action == BrowserAction.SCROLL:
                    amount = params.get("amount", 500)
                    await page.evaluate(f"window.scrollBy(0, {amount})")
                    import asyncio as aio
                    await aio.sleep(0.5)

                elif action == BrowserAction.EXTRACT:
                    selector = params.get("selector", "body")
                    state.dom_text = await page.inner_text(selector)

                elif action == BrowserAction.GO_BACK:
                    await page.go_back()

                elif action == BrowserAction.WAIT:
                    ms = params.get("ms", 1000)
                    import asyncio as aio
                    await aio.sleep(ms / 1000)

                state.current_url = page.url
                state.page_title = await page.title()

                screenshot = await page.screenshot(type="png")
                import base64
                state.screenshot_b64 = base64.b64encode(screenshot).decode()

                await browser.close()

            return state

        except Exception as e:
            logger.error(f"Browser action {action} failed: {e}")
            return state

    async def stream_screenshots(
        self, session_id: str, interval_ms: int = 1000
    ) -> AsyncIterator[str]:
        import asyncio as aio
        state = self._get_state(session_id)

        while True:
            try:
                from playwright.async_api import async_playwright
                async with async_playwright() as p:
                    browser = await p.chromium.launch(headless=True)
                    page = await browser.new_page()

                    if state.current_url:
                        await page.goto(state.current_url, timeout=15000)

                    screenshot = await page.screenshot(type="png")
                    import base64
                    state.screenshot_b64 = base64.b64encode(screenshot).decode()
                    state.current_url = page.url
                    state.page_title = await page.title()

                    await browser.close()

                yield state.screenshot_b64
                await aio.sleep(interval_ms / 1000)

            except Exception:
                yield ""
                await aio.sleep(interval_ms / 1000)

    def _get_state(self, session_id: str) -> BrowserState:
        if session_id not in self._sessions:
            self._sessions[session_id] = BrowserState()
        return self._sessions[session_id]


browser_agent = BrowserAgent()
