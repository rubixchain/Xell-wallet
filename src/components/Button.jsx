import { motion } from 'framer-motion';

export default function Button({ children, variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/90',
    secondary: 'bg-gray-500 text-white hover:bg-gray-600',
  };

  return (
    <motion.button
      className={`w-full font-semibold text-base py-3 px-4 rounded-lg transition-colors ${variants[variant]} ${props.disabled ? 'opacity-20' : 'opacity-100'} ${props.className || ''}`}
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