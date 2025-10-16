import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';

function MigrationIntro() {
    const navigate = useNavigate();

    const handleContinue = () => {
        navigate('/migration/passwords');
    };

    return (
        <Card>
            <div className="flex w-full h-full flex-col justify-center items-center py-5 px-6">
                <div className='flex items-center mb-6'>
                    <img
                        src="/images/xell-wallet.svg"
                        alt="Xell Wallet Logo"
                        style={{ width: '100px', height: 'auto' }}
                    />
                </div>

                <h1 className="text-2xl font-bold text-center text-senary mb-4">
                    Unified Password Update
                </h1>

                <div className="text-center text-sm text-quinary mb-8 space-y-2">
                    <p>We're upgrading to a single password for all your accounts.</p>
                    <p>You'll need to enter your current password for each account, then set one new password that works for all.</p>
                    <p>Note: Accounts with forgotten passwords will be removed.</p>
                </div>

                <button
                    onClick={handleContinue}
                    className="w-full bg-secondary hover:bg-primary text-quaternary font-semibold py-4 px-6 rounded-lg transition-colors"
                >
                    Continue
                </button>
            </div>
        </Card>
    );
}

export default MigrationIntro;
