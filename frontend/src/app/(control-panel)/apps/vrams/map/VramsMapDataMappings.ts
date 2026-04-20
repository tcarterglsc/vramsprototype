/** ArcGIS field mappings and popup templates for VRAMS fleet vehicles */

export const vehicleMappings = [
  { name: "id",           type: "oid"    },
  { name: "plate",        type: "string" },
  { name: "make",         type: "string" },
  { name: "model",        type: "string" },
  { name: "vehicle_type", type: "string" },
  { name: "status",       type: "string" },
  { name: "driver_name",  type: "string" },
  { name: "destination",  type: "string" },
  { name: "year",         type: "integer"},
  { name: "color",        type: "string" },
];

export const vehicleTemplate = {
  title: "{plate}",
  content: `
    <b>Make / Model:</b> {make} {model} ({year})<br>
    <b>Type:</b> {vehicle_type}<br>
    <b>Color:</b> {color}<br>
    <b>Status:</b> {status}<br>
    <b>Driver:</b> {driver_name}<br>
    <b>Destination:</b> {destination}
  `,
};

export const hqMappings = [
  { name: "id",   type: "oid"    },
  { name: "name", type: "string" },
  { name: "type", type: "string" },
];

export const hqTemplate = {
  title: "{name}",
  content: `<b>Type:</b> {type}`,
};

/** Status → ArcGIS colour */
export const STATUS_COLORS: Record<string, string> = {
  available:       "#16a34a",
  dispatched:      "#2563eb",
  in_service:      "#d97706",
  out_of_service:  "#dc2626",
};

export const STATUS_LABELS: Record<string, string> = {
  available:      "Available",
  dispatched:     "En Route",
  in_service:     "In Service",
  out_of_service: "Offline",
};
