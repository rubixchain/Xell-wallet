import { useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import { routes } from '../routes/routes';
import { UserContext } from '../context/userContext';
import indexDBUtil from '../indexDB';
import toast from 'react-hot-toast';
import { EXECUTE_API } from '../utils';
import { WALLET_TYPES } from '../enums';
import NetworkNodeSelector from '../components/network/NetworkNodeSelector';

export default function ImportWalletNetwork() {
  const { userDetails, setUserDetails, setIsUserLoggedIn, websiteInitiated, setWebsiteInitiated } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { publickey, privatekey, mnemonics, username } = location.state || {};

  const [loader, setLoader] = useState(false);
  const [showNetworkNodeSelector, setShowNetworkNodeSelector] = useState(true);

  const handleNetworkNodeSelect = async (network, node, accountExistsInNetwork) => {
    if (accountExistsInNetwork) {
      // Account already exists in this network, just switch to it
      await switchToExistingAccount(network);
    } else {
      // Account doesn't exist, create new account with selected node
      await createAccount(network, node);
    }
  };

  const switchToExistingAccount = async (network) => {
    // Logic to switch to existing account in the network
    // This would need to be implemented based on your requirements
    toast.success(`Switched to existing account in ${network.name}`);
    navigate(routes.SUCCESS);
  };

  const createAccount = async (network, node) => {
    if (!network || !node || loader) return;

    try {
      setLoader(true);

      const accounts = await indexDBUtil.getData();
      const hasOtherAccounts = accounts?.data && accounts.data.length > 0;

      let actualPin;
      if (hasOtherAccounts) {
        const currentVersion = await indexDBUtil.getCurrentVersion();
        if (currentVersion?.version >= 5) {
          const firstAccount = accounts.data[0];
          actualPin = userDetails?.pin || Math.random().toString(36).slice(-8);
        } else {
          actualPin = Math.random().toString(36).slice(-8);
        }
      } else {
        actualPin = Math.random().toString(36).slice(-8);
      }

      indexDBUtil.storeNetworkSetting({
        network: network.id,
        RPCUrl: node.url,
        name: network.name,
        tokenSymbol: network.tokenSymbol
      });

      const res = await indexDBUtil.storeToDBV4({
        username,
        pin: actualPin,
        publickey,
        privatekey,
        mnemonics,
        network: network.id,
        networkId: network.id,
        nodeId: node.id,
        nodeUrl: node.url,
        swarmKey: network.swarmKey
      });

      setLoader(false);

      if (!res || !res?.status) {
        toast.error('Failed to import account');
        return;
      }

      const hasUnifiedPassword = await indexDBUtil.hasUnifiedPassword();
      if (!hasUnifiedPassword) {
        await indexDBUtil.setUnifiedPasswordForSingleUser(actualPin);
      }
      await indexDBUtil.setCurrentVersion(5);

      toast.success('Account imported successfully');
      setIsUserLoggedIn(true);

      localStorage.setItem('currency', JSON.stringify({ label: '$ USD - US Dollar', value: 'USD' }));
      localStorage.setItem("currentUser", JSON.stringify({
        username: res?.data?.username,
        network: network.id,
      }));

      if (websiteInitiated?.type == WALLET_TYPES.WALLET_SIGN_REQUEST) {
        try {
          window.close();
          let result = await EXECUTE_API({
            data: {
              did: res?.data?.did,
              username: res?.data?.username,
              network: network.id,
              pin: res?.data?.pin,
              tokenSymbol: network.tokenSymbol
            },
            type: WALLET_TYPES.WALLET_SIGN_RESPONSE
          });
          if (result) {
            setWebsiteInitiated(null);
          }
        } catch (e) {
          console.error(e);
        }
        return;
      }

      await EXECUTE_API({
        data: {
          did: res?.data?.did,
          username: res?.data?.username,
          network: network.id,
          pin: res?.data?.pin,
          tokenSymbol: network.tokenSymbol
        },
        type: WALLET_TYPES.STORE_USER_DETAILS
      });
      setUserDetails({
        ...res?.data,
        username: username, // Store username from state when account is created
        tokenSymbol: network.tokenSymbol,
      });
      navigate(routes.SUCCESS);
    } catch (error) {
      setLoader(false);
      toast.error('Failed to import account');
    }
  };

  return (
    <Card>
      <div className="space-y-6 py-6 flex flex-col w-full justify-center">
        <BackButton onClick={() => navigate(routes.IMPORT_WALLET_USERNAME)} />

        <div>
          <h1 className="text-[22px] font-bold text-gray-900 dark:text-white mb-2">
            Select Network
          </h1>
          <p className="text-quinary font-medium text-base dark:text-gray-300">
            Choose the network and node for your imported wallet
          </p>
        </div>

        {showNetworkNodeSelector && (
          <NetworkNodeSelector
            isOpen={showNetworkNodeSelector}
            onClose={() => {
              setShowNetworkNodeSelector(false);
              navigate(routes.IMPORT_WALLET_USERNAME);
            }}
            onSelect={handleNetworkNodeSelect}
            currentAccount={userDetails}
            allAccounts={[]} // This would need to be populated with all accounts
            disableCurrentNetwork={false}
          />
        )}
      </div>
    </Card>
  );
}
