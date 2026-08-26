from django.test import SimpleTestCase
from django.urls import reverse


class RootAdminRouteTests(SimpleTestCase):
    def test_root_opens_the_admin_login(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 302)
        self.assertIn("/login/", response["Location"])

    def test_admin_login_uses_tipiti_brand_assets(self):
        response = self.client.get(reverse("tipiti_admin:login"))

        self.assertContains(response, "Administre as compras que cuidam da casa.")
        self.assertContains(response, "core/images/tipiti-login-landscape.png")
        self.assertContains(response, "core/images/undraw-shopping.svg")
