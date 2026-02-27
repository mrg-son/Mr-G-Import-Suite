import { motion } from 'framer-motion';

interface ModuleTransitionProps {
  type: 'freight' | 'devis' | 'orders' | 'dashboard' | 'settings';
  children: React.ReactNode;
}

const BoatSVG = () => (
  <motion.svg
    viewBox="0 0 120 40"
    className="absolute top-4 right-4 w-24 h-10 text-primary/20 pointer-events-none"
    initial={{ x: -140 }}
    animate={{ x: 0 }}
    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
  >
    <motion.path
      d="M10 30 Q20 10 40 20 L80 20 Q90 20 95 25 L100 30 Z"
      fill="currentColor"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1, delay: 0.3 }}
    />
    <motion.path
      d="M50 20 L50 5 L75 15 L50 15"
      fill="currentColor"
      opacity={0.6}
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.6 }}
      transition={{ delay: 0.5 }}
    />
    {/* Waves */}
    <motion.path
      d="M0 35 Q15 30 30 35 Q45 40 60 35 Q75 30 90 35 Q105 40 120 35"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.5, delay: 0.2 }}
    />
  </motion.svg>
);

const PlaneSVG = () => (
  <motion.svg
    viewBox="0 0 100 60"
    className="absolute top-4 right-4 w-20 h-12 text-or/20 pointer-events-none"
    initial={{ x: 100, y: 40, rotate: 0 }}
    animate={{ x: 0, y: 0, rotate: -15 }}
    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
  >
    <motion.path
      d="M10 40 L50 25 L45 20 L80 15 L50 25 L55 35 Z"
      fill="currentColor"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    />
    <motion.path
      d="M80 15 L95 10 L85 18 Z"
      fill="currentColor"
      opacity={0.7}
    />
  </motion.svg>
);

const ScaleSVG = () => (
  <motion.svg
    viewBox="0 0 80 80"
    className="absolute top-4 right-4 w-16 h-16 text-primary/15 pointer-events-none"
  >
    {/* Post */}
    <line x1="40" y1="15" x2="40" y2="70" stroke="currentColor" strokeWidth="2" />
    {/* Base */}
    <line x1="25" y1="70" x2="55" y2="70" stroke="currentColor" strokeWidth="2" />
    {/* Beam */}
    <motion.line
      x1="10" y1="25" x2="70" y2="25"
      stroke="currentColor" strokeWidth="2"
      initial={{ rotate: -10 }}
      animate={{ rotate: [0, 5, -3, 2, 0] }}
      transition={{ duration: 2, delay: 0.3 }}
      style={{ transformOrigin: '40px 25px' }}
    />
    {/* Left pan */}
    <motion.path
      d="M10 25 L5 40 L20 40 Z"
      fill="currentColor" opacity={0.5}
      animate={{ y: [0, 3, -2, 1, 0] }}
      transition={{ duration: 2, delay: 0.3 }}
    />
    {/* Right pan */}
    <motion.path
      d="M70 25 L60 40 L75 40 Z"
      fill="currentColor" opacity={0.5}
      animate={{ y: [0, -3, 2, -1, 0] }}
      transition={{ duration: 2, delay: 0.3 }}
    />
  </motion.svg>
);

const FeatherSVG = () => (
  <motion.svg
    viewBox="0 0 60 60"
    className="absolute top-4 right-4 w-14 h-14 text-or/20 pointer-events-none"
    initial={{ rotate: -30, opacity: 0 }}
    animate={{ rotate: 0, opacity: 1 }}
    transition={{ duration: 0.8, ease: 'easeOut' }}
  >
    <motion.path
      d="M45 5 Q40 20 30 30 Q20 40 10 50 L15 50 Q25 40 35 30 Q42 22 45 5 Z"
      fill="currentColor"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1 }}
    />
    <motion.line
      x1="10" y1="50" x2="50" y2="55"
      stroke="currentColor" strokeWidth="1"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5, delay: 0.8 }}
    />
  </motion.svg>
);

const MapSVG = () => (
  <motion.svg
    viewBox="0 0 120 60"
    className="absolute top-4 right-4 w-24 h-12 text-bleu-mer/20 pointer-events-none"
  >
    {/* Simplified continents */}
    <circle cx="35" cy="25" r="8" fill="currentColor" opacity={0.4} />
    <circle cx="75" cy="30" r="10" fill="currentColor" opacity={0.4} />
    {/* Route */}
    <motion.path
      d="M35 30 Q55 50 75 35"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeDasharray="4 3"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.5, delay: 0.3 }}
    />
    <motion.circle
      cx="35"
      cy="30"
      r="2"
      fill="currentColor"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.2 }}
    />
    <motion.circle
      cx="75"
      cy="35"
      r="2"
      fill="currentColor"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 1.5 }}
    />
  </motion.svg>
);

const svgMap = {
  freight: <BoatSVG />,
  devis: <FeatherSVG />,
  orders: <MapSVG />,
  dashboard: <ScaleSVG />,
  settings: null,
};

const ModuleTransition = ({ type, children }: ModuleTransitionProps) => {
  return (
    <motion.div
      key={type}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {svgMap[type]}
      {children}
    </motion.div>
  );
};

export default ModuleTransition;
