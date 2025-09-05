import { motion } from 'framer-motion';

export default function Button({ children, variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-primary hover:bg-primary-light text-white',
    secondary: 'bg-tertiary hover:bg-tertiary-100 text-quinary',
  };

  return (
    <motion.button
      className={`w-full font-semibold text-base py-3 px-4 rounded-lg transition-colors ${variants[variant]} ${props.disabled ? 'opacity-20' : 'opacity-1'}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {props?.loader ? <div className="flex items-center justify-center ">
        <div className="w-6 h-6 border-2 border-t-2 border-white border-t-primary rounded-full animate-spin"></div>
      </div> : children}
    </motion.button>
  );
}