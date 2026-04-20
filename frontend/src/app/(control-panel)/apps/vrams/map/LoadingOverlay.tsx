import React from "react";
import { CircularProgress, Typography, Box } from "@mui/material";

interface LoadingOverlayProps {
  layerLoading: boolean;
}

export default function LoadingOverlay({ layerLoading }: LoadingOverlayProps) {
  if (!layerLoading) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(255,255,255,0.75)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        borderRadius: "inherit",
      }}
    >
      <CircularProgress size={56} thickness={5} color="primary" />
      <Typography variant="h6" sx={{ mt: 2, color: "#333", fontWeight: 500 }}>
        Loading fleet data…
      </Typography>
    </Box>
  );
}
