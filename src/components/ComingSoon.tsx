import { motion } from 'framer-motion';

interface ComingSoonProps {
  title: string;
  description: string;
}

const ComingSoon = ({ title, description }: ComingSoonProps) => (
  <div className="max-w-3xl mx-auto px-4 pt-24 md:pt-20 pb-8">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-12 text-center"
    >
      <h1 className="text-3xl font-clash font-bold uppercase tracking-wider mb-3">{title}</h1>
      <p className="text-muted-foreground font-satoshi">{description}</p>
    </motion.div>
  </div>
);

export default ComingSoon;
