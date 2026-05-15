import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSnackbar } from "notistack";
import type { Vehicle, Dispatch, VramsRequest, VramsUser } from "../types/index";
import VehicleIllustration from "../components/VehicleIllustration";
import {
  vehiclePlateNumber,
  vehicleMake,
  vehicleModel,
  vehicleTypeLabel,
  vehicleFitnessExpiryDate,
  vehicleInsuranceExpiryDate,
  vehicleNextServiceDate,
  vehicleOdometerKm,
  vehicleStatusKey,
  vehicleIsBookable,
  vehicleVin,
} from "../utils/erdView";
import {
  useGetVramsDispatchPendingQuery,
  useGetVramsDriversQuery,
  useAssignVramsDispatchMutation,
  useUpdateVramsVehicleMutation,
} from "../VramsApi";

/* ── constants ─────────────────────────────────────────────────── */
const STATUS_COLOR: Record<string, string> = {
  available:      "#16a34a",
  dispatched:     "#2563eb",
  in_service:     "#d97706",
  out_of_service: "#dc2626",
};
const STATUS_LABEL: Record<string, string> = {
  available:      "Available",
  dispatched:     "En Route",
  in_service:     "In Service",
  out_of_service: "Out of Service",
};

/* ── tiny sub-components ────────────────────────────────────────── */
function ComplianceRow({ label, date }: { label: string; date?: string }) {
  if (!date) return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ fontSize: 13, color: "#6b7280" }}>{label}</span>
      <span style={{ fontSize: 13, color: "#d1d5db" }}>—</span>
    </div>
  );
  const days  = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  const color = days < 0 ? "#dc2626" : days < 30 ? "#d97706" : "#16a34a";
  const icon  = days < 0 ? "✕" : days < 30 ? "△" : "✓";
  const text  = new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ fontSize: 13, color: "#6b7280" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{icon} {text}</span>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f9fafb" }}>
      <span style={{ fontSize: 13, color: "#9ca3af" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{value}</span>
    </div>
  );
}

