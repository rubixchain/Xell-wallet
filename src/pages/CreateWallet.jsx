import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { FiShield } from 'react-icons/fi';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import Card from '../components/Card';
import { routes } from '../routes/routes';

export default function CreateWallet() {
  const navigate = useNavigate();
  const [checkboxes, setCheckboxes] = useState({
    responsible: false,
    secure: false,
    backup: false,
  });

  const allChecked = Object.values(checkboxes).every(Boolean);

  const handleCheckboxChange = (key) => {
    setCheckboxes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleContinue = () => {
    if (allChecked) {
      navigate(routes.SETUP_WALLET, { state: { allChecked } });
    }
  };

  return (
    <Card>

      <div className="space-y-6 flex flex-col w-full h-full  justify-center ">
        <BackButton />
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-tertiary rounded-xl flex items-center justify-center">
            <FiShield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-senary dark:text-white">
              Secure Your Wallet
            </h1>
            <p className="text-quinary font-medium text-base dark:text-gray-300">
              Please read carefully before proceeding
            </p>
          </div>
        </div>

        <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-900 font-semibold text-sm">
            Keep your mnemonic phrase private. Do not share it with anyone.
          </p>
        </div>

        <div className="space-y-4 text-sm">
          <label className="flex items-start cursor-pointer space-x-3">
            <input
              type="checkbox"
              checked={checkboxes.responsible}
              onChange={() => handleCheckboxChange('responsible')}
              className="mt-1"
            />
            <span className="text-senary font-medium dark:text-gray-300">
              I understand that I am responsible for securing my recovery phrase
            </span>
          </label>

          <label className="flex items-start cursor-pointer space-x-3">
            <input
              type="checkbox"
              checked={checkboxes.secure}
              onChange={() => handleCheckboxChange('secure')}
              className="mt-1 border-black"
            />
            <span className="text-senary font-medium dark:text-gray-300">
              I will keep my recovery phrase in a secure location
            </span>
          </label>

          <label className="flex cursor-pointer items-start space-x-3">
            <input
              type="checkbox"
              checked={checkboxes.backup}
              onChange={() => handleCheckboxChange('backup')}
              className="mt-1"
            />
            <span className="text-senary font-medium dark:text-gray-300">
              I will make a backup of my recovery phrase
            </span>
          </label>
        </div>

        <Button
          disabled={!allChecked}
          onClick={handleContinue}
        >
          Continue
        </Button>
      </div>
    </Card>
  );
}