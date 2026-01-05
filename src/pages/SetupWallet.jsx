import { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/Card';
import SetupUsername from '../components/setup/SetupUsername';
import SetupPin from '../components/setup/SetupPin';
import ConfirmPin from '../components/setup/ConfirmPin';
import VerifyWalletPassword from '../components/setup/VerifyWalletPassword';
import SetupProgress from '../components/setup/SetupProgress';
import BackButton from '../components/BackButton';
import { validatePin } from '../utils/validation';
import indexDBUtil from '../indexDB';
import * as bip39 from 'bip39'
import { routes } from '../routes/routes';
import { UserContext } from '../context/userContext';
import { toast } from 'react-hot-toast'
import Network from '../components/setup/Network';
import NetworkSelector from '../components/network/NetworkSelector';
import { EXECUTE_API } from '../utils';
import { WALLET_TYPES } from '../enums';
import { config, NETWORK_TYPES } from '../../config';

export default function SetupWallet() {
  const { setUserDetails, userDetails, setIsUserLoggedIn, websiteInitiated, setWebsiteInitiated } = useContext(UserContext)
  const [step, setStep] = useState(1);
  const [loader, setLoader] = useState(false)
  const [error, setError] = useState('');
  const [hasUnifiedPassword, setHasUnifiedPassword] = useState(false);
  const [isCheckingUnified, setIsCheckingUnified] = useState(true);
  const navigate = useNavigate()
  const location = useLocation()
  const state = location?.state

  useEffect(() => {
    const checkUnifiedPassword = async () => {
      try {
        const hasUnified = await indexDBUtil.hasUnifiedPassword();
        setHasUnifiedPassword(hasUnified);
      } catch (e) {
        setHasUnifiedPassword(false);
      } finally {
        setIsCheckingUnified(false);
      }
    };
    checkUnifiedPassword();
  }, []);

  useEffect(() => {
    if (!state?.allChecked && state.type !== "import") {
      navigate(-1)
    }
  }, [state])

  const handleBack = () => {
    if (step === 1) {
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
    setUserDetails(prev => ({ ...prev, username }));

    if (state?.fromDashboard && userDetails?.pin) {
      if (state?.type === 'import') {
        await handleImportFromDashboard(username);
        return;
      }
      setUserDetails(prev => ({ ...prev, username, network: 1 }));
      navigate(routes.RECOVERY_PHARSE);
      return;
    }

    setStep(2);
  };

  const handleImportFromDashboard = async (username) => {
    try {
      setLoader(true);
      await indexDBUtil.setCurrentVersion(5);
      await indexDBUtil.storeNetworkSetting({
        network: 1,
        RPCUrl: config?.RUBIX_MAINNET_BASE_URL,
        name: "Rubix Mainnet",
        tokenSymbol: NETWORK_TYPES.RBT
      });
      const updatedUserDetails = { ...userDetails, username, network: 1, tokenSymbol: NETWORK_TYPES.RBT };
      setUserDetails(updatedUserDetails);

      const storeData = {
        ...updatedUserDetails,
        publickey: state.publickey,
        privatekey: state?.privatekey,
        mnemonics: state?.mnemonics
      };

      if (state?.isLegacyImport) {
        storeData.needsLegacyMigration = true;
      }

      let res = await indexDBUtil.storeToDB(storeData);
      setLoader(false);

      if (!res?.status) {
        toast.error(res?.message);
        return;
      }

      toast.success('Account imported successfully');
      setIsUserLoggedIn(true);

      const payload = {
        publickey: res?.data?.publickey,
        did: res?.data?.did,
        pin: res?.data?.pin,
        username: res?.data?.username,
        network: res?.data?.network || 1,
        tokenSymbol: NETWORK_TYPES.RBT,
        needsLegacyMigration: state?.isLegacyImport || false
      };

      localStorage.setItem('currency', JSON.stringify({ label: '$ USD - US Dollar', value: 'USD' }));
      localStorage.setItem("currentUser", JSON.stringify({
        username: res?.data?.username,
        network: res?.data?.network || 1
      }));

      sessionStorage.removeItem('previousUserDetails');

      await EXECUTE_API({
        data: { ...res?.data, tokenSymbol: NETWORK_TYPES.RBT },
        type: WALLET_TYPES.STORE_USER_DETAILS
      });

      setUserDetails(payload);

      if (state?.isLegacyImport) {
        navigate(routes.DASHBOARD, { state: { triggerLegacyMigration: true, username: res?.data?.username } });
      } else {
        navigate(routes.SUCCESS);
      }
    } catch (e) {
      setLoader(false);
      toast.error('Failed to import wallet');
    }
  };

  const handlePinSubmit = (pin) => {
    if (!validatePin(pin)) {
      setError('Please choose a more secure PIN');
      return;
    }
    setUserDetails(prev => ({ ...prev, pin }));
    setStep(3);
    setError('');
  };

  const handleVerifyExistingPassword = async (pin) => {
    setError('');
    const isValid = await indexDBUtil.validateUnifiedPassword(pin);
    if (!isValid) {
      setError('Invalid wallet password');
      return;
    }
    setUserDetails(prev => ({ ...prev, pin }));

    if (!state?.type) {
      setUserDetails(prev => ({ ...prev, pin, network: 1 }));
      navigate(routes.RECOVERY_PHARSE);
      return;
    }

    try {
      await indexDBUtil.setCurrentVersion(5);
      await indexDBUtil.storeNetworkSetting({
        network: 1,
        RPCUrl: config?.RUBIX_MAINNET_BASE_URL,
        name: "Rubix Mainnet",
        tokenSymbol: NETWORK_TYPES.RBT
      });
      const updatedUserDetails = { ...userDetails, pin, network: 1, tokenSymbol: NETWORK_TYPES.RBT };
      setUserDetails(updatedUserDetails);
      setLoader(true);

      const storeData = {
        ...updatedUserDetails,
        publickey: state.publickey,
        privatekey: state?.privatekey,
        mnemonics: state?.mnemonics
      };

      if (state?.isLegacyImport) {
        storeData.needsLegacyMigration = true;
      }

      let res = await indexDBUtil.storeToDB(storeData);
      setLoader(false);
      if (!res?.status) {
        toast.error(res?.message);
        return;
      }

      toast.success('Account created successfully');
      setIsUserLoggedIn(true);
      let payload = {
        publickey: res?.data?.publickey,
        did: res?.data?.did,
        pin: res?.data?.pin,
        username: res?.data?.username,
        network: res?.data?.network || 1,
        tokenSymbol: NETWORK_TYPES.RBT,
        needsLegacyMigration: state?.isLegacyImport || false
      };

      localStorage.setItem('currency', JSON.stringify({ label: '$ USD - US Dollar', value: 'USD' }));
      localStorage.setItem("currentUser", JSON.stringify({
        username: res?.data?.username,
        network: res?.data?.network || 1
      }));

      if (websiteInitiated?.type == WALLET_TYPES.WALLET_SIGN_REQUEST) {
        try {
          window.close();
          let result = await EXECUTE_API({
            data: { ...res?.data, tokenSymbol: NETWORK_TYPES.RBT },
            type: WALLET_TYPES.WALLET_SIGN_RESPONSE
          });
          if (result) {
            setWebsiteInitiated(null);
          }
          return;
        } catch (e) {}
      }

      await EXECUTE_API({
        data: { ...res?.data, tokenSymbol: NETWORK_TYPES.RBT },
        type: WALLET_TYPES.WALLET_SIGN_RESPONSE
      });
      setUserDetails(payload);

      if (state?.isLegacyImport) {
        navigate(routes.DASHBOARD, { state: { triggerLegacyMigration: true, username: res?.data?.username } });
      } else {
        navigate(routes.SUCCESS);
      }
    } catch (e) {
      setLoader(false);
    }
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
    try {
      await indexDBUtil.setCurrentVersion(5)
      await indexDBUtil.storeNetworkSetting({
        network: 1,
        RPCUrl: config?.RUBIX_MAINNET_BASE_URL,
        name: "Rubix Mainnet",
        tokenSymbol: NETWORK_TYPES.RBT
      })
      const updatedUserDetails = { ...userDetails, network: 1, tokenSymbol: NETWORK_TYPES.RBT };
      setUserDetails(updatedUserDetails);
      setLoader(true)

      const storeData = {
        ...updatedUserDetails,
        publickey: state.publickey,
        privatekey: state?.privatekey,
        mnemonics: state?.mnemonics
      };

      if (state?.isLegacyImport) {
        storeData.needsLegacyMigration = true;
      }

      let res = await indexDBUtil.storeToDB(storeData)
      setLoader(false)
      if (!res?.status) {
        toast.error(res?.message)
        return
      }

      toast.success('Account imported successfully')
      setIsUserLoggedIn(true)
      let payload = {
        publickey: res?.data?.publickey,
        did: res?.data?.did,
        pin: res?.data?.pin,
        username: res?.data?.username,
        network: res?.data?.network || 1,
        tokenSymbol: NETWORK_TYPES.RBT,
        needsLegacyMigration: state?.isLegacyImport || false
      }

      localStorage.setItem('currency', JSON.stringify({ label: '$ USD - US Dollar', value: 'USD' }))
      localStorage.setItem("currentUser", JSON.stringify({
        username: res?.data?.username,
        network: res?.data?.network || 1
      }))

      if (websiteInitiated?.type == WALLET_TYPES.WALLET_SIGN_REQUEST) {
        try {
          window.close()
          let result = await EXECUTE_API({
            data: {
              ...res?.data,
              tokenSymbol: NETWORK_TYPES.RBT
            },
            type: WALLET_TYPES.WALLET_SIGN_RESPONSE
          })
          if (result) {
            setWebsiteInitiated(null)
          }
          return
        } catch (e) {}
      }

      await EXECUTE_API({
        data: {
          ...res?.data,
          tokenSymbol: NETWORK_TYPES.RBT
        },
        type: WALLET_TYPES.WALLET_SIGN_RESPONSE
      })
      setUserDetails(payload);

      if (state?.isLegacyImport) {
        navigate(routes.DASHBOARD, { state: { triggerLegacyMigration: true, username: res?.data?.username } });
      } else {
        navigate(routes.SUCCESS);
      }
    } catch (e) {
      setLoader(false)
    }
  };

  const onChangeNetwork = (network) => {
    setUserDetails(prev => ({ ...prev, network }));
  }
  const Continue = async () => {

    setUserDetails(prev => {
      delete prev['confirmPin']
      return prev
    })
    navigate(routes.RECOVERY_PHARSE)
    return
  }

  const totalSteps = (state?.fromDashboard && userDetails?.pin) ? 1 : (hasUnifiedPassword ? 2 : 3);

  if (isCheckingUnified) {
    return (
      <Card>
        <div className="flex w-full h-full flex-col justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-quinary">Loading...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-6 flex flex-col w-full h-full justify-center">
        <BackButton onClick={handleBack} />

        <SetupProgress currentStep={step} totalSteps={totalSteps} />

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="username"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SetupUsername onSubmit={handleUsernameSubmit} />
            </motion.div>
          )}

          {step === 2 && hasUnifiedPassword && (
            <motion.div
              key="verify-password"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <VerifyWalletPassword onSubmit={handleVerifyExistingPassword} error={error} loader={loader} />
            </motion.div>
          )}

          {step === 2 && !hasUnifiedPassword && (
            <motion.div
              key="pin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SetupPin onSubmit={handlePinSubmit} error={error} />
            </motion.div>
          )}

          {step === 3 && !hasUnifiedPassword && (
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
              key="network"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Network loader={loader} Continue={Continue} onChange={onChangeNetwork} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}


