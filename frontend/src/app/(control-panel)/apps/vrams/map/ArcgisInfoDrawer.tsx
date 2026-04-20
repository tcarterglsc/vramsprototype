import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ArcgisInfoDrawer — slides in from the top when visible.
 *
 * Props:
 *   showInfoDrawer (boolean) – controls visibility
 *   width          (string)  – optional, default '420px'
 *   duration       (number)  – animation duration in seconds
 *   children                 – content inside the drawer
 */
const ArcgisInfoDrawer = ({
  showInfoDrawer,
  width = "420px",
  duration = 0.3,
  children,
}: {
  showInfoDrawer: boolean;
  width?: string;
  duration?: number;
  children: React.ReactNode;
}) => {
  return (
    <AnimatePresence>
      {showInfoDrawer && (
        <motion.div
          key="infoDrawer"
          initial={{ y: "-100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ type: "tween", duration }}
          style={{
            position: "absolute",
            top: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            width,
            background: "rgba(255, 255, 255, 0.97)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.18)",
            borderRadius: "12px",
            padding: "1rem 1.5rem",
            fontFamily: "Arial, sans-serif",
            zIndex: 2000,
            textAlign: "center",
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ArcgisInfoDrawer;
