import React from "react";
import { motion } from "framer-motion";

const pageVariants = {
  initial: {
    opacity: 0,
    y: 12,
    filter: "blur(4px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.38,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(3px)",
    transition: {
      duration: 0.25,
      ease: "easeInOut",
    },
  },
};

export default function PageTransition({ children, className = "", style = {} }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      style={{ width: "100%", ...style }}
    >
      {children}
    </motion.div>
  );
}
