from django.test import SimpleTestCase


class RootAdminRouteTests(SimpleTestCase):
    def test_root_opens_the_admin_login(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 302)
        self.assertIn("/login/", response["Location"])
