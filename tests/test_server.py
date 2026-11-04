import json
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import urlopen
from main import make_server


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = make_server("127.0.0.1", 0)
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def test_health_and_home(self):
        with urlopen(self.base + "/healthz") as response:
            self.assertEqual(json.load(response), {"status": "ok"})
        with urlopen(self.base) as response:
            self.assertIn("МАША".encode(), response.read())
            self.assertIn("default-src 'self'", response.headers["Content-Security-Policy"])

    def test_project_and_missing_files_are_not_served(self):
        for path in ("/main.py", "/.env", "/../main.py", "/%2e%2e/main.py", "/.git/config", "/missing"):
            with self.subTest(path=path):
                with self.assertRaises(HTTPError) as error:
                    urlopen(self.base + path)
                self.assertEqual(error.exception.code, 404)

    def test_javascript_modules_have_script_content_type(self):
        for path in ("/app.js", "/model.mjs", "/games.js", "/sound.js", "/effects.js"):
            with urlopen(self.base + path) as response:
                self.assertIn(response.headers.get_content_type(), ("application/javascript", "text/javascript"))


if __name__ == "__main__":
    unittest.main()
