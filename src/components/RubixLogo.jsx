import { motion } from 'framer-motion';

export default function RubixLogo() {
  const gridVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cellVariants = {
    initial: {
      opacity: 0,
      scale: 0.5,
    },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15,
      },
    },
  };

  return (
    <motion.div
      className="grid grid-cols-3 gap-0.5 w-14 h-14 sm:w-18 sm:h-18  p-2 rounded-lg"
      variants={gridVariants}
      initial="initial"
      animate="animate"
    // whileHover={{ rotate: 180 }}
    // transition={{ duration: 0.6 }}
    >
      {[...Array(9)].map((_, i) => (
        <motion.div
          key={i}
          className="bg-yellow-300 cursor-pointer "
          variants={cellVariants}
        // whileHover={{ scale: 1.1 }}
        />
      ))}
    </motion.div>
  );
}