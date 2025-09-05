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
  const navigate = useNavigate()
  const location = useLocation()
  const state = location?.state


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
    setStep(2);
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
      indexDBUtil.setCurrentVersion()
      indexDBUtil.storeNetworkSetting({
        network: 1,
        RPCUrl: config?.RUBIX_MAINNET_BASE_URL,
        name: "Rubix Mainnet",
        tokenSymbol: NETWORK_TYPES.RBT
      })
      // Set network in userDetails for import case as well
      const updatedUserDetails = { ...userDetails, network: 1, tokenSymbol: NETWORK_TYPES.RBT };
      setUserDetails(updatedUserDetails);
      setLoader(true)
      let res = await indexDBUtil.storeToDB({ ...updatedUserDetails, publickey: state.publickey, privatekey: state?.privatekey, mnemonics: state?.mnemonics })
      setLoader(false)
      if (!res?.status) {
        toast.error(res?.message)
        return
      }

      toast.success('login success')
      setIsUserLoggedIn(true)
      let payload = {
        publickey: res?.data?.publickey,
        did: res?.data?.did,
        pin: res?.data?.pin,
        username: res?.data?.username,
        network: res?.data?.network || 1,  // Default to mainnet if not set
        tokenSymbol: NETWORK_TYPES.RBT
      }
      // localStorage.setItem('network', res?.data?.network)

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
        }
        catch (e) {

        }

      }
      await EXECUTE_API({
        data: {
          ...res?.data,
          tokenSymbol: NETWORK_TYPES.RBT
        },
        type: WALLET_TYPES.WALLET_SIGN_RESPONSE
      })
      setUserDetails(payload);

      navigate(routes.SUCCESS)
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

  return (
    <Card>
      <div className="space-y-6 flex flex-col w-full h-full justify-center">
        <BackButton onClick={handleBack} />

        <SetupProgress currentStep={step} totalSteps={3} />

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

          {step === 2 && (
            <motion.div
              key="pin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SetupPin onSubmit={handlePinSubmit} error={error} />
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
              <Network loader={loader} Continue={Continue} onChange={onChangeNetwork} />

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}


