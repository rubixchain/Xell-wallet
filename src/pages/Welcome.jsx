import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import RubixLogo from '../components/RubixLogo';
import Button from '../components/Button';
import Card from '../components/Card';
import { routes } from '../routes/routes';
import { useContext, useEffect } from 'react';
import { UserContext } from '../context/userContext';
import { ROUTES } from '../utils/constants';

export default function Welcome() {
  const navigate = useNavigate();
  const { setWebsiteInitiated } = useContext(UserContext)

  const handleBack = () => {
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <Card>
      <div className="flex flex-col w-full h-full">
        {/* Header with back button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={handleBack}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <FiArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1"></div>
        </div>
        
        {/* Main content */}
        <div className="flex flex-col w-full h-full justify-center items-center space-y-6 px-4">
        <div className='flex items-center'>
          <img
            src="/images/xell-wallet.svg"
            alt="Xell Wallet Logo"
            style={{ width: '100px', height: 'auto' }}
          />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
            Welcome to Xell
          </h1>
          <p className="text-quinary font-medium dark:text-gray-300">
            Your secure gateway to self-custodial crypto
          </p>
        </div>

        <div className="w-full space-y-4">
          <Button onClick={() => navigate(routes.CREATE_WALLET)}>
            Create New Wallet
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate(routes.IMPORT_WALLET)}
          >
            Import Existing Wallet
          </Button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          By continuing, you agree to our{' '}
          <a onClick={() => navigate('/termsofservices')} className="cursor-pointer text-blue-600 hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a onClick={() => navigate('/privacypolicy')} className="cursor-pointer text-blue-600 hover:underline">
            Privacy Policy
          </a>
        </p>
        </div>
      </div>
    </Card>
  );
}