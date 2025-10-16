import React from 'react';

function InvalidPasswordsModal({ invalidAccounts, onGoBack, onContinue }) {
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                zIndex: 9999
            }}
        >
            <div
                className="rounded-xl p-6 w-full"
                style={{
                    maxWidth: '400px',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    backgroundColor: 'white'
                }}
            >
                <h2 className="text-xl font-bold mb-4" style={{ color: '#000' }}>
                    Invalid Passwords Detected
                </h2>

                <p className="text-sm mb-4" style={{ color: '#666' }}>
                    The following accounts have incorrect passwords and will be permanently deleted if you continue:
                </p>

                <div className="rounded-lg p-4 mb-4" style={{ maxHeight: '120px', overflowY: 'auto', backgroundColor: '#f5f5f5' }}>
                    <ul className="space-y-2">
                        {invalidAccounts.map((username) => (
                            <li key={username} className="flex items-center gap-2" style={{ color: '#000' }}>
                                <span style={{ color: '#666' }}>@</span>
                                <span className="font-medium">{username}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6">
                    <p className="text-red-400 text-sm">
                        ⚠️ Warning: This action cannot be undone. Please double-check your passwords before proceeding.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onGoBack}
                        className="flex-1 border border-secondary text-secondary font-semibold py-3 px-4 rounded-lg transition-colors hover:bg-secondary/10"
                    >
                        Go Back
                    </button>
                    <button
                        onClick={onContinue}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                        Continue Anyway
                    </button>
                </div>
            </div>
        </div>
    );
}

export default InvalidPasswordsModal;
