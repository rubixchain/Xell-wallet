import React, { useState, useCallback, useRef } from 'react';
import { FiArrowLeft, FiUpload, FiFile, FiDownload } from 'react-icons/fi';
import * as bip39 from "bip39"
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { routes } from '../routes/routes';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import indexDBUtil from '../indexDB';
import { deriveKeysFromMnemonic } from '../utils/migration';
import { END_POINTS } from '../api/endpoints';
import { config, getConfigPromise } from '../../config';
import axios from 'axios';


const Header = () => {
  return (
    <div className="p-4 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <button className="text-gray-600 hover:text-gray-800">
          <FiArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-semibold">Back</h1>
      </div>
    </div>
  );
};

const ImportWallet = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [importedFile, setImportedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate()
  const location = useLocation()
  const fromDashboard = location.state?.fromDashboard || false;

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleFileInput = (e) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (file.type !== 'text/plain') {
      alert('Please upload a .txt file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;

      // Extract the recovery phrase
      const start = content.indexOf('Recovery Phrase:') + 'Recovery Phrase:'.length;
      const end = content.indexOf('IMPORTANT:');

      if (start === -1 || end === -1 || end <= start) {
        return toast.error('Invalid file format');
      }

      const recoveryPhrase = content.slice(start, end).trim();

      if (!recoveryPhrase) {
        return toast.error('Recovery phrase is missing');
      }

      // toast.success('Recovery phrase uploaded successfully');
      setRecoveryPhrase(recoveryPhrase);
      setImportedFile(file.name);
    };

    reader.readAsText(file);
  };

  const handleContinue = async () => {
    let trimed = recoveryPhrase.trim()
    const words = trimed.split(/\s+/);
    if (words.length !== 24) {
      return toast.error('Invalid mnemonics')
    }
    let verifyMnemonic = bip39.validateMnemonic(trimed)
    if (!verifyMnemonic) {
      return toast.error('Invalid mnemonics')
    }

    setIsLoading(true);
    try {
      const keys = deriveKeysFromMnemonic(trimed);

      const isNewKeyExists = await indexDBUtil.checkPrivateKeyExists(keys.privateKey);
      const isLegacyKeyExists = await indexDBUtil.checkPrivateKeyExists(keys.legacyPrivateKey);

      if (isNewKeyExists?.status || isLegacyKeyExists?.status) {
        toast.error('This wallet already exists in your accounts')
        setIsLoading(false);
        return
      }

      let legacyDid = null;
      try {
        await getConfigPromise();

        const rubixNetworks = [
          { id: "1", baseUrl: config.RUBIX_MAINNET_BASE_URL },
          { id: "2", baseUrl: config.RUBIX_TESTNET_BASE_URL }
        ];

        for (const network of rubixNetworks) {
          if (!network.baseUrl) continue;

          try {
            const networkApi = axios.create({
              baseURL: network.baseUrl,
              headers: { 'Content-Type': 'application/json' }
            });

            const legacyDIDResponse = await networkApi.post('/request-did-for-pubkey', {
              public_key: keys.legacyCompressedPublicKey,
              network: network.id
            });
            const did = legacyDIDResponse?.data?.did;

            if (did) {
              legacyDid = did;
              break;
            }
          } catch (e) {
          }
        }
      } catch (e) {
      }

      toast.success('Phrase verified successfully')

      navigate(routes.SETUP_WALLET, {
        state: {
          type: 'import',
          publickey: keys.uncompressedPublicKey,
          privatekey: keys.privateKey,
          mnemonics: trimed,
          fromDashboard,
          legacyDid: legacyDid,
          legacyPrivateKey: legacyDid ? keys.legacyPrivateKey : null,
          needsLegacyMigration: !!legacyDid
        }
      })
    } catch (error) {
      toast.error('Failed to derive keys from mnemonic')
      setIsLoading(false);
    }
  };

  const handleRecoveryContinue = async () => {
    let res = await indexDBUtil.checkPrivateKeyExists(fileContent?.privatekey)
    if (res?.status) {
      toast.error(res?.message)
      return
    }
    toast.success(res.message)
    navigate(routes.SETUP_WALLET, { state: { type: 'import', publickey: fileContent?.publickey, privatekey: fileContent?.privatekey, fromDashboard } })
  }

  const renderStepOne = () => (
    <div className="mt-6">
      {/* <div
        className=" border-gray-200 bg-surface-low rounded-xl p-8 text-center"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center gap-1">
          <div
            onClick={() => {
              if (inputRef.current) {
                inputRef.current.click();
              }
            }}
            className='p-6 cursor-pointer rounded-full bg-green-100'>
            <FiUpload className="text-green-900" size={24} />
          </div>
          <p className="text-]black font-medium ">Drop your recovery  file here</p>
          <label className="cursor-pointer text-sm text-gray-500 hover:text-gray-600">
            or browse files
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".txt"
              onChange={handleFileInput}
            />
          </label>
        </div>
      </div> */}
      <button
        onClick={handleContinue}
        className={`w-full py-3 mt-5 rounded-lg font-medium bg-primary text-white ${importedFile && !isLoading
          ? 'opacity-1'
          : 'opacity-20'
          }`}
        disabled={!importedFile || isLoading}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
            Processing...
          </span>
        ) : (
          'Continue'
        )}
      </button>
    </div>
  );

  const renderStepTwo = () => (
    <div className="mt-6">

      <div className="space-y-4">
        <div>
          <label className="block text-base font-medium text-black text-gray-700 mb-2">
            Recovery Phrase
          </label>
          <textarea
            value={recoveryPhrase}
            onChange={(e) => setRecoveryPhrase(e.target.value)}
            className="w-full h-32 text-wrap p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your 24-word recovery phrase..."
          />
        </div>

        <button
          onClick={handleContinue}
          className={`w-full py-3 rounded-lg font-medium bg-primary text-white ${recoveryPhrase.trim() && !isLoading
            ? 'opacity-1'
            : 'opacity-20'
            }`}
          disabled={!recoveryPhrase.trim() || isLoading}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
              Processing...
            </span>
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  );

  return (
    <Card>
      <div className="space-y-6 py-10 pb-6 flex flex-col w-full  justify-center">
        <BackButton />

        <div className="">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-tertiary p-3 rounded-xl">
              <FiDownload className="text-black" size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-[22px]">Import Wallet</h2>
              <p className="text-quinary font-medium text-sm">Choose how you want to restore your wallet</p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => {
                if (inputRef?.current) {
                  inputRef.current?.click()
                }

                setActiveStep(1)
              }}
              className={`w-full text-left ${activeStep === 1 ? 'bg-yellow-50' : 'bg-gray-50'} p-4 rounded-xl`}
            >
              <div className="flex items-center gap-4">
                <div style={{ width: 40, height: 40 }} className=" bg-black/20 text-senary rounded-full flex items-center justify-center text-xl font-semibold">
                  1
                </div>
                {!importedFile ? <div className='flex-1'>
                  <h3 className="font-semibold text-black text-base">Import from File</h3>
                  <p className="text-sm mt-2 text-quinary font-medium ">Upload your recovery key file to restore your wallet</p>
                </div> : (
                  <div className="flex-1 p-3 items-center flex w-full justify-between rounded-lg">
                    <p className="font-semibold text-black text-sm">
                      File imported: {importedFile}
                    </p>
                    <p className='bg-green-500 p-1 px-2 text-white rounded-full text-sm'>✓</p>
                  </div>
                )
                }
                <input
                  key={importedFile}
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  accept=".txt"
                  onChange={handleFileInput}
                />
              </div>
            </button>
            <div className='text-center'>------------- or ---------------</div>
            <button
              onClick={() => {
                setRecoveryPhrase('')
                if (importedFile) {
                  setImportedFile(null)

                  // toast.error('Please remove recovery file')
                  // return
                }
                setActiveStep(2)
              }
              }
              className={`w-full text-left ${activeStep === 2 ? 'bg-yellow-50' : 'bg-gray-50'} p-4 rounded-xl`}
            >
              <div className="flex items-center gap-4">
                <div style={{ width: 40, height: 40 }} className="bg-black/20 font-semibold text-xl text-senary rounded-full  flex items-center justify-center ">
                  2
                </div>
                <div className='flex-1'>
                  <h3 className="font-semibold text-black text-base">Enter Recovery Phrase</h3>
                  <p className="mt-2 text-sm text-quinary font-medium">Type or paste your 24-word recovery phrase</p>
                </div>
              </div>
            </button>

            {activeStep === 1 && renderStepOne()}
            {activeStep === 2 && renderStepTwo()}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ImportWallet;