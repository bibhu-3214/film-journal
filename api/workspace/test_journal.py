from django.test import TestCase

from . import test_workspace as support

fixture = support.fixture
send = support.send


class JournalTests(TestCase):
    def setUp(self):
        support.BoundaryTests.setUp(self)

    def test_watched_dates_persist_and_invalid_changes_do_not_replace_saved_reviews(self):
        record = {
            **fixture(),
            "status": "Watched",
            "watchedOn": "2026-10-30",
            "notes": "A personal review",
        }
        response = send(self.client, "/api/workspace", {"revision": 0, "records": [record]}, "put")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.client.get("/api/workspace").json()["records"], [record])
        for patch in [
            {"status": "Watchlist"},
            {"watchedOn": "2026-02-30"},
            {"rating": True},
            {"year": 1700},
        ]:
            self.assertEqual(
                send(
                    self.client,
                    "/api/workspace",
                    {"revision": 1, "records": [{**record, **patch}]},
                    "put",
                ).status_code,
                400,
            )
        self.assertEqual(self.client.get("/api/workspace").json()["records"], [record])
