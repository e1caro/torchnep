"""Tests of the start-up helpers: opening the window and noticing a copy that is already running.

run:  python -m unittest discover -s tests   (from the command-room folder)
"""
import json
import os
import sys
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from commandroom import __main__ as start  # noqa: E402
from commandroom.server import App, make_handler  # noqa: E402
from commandroom.settings import Settings  # noqa: E402


class Start(unittest.TestCase):
    def test_app_window_when_a_browser_is_installed(self):
        with tempfile.TemporaryDirectory() as d:
            exe = os.path.join(d, "browser.exe")
            with open(exe, "w") as f:
                f.write("")
            calls = []
            self.assertEqual(start.open_window(8791, browsers=(os.path.join(d, "missing.exe"), exe), popen=calls.append), "app")
            self.assertEqual(calls, [[exe, "--app=http://localhost:8791", "--window-size=1500,950"]])

    def test_falls_back_to_the_normal_browser(self):
        with mock.patch("webbrowser.open") as opened:
            self.assertEqual(start.open_window(8791, browsers=()), "browser")
            opened.assert_called_once_with("http://localhost:8791")

    def test_already_running(self):
        with tempfile.TemporaryDirectory() as d:
            with open(os.path.join(d, "settings.local.json"), "w", encoding="utf-8") as f:
                json.dump({}, f)
            app = App(Settings(os.path.join(d, "settings.local.json")))
            server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(app, 8791))
            port = server.server_address[1]
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                self.assertTrue(start.already_running(port))
            finally:
                server.shutdown()
                server.server_close()
            self.assertFalse(start.already_running(port))


if __name__ == "__main__":
    unittest.main()
