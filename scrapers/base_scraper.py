"""
BaseScraper — abstract base class for all subsidy scrapers.

Every concrete scraper must implement:
  - `scrape()` → list[ScrapedIncentive]

The base class provides:
  - HTTP session management (requests + httpx)
  - Playwright browser lifecycle (for JS-rendered pages)
  - Retry logic with exponential back-off (tenacity)
  - Structured logging (structlog)
  - Rate limiting helpers
  - BeautifulSoup parse utilities
"""

from __future__ import annotations

import asyncio
import time
from abc import ABC, abstractmethod
from typing import Optional
from urllib.parse import urlparse

import httpx
import structlog
from bs4 import BeautifulSoup
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

from .models import ScrapedIncentive

logger = structlog.get_logger()


class ScraperConfig:
    """Shared configuration for all scrapers."""

    DEFAULT_HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; SubsidyFinderBot/1.0; "
            "+https://subsidyfinder.io/bot)"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    REQUEST_TIMEOUT = 30  # seconds
    MAX_RETRIES = 4
    MIN_WAIT = 2  # seconds between requests (be polite)
    MAX_WAIT = 10


class BaseScraper(ABC):
    """
    Abstract base class for all incentive scrapers.

    Usage::

        class MyScraper(BaseScraper):
            SOURCE_NAME = "my_agency_scraper"
            BASE_URL = "https://example.gov/grants"

            def scrape(self) -> list[ScrapedIncentive]:
                html = self.fetch(self.BASE_URL)
                soup = self.parse(html)
                # ... extract and return ScrapedIncentive objects

        results = MyScraper().scrape()
    """

    #: Human-readable identifier stored in `scraperSource` DB column.
    SOURCE_NAME: str = "base_scraper"

    #: Root URL of the target site — set in each subclass.
    BASE_URL: str = ""

    def __init__(self, use_playwright: bool = False):
        self._log = logger.bind(scraper=self.SOURCE_NAME)
        self._last_request_time: float = 0
        self._use_playwright = use_playwright
        self._client = httpx.Client(
            headers=ScraperConfig.DEFAULT_HEADERS,
            timeout=ScraperConfig.REQUEST_TIMEOUT,
            follow_redirects=True,
        )

    # ── Public API ────────────────────────────────────────────────────────

    @abstractmethod
    def scrape(self) -> list[ScrapedIncentive]:
        """Perform the full scrape and return a list of incentives."""
        ...

    # ── HTTP helpers ──────────────────────────────────────────────────────

    @retry(
        stop=stop_after_attempt(ScraperConfig.MAX_RETRIES),
        wait=wait_exponential(multiplier=1, min=2, max=60),
        retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException)),
        before_sleep=before_sleep_log(logger, 10),  # 10 = logging.DEBUG
    )
    def fetch(self, url: str, params: Optional[dict] = None) -> str:
        """
        Fetch a URL, returning the raw HTML string.
        Applies politeness delay between requests.
        """
        self._polite_delay()
        self._log.info("fetching", url=url)
        response = self._client.get(url, params=params)
        response.raise_for_status()
        self._last_request_time = time.monotonic()
        return response.text

    def fetch_json(self, url: str, params: Optional[dict] = None) -> dict:
        """Fetch a JSON API endpoint."""
        self._polite_delay()
        self._log.info("fetching json", url=url)
        response = self._client.get(url, params=params)
        response.raise_for_status()
        self._last_request_time = time.monotonic()
        return response.json()

    # ── Playwright helpers ────────────────────────────────────────────────

    async def fetch_dynamic(self, url: str, wait_selector: Optional[str] = None) -> str:
        """
        Use Playwright to render a JavaScript-heavy page and return HTML.

        Args:
            url: Target URL.
            wait_selector: CSS selector to wait for before capturing HTML.
                           Falls back to `networkidle` if not provided.
        """
        from playwright.async_api import async_playwright  # lazy import

        self._log.info("fetching with playwright", url=url)
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            page = await browser.new_page(
                extra_http_headers=ScraperConfig.DEFAULT_HEADERS,
            )
            await page.goto(url, wait_until="networkidle")
            if wait_selector:
                await page.wait_for_selector(wait_selector, timeout=15_000)
            html = await page.content()
            await browser.close()
        return html

    def fetch_dynamic_sync(self, url: str, wait_selector: Optional[str] = None) -> str:
        """Synchronous wrapper around `fetch_dynamic`."""
        return asyncio.run(self.fetch_dynamic(url, wait_selector))

    # ── Parse helpers ─────────────────────────────────────────────────────

    def parse(self, html: str) -> BeautifulSoup:
        """Return a BeautifulSoup tree from raw HTML."""
        return BeautifulSoup(html, "lxml")

    def extract_text(self, soup: BeautifulSoup, selector: str, default: str = "") -> str:
        """
        Extract and clean text from the first element matching `selector`.

        Example::
            title = self.extract_text(soup, "h1.program-title")
        """
        el = soup.select_one(selector)
        return el.get_text(strip=True) if el else default

    def extract_bullets(self, soup: BeautifulSoup, selector: str) -> list[str]:
        """
        Extract a list of strings from <li> elements under `selector`.

        Example::
            reqs = self.extract_bullets(soup, "#eligibility ul")
        """
        container = soup.select_one(selector)
        if not container:
            return []
        return [li.get_text(strip=True) for li in container.select("li") if li.get_text(strip=True)]

    def extract_paragraphs(self, soup: BeautifulSoup, selector: str) -> str:
        """
        Join all <p> tag texts within `selector` into a single summary string.
        """
        container = soup.select_one(selector)
        if not container:
            return ""
        paras = [p.get_text(strip=True) for p in container.select("p") if p.get_text(strip=True)]
        return " ".join(paras[:3])  # cap at first 3 paragraphs for summary

    def resolve_url(self, href: str) -> str:
        """Resolve a relative URL against BASE_URL."""
        if href.startswith("http"):
            return href
        base = urlparse(self.BASE_URL)
        return f"{base.scheme}://{base.netloc}{href}"

    # ── Rate limiting ─────────────────────────────────────────────────────

    def _polite_delay(self):
        """Wait at least MIN_WAIT seconds since the last request."""
        elapsed = time.monotonic() - self._last_request_time
        if elapsed < ScraperConfig.MIN_WAIT:
            time.sleep(ScraperConfig.MIN_WAIT - elapsed)

    # ── Lifecycle ─────────────────────────────────────────────────────────

    def close(self):
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
