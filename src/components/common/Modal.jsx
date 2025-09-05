import React, { useEffect, useRef } from 'react';
import { FiXCircle } from 'react-icons/fi';

const Modal = ({ onClose, children }) => {
    const modalRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
            <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg h-[90vh] w-full max-w-md relative overflow-hidden">
                <div className="p-4 h-full flex flex-col">
                    <button 
                        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 z-10" 
                        onClick={onClose}
                    >
                        <FiXCircle className="w-5 h-5" />
                    </button>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal; 