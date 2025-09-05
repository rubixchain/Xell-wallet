import { useRef, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { UserContext } from '../../context/userContext';
import Button from '../Button';

export default function Network({ onChange, loader, Continue }) {
    const { userDetails } = useContext(UserContext)
    const networks = [
        // {
        //     id: 'mainnet',
        //     label: 'Mainnet',
        //     description: 'Xell Main Network',
        //     color: 'bg-green-500',
        //     glow: 'shadow-green-500/20'
        // },
        {
            id: 'testnet',
            label: 'Testnet',
            description: 'Xell Test Network',
            color: 'bg-purple-500',
            glow: 'shadow-purple-500/20'
        }
    ];





    return (
        <div className="space-y-2">
            <p className='text-lg font-bold'>Select Your Network:</p>
            <div>
                {networks.map((network) => (
                    <motion.button
                        key={network.id}
                        onClick={() => onChange(network.id)}
                        className={`w-full px-4 py-3.5 flex items-center space-x-3 text-left ${userDetails?.network === network.id
                            ? 'bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }
                                transition-all duration-200`}
                        // whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className={`w-2.5 h-2.5 rounded-full ${network.color} shadow-lg ${network.glow}`} />
                        <div className="flex-1">
                            <div className="font-medium bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                                {network.label}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {network.description}
                            </div>
                        </div>
                        {/* {userDetails?.network === network.id && (
                            <motion.div
                                className="ml-auto p-1.5 rounded-full bg-primary/10"
                                layoutId="activeIndicator"
                            >
                                <div className="w-2 h-2 rounded-full bg-primary" />
                            </motion.div>
                        )} */}
                        <input className='cursor-pointer' style={{ width: 20, borderRadius: "50%", height: 20, accentColor: "#033500" }} type='checkbox' checked={userDetails?.network === network.id} />
                    </motion.button>
                ))}
            </div>

            <Button
                onClick={Continue}
                loader={loader}
                type="submit"
                disabled={loader}
            >
                {!loader ? 'Continue' : <div class="flex items-center justify-center ">
                    <div class="loader border-2 border-white-500 rounded-full w-6 h-6 animate-spin border-t-transparent"></div>
                </div>}
            </Button>
        </div>
    );
}