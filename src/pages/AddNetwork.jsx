import React, { useState, useEffect } from 'react';
import ContentContainer from '../components/layout/ContentContainer';
import Header from '../components/dashboard/Header';
import Navigation from '../components/dashboard/Navigation';

const AddNetwork = () => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        swarmKey: '',
        portNumber: '',
    });
    const [availablePorts, setAvailablePorts] = useState([]);
    const [isVerifyingSwarmKey, setIsVerifyingSwarmKey] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);



    const showToast = (message, type = 'error') => {
        setToastMessage({ message, type });
        setTimeout(() => setToastMessage(null), 5000);
    };


    const verifySwarmKey = async (key) => {
        setIsVerifyingSwarmKey(true);
        try {
            // TODO: Replace with actual API endpoint
            const response = await fetch('/api/verify-swarm-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ swarmKey: key }),
            });
            const data = await response.json();

            if (!data.isValid) {
                showToast('Please enter a valid swarm key');
            }
            return data.isValid;
        } catch (error) {
           
            showToast('Failed to verify swarm key');
            return false;
        } finally {
            setIsVerifyingSwarmKey(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSwarmKeyBlur = async () => {
        if (formData.swarmKey) {
            await verifySwarmKey(formData.swarmKey);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate all fields are filled
        if (!formData.name || !formData.description || !formData.swarmKey || !formData.portNumber) {
            showToast('Please fill in all fields');
            return;
        }

        // Verify swarm key before submission
        const isSwarmKeyValid = await verifySwarmKey(formData.swarmKey);
        if (!isSwarmKeyValid) {
            return;
        }

        try {
            // TODO: Replace with actual API endpoint
            const response = await fetch('/api/add-network', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                showToast('Network added successfully', 'success');
                // Reset form
                setFormData({
                    name: '',
                    description: '',
                    swarmKey: '',
                    portNumber: '',
                });
            } else {
                throw new Error('Failed to add network');
            }
        } catch (error) {
          
            showToast('Failed to add network');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Header />
            <ContentContainer className="space-y-6 ">
                <main className=" pb-24 flex justify-center">
                    <div className="container mx-auto px-4 py-8 max-w-2xl">
                        {toastMessage && (
                            <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg ${toastMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                                } text-white`}>
                                {toastMessage.message}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <h1 className="text-2xl font-bold text-gray-800 mb-8">Add Network</h1>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Network Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter network name"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder="Enter network description"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Swarm Key <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="swarmKey"
                                        value={formData.swarmKey}
                                        onChange={handleInputChange}
                                        onBlur={handleSwarmKeyBlur}
                                        placeholder="Enter swarm key"
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isVerifyingSwarmKey ? 'border-yellow-500' : 'border-gray-300'
                                            }`}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Port Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="portNumber"
                                        value={formData.portNumber}
                                        onChange={handleInputChange}
                                        placeholder="Enter port number"
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isVerifyingSwarmKey ? 'border-yellow-500' : 'border-gray-300'
                                            }`}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!isVerifyingSwarmKey}
                                className={`w-full py-3 px-4 text-white font-medium rounded-lg ${!isVerifyingSwarmKey
                                    ? 'bg-secondary cursor-not-allowed'
                                    : 'bg-secondary  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                                    }`}
                            >
                                {isVerifyingSwarmKey ? 'Verifying...' : 'Add Network'}
                            </button>
                        </form>
                    </div>
                </main>
            </ContentContainer>
            <Navigation />
        </div>

    );
};

export default AddNetwork; 