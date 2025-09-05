import { createContext, useState } from "react";

export const TransactionsContext = createContext()

export const TransactionsProvider = ({ children }) => {
    const [transactionsData, setTransactionsData] = useState([])
    const values = {
        transactionsData,
        setTransactionsData
    }
    return (
        <TransactionsContext.Provider value={values}>
            {children}
        </TransactionsContext.Provider>
    )
}