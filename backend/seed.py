"""
Run: python seed.py
Seeds the database with demo data matching the prototype.
"""
from datetime import date, datetime, timezone, timedelta
from app import create_app
from app.extensions import db, bcrypt
from app.models import User, Vehicle, Request, MaintenanceLog, Dispatch, UserRole, VehicleStatus, RequestStatus
from app.models.vehicle import VehicleStatusLog
from app.models.dispatch import DispatchStatus

app = create_app()

with app.app_context():
    db.drop_all()
    db.create_all()

    # ── Users ──────────────────────────────────────────────────────────────────
    def make_user(name, email, role, dept=None, phone=None, license_no=None, driver_code=None):
        return User(
            name=name, email=email,
            password_hash=bcrypt.generate_password_hash("Password123!").decode(),
            role=role, department=dept, phone=phone,
            license_number=license_no, driver_id_code=driver_code,
            is_active=True, total_trips=0
        )

    admin = make_user("Admin User", "admin@vrams.org", UserRole.fleet_manager, "Fleet Management")
    john = make_user("John Doe", "john.doe@vrams.org", UserRole.requester, "Sales")
    sarah = make_user("Sarah Smith", "sarah.smith@vrams.org", UserRole.requester, "Logistics")
    mike = make_user("Mike Johnson", "mike.johnson@vrams.org", UserRole.requester, "Exec")
    emily = make_user("Emily Davis", "emily.davis@vrams.org", UserRole.requester, "HR")
    robert = make_user("Robert Wilson", "robert.wilson@vrams.org", UserRole.requester, "IT")
    grace = make_user("Grace Njeri", "grace.njeri@vrams.org", UserRole.requester, "Finance")
    james = make_user("James Mwangi", "james.mwangi@vrams.org", UserRole.driver, phone="+254 712 345 678",
                       license_no="DL-204-KE", driver_code="DRV-042")
    peter = make_user("Peter Ochieng", "peter.ochieng@vrams.org", UserRole.driver, phone="+254 722 111 222",
                       license_no="DL-178-KE", driver_code="DRV-017")

    db.session.add_all([admin, john, sarah, mike, emily, robert, grace, james, peter])
    db.session.flush()

    # ── Vehicles ───────────────────────────────────────────────────────────────
    today = date.today()

    vehicles_data = [
        ("KDG 421Z", "Toyota", "Prado", 2020, "SUV", "Diesel", "Automatic", 8, "3.0L V6", "White", 62000,
         VehicleStatus.available, True, today + timedelta(days=270), today + timedelta(days=345), today + timedelta(days=24), james.id),
        ("KBZ 882T", "Toyota", "HiAce", 2019, "Van", "Diesel", "Manual", 14, "2.7L", "Silver", 88000,
         VehicleStatus.in_service, False, today + timedelta(days=19), today + timedelta(days=118), today + timedelta(days=50), peter.id),
        ("KCJ 554R", "Nissan", "Navara", 2018, "Truck", "Diesel", "Manual", 5, "2.5L", "Black", 104000,
         VehicleStatus.out_of_service, False, today - timedelta(days=30), today - timedelta(days=15), today - timedelta(days=10), None),
        ("KDD 109M", "Mercedes-Benz", "E-Class", 2022, "Sedan", "Petrol", "Automatic", 5, "2.0L", "Graphite", 22000,
         VehicleStatus.available, True, today + timedelta(days=372), today + timedelta(days=41), today + timedelta(days=80), None),
        ("KBX 776P", "Mitsubishi", "Rosa", 2021, "Bus", "Diesel", "Manual", 30, "4.2L", "White", 54000,
         VehicleStatus.in_service, True, today + timedelta(days=440), today + timedelta(days=390), today + timedelta(days=13), james.id),
        ("KCA 339W", "Toyota", "Land Cruiser", 2021, "SUV", "Diesel", "Automatic", 8, "4.5L V8", "Graphite", 48320,
         VehicleStatus.available, True, today + timedelta(days=117), today + timedelta(days=258), today + timedelta(days=38), james.id),
    ]

    vehicle_objs = []
    for row in vehicles_data:
        (plate, make, model, year, vtype, fuel, trans, seats, engine, color, odo,
         status, bookable, fit_exp, ins_exp, svc_due, drv_id) = row
        v = Vehicle(
            plate=plate, make=make, model=model, year=year, vehicle_type=vtype,
            fuel_type=fuel, transmission=trans, seating_capacity=seats,
            engine_size=engine, color=color, odometer_km=odo, status=status,
            bookable=bookable, fitness_expiry=fit_exp, insurance_expiry=ins_exp,
            next_service_date=svc_due, default_driver_id=drv_id,
            vin=f"VIN{plate.replace(' ', '')}DEMO01"
        )
        db.session.add(v)
        vehicle_objs.append(v)

    db.session.flush()
    v_kdg, v_kbz, v_kcj, v_kdd, v_kbx, v_kca = vehicle_objs

    # ── Status logs for KCA 339W ───────────────────────────────────────────────
    for sl in [
        VehicleStatusLog(vehicle_id=v_kca.id, changed_by_id=None, from_status=VehicleStatus.dispatched, to_status=VehicleStatus.available, reason="Trip completed — auto status update", changed_at=datetime(2024, 10, 22, 16, 30, tzinfo=timezone.utc)),
        VehicleStatusLog(vehicle_id=v_kca.id, changed_by_id=admin.id, from_status=VehicleStatus.available, to_status=VehicleStatus.dispatched, reason="Assigned to REQ-7802", changed_at=datetime(2024, 10, 22, 8, 0, tzinfo=timezone.utc)),
        VehicleStatusLog(vehicle_id=v_kca.id, changed_by_id=admin.id, from_status=VehicleStatus.in_service, to_status=VehicleStatus.available, reason="45,000 km service completed", changed_at=datetime(2024, 10, 10, 9, 0, tzinfo=timezone.utc)),
    ]:
        db.session.add(sl)

    # ── Maintenance logs ───────────────────────────────────────────────────────
    for ml in [
        MaintenanceLog(vehicle_id=v_kca.id, service_type="Oil Change", date_performed=date(2024, 10, 1), technician="AutoXpress Nairobi", cost_kes=12500, next_due_date=today - timedelta(days=2), logged_by_id=admin.id),
        MaintenanceLog(vehicle_id=v_kdg.id, service_type="Tyre Rotation", date_performed=date(2024, 10, 15), technician="MotoService Kenya", cost_kes=8000, next_due_date=today + timedelta(days=25), logged_by_id=admin.id),
        MaintenanceLog(vehicle_id=v_kbx.id, service_type="Battery Replacement", date_performed=date(2024, 10, 25), technician="AutoXpress Nairobi", cost_kes=18000, next_due_date=today + timedelta(days=90), logged_by_id=admin.id),
        MaintenanceLog(vehicle_id=v_kca.id, service_type="Brake Service", date_performed=date(2024, 11, 20), technician="AutoFix Ltd", cost_kes=28000, next_due_date=today + timedelta(days=365)),
        MaintenanceLog(vehicle_id=v_kca.id, service_type="General Service", date_performed=date(2024, 10, 10), technician="AutoCare Garage", cost_kes=45000, next_due_date=today + timedelta(days=350)),
    ]:
        db.session.add(ml)

    # ── Requests ───────────────────────────────────────────────────────────────
    dep = datetime.now(timezone.utc)
    req_data = [
        ("REQ-7810", sarah.id, "Nairobi CBD", "Logistics run", "fixed", dep + timedelta(hours=2), "normal", RequestStatus.approved, v_kdg.id),
        ("REQ-7811", john.id, "JKIA Terminal", "Executive pickup", "fixed", dep + timedelta(hours=4), "urgent", RequestStatus.pending, None),
        ("REQ-7812", mike.id, "JKIA Terminal 1A", "Board meeting", "fixed", dep + timedelta(days=1), "high", RequestStatus.dispatched, v_kca.id),
        ("REQ-7813", emily.id, "Westlands Office Park", "HR interviews", "flexible", dep + timedelta(days=1, hours=6), "normal", RequestStatus.rejected, None),
        ("REQ-7814", robert.id, "Karen Business Park", "IT equipment", "fixed", dep + timedelta(days=2), "normal", RequestStatus.pending, None),
        ("REQ-7815", grace.id, "Upper Hill, Nairobi", "Finance audit", "flexible", dep + timedelta(days=3), "high", RequestStatus.pending, None),
        ("REQ-7818", john.id, "Mombasa Road", "Delivery", "fixed", dep + timedelta(days=4), "normal", RequestStatus.approved, v_kca.id),
        ("REQ-7820", sarah.id, "Thika Road", "Site visit", "fixed", dep + timedelta(days=6), "normal", RequestStatus.pending, None),
        ("REQ-8041", sarah.id, "Westlands Office Park", "Meeting", "fixed", dep + timedelta(days=1), "normal", RequestStatus.approved, None),
        ("REQ-8053", robert.id, "Karen Business Park", "Delivery", "fixed", dep + timedelta(days=2), "normal", RequestStatus.approved, None),
    ]

    req_objs = {}
    for ref, req_id, dest, purp, btype, dep_at, pri, status, v_id in req_data:
        r = Request(
            ref=ref, requester_id=req_id, destination=dest, purpose=purp,
            booking_type=btype, departure_at=dep_at, priority=pri,
            status=status, vehicle_id=v_id,
            approved_by_id=admin.id if status in (RequestStatus.approved, RequestStatus.dispatched) else None,
            approved_at=datetime.now(timezone.utc) if status in (RequestStatus.approved, RequestStatus.dispatched) else None,
            rejection_reason="No vehicles available for the requested time." if status == RequestStatus.rejected else None,
            rejected_by_id=admin.id if status == RequestStatus.rejected else None,
        )
        db.session.add(r)
        req_objs[ref] = r

    db.session.flush()

    # ── Dispatches ─────────────────────────────────────────────────────────────
    dispatches = [
        Dispatch(request_id=req_objs["REQ-7812"].id, vehicle_id=v_kca.id, driver_id=james.id,
                 dispatched_at=datetime.now(timezone.utc) - timedelta(hours=3),
                 status=DispatchStatus.en_route),
        Dispatch(request_id=req_objs["REQ-7810"].id, vehicle_id=v_kdg.id, driver_id=peter.id,
                 dispatched_at=datetime.now(timezone.utc) - timedelta(hours=9),
                 returned_at=datetime.now(timezone.utc) - timedelta(hours=1),
                 status=DispatchStatus.returned),
    ]
    for d in dispatches:
        db.session.add(d)

    db.session.commit()
    print("Database seeded successfully!")
    print(f"   Admin login: admin@vrams.org / Password123!")
    print(f"   {len(vehicle_objs)} vehicles, {len(req_data)} requests, {len(dispatches)} dispatches")
