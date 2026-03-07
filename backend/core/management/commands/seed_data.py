"""Seed sample mosques, announcements, and events for development."""

from datetime import date, time, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import Announcement, Event, Mosque


class Command(BaseCommand):
    help = "Seed the database with sample mosques, announcements, and events"

    def handle(self, *args, **options):
        if Mosque.objects.exists():
            self.stdout.write(self.style.WARNING("Data already seeded — skipping."))
            return

        mosques_data = [
            {
                "name": "East London Mosque",
                "address": "82-92 Whitechapel Rd",
                "city": "London",
                "state": "England",
                "country": "United Kingdom",
                "latitude": 51.5178,
                "longitude": -0.0658,
                "calculation_method": 3,
                "jumua_time": time(13, 15),
                "contact_phone": "+44 20 7650 3000",
                "website": "https://www.eastlondonmosque.org.uk",
            },
            {
                "name": "Birmingham Central Mosque",
                "address": "180 Belgrave Middleway",
                "city": "Birmingham",
                "state": "England",
                "country": "United Kingdom",
                "latitude": 52.4672,
                "longitude": -1.8996,
                "calculation_method": 3,
                "jumua_time": time(13, 30),
                "contact_phone": "+44 121 440 5355",
            },
            {
                "name": "Islamic Center of America",
                "address": "19500 Ford Rd",
                "city": "Dearborn",
                "state": "Michigan",
                "country": "United States",
                "latitude": 42.3118,
                "longitude": -83.2339,
                "calculation_method": 2,
                "jumua_time": time(13, 0),
            },
            {
                "name": "Masjid Al-Haram",
                "address": "Al Haram",
                "city": "Makkah",
                "state": "Makkah Province",
                "country": "Saudi Arabia",
                "latitude": 21.4225,
                "longitude": 39.8262,
                "calculation_method": 4,
            },
            {
                "name": "Regents Park Mosque",
                "address": "146 Park Rd",
                "city": "London",
                "state": "England",
                "country": "United Kingdom",
                "latitude": 51.5274,
                "longitude": -0.1554,
                "calculation_method": 3,
                "jumua_time": time(13, 30),
                "contact_phone": "+44 20 7724 3363",
                "website": "https://www.iccuk.org",
            },
        ]

        created_mosques = []
        for data in mosques_data:
            m = Mosque.objects.create(**data)
            created_mosques.append(m)
            self.stdout.write(f"  Created mosque: {m.name}")

        # Announcements
        now = timezone.now()
        announcements_data = [
            {
                "mosque": created_mosques[0],
                "title": "Ramadan Timetable Available",
                "body": "The Ramadan timetable for this year is now available. Please collect your copy from the mosque reception or download from our website.",
                "priority": "normal",
            },
            {
                "mosque": created_mosques[0],
                "title": "Emergency — Boiler Repair",
                "body": "The heating system is under repair. Please bring warm clothing for prayers until further notice. We apologise for the inconvenience.",
                "priority": "urgent",
            },
            {
                "mosque": created_mosques[1],
                "title": "New Quran Classes Starting",
                "body": "Weekly Quran memorisation classes for adults will begin next Monday after Isha. All levels welcome. Please register at the office.",
                "priority": "normal",
            },
            {
                "mosque": created_mosques[4],
                "title": "Jumu'ah Time Change",
                "body": "Starting next week, the first Jumu'ah khutbah will begin at 1:00 PM and the second at 1:45 PM due to seasonal time changes.",
                "priority": "normal",
            },
        ]

        for data in announcements_data:
            a = Announcement.objects.create(**data)
            self.stdout.write(f"  Created announcement: {a.title}")

        # Events
        today = date.today()
        events_data = [
            {
                "mosque": created_mosques[0],
                "title": "Tafsir of Surah Al-Kahf",
                "description": "Weekly tafsir session covering Surah Al-Kahf, verse by verse.",
                "speaker": "Shaykh Abdul Rahman",
                "event_date": today + timedelta(days=2),
                "start_time": time(20, 0),
                "end_time": time(21, 0),
                "category": "lesson",
                "recurring": "weekly",
            },
            {
                "mosque": created_mosques[0],
                "title": "Youth Football Tournament",
                "description": "Annual youth 5-a-side football tournament. Teams of ages 12-18. Prizes for winners!",
                "event_date": today + timedelta(days=7),
                "start_time": time(10, 0),
                "end_time": time(16, 0),
                "category": "youth",
            },
            {
                "mosque": created_mosques[1],
                "title": "Sisters Halaqah",
                "description": "Weekly halaqah for sisters covering topics of faith, family, and personal development.",
                "speaker": "Ustadha Maryam Khan",
                "event_date": today + timedelta(days=3),
                "start_time": time(11, 0),
                "end_time": time(12, 30),
                "category": "sisters",
                "recurring": "weekly",
            },
            {
                "mosque": created_mosques[4],
                "title": "Community Iftar",
                "description": "Open iftar for the community. All are welcome. Please bring a dish to share.",
                "event_date": today + timedelta(days=5),
                "start_time": time(18, 30),
                "category": "community",
            },
            {
                "mosque": created_mosques[2],
                "title": "Qur'an Memorisation Circle",
                "description": "Structured hifz programme with individual attention. Students at all levels welcome.",
                "speaker": "Qari Ibrahim",
                "event_date": today + timedelta(days=1),
                "start_time": time(19, 0),
                "end_time": time(20, 30),
                "category": "quran_circle",
                "recurring": "weekly",
            },
        ]

        for data in events_data:
            e = Event.objects.create(**data)
            self.stdout.write(f"  Created event: {e.title}")

        self.stdout.write(self.style.SUCCESS(
            f"\nSeeded {len(created_mosques)} mosques, "
            f"{len(announcements_data)} announcements, "
            f"{len(events_data)} events."
        ))
