import { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiShield } from 'react-icons/fi';
import { motion } from 'framer-motion';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Button from '../components/Button';
import PhraseDisplay from '../components/verify/PhraseDisplay';
import { getVerificationIndices } from '../utils/verification';
import { routes } from '../routes/routes';
import indexDBUtil from '../indexDB';
import { UserContext } from '../context/userContext';
import { download } from '../utils/wallet';
import secp256k1 from 'secp256k1';
import toast from 'react-hot-toast';
import { EXECUTE_API } from '../utils';
import { WALLET_TYPES } from '../enums';
import { config, NETWORK_TYPES } from '../../config';
// import { generateSignature } from '../utils';

export default function VerifyPhrase() {
  const { setUserDetails, userDetails, setIsUserLoggedIn, websiteInitiated, setWebsiteInitiated } = useContext(UserContext)
  const navigate = useNavigate();
  const location = useLocation();
  const originalPhrase = location.state?.mnemonic || '';
  const phraseWords = originalPhrase.split(' ');

  const [verificationIndices, setVerificationIndices] = useState(() => getVerificationIndices(phraseWords?.length));
  const [inputValues, setInputValues] = useState({});
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [loader, setLoader] = useState(false)

  useEffect(() => {
    if (!originalPhrase) {
      navigate(-1)
    }
  }, [userDetails])


  const handleInputChange = (index, value) => {
    setInputValues(prev => ({ ...prev, [index]: value }));
    setError('');
  };
  const handleVerify = async () => {
    try {
      const allCorrect = verificationIndices.every(index =>
        inputValues[index]?.trim().toLowerCase() === phraseWords[index]
      );
      if (!allCorrect) {
        setError('One or more words are incorrect. Please check and try again.');
        return
      }
      setLoader(true)
      indexDBUtil.setCurrentVersion()
      indexDBUtil.storeNetworkSetting({
        network: userDetails?.network,
        RPCUrl: config?.RUBIX_MAINNET_BASE_URL,
        name: "Rubix Mainnet",
        tokenSymbol: NETWORK_TYPES.RBT
      })
      let res = await indexDBUtil.savePrivateKey('UserDetails', { ...userDetails, originalPhrase })
      setLoader(false)
      if (!res || !res?.status) {
        return
      }

      toast.success('Account created successfully')
      setIsUserLoggedIn(true)
      localStorage.setItem('currency', JSON.stringify({ label: '$ USD - US Dollar', value: 'USD' }))

      localStorage.setItem("currentUser", JSON.stringify({
        username: res?.data?.username,
        network: res?.data?.network || userDetails?.network || 1,
      }))
      if (websiteInitiated?.type == WALLET_TYPES.WALLET_SIGN_REQUEST) {
        try {
          window.close()
          let result = await EXECUTE_API({
            data: {
              did: res?.data?.did,
              username: res?.data?.username,
              network: res?.data?.network,
              pin: res?.data?.pin,
              tokenSymbol:NETWORK_TYPES.RBT
            }, type: WALLET_TYPES.WALLET_SIGN_RESPONSE
          })
          if (result) {
            setWebsiteInitiated(null)
          }
        }
        catch (e) {

        }
        return
      }
      await EXECUTE_API({
        data: {
          publickey: res?.data?.publickey,
          did: res?.data?.did,
          username: res?.data?.username,
          network: res?.data?.network,
          pin: res?.data?.pin,
          tokenSymbol: NETWORK_TYPES.RBT

        },
        type: WALLET_TYPES.STORE_USER_DETAILS
      });
      setUserDetails({
        publickey: res?.data?.publickey,
        did: res?.data?.did,
        username: res?.data?.username,
        network: res?.data?.network || userDetails?.network || 1,
        pin: res?.data?.pin,
        tokenSymbol: NETWORK_TYPES.RBT
      })
      navigate(routes.SUCCESS, { replace: true })
    }
    catch (e) {
      setLoader(false)

      // toast.error("account creation failed")
    }
  };
  const isComplete = verificationIndices.every(index => inputValues[index]?.trim());



  return (
    <Card>
      <div className="space-y-6 flex flex-col w-full  justify-center">
        <BackButton />

        <div className="flex items-center space-x-4">
          {/* <div className=" w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center" >
            <FiShield className="w-6 h-6 text-primary" />
          </div> */}
          <div className='flex-1'>
            <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">
              Verify Recovery Phrase
            </h1>
            <p className="text-quinary font-medium dark:text-gray-300">
              Fill in the missing words to verify your recovery phrase
            </p>
          </div>
        </div>

        <PhraseDisplay
          phrase={originalPhrase}
          verificationIndices={verificationIndices}
          inputValues={inputValues}
          onChange={handleInputChange}
          error={error}
        />

        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center mb-10 justify-center space-x-2 text-green-600 dark:text-green-400"
          >
            <FiShield className="w-5 h-5" />
            <span>Verification successful!</span>
          </motion.div>
        )}

        <Button
          onClick={handleVerify}
        // disabled={!isComplete || loader}
        >
          {loader ? <div className="flex justify-center items-center ">
            <div className="loader border-t-transparent border-solid border-2 border-white-500 rounded-full animate-spin w-6 h-6"></div>
          </div> :
            'Verify'}
        </Button>
      </div>
    </Card>
  );
}