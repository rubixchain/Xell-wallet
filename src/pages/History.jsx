import Header from '../components/dashboard/Header';
import HistoryHeader from '../components/history/HistoryHeader';
import HistoryFilters from '../components/history/HistoryFilters';
import TransactionList from '../components/history/TransactionList';
import Navigation from '../components/dashboard/Navigation';
import ContentContainer from '../components/layout/ContentContainer';
import { useCallback, useContext, useEffect, useState } from 'react';
import { TransactionsContext } from '../context/transactionContext';
import { END_POINTS } from '../api/endpoints';
import { UserContext } from '../context/userContext';
import { NETWORK_TYPES } from '../../config';
import { useNavigate } from 'react-router-dom'; //  ADDED
import { normalizeEpoch } from '../utils/utils';

export default function History({ isModal = false }) {
  const [tarnsactionsFilter, setTransactionsFilter] = useState([]);
  const { transactionsData, setTransactionsData } = useContext(TransactionsContext);
  const { userDetails } = useContext(UserContext);
  const [displayedRange, setDisplayedRange] = useState({
    startDate: new Date("2024-12-02"),
    endDate: new Date(),
  });
  const [selectedType, setSelectedType] = useState("All");
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate(); //  ADDED

  const handleBack = () => {
    navigate("/dashboard"); //  CHANGE if you have a ROUTES constant
  };

  const filterData = (filterData) => {
    if (!filterData?.length) return;

    const endDate = new Date(displayedRange.endDate);
    const startDate = new Date(displayedRange.startDate);
    const startEpoch = Math.floor(startDate.getTime() / 1000);
    const endEpoch = Math.floor(endDate.getTime() / 1000);

    const filteredData = filterData.filter((item) => {
      const inTimeRange = item.Epoch >= startEpoch && item.Epoch <= endEpoch;
      const meetsTypeCheck = selectedType === "All" || item?.type === selectedType;
      const matchesInput =
        !inputValue || item?.SenderDID?.includes(inputValue) || item?.ReceiverDID?.includes(inputValue);
      return inTimeRange && meetsTypeCheck && matchesInput;
    });

    setTransactionsFilter(filteredData);
  };

  const triggerFtAPI = async () => {
    try {
      setIsLoading(true);
      const formatDate = (date) => date.toISOString().split("T")[0];



      const fttxn = await END_POINTS.get_ft_txn_by_did({
        DID: userDetails?.did,
        StartDate: formatDate(displayedRange.startDate),
        EndDate: formatDate(displayedRange.endDate),
      });


      if (!fttxn?.status) {

        setTransactionsFilter([]);
        return;
      }

      const transactions = fttxn?.TxnDetails?.map((txn) => ({
        ...txn,
        type: txn?.SenderDID === userDetails?.did ? "Sent" : "Received",
        Epoch: normalizeEpoch(txn?.Epoch, txn?.DateTime),
      })) || [];


      const filteredTxns = transactions.filter((item) => {
        const meetsTypeCheck = selectedType === "All" || item?.type === selectedType;
        const matchesInput =
          !inputValue || item?.SenderDID?.includes(inputValue) || item?.ReceiverDID?.includes(inputValue);
        return meetsTypeCheck && matchesInput;
      });


      const sortedTxns = filteredTxns.sort((a, b) => b.Epoch - a.Epoch);


      setTransactionsFilter(sortedTxns);
    } catch (error) {

      setTransactionsFilter([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRBTTransactions = async () => {
    try {
      setIsLoading(true);
      setTransactionsFilter([]);



      const transactionsApiData = await END_POINTS.get_transactions_info({
        DID: userDetails?.did,
      });



      if (transactionsApiData?.status) {
        const transactions =
          transactionsApiData?.TxnDetails?.filter((res) => res?.Mode === 0 || res?.Mode === 1)?.map(
            (txn) => ({
              ...txn,
              type: txn?.SenderDID === userDetails?.did ? "Sent" : "Received",
              Epoch: normalizeEpoch(txn?.Epoch, txn?.DateTime),
            })
          ) || [];



        // Apply filtering similar to FT transactions
        const filteredTxns = transactions.filter((item) => {
          const meetsTypeCheck = selectedType === "All" || item?.type === selectedType;
          const matchesInput =
            !inputValue || item?.SenderDID?.includes(inputValue) || item?.ReceiverDID?.includes(inputValue);
          return meetsTypeCheck && matchesInput;
        });



        const sortedTransactions = filteredTxns.sort((a, b) => b.Epoch - a.Epoch);


        setTransactionsFilter(sortedTransactions);
      } else {

        setTransactionsFilter([]);
      }
    } catch (error) {

      setTransactionsFilter([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Non-RBT networks (3, 4, etc.)
  useEffect(() => {


    if (!userDetails?.did || userDetails?.network === 1 || userDetails?.network === 2) return;
    triggerFtAPI();
  }, [displayedRange, selectedType, inputValue, userDetails?.did, userDetails?.network]);

  // RBT network (1, 2)
  useEffect(() => {


    if (!userDetails?.did || (userDetails?.network !== 1 && userDetails?.network !== 2)) return;
    fetchRBTTransactions();
  }, [displayedRange, selectedType, inputValue, userDetails?.did, userDetails?.network]);

  return (
    <div className={`${isModal ? "" : "min-h-screen bg-gray-50 dark:bg-gray-900"}`}>
      {/*  Show header only if not in modal */}
      {!isModal && <Header />}

      <div className={`space-y-6 ${isModal ? "" : "p-4 sm:p-10"} w-full`}>
        <main className={`w-full ${isModal ? "" : "flex justify-center"}`}>
          <div className="w-full space-y-6 bg-white dark:bg-gray-800 shadow-xl p-4 transition-colors">

            {/*  BACK BUTTON only if NOT modal */}
            {!isModal && (
              <button
                onClick={handleBack}
                className="inline-flex mb-4 items-center px-4 py-2 text-sm font-medium text-white bg-secondary rounded hover:bg-primary transition-colors"
              >
                ← Back to Dashboard
              </button>
            )}

            <div className="flex  sm:flex-row sm:items-center sm:justify-between gap-2">
              <HistoryHeader
                displayedRange={displayedRange}
                setDisplayedRange={setDisplayedRange}
              />

              <HistoryFilters
                selectedType={selectedType}
                setSelectedType={setSelectedType}
                inputValue={inputValue}
                setInputValue={setInputValue}
              />
            </div>
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
