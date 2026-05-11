import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone

os.environ["FLASK_ENV"] = "development"
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app  # noqa: E402
from app.extensions import db, bcrypt  # noqa: E402
from app.models import User, UserRole, Request, Vehicle, VehicleStatus  # noqa: E402


class VramsSecurityTests(unittest.TestCase):
    def setUp(self):
        self.db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.db_file.close()
        os.environ["DATABASE_URL"] = f"sqlite:///{self.db_file.name}"
        self.app = create_app("development")
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()
            admin = User(
                name="Admin User",
                email="admin@example.com",
                password_hash=bcrypt.generate_password_hash("AdminPass123").decode("utf-8"),
                role=UserRole.admin,
                is_active=True,
            )
            requester = User(
                name="Requester User",
                email="requester@example.com",
                password_hash=bcrypt.generate_password_hash("RequesterPass123").decode("utf-8"),
                role=UserRole.requester,
                is_active=True,
            )
            driver = User(
                name="Driver User",
                email="driver@example.com",
                password_hash=bcrypt.generate_password_hash("DriverPass123").decode("utf-8"),
                role=UserRole.driver,
                is_active=True,
            )
            vehicle = Vehicle(
                plate="KAA111A",
                make="Toyota",
                model="Hilux",
                year=2022,
                vehicle_type="pickup",
                status=VehicleStatus.available,
                bookable=True,
            )
            db.session.add_all([admin, requester, driver, vehicle])
            db.session.commit()
            self.admin_id = admin.id
            self.requester_id = requester.id
            self.driver_id = driver.id
            self.vehicle_id = vehicle.id

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
        if os.path.exists(self.db_file.name):
            os.unlink(self.db_file.name)

    def _login(self, email, password):
        res = self.client.post(
            "/api/auth/login",
            json={"email": email, "password": password},
        )
        self.assertEqual(res.status_code, 200)
        return res.get_json()["access_token"]

    def _auth_headers(self, token):
        return {"Authorization": f"Bearer {token}"}

    def test_requires_jwt_for_dashboard(self):
        res = self.client.get("/api/vrams/dashboard")
        self.assertEqual(res.status_code, 401)

    def test_requester_cannot_invite_user(self):
        token = self._login("requester@example.com", "RequesterPass123")
        res = self.client.post(
            "/api/vrams/users/invite",
            headers=self._auth_headers(token),
            json={"name": "Test", "email": "test@example.com", "role": "requester"},
        )
        self.assertEqual(res.status_code, 403)

    def test_dispatch_requires_approved_request(self):
        token = self._login("requester@example.com", "RequesterPass123")
        departure = datetime.now(timezone.utc) + timedelta(hours=2)
        create_req = self.client.post(
            "/api/vrams/requests",
            headers=self._auth_headers(token),
            json={
                "destination": "HQ",
                "departure_at": departure.isoformat(),
                "priority": "normal",
            },
        )
        self.assertEqual(create_req.status_code, 201)
        req_id = create_req.get_json()["id"]

        admin_token = self._login("admin@example.com", "AdminPass123")
        assign = self.client.post(
            "/api/vrams/dispatch/assign",
            headers=self._auth_headers(admin_token),
            json={
                "request_id": req_id,
                "vehicle_id": self.vehicle_id,
                "driver_id": self.driver_id,
            },
        )
        self.assertEqual(assign.status_code, 409)

    def test_admin_invite_and_accept_flow(self):
        admin_token = self._login("admin@example.com", "AdminPass123")
        invite = self.client.post(
            "/api/vrams/users/invite",
            headers=self._auth_headers(admin_token),
            json={"name": "Invited", "email": "invited@example.com", "role": "requester"},
        )
        self.assertEqual(invite.status_code, 201)
        body = invite.get_json()
        self.assertIn("invite_token", body)

        accept = self.client.post(
            "/api/vrams/users/accept-invite",
            json={"token": body["invite_token"], "password": "NewSecurePass1"},
        )
        self.assertEqual(accept.status_code, 200)

        login = self.client.post(
            "/api/auth/login",
            json={"email": "invited@example.com", "password": "NewSecurePass1"},
        )
        self.assertEqual(login.status_code, 200)

    def test_soft_delete_request_hidden_from_listing(self):
        requester_token = self._login("requester@example.com", "RequesterPass123")
        departure = datetime.now(timezone.utc) + timedelta(hours=1)
        created = self.client.post(
            "/api/vrams/requests",
            headers=self._auth_headers(requester_token),
            json={"destination": "Airport", "departure_at": departure.isoformat()},
        )
        self.assertEqual(created.status_code, 201)
        req_id = created.get_json()["id"]

        deleted = self.client.delete(f"/api/vrams/requests/{req_id}", headers=self._auth_headers(requester_token))
        self.assertEqual(deleted.status_code, 200)

        listed = self.client.get("/api/vrams/requests", headers=self._auth_headers(requester_token))
        self.assertEqual(listed.status_code, 200)
        ids = [item["id"] for item in listed.get_json()["items"]]
        self.assertNotIn(req_id, ids)

    def test_expected_version_conflict_on_request_update(self):
        requester_token = self._login("requester@example.com", "RequesterPass123")
        departure = datetime.now(timezone.utc) + timedelta(hours=1)
        created = self.client.post(
            "/api/vrams/requests",
            headers=self._auth_headers(requester_token),
            json={"destination": "HQ", "departure_at": departure.isoformat()},
        )
        self.assertEqual(created.status_code, 201)
        req = created.get_json()
        req_id = req["id"]

        ok_update = self.client.patch(
            f"/api/vrams/requests/{req_id}",
            headers=self._auth_headers(requester_token),
            json={"destination": "HQ Annex", "expected_version": req["version"]},
        )
        self.assertEqual(ok_update.status_code, 200)

        stale_update = self.client.patch(
            f"/api/vrams/requests/{req_id}",
            headers=self._auth_headers(requester_token),
            json={"destination": "HQ Old", "expected_version": req["version"]},
        )
        self.assertEqual(stale_update.status_code, 409)

    def test_admin_can_read_audit_logs(self):
        requester_token = self._login("requester@example.com", "RequesterPass123")
        departure = datetime.now(timezone.utc) + timedelta(hours=1)
        self.client.post(
            "/api/vrams/requests",
            headers=self._auth_headers(requester_token),
            json={"destination": "HQ", "departure_at": departure.isoformat()},
        )

        admin_token = self._login("admin@example.com", "AdminPass123")
        res = self.client.get("/api/vrams/audit/logs", headers=self._auth_headers(admin_token))
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.get_json()["total"], 1)


if __name__ == "__main__":
    unittest.main()
