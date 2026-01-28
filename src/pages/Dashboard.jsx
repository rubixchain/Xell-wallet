import Header from '../components/dashboard/Header';
import BalanceCard from '../components/dashboard/BalanceCard';
import ActionButtons from '../components/dashboard/ActionButtons';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import Navigation from '../components/dashboard/Navigation';
import ContentContainer from '../components/layout/ContentContainer';
import { END_POINTS } from '../api/endpoints';
import { useEffect, useState } from 'react';
import { useContext } from 'react';
import { TransactionsContext } from '../context/transactionContext';
import { UserContext } from '../context/userContext';
import toast from 'react-hot-toast';
import { FiList, FiClock } from 'react-icons/fi';
import History from './History';
import { NETWORK_TYPES } from "../../config.js"
import indexDBUtil from '../indexDB';
import { useNavigate } from 'react-router-dom';
import { routes } from '../routes/routes';

const Tabs = ({ activeTab, setActiveTab }) => (
  <div className="flex justify-between my-4 border-b border-gray-300">
    <button
      className={`flex w-[50%] justify-center text-base font-medium items-center px-4 py-3 ${activeTab === 'Tokens' ? 'text-secondary border-b-2 border-secondary' : 'text-gray-500'} focus:outline-none`}
      onClick={() => setActiveTab('Tokens')}
    >
      Tokens
    </button>
    <button
      className={`flex w-[50%] text-base justify-center font-medium items-center px-4 py-3 ${activeTab === 'History' ? 'text-secondary border-b-2 border-secondary' : 'text-gray-500'} focus:outline-none`}
      onClick={() => setActiveTab('History')}
    >
      History
    </button>
  </div>
);

export default function Dashboard() {

  const { userDetails, setUserDetails, setSelectedTokens, setIsUserLoggedIn } = useContext(UserContext)
  const [accountInfo, setAccountInfo] = useState({})
  const { transactionsData, setTransactionsData } = useContext(TransactionsContext)
  const [isTransactionCompleted, setIsTransactionCompleted] = useState(false)
  const [activeTab, setActiveTab] = useState('Tokens');
  const navigate = useNavigate();

  useEffect(() => {
    const checkPendingMigration = async () => {
      try {
        if (!userDetails?.username) {
          return;
        }
        const needsMigration = await indexDBUtil.accountNeedsDIDMigration(userDetails.username);
        if (needsMigration) {
          setIsUserLoggedIn(false);
          navigate(routes.LOGIN, { replace: true });
        }
      } catch (e) {
      }
    };
    checkPendingMigration();
  }, [userDetails?.username]);

  useEffect(() => {
    if (!userDetails?.username || !userDetails?.did) {
      const previousUserDetails = sessionStorage.getItem('previousUserDetails');
      if (previousUserDetails) {
        setUserDetails(JSON.parse(previousUserDetails));
        sessionStorage.removeItem('previousUserDetails');
      }
    }
  }, []);

  useEffect(() => {
    try {
      (async () => {
        if (!userDetails?.username || !userDetails?.did) {
          return
        }
        setAccountInfo({})
        setSelectedTokens([])
        setTransactionsData([])
        const networkValue = userDetails?.network ?? 1;
        if (networkValue == 1 || networkValue == 2) {
          const apiPromises = [
            END_POINTS.get_account_info({ did: userDetails?.did }),
            END_POINTS.get_transactions_info({ DID: userDetails?.did })
          ];

          if (userDetails?.legacyDid && networkValue === 1) {
            apiPromises.push(
              END_POINTS.get_transactions_info({ DID: userDetails?.legacyDid })
            );
          }

          const apiResults = await Promise.all(apiPromises);
          const accountinfoApiData = apiResults[0];
          const transactionsApiData = apiResults[1];
          const legacyTransactionsApiData = apiResults[2]; // undefined if no legacy DID

          let res = {}

          if (accountinfoApiData?.status) {
            res = { ...res, ...accountinfoApiData?.account_info[0] }
          }
          setAccountInfo(res)
          setSelectedTokens([])

          let allTransactions = [];

          if (transactionsApiData?.status) {
            const newTransactions = transactionsApiData?.TxnDetails?.filter(res => res?.Mode == 0 || res?.Mode == 1)?.map((txn) => ({
              ...txn,
              type: txn?.SenderDID == userDetails?.did ? "Sent" : "Received",
              isLegacy: false
            })) || []
            allTransactions = [...allTransactions, ...newTransactions];
          }

          if (legacyTransactionsApiData?.status) {
            const legacyTransactions = legacyTransactionsApiData?.TxnDetails?.filter(res => res?.Mode == 0 || res?.Mode == 1)?.map((txn) => ({
              ...txn,
              type: txn?.SenderDID == userDetails?.legacyDid ? "Sent" : "Received",
              isLegacy: true
            })) || []
            allTransactions = [...allTransactions, ...legacyTransactions];
          }

          setTransactionsData(allTransactions?.sort((a, b) => b.Epoch - a.Epoch) || [])
        }
        else {
          const [ftinfo, fttxn] = await Promise.all([
            END_POINTS.get_ft_info({ did: userDetails?.did }),
            END_POINTS.get_ft_txn_by_did({
              DID: userDetails?.did,
              startDate: new Date("2024-12-02"),
              endDate: new Date()
            })
          ])
          let ftinfoData = ftinfo?.ft_info
          if (networkValue === 3) {
            ftinfoData = ftinfoData?.filter(res => res?.creator_did == "bafybmifzar4metqgkm4ivtnvabmiouyi32y2x2ikpi5h4tflrfug2ghi5q")
          }

          if (!ftinfoData || ftinfoData.length === 0) {
            setAccountInfo({ ft_count: 0 });
          } else {
            
            setAccountInfo(ftinfoData[0]);
          }
          if (fttxn?.status) {
            let transactions = fttxn?.TxnDetails?.map((txn) => ({
              ...txn,
              type: txn?.SenderDID == userDetails?.did ? "Sent" : "Received",
            })) || []


            setTransactionsData(transactions.sort((a, b) => b.Epoch - a.Epoch)?.slice(0, 3))
          }


        }



      })()
    }
    catch (e) {
     
      toast.error(e)
    }
  }, [userDetails, isTransactionCompleted])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center"
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        width: 390,
        height: 600
      }}
    >
      <Header />

      <main className="w-full h-full flex flex-col items-center">
        <div className='w-full h-full p-6 bg-white dark:bg-gray-800 transition-colors '>

          <BalanceCard setIsTransactionCompleted={setIsTransactionCompleted} accountInfo={accountInfo} />
          <div className="flex justify-around mt-4">
            <ActionButtons setIsTransactionCompleted={setIsTransactionCompleted} accountInfo={accountInfo} />
          </div>

          <RecentTransactions transactionsData={transactionsData} />
        </div>
      </main>

    </div>
  );
}