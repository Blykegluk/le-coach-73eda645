import { useOutlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cloneElement } from 'react';

interface AnimatedOutletProps {
  context?: Record<string, unknown>;
}

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.12 },
  },
};

/**
 * Animated outlet that wraps route changes in framer-motion transitions.
 * We use useOutlet() instead of <Outlet /> so we can control the element
 * and pass it as a child of AnimatePresence with the correct key.
 */
const AnimatedOutlet = ({ context }: AnimatedOutletProps) => {
  const location = useLocation();
  const outlet = useOutlet(context);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex-1"
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedOutlet;
