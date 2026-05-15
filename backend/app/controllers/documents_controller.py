import os
from uuid import uuid4

from flask import current_app, jsonify, request, send_from_directory
from flask_jwt_extended import jwt_required
from flask_smorest import Blueprint
from sqlalchemy import or_
from sqlalchemy.orm import joinedload
from werkzeug.utils import secure_filename

from app.domain.erd_projection import document_aggregate_erd, vehicle_block
from app.extensions import db
from app.models import Vehicle, VehicleDocument
from app.schemas import VehicleDocumentSchema
from app.services import vrams_common as vc

blp = Blueprint("VramsDocuments", __name__, url_prefix="/api/vrams")


@blp.route("/documents")
@jwt_required()
def list_fleet_documents():
    q = (
        vc.active_query(VehicleDocument)
        .join(Vehicle, VehicleDocument.vehicle_id == Vehicle.id)
        .filter(Vehicle.deleted_at.is_(None))
        .options(joinedload(VehicleDocument.vehicle))
    )
    if term := (request.args.get("q") or "").strip():
        pat = f"%{term}%"
        q = q.filter(
            or_(
                VehicleDocument.doc_type.ilike(pat),
                VehicleDocument.file_name.ilike(pat),
                Vehicle.plate.ilike(pat),
                Vehicle.make.ilike(pat),
                Vehicle.model.ilike(pat),
            )
        )
    docs = q.order_by(VehicleDocument.uploaded_at.desc()).all()
    schema = VehicleDocumentSchema()
    out = []
    for d in docs:
        row = schema.dump(d)
        v = d.vehicle
        row["vehicle"] = {"id": v.id, "plate": v.plate, "make": v.make, "model": v.model}
        row["erd"] = {**document_aggregate_erd(d), "Vehicle": vehicle_block(v)}
        out.append(row)
    return jsonify(out)


@blp.route("/vehicles/<int:v_id>/documents")
@jwt_required()
def get_vehicle_documents(v_id):
    docs = vc.active_query(VehicleDocument).filter_by(vehicle_id=v_id).order_by(VehicleDocument.uploaded_at.desc()).all()
    return jsonify(VehicleDocumentSchema(many=True).dump(docs))


@blp.route("/vehicles/<int:v_id>/documents", methods=["POST"])
@jwt_required()
@vc.require_roles("fleet_manager", "admin")
def upload_vehicle_document(v_id):
    from datetime import date as date_type

    vehicle = vc.active_or_404(Vehicle, v_id)
    doc_type = request.form.get("doc_type", "other")
    expires_at = request.form.get("expires_at")
    file = request.files.get("file")

    if not file:
        return jsonify({"message": "File is required"}), 400

    original_name = secure_filename(file.filename or "document")
    ext = os.path.splitext(original_name)[1].lower()
    if ext not in vc.ALLOWED_DOC_EXTENSIONS:
        return jsonify({"message": "Unsupported file type"}), 400
    if file.mimetype not in vc.ALLOWED_DOC_MIMETYPES:
        return jsonify({"message": "Unsupported mime type"}), 400
    saved_name = f"{vehicle.id}_{uuid4().hex}{ext}"
    upload_dir = current_app.config.get("UPLOAD_FOLDER")
    save_path = os.path.join(upload_dir, saved_name)
    file.save(save_path)

    doc = VehicleDocument(
        vehicle_id=vehicle.id,
        doc_type=doc_type,
        file_name=original_name,
        file_url=f"/api/vrams/vehicles/{vehicle.id}/documents/{saved_name}/download",
        expires_at=date_type.fromisoformat(expires_at) if expires_at else None,
        uploaded_by_id=vc.current_user().id,
    )
    db.session.add(doc)
    db.session.commit()
    vc.log_audit("vehicle_document_uploaded", "vehicle_document", doc.id, {"vehicle_id": vehicle.id, "doc_type": doc_type})
    return jsonify(VehicleDocumentSchema().dump(doc)), 201


@blp.route("/vehicles/<int:v_id>/documents/<path:file_name>/download")
@jwt_required()
def download_vehicle_document(v_id, file_name):
    vc.active_or_404(Vehicle, v_id)
    doc = (
        vc.active_query(VehicleDocument)
        .filter_by(vehicle_id=v_id)
        .filter(VehicleDocument.file_url.ilike(f"%/{file_name}/download"))
        .first()
    )
    if not doc:
        return jsonify({"message": "Document not found"}), 404
    return send_from_directory(current_app.config.get("UPLOAD_FOLDER"), file_name, as_attachment=True)
