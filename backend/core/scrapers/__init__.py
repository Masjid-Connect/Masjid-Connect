"""Mosque timetable scraper registry."""

from .wright_street import WrightStreetScraper

SCRAPERS: dict[str, type] = {
    "wright_street": WrightStreetScraper,
}
