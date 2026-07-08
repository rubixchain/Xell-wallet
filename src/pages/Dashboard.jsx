import Header from '../components/dashboard/Header';
import BalanceCard from '../components/dashboard/BalanceCard';
import ActionButtons from '../components/dashboard/ActionButtons';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import DashboardTabs from '../components/dashboard/DashboardTabs';
import TokenList from '../components/dashboard/TokenList';
import { END_POINTS } from '../api/endpoints';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useContext } from 'react';
import { TransactionsContext } from '../context/transactionContext';
import { UserContext } from '../context/userContext';
import toast from 'react-hot-toast';

const DASHBOARD_TABS = [
  { id: 'fts', label: 'FTs' },
  { id: 'history', label: 'Transaction History' },
];

export default function Dashboard() {
  const { userDetails, setUserDetails, setSelectedTokens, selectedTokens } = useContext(UserContext);
  const [accountInfo, setAccountInfo] = useState({});
  const { transactionsData, setTransactionsData } = useContext(TransactionsContext);
  const [isTransactionCompleted, setIsTransactionCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState('fts');
  const [userPickedTab, setUserPickedTab] = useState(false);

  // FTs tab is shown first when the account owns any FT; otherwise Transaction
  // History leads. The data-driven default applies until the user picks a tab.
  const hasFts = (selectedTokens?.length || 0) > 0;
  const hasTxns = (transactionsData?.length || 0) > 0;
  const historyFirst = !hasFts && hasTxns;
  const orderedTabs = historyFirst ? [DASHBOARD_TABS[1], DASHBOARD_TABS[0]] : DASHBOARD_TABS;

  const handleTabChange = (id) => {
    setUserPickedTab(true);
    setActiveTab(id);
  };

  useEffect(() => {
    if (userPickedTab) return;
    setActiveTab(historyFirst ? 'history' : 'fts');
  }, [historyFirst, userPickedTab]);

  useEffect(() => {
    if (!userDetails?.username || !userDetails?.did) {
      const previousUserDetails = sessionStorage.getItem('previousUserDetails');
      if (previousUserDetails) {
        setUserDetails(JSON.parse(previousUserDetails));
        sessionStorage.removeItem('previousUserDetails');
      }
    }
  }, []);

  // Every network is now Rubix and serves both the native RBT balance and FTs
  // from the same node, so we always fetch both. RBT feeds the balance card,
  // FTs feed the FTs tab, and RBT + FT transactions merge into one history list.
  const loadAccountData = useCallback(async () => {
    const did = userDetails?.did;
    if (!did) return;

    const [rbtBal, rbtTxn, ftInfo, ftTxn] = await Promise.all([
      END_POINTS.get_rbt_balance(did),
      END_POINTS.get_rbt_transactions({ DID: did }),
      END_POINTS.get_ft_balance({ did }),
      END_POINTS.get_ft_transactions({
        DID: did,
        startDate: new Date("2024-12-02"),
        endDate: new Date()
      })
    ]);

    if (rbtBal?.status) {
      setAccountInfo({
        balance: rbtBal?.result?.balance,
        pledged: rbtBal?.result?.pledged,
        locked: rbtBal?.result?.locked
      });
    }

    setSelectedTokens(ftInfo?.ft_info || []);

    const mapTxn = (txn) => ({
      ...txn,
      type: txn?.SenderDID == did ? "Sent" : "Received",
      Epoch: txn?.Epoch > 0 ? txn?.Epoch : Math.floor(new Date(txn.DateTime).getTime() / 1000)
    });

    const merged = [];
    if (rbtTxn?.status) {
      merged.push(...(rbtTxn?.TxnDetails
        ?.filter(t => t?.Mode == 0 || t?.Mode == 1)
        ?.filter(t => t?.SenderDID !== t?.ReceiverDID)
        ?.map(mapTxn) || []));
    }
    if (ftTxn?.status) {
      merged.push(...(ftTxn?.TxnDetails
        ?.filter(t => t?.SenderDID !== t?.ReceiverDID)
        ?.map(mapTxn) || []));
    }

    const seen = new Set();
    const deduped = merged.filter(t => {
      const key = t?.TransactionID;
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setTransactionsData(deduped.sort((a, b) => b.Epoch - a.Epoch));
  }, [userDetails?.did, setSelectedTokens, setTransactionsData]);

  useLayoutEffect(() => {
    setAccountInfo({});
    setSelectedTokens([]);
    setTransactionsData([]);
  }, [userDetails?.did, setSelectedTokens, setTransactionsData]);

  useEffect(() => {
    if (!userDetails?.username || !userDetails?.did) return;
    loadAccountData().catch((e) => toast.error(typeof e === 'string' ? e : 'Failed to load account data'));
  }, [userDetails, isTransactionCompleted, loadAccountData]);

  const settleMountRef = useRef(false);
  useEffect(() => {
    if (!settleMountRef.current) { settleMountRef.current = true; return; }
    if (!userDetails?.did) return;
    const t3 = setTimeout(() => { loadAccountData().catch(() => { }); }, 3000);
    const t6 = setTimeout(() => { loadAccountData().catch(() => { }); }, 6000);
    return () => { clearTimeout(t3); clearTimeout(t6); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTransactionCompleted]);

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

      <main className="w-full h-full flex flex-col items-center overflow-y-auto">
        <div className='w-full h-full p-6 bg-white dark:bg-gray-800 transition-colors'>
          <BalanceCard setIsTransactionCompleted={setIsTransactionCompleted} accountInfo={accountInfo} />
          <div className="flex justify-around mt-4">
            <ActionButtons setIsTransactionCompleted={setIsTransactionCompleted} accountInfo={accountInfo} />
          </div>

          <DashboardTabs tabs={orderedTabs} activeTab={activeTab} onChange={handleTabChange} />

          <div className="mt-6">
            {activeTab === 'fts' ? (
              <div role="tabpanel" id="dashboard-panel-fts" aria-labelledby="dashboard-tab-fts">
                <TokenList />
              </div>
            ) : (
              <div role="tabpanel" id="dashboard-panel-history" aria-labelledby="dashboard-tab-history">
                <RecentTransactions transactionsData={transactionsData} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
