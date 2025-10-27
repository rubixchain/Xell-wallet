import { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/Card';
import SetupUsername from '../components/setup/SetupUsername';
import SetupPin from '../components/setup/SetupPin';
import ConfirmPin from '../components/setup/ConfirmPin';
import SetupProgress from '../components/setup/SetupProgress';
import BackButton from '../components/BackButton';
import { validatePin } from '../utils/validation';
import indexDBUtil from '../indexDB';
import * as bip39 from 'bip39'
import { routes } from '../routes/routes';
import { UserContext } from '../context/userContext';
import { toast } from 'react-hot-toast'
// import Network from '../components/setup/Network';
import NetworkNodeSelector from '../components/network/NetworkNodeSelector';
import { EXECUTE_API } from '../utils';
import { WALLET_TYPES } from '../enums';
import { config, NETWORK_TYPES } from '../../config';

export default function SetupWallet() {
  const { setUserDetails, userDetails, setIsUserLoggedIn, websiteInitiated, setWebsiteInitiated } = useContext(UserContext)
  const [step, setStep] = useState(1);
  const [loader, setLoader] = useState(false)
  const [error, setError] = useState('');
  const navigate = useNavigate()
  const location = useLocation()
  const state = location?.state
  const isCreatingFromDashboard = state?.fromDashboard || false;


  useEffect(() => {
    if (!state?.allChecked && state.type !== "import") {
      navigate(-1)
    }
  }, [state])

  const handleBack = () => {
    if (step === 1) {
      // Clear username when going back from step 1
      setUserDetails(prev => ({ ...prev, username: '' }));
      navigate(-1);
    } else {
      setStep(prev => prev - 1);
      setError('');
    }
  };

  const handleUsernameSubmit = async (username) => {
    let validateUserName = await indexDBUtil.checkUserNameExists(username)
    if (validateUserName) {
      toast.error('Username already exists')
      return
    }

    const currentVersion = await indexDBUtil.getCurrentVersion();
    const hasUnifiedPassword = currentVersion?.version >= 5;

    if (hasUnifiedPassword && isCreatingFromDashboard) {
      // Only store username when we're sure we'll create the account
      setUserDetails(prev => ({ ...prev, username }));
      toast.success('Using your existing PIN');
      navigate(routes.RECOVERY_PHARSE);
      return;
    }

    // Don't store username in userDetails yet - just pass to next step
    setUserDetails(prev => ({ ...prev, username }));
    setStep(2);
  };

  const handlePinSubmit = async (pin) => {
    if (!validatePin(pin)) {
      setError('Please choose a more secure PIN');
      return;
    }

    const currentVersion = await indexDBUtil.getCurrentVersion();
    const hasUnifiedPassword = currentVersion?.version >= 5;

    if (hasUnifiedPassword) {
      const accounts = await indexDBUtil.getData();
      const hasOtherAccounts = accounts?.data && accounts.data.length > 0;

      if (hasOtherAccounts) {
        const isValid = await indexDBUtil.validateUnifiedPassword(pin);
        if (!isValid) {
          setError('PIN does not match your existing account PIN');
          return;
        }

        toast.success('PIN accepted. Creating new account...');
        setUserDetails(prev => ({ ...prev, pin }));
        if (!state?.type) {
          navigate(routes.RECOVERY_PHARSE);
          return;
        }
        navigate(routes.RECOVERY_PHARSE);
      } else {
        setUserDetails(prev => ({ ...prev, pin }));
        setStep(3);
      }
    } else {
      setUserDetails(prev => ({ ...prev, pin }));
      setStep(3);
    }
    setError('');
  };
  const handleConfirmPin = async (confirmPin) => {
    if (confirmPin !== userDetails.pin) {
      setError('PINs do not match');
      return;
    }
    if (!state?.type) {
      setUserDetails(prev => ({ ...prev, confirmPin, network: 1 }));
      navigate(routes.RECOVERY_PHARSE)
      return
    }

    setUserDetails(prev => ({ ...prev, confirmPin }));
    navigate(routes.IMPORT_WALLET_NETWORK, {
      state: {
        publickey: state.publickey,
        privatekey: state.privatekey,
        mnemonics: state.mnemonics
      }
    });
  };

  const onChangeNetwork = (network) => {
    setUserDetails(prev => ({ ...prev, network }));
  }

  const handleNetworkNodeSelect = async (network, node, accountExistsInNetwork) => {
    if (accountExistsInNetwork) {
      // Account already exists in this network, just switch to it
      toast.success(`Switched to existing account in ${network.name}`);
      navigate(routes.SUCCESS);
    } else {
      // Account doesn't exist, create new account with selected node
      await createAccount(network, node);
    }
  };

  const createAccount = async (network, node) => {
    if (!network || !node || loader) return;

    try {
      setLoader(true);
      
      // Store network settings
      indexDBUtil.storeNetworkSetting({
        network: network.id,
        RPCUrl: node.url,
        name: network.name,
        tokenSymbol: network.tokenSymbol
      });

      // Create account using existing logic
      const res = await indexDBUtil.storeToDBV4({
        username: userDetails.username,
        pin: userDetails.pin,
        publickey: userDetails.publickey,
        privatekey: userDetails.privatekey,
        mnemonics: userDetails.mnemonics,
        network: network.id,
        networkId: network.id,
        nodeId: node.id,
        nodeUrl: node.url,
        swarmKey: network.swarmKey
      });

      setLoader(false);

      if (!res || !res?.status) {
        toast.error('Failed to create account');
        return;
      }

      const hasUnifiedPassword = await indexDBUtil.hasUnifiedPassword();
      if (!hasUnifiedPassword) {
        await indexDBUtil.setUnifiedPasswordForSingleUser(userDetails.pin);
      }
      await indexDBUtil.setCurrentVersion(5);

      toast.success('Account created successfully');
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
        tokenSymbol: network.tokenSymbol,
      });
      navigate(routes.SUCCESS);
    } catch (error) {
      setLoader(false);
      toast.error('Failed to create account');
    }
  };
  const Continue = async () => {

    setUserDetails(prev => {
      delete prev['confirmPin']
      return prev
    })
    navigate(routes.RECOVERY_PHARSE)
    return
  }

  return (
    <Card>
      <div className="space-y-6 flex flex-col w-full h-full justify-center">
        <BackButton onClick={handleBack} />

        {!isCreatingFromDashboard && <SetupProgress currentStep={step} totalSteps={3} />}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="username"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SetupUsername onSubmit={handleUsernameSubmit} isNewAccount={isCreatingFromDashboard} />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="pin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SetupPin onSubmit={handlePinSubmit} error={error} clearPin={isCreatingFromDashboard} />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ConfirmPin loader={loader} onSubmit={handleConfirmPin} error={error} />
            </motion.div>
          )}
          {step === 4 && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <NetworkNodeSelector
                isOpen={true}
                onClose={() => setStep(3)}
                onSelect={handleNetworkNodeSelect}
                currentAccount={userDetails}
                allAccounts={[]}
                disableCurrentNetwork={false}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}


