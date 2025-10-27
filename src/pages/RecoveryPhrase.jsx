import { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Button from '../components/Button';
import MnemonicDisplay from '../components/mnemonic/MnemonicDisplay';
import BackupOptions from '../components/BackupOptions';
import SecurityGuidelines from '../components/SecurityGuidelines';
import { download, printRecoveryPhrase } from '../utils/wallet';
import * as bip39 from 'bip39'
import { Buffer } from 'buffer';
import { routes } from '../routes/routes';
import { UserContext } from '../context/userContext';
import indexDBUtil from '../indexDB';
import toast from 'react-hot-toast';
import { EXECUTE_API } from '../utils';
import { WALLET_TYPES } from '../enums';
import { config, NETWORK_TYPES } from '../../config';
import NetworkNodeSelector from '../components/network/NetworkNodeSelector';


export default function RecoveryPhrase() {
  const { userDetails, setUserDetails, setIsUserLoggedIn, websiteInitiated, setWebsiteInitiated } = useContext(UserContext)

  const navigate = useNavigate();
  const [mnemonic, setMnemonic] = useState();
  const [loader, setLoader] = useState(false);
  const [showNetworkNodeSelector, setShowNetworkNodeSelector] = useState(false);


  useEffect(() => {
    if (!userDetails?.username || !userDetails?.pin) {
      navigate(-1)
    }
  }, [userDetails])

  useEffect(() => {
    setMnemonic(bip39.generateMnemonic(256));
  }, []);

  const handleCopy = async () => {
    toast.success('Copied to clipboard')
    await navigator.clipboard.writeText(mnemonic);
  };

  const handleContinue = async () => {
    navigate(routes.VERIFY_PHARSE, { state: { mnemonic } });
  };

  const onSkip = async () => {
    setShowNetworkNodeSelector(true);
  };

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
    if (!network || !node || loader) return; // Prevent double creation

    try {
      setLoader(true);
      indexDBUtil.storeNetworkSetting({
        network: network.id,
        RPCUrl: node.url,
        name: network.name,
        tokenSymbol: network.tokenSymbol
      });

      const res = await indexDBUtil.savePrivateKeyV4('UserDetails', {
        ...userDetails,
        originalPhrase: mnemonic,
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
      navigate(routes.DASHBOARD);
    } catch (error) {
      setLoader(false);
      toast.error('Failed to create account');
    }
  };
  const handleDownload = () => {
    const content = `Recovery Phrase:\n\n${mnemonic}\n\nIMPORTANT:\n- Keep this phrase secret and secure\n- Never share it with anyone\n- Store it offline\n- Make multiple backups\n- Don't tamper the file`;
    download(content, 'recovery-phrase.txt')
  }

  return (
    <Card>
      <div className="space-y-6 py-6 flex flex-col w-full  justify-center">
        <BackButton />

        <div>
          <h1 className="text-[22px] font-bold text-gray-900 dark:text-white mb-2">
            Your Recovery Phrase
          </h1>
          <p className="text-quinary font-medium text-base dark:text-gray-300">
            Write down these 24 words in order and store them securely
          </p>
        </div>

        <MnemonicDisplay phrase={mnemonic} onCopy={handleCopy} handleDownload={handleDownload} />

        {/* <BackupOptions
          onDownload={() => {
            const content = `Recovery Phrase:\n\n${mnemonic}\n\nIMPORTANT:\n- Keep this phrase secret and secure\n- Never share it with anyone\n- Store it offline\n- Make multiple backups\n- Don't tamper the file`;
            download(content, 'recovery-phrase.txt')
          }}
          onPrint={() => printRecoveryPhrase(mnemonic)}
        /> */}

        <SecurityGuidelines />
        <div className='flex justify-between'>
          <button className='w-[46%] text-white rounded px-4 py-3 bg-primary' onClick={handleContinue}>
            Next
          </button>
          <button className='w-[46%] text-white rounded px-4 py-3 bg-gray-500' onClick={onSkip}>
            {loader ?
              <div className="flex justify-center items-center ">
                <div className="loader border-t-transparent border-solid border-2 border-white-500 rounded-full animate-spin w-6 h-6"></div>
              </div> :
              'Skip'}
          </button>
        </div>
      </div>

      {showNetworkNodeSelector && (
        <NetworkNodeSelector
          isOpen={showNetworkNodeSelector}
          onClose={() => setShowNetworkNodeSelector(false)}
          onSelect={handleNetworkNodeSelect}
          currentAccount={userDetails}
          allAccounts={[]}
          disableCurrentNetwork={false}
        />
      )}
    </Card>
  );
}