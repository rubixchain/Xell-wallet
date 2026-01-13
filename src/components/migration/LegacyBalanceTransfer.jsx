import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiCheck, FiX, FiLoader } from 'react-icons/fi';
import { initiateProxyTransfer } from '../../utils/migration';
import { END_POINTS } from '../../api/endpoints';
import { config, getConfigPromise } from '../../../config';

const MIGRATION_STEPS = {
    CHECKING_BALANCE: 'checking_balance',
    TRANSFERRING: 'transferring',
    COMPLETE: 'complete',
    NO_BALANCE: 'no_balance',
    FAILED: 'failed'
};

const LegacyBalanceTransfer = ({ legacyDid, legacyPrivateKey, newDid, onComplete, onSkip }) => {
    const [currentStep, setCurrentStep] = useState(MIGRATION_STEPS.CHECKING_BALANCE);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [balance, setBalance] = useState(0);
    const [isRetrying, setIsRetrying] = useState(false);

    useEffect(() => {
        startTransfer();
    }, []);

    const startTransfer = async () => {
        try {
            setCurrentStep(MIGRATION_STEPS.CHECKING_BALANCE);
            setError(null);
            setProgress(30);

            await getConfigPromise();

            const accountInfo = await END_POINTS.get_account_info({ did: legacyDid });
            const legacyBalance = accountInfo?.account_info?.[0]?.rbt_amount || 0;
            setBalance(legacyBalance);

            if (legacyBalance <= 0) {
                setCurrentStep(MIGRATION_STEPS.NO_BALANCE);
                setProgress(100);
                setTimeout(() => onSkip(), 1500);
                return;
            }

            setCurrentStep(MIGRATION_STEPS.TRANSFERRING);
            setProgress(60);

            const result = await initiateProxyTransfer(legacyPrivateKey, legacyDid, newDid, config.RUBIX_MAINNET_BASE_URL);

            if (result.success) {
                setProgress(100);
                setCurrentStep(MIGRATION_STEPS.COMPLETE);
                setTimeout(() => onComplete(), 1500);
            } else {
                setError(result.message);
                setCurrentStep(MIGRATION_STEPS.FAILED);
            }
        } catch (err) {
            setError(err.message);
            setCurrentStep(MIGRATION_STEPS.FAILED);
        }
    };

    const handleRetry = async () => {
        setIsRetrying(true);
        setProgress(10);
        await startTransfer();
        setIsRetrying(false);
    };

    const getStepLabel = () => {
        switch (currentStep) {
            case MIGRATION_STEPS.CHECKING_BALANCE:
                return 'Checking legacy balance...';
            case MIGRATION_STEPS.TRANSFERRING:
                return 'Transferring balance...';
            case MIGRATION_STEPS.COMPLETE:
                return 'Transfer complete!';
            case MIGRATION_STEPS.NO_BALANCE:
                return 'No balance to transfer';
            case MIGRATION_STEPS.FAILED:
                return 'Transfer failed';
            default:
                return 'Processing...';
        }
    };

    const allSteps = [
        { step: MIGRATION_STEPS.CHECKING_BALANCE, label: 'Check legacy balance' },
        { step: MIGRATION_STEPS.TRANSFERRING, label: 'Transfer to new wallet' }
    ];

    const stepOrder = [MIGRATION_STEPS.CHECKING_BALANCE, MIGRATION_STEPS.TRANSFERRING, MIGRATION_STEPS.COMPLETE];

    return (
        <div className="flex flex-col h-full pt-4 pb-6">
            <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-xl ${
                    currentStep === MIGRATION_STEPS.COMPLETE || currentStep === MIGRATION_STEPS.NO_BALANCE
                        ? 'bg-tertiary'
                        : currentStep === MIGRATION_STEPS.FAILED
                            ? 'bg-red-100'
                            : 'bg-tertiary'
                }`}>
                    {currentStep === MIGRATION_STEPS.COMPLETE || currentStep === MIGRATION_STEPS.NO_BALANCE ? (
                        <FiCheck className="text-secondary" size={24} />
                    ) : currentStep === MIGRATION_STEPS.FAILED ? (
                        <FiX className="text-red-600" size={24} />
                    ) : (
                        <FiRefreshCw className="text-primary animate-spin" size={24} />
                    )}
                </div>
                <div>
                    <h2 className="font-semibold text-xl text-senary">Balance Migration</h2>
                    <p className="text-quinary text-sm">{getStepLabel()}</p>
                </div>
            </div>

            <div className="mb-6 p-4 bg-tertiary/50 rounded-lg border border-secondary/20">
                <p className="text-sm text-quinary mb-1">Migrating from legacy wallet</p>
                <p className="font-medium text-senary truncate text-sm">{legacyDid}</p>
            </div>

            <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-quinary">Progress</span>
                    <span className="font-medium text-senary">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ${
                            currentStep === MIGRATION_STEPS.FAILED
                                ? 'bg-red-500'
                                : currentStep === MIGRATION_STEPS.COMPLETE || currentStep === MIGRATION_STEPS.NO_BALANCE
                                    ? 'bg-secondary'
                                    : 'bg-primary'
                        }`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className="flex-1 space-y-2 mb-4">
                {allSteps.map(({ step, label }, index) => {
                    const currentIndex = stepOrder.indexOf(currentStep);
                    const stepIndex = stepOrder.indexOf(step);
                    const isComplete = currentIndex > stepIndex || currentStep === MIGRATION_STEPS.COMPLETE || currentStep === MIGRATION_STEPS.NO_BALANCE;
                    const isCurrent = step === currentStep;

                    return (
                        <div
                            key={step}
                            className={`flex items-center gap-3 p-2 rounded-lg ${
                                isComplete ? 'text-secondary' : isCurrent ? 'text-primary' : 'text-gray-400'
                            }`}
                        >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                isComplete ? 'bg-secondary/10' : isCurrent ? 'bg-primary/10' : 'bg-gray-100'
                            }`}>
                                {isComplete ? (
                                    <FiCheck size={14} />
                                ) : isCurrent ? (
                                    <FiLoader className="animate-spin" size={14} />
                                ) : (
                                    <span className="text-xs">{index + 1}</span>
                                )}
                            </div>
                            <span className="text-sm">{label}</span>
                        </div>
                    );
                })}
            </div>

            {balance > 0 && (currentStep === MIGRATION_STEPS.TRANSFERRING || currentStep === MIGRATION_STEPS.COMPLETE) && (
                <div className="bg-tertiary border border-secondary/30 rounded-lg p-3 mb-4">
                    <p className="text-xs text-quinary mb-1">Transferring</p>
                    <p className="text-lg text-secondary font-semibold">{balance} RBT</p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {currentStep === MIGRATION_STEPS.FAILED && (
                <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="w-full bg-secondary hover:bg-primary text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-disabled disabled:text-gray-500"
                >
                    {isRetrying ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                            Retrying...
                        </span>
                    ) : (
                        'Retry Transfer'
                    )}
                </button>
            )}

            {currentStep === MIGRATION_STEPS.COMPLETE && (
                <div className="text-center">
                    <p className="text-secondary font-medium">Balance transferred successfully!</p>
                    <p className="text-sm text-quinary mt-1">Continuing to wallet...</p>
                </div>
            )}

            {currentStep === MIGRATION_STEPS.NO_BALANCE && (
                <div className="text-center">
                    <p className="text-quinary">No balance found. Continuing...</p>
                </div>
            )}
        </div>
    );
};

export default LegacyBalanceTransfer;