/* ── Quick-dispatch panel ───────────────────────────────────────── */
function QuickDispatchPanel({
  vehicle,
  onBack,
  onDone,
}: {
  vehicle: Vehicle;
  onBack: () => void;
  onDone: () => void;
}) {
  const plate = vehiclePlateNumber(vehicle);
  const make = vehicleMake(vehicle);
  const model = vehicleModel(vehicle);
  const { data: pendingRequests = [] } = useGetVramsDispatchPendingQuery();
  const { data: drivers          = [] } = useGetVramsDriversQuery();
  const [assignDispatch, { isLoading }] = useAssignVramsDispatchMutation();

  const [requestId, setRequestId] = useState<number | "">(
    pendingRequests.length === 1 ? pendingRequests[0].id : ""
  );
  const [driverId, setDriverId] = useState<number | "">(
    vehicle.default_driver?.id ?? ""
  );
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedReq = pendingRequests.find(r => r.id === requestId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requestId || !driverId) {
      setError("Please select both a request and a driver.");
      return;
    }
    setError(null);
    try {
      await assignDispatch({
        request_id: requestId as number,
        vehicle_id: vehicle.id,
        driver_id:  driverId  as number,
      }).unwrap();
      setSuccess(true);
      setTimeout(onDone, 1400);
    } catch (err: any) {
      setError(err?.data?.message ?? "Dispatch failed. Please try again.");
    }
  }

  const selectStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px",
    border: "1px solid #e2e8f0", borderRadius: 10,
    fontSize: 13, color: "#374151",
    background: "#f8fafc", outline: "none",
    appearance: "none" as any,
  };

  if (success) return (
    <div style={{ padding: "40px 24px", textAlign: "center" }}>
      <div style={{
        width: 60, height: 60, borderRadius: "50%",
        background: "#dcfce7", color: "#16a34a",
        fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 16px",
      }}>✓</div>
      <p style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#111827" }}>Dispatched!</p>
      <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
        {plate} has been dispatched successfully.
      </p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      {/* Panel header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "18px 24px", borderBottom: "1px solid #f3f4f6",
      }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            width: 32, height: 32, borderRadius: 8,
            border: "none", background: "#f1f5f9",
            cursor: "pointer", fontSize: 16, color: "#6b7280",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          ←
        </button>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#111827" }}>Quick Dispatch</p>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
            {plate} · {make} {model}
          </p>
        </div>
      </div>

      {/* Illustration strip */}
      <div style={{ background: "#f8fafc", padding: "12px 24px 8px" }}>
        <VehicleIllustration
          vehicleType={vehicle.vehicle_type}
          style={{ width: "100%", maxHeight: 72 }}
        />
      </div>

      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Request picker */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
            Assign to Request *
          </label>
          {pendingRequests.length === 0 ? (
            <div style={{
              padding: "12px 14px", borderRadius: 10, background: "#fef3c7",
              fontSize: 13, color: "#92400e", border: "1px solid #fde68a",
            }}>
              No pending approved requests at the moment.
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <select
                value={requestId}
                onChange={e => setRequestId(e.target.value ? Number(e.target.value) : "")}
                style={selectStyle}
              >
                <option value="">— Select a request —</option>
                {pendingRequests.map((r: VramsRequest) => (
                  <option key={r.id} value={r.id}>
                    #{r.ref} · {r.destination} ({r.requester?.name ?? "Unknown"})
                  </option>
                ))}
              </select>
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af" }}>▾</span>
            </div>
          )}
        </div>

        {/* Request detail preview */}
        {selectedReq && (
          <div style={{
            background: "#eff6ff", borderRadius: 10, padding: "12px 14px",
            borderLeft: "3px solid #2563eb", fontSize: 13,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontWeight: 700, color: "#1e3a8a" }}>#{selectedReq.ref}</span>
              <span style={{
                padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: "#dbeafe", color: "#1d4ed8",
              }}>{selectedReq.priority}</span>
            </div>
            <p style={{ margin: "2px 0", color: "#374151" }}>
              <strong>→</strong> {selectedReq.destination}
            </p>
            {selectedReq.purpose && (
              <p style={{ margin: "2px 0", color: "#6b7280" }}>{selectedReq.purpose}</p>
            )}
            <p style={{ margin: "4px 0 0", color: "#6b7280" }}>
              {new Date(selectedReq.departure_at).toLocaleString("en-GB", {
                weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
        )}

        {/* Driver picker */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
            Assign Driver *
          </label>
          <div style={{ position: "relative" }}>
            <select
              value={driverId}
              onChange={e => setDriverId(e.target.value ? Number(e.target.value) : "")}
              style={selectStyle}
            >
              <option value="">— Select a driver —</option>
              {drivers.map((d: VramsUser) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.driver_id_code ? ` (${d.driver_id_code})` : ""}
                </option>
              ))}
            </select>
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af" }}>▾</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 10,
            background: "#fef2f2", border: "1px solid #fecaca",
            fontSize: 13, color: "#dc2626",
          }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !requestId || !driverId}
          style={{
            padding: "12px 0",
            background: isLoading || !requestId || !driverId ? "#e2e8f0" : "#2563eb",
            color:      isLoading || !requestId || !driverId ? "#9ca3af" : "#fff",
            border: "none", borderRadius: 10,
            fontWeight: 800, fontSize: 15, cursor: isLoading || !requestId || !driverId ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {isLoading ? "Dispatching…" : "Dispatch Vehicle"}
        </button>
      </div>
    </form>
  );
}

/* ══════════════════════════════════════════════════════════════════
   VehicleProfileModal
══════════════════════════════════════════════════════════════════ */
interface Props {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  dispatch?: Dispatch;
}

export default function VehicleProfileModal({ open, onClose, vehicle, dispatch }: Props) {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [view, setView] = useState<"details" | "dispatch">("details");
  const [selectedDriverId, setSelectedDriverId] = useState<number | "">("");
  const { data: drivers = [] } = useGetVramsDriversQuery();
  const [updateVehicle, { isLoading: isReassigning }] = useUpdateVramsVehicleMutation();

  useEffect(() => {
    setSelectedDriverId(
      open && vehicle ? (dispatch?.driver?.id ?? vehicle.default_driver?.id ?? "") : ""
    );
  }, [open, vehicle, dispatch]);

  if (!open || !vehicle) return null;

  const plate = vehiclePlateNumber(vehicle);
  const make = vehicleMake(vehicle);
  const model = vehicleModel(vehicle);
  const typeLabel = vehicleTypeLabel(vehicle);
  const statusKey = vehicleStatusKey(vehicle);
  const fitnessExpiry = vehicleFitnessExpiryDate(vehicle);
  const insuranceExpiry = vehicleInsuranceExpiryDate(vehicle);
  const nextService = vehicleNextServiceDate(vehicle);
  const odometerKm = vehicleOdometerKm(vehicle);
  const bookable = vehicleIsBookable(vehicle);
  const vin = vehicleVin(vehicle);

  const statusColor = STATUS_COLOR[statusKey] ?? "#9ca3af";
  const statusLabel = STATUS_LABEL[statusKey] ?? statusKey;

  function handleClose() {
    setView("details");
    onClose();
  }

  async function handleReassignDriver() {
    if (!vehicle || !selectedDriverId) {
      enqueueSnackbar("Select a driver first.", { variant: "warning" });
      return;
    }
    try {
      await updateVehicle({ id: vehicle.id, default_driver_id: Number(selectedDriverId) }).unwrap();
      enqueueSnackbar(dispatch ? "Task reassigned to selected driver." : "Default driver updated.", { variant: "success" });
    } catch {
      enqueueSnackbar("Failed to update driver assignment.", { variant: "error" });
    }
  }

  return (
    /* Backdrop */
    <div
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, zIndex: 5000,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      {/* Modal card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 20,
          width: "100%",
          maxWidth: 520,
          maxHeight: "88vh",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {/* ══ DISPATCH VIEW ══ */}
        {view === "dispatch" ? (
          <QuickDispatchPanel
            vehicle={vehicle}
            onBack={() => setView("details")}
            onDone={handleClose}
          />
        ) : (
          /* ══ DETAILS VIEW ══ */
          <>
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg,#f8fafc 0%,#e0e7ff 100%)",
              borderRadius: "20px 20px 0 0",
              padding: "24px 24px 16px",
              position: "relative",
            }}>
              {/* Close */}
              <button
                onClick={handleClose}
                style={{
                  position: "absolute", top: 16, right: 16,
                  width: 32, height: 32, borderRadius: 8,
                  border: "none", background: "rgba(0,0,0,0.08)",
                  cursor: "pointer", fontSize: 16, color: "#6b7280",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                ✕
              </button>

              {/* Illustration */}
              <div style={{ marginBottom: 16 }}>
                <VehicleIllustration
                  vehicleType={vehicle.vehicle_type}
                  style={{ width: "100%", maxHeight: 100 }}
                />
              </div>

              {/* Plate + status */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 26, fontWeight: 900, fontFamily: "monospace", color: "#111827", letterSpacing: 2 }}>
                  {plate}
                </span>
                <span style={{
                  padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: statusColor + "20", color: statusColor,
                }}>
                  ● {statusLabel}
                </span>
                {bookable && (
                  <span style={{
                    padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: "#dbeafe", color: "#1d4ed8",
                  }}>
                    ✓ Bookable
                  </span>
                )}
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "#6b7280" }}>
                {make} {model} · {typeLabel}
                {vin ? ` · VIN: ${vin}` : ""}
              </p>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Active dispatch banner */}
              {dispatch && (
                <div style={{
                  background: "#eff6ff", borderRadius: 12, padding: "12px 16px",
                  borderLeft: "4px solid #2563eb",
                }}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Active Dispatch
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#374151" }}><strong>Driver:</strong> {dispatch.driver?.name ?? "—"}</span>
                    <span style={{ color: "#374151" }}><strong>→</strong> {dispatch.request?.destination ?? "—"}</span>
                  </div>
                </div>
              )}

              {/* Reassign task / default driver */}
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 14px" }}>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {dispatch ? "Reassign Task Driver" : "Assign Default Driver"}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value ? Number(e.target.value) : "")}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      fontSize: 13,
                      color: "#374151",
                      background: "#fff",
                      outline: "none",
                    }}
                  >
                    <option value="">— Select driver —</option>
                    {drivers.map((d: VramsUser) => (
                      <option key={d.id} value={d.id}>
                        {d.name}{d.driver_id_code ? ` (${d.driver_id_code})` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleReassignDriver}
                    disabled={isReassigning || !selectedDriverId}
                    style={{
                      padding: "10px 12px",
                      background: isReassigning || !selectedDriverId ? "#e2e8f0" : "#1d4ed8",
                      color: isReassigning || !selectedDriverId ? "#94a3b8" : "#fff",
                      border: "none",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: isReassigning || !selectedDriverId ? "not-allowed" : "pointer",
                    }}
                  >
                    {dispatch ? "Reassign" : "Assign"}
                  </button>
                </div>
              </div>

              {/* Specs */}
              <div>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Specifications
                </p>
                <SpecRow label="Make / Model" value={`${make} ${model}`.trim() || null} />
                <SpecRow label="Type" value={typeLabel} />
                <SpecRow label="Year" value={vehicle.year} />
                <SpecRow label="Odometer" value={odometerKm != null ? `${odometerKm.toLocaleString()} km` : null} />
              </div>

              {/* Compliance */}
              <div>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Compliance
                </p>
                <ComplianceRow label="Fitness Certificate" date={fitnessExpiry} />
                <ComplianceRow label="Insurance"           date={insuranceExpiry} />
                <ComplianceRow label="Next Service"        date={nextService} />
              </div>

              {/* Default driver */}
              {vehicle.default_driver && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "#f8fafc", borderRadius: 12, padding: "12px 16px",
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "#e0e7ff", color: "#4338ca",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 15, flexShrink: 0,
                  }}>
                    {vehicle.default_driver.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827" }}>{vehicle.default_driver.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                      Default Driver{vehicle.default_driver.driver_id_code ? ` · ${vehicle.default_driver.driver_id_code}` : ""}
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {vehicle.notes && (
                <div style={{ background: "#fefce8", borderRadius: 10, padding: "10px 14px" }}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#a16207", textTransform: "uppercase" }}>Notes</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#713f12" }}>{vehicle.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <button
                  onClick={() => { handleClose(); navigate(`/apps/vrams/vehicles/${vehicle.id}`); }}
                  style={{
                    flex: 1, padding: "11px 0",
                    background: "#2563eb", color: "#fff",
                    border: "none", borderRadius: 10,
                    fontWeight: 700, fontSize: 14, cursor: "pointer",
                  }}
                >
                  Full Profile →
                </button>
                <button
                  onClick={() => setView("dispatch")}
                  style={{
                    flex: 1, padding: "11px 0",
                    background: "#16a34a", color: "#fff",
                    border: "none", borderRadius: 10,
                    fontWeight: 700, fontSize: 14, cursor: "pointer",
                  }}
                >
                  Dispatch
                </button>
                <button
                  onClick={handleClose}
                  style={{
                    padding: "11px 16px",
                    background: "#f1f5f9", color: "#9ca3af",
                    border: "1px solid #e2e8f0", borderRadius: 10,
                    fontWeight: 700, fontSize: 14, cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
