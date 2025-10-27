import { useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import SetupUsername from '../components/setup/SetupUsername';
import { routes } from '../routes/routes';
import { UserContext } from '../context/userContext';
import indexDBUtil from '../indexDB';
import toast from 'react-hot-toast';

export default function ImportWalletUsername() {
  const { setUserDetails } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { publickey, privatekey, mnemonics } = location.state || {};

  const handleUsernameSubmit = async (username) => {
    const validateUserName = await indexDBUtil.checkUserNameExists(username);
    if (validateUserName) {
      toast.error('Username already exists');
      return;
    }

    setUserDetails(prev => ({ ...prev, username }));
    navigate(routes.IMPORT_WALLET_NETWORK, {
      state: {
        publickey,
        privatekey,
        mnemonics,
        username
      }
    });
  };

  return (
    <Card>
      <div className="space-y-6 flex flex-col w-full h-full justify-center">
        <BackButton />
        <SetupUsername
          onSubmit={handleUsernameSubmit}
          isNewAccount={true}
          description="Enter a unique username for your imported wallet"
        />
      </div>
    </Card>
  );
}
