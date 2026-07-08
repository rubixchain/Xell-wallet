import Header from '../components/dashboard/Header';
import HistoryHeader from '../components/history/HistoryHeader';
import HistoryFilters from '../components/history/HistoryFilters';
import TransactionList from '../components/history/TransactionList';
import { useContext, useEffect, useState } from 'react';
import { END_POINTS } from '../api/endpoints';
import { UserContext } from '../context/userContext';
import { useNavigate } from 'react-router-dom';
import { download } from '../utils/wallet';

export default function History({ isModal = false }) {
  const [tarnsactionsFilter, setTransactionsFilter] = useState([]);
  const { userDetails } = useContext(UserContext);
  const [displayedRange, setDisplayedRange] = useState({
    startDate: new Date("2024-12-02"),
    endDate: new Date(),
  });
  const [selectedType, setSelectedType] = useState("All");
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/dashboard");
  };

  const filterData = (data) => {
    if (!data?.length) {
      setTransactionsFilter([]);
      return;
    }

    const startEpoch = Math.floor(new Date(displayedRange.startDate).getTime() / 1000);
    const endEpoch = Math.floor(new Date(displayedRange.endDate).getTime() / 1000);

    const filteredData = data.filter((item) => {
      const inTimeRange = item.Epoch >= startEpoch && item.Epoch <= endEpoch;
      if (!inTimeRange) return false;

      const meetsTypeCheck = selectedType === "All" || item?.type === selectedType;
      if (!meetsTypeCheck) return false;

      // Filter by recipient/sender DID OR transaction ID.
      if (inputValue) {
        return item?.SenderDID?.includes(inputValue) ||
          item?.ReceiverDID?.includes(inputValue) ||
          item?.TransactionID?.includes(inputValue);
      }
      return true;
    });

    setTransactionsFilter(filteredData.sort((a, b) => b.Epoch - a.Epoch));
  };

  // Post-merge each Rubix network carries both RBT and FT activity, so history
  // fetches both and merges them into one list (deduped by TransactionID).
  const fetchAllTransactions = async () => {
    try {
      setIsLoading(true);
      const formatDate = (date) => date.toISOString().split('T')[0];

      const [rbtTxn, ftTxn] = await Promise.all([
        END_POINTS.get_rbt_transactions({ DID: userDetails?.did }),
        END_POINTS.get_ft_transactions({
          DID: userDetails?.did,
          StartDate: formatDate(displayedRange.startDate),
          EndDate: formatDate(displayedRange.endDate)
        })
      ]);

      const mapTxn = (txn) => ({
        ...txn,
        type: txn?.SenderDID === userDetails?.did ? "Sent" : "Received",
        Epoch: txn?.Epoch > 0 ? txn?.Epoch : Math.floor(new Date(txn.DateTime).getTime() / 1000)
      });

      const merged = [];
      if (rbtTxn?.status) {
        merged.push(...(rbtTxn?.TxnDetails
          ?.filter(t => t?.Mode === 0 || t?.Mode === 1)
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

      filterData(deduped.sort((a, b) => b.Epoch - a.Epoch));
    } catch (error) {
      setTransactionsFilter([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userDetails?.did) return;
    fetchAllTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedRange, selectedType, inputValue, userDetails?.did, userDetails?.network]);

  const downloadHistory = () => {
    if (!tarnsactionsFilter?.length) return;
    const headers = ['Date/Time', 'Type', 'Amount', 'Asset', 'Status', 'Sender DID', 'Receiver DID', 'Transaction ID'];
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = tarnsactionsFilter.map((tx) => [
      tx?.DateTime || (tx?.Epoch ? new Date(tx.Epoch * 1000).toISOString() : ''),
      tx?.type || '',
      tx?.Amount ?? '',
      tx?.Symbol || '',
      tx?.Status ? 'Success' : 'Failed',
      tx?.SenderDID || '',
      tx?.ReceiverDID || '',
      tx?.TransactionID || ''
    ].map(escape).join(','));
    const csv = [headers.map(escape).join(','), ...rows].join('\n');
    download(csv, `xell-transaction-history-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className={`${isModal ? "" : "min-h-screen bg-gray-50 dark:bg-gray-900"}`}>
      {!isModal && <Header />}

      <div className={`space-y-6 ${isModal ? "" : "p-4 sm:p-10"} w-full`}>
        <main className={`w-full ${isModal ? "" : "flex justify-center"}`}>
          <div className="w-full space-y-6 bg-white dark:bg-gray-800 shadow-xl p-4 transition-colors">

            {!isModal && (
              <button
                onClick={handleBack}
                className="inline-flex mb-4 items-center px-4 py-2 text-sm font-medium text-white bg-secondary rounded hover:bg-primary transition-colors"
              >
                ← Back to Dashboard
              </button>
            )}

            <HistoryHeader
              displayedRange={displayedRange}
              setDisplayedRange={setDisplayedRange}
              onDownload={downloadHistory}
              hasTransactions={tarnsactionsFilter?.length > 0}
            />

            <HistoryFilters
              selectedType={selectedType}
              setSelectedType={setSelectedType}
              inputValue={inputValue}
              setInputValue={setInputValue}
            />

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Loading transactions...
                  </p>
                </div>
              </div>
            ) : (
              <TransactionList tarnsactionsFilter={tarnsactionsFilter} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
