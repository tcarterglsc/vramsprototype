import React, { useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Switch,
  FormControlLabel,
  Paper,
  Box,
  Divider,
  Collapse,
  IconButton,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LayersIcon from "@mui/icons-material/Layers";
import CloseIcon from "@mui/icons-material/Close";

interface VramsLayersPanelProps {
  showAvailable: boolean;
  setShowAvailable: (v: boolean) => void;
  showDispatched: boolean;
  setShowDispatched: (v: boolean) => void;
  showInService: boolean;
  setShowInService: (v: boolean) => void;
  showOffline: boolean;
  setShowOffline: (v: boolean) => void;
  showHq: boolean;
  setShowHq: (v: boolean) => void;
  counts: {
    available: number;
    dispatched: number;
    in_service: number;
    offline: number;
  };
}

export default function VramsLayersPanel({
  showAvailable,
  setShowAvailable,
  showDispatched,
  setShowDispatched,
  showInService,
  setShowInService,
  showOffline,
  setShowOffline,
  showHq,
  setShowHq,
  counts,
}: VramsLayersPanelProps) {
  const [visible, setVisible] = useState(true);

  return (
    <Paper
      elevation={6}
      sx={{
        position: "relative",
        top: 0,
        left: 0,
        width: 280,
        p: 1,
        borderRadius: 3,
        bgcolor: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(8px)",
        border: "1px solid #e2e8f0",
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={1.5}
        py={0.5}
        sx={{ cursor: "pointer" }}
        onClick={() => setVisible(!visible)}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <LayersIcon color="primary" />
          <Typography variant="subtitle1" fontWeight="bold">
            Fleet Layers
          </Typography>
        </Box>
        <IconButton size="small" color="primary">
          {visible ? <CloseIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Divider />

      <Collapse in={visible} timeout={400}>
        <Box sx={{ mt: 1 }}>
          <LayerSection title="Vehicle Status">
            <LayerToggle
              label="Available"
              dotColor="#16a34a"
              count={counts.available}
              checked={showAvailable}
              onChange={() => setShowAvailable(!showAvailable)}
            />
            <LayerToggle
              label="En Route"
              dotColor="#2563eb"
              count={counts.dispatched}
              checked={showDispatched}
              onChange={() => setShowDispatched(!showDispatched)}
            />
            <LayerToggle
              label="In Service"
              dotColor="#d97706"
              count={counts.in_service}
              checked={showInService}
              onChange={() => setShowInService(!showInService)}
            />
            <LayerToggle
              label="Offline"
              dotColor="#dc2626"
              count={counts.offline}
              checked={showOffline}
              onChange={() => setShowOffline(!showOffline)}
            />
          </LayerSection>

          <LayerSection title="Points of Interest">
            <LayerToggle
              label="Fleet HQ"
              dotColor="#1e3a8a"
              checked={showHq}
              onChange={() => setShowHq(!showHq)}
            />
          </LayerSection>
        </Box>
      </Collapse>
    </Paper>
  );
}

function LayerSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{ bgcolor: "transparent", "&:before": { display: "none" } }}
      expanded={open}
      onChange={() => setOpen(!open)}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography fontWeight="bold" variant="body2">
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, pl: 1, pr: 1 }}>{children}</AccordionDetails>
    </Accordion>
  );
}

function LayerToggle({
  label,
  dotColor,
  count,
  checked,
  onChange,
}: {
  label: string;
  dotColor: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      py={0.5}
      pl={0.5}
      pr={0.5}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            bgcolor: dotColor,
            flexShrink: 0,
          }}
        />
        <Typography variant="body2" sx={{ fontSize: "0.875rem" }}>
          {label}
        </Typography>
        {count !== undefined && (
          <Chip
            label={count}
            size="small"
            sx={{
              height: 18,
              fontSize: "0.7rem",
              bgcolor: dotColor + "22",
              color: dotColor,
              fontWeight: 700,
            }}
          />
        )}
      </Box>
      <Switch
        checked={checked}
        onChange={onChange}
        color="primary"
        size="small"
      />
    </Box>
  );
}
