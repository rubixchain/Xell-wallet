import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Welcome from './pages/Welcome';
import CreateWallet from './pages/CreateWallet';
import ImportWallet from './pages/ImportWallet';
import VerifyPhrase from './pages/VerifyPhrase';
import RecoveryPhrase from './pages/RecoveryPhrase';
import SetupWallet from './pages/SetupWallet';
import WalletSuccess from './pages/WalletSuccess';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Settings from './pages/Settings';
import { routes } from './routes/routes';
import { UserProvider } from './context/userContext';
import { Toaster } from 'react-hot-toast';
import Login from './pages/login';
import { TransactionsProvider } from './context/transactionContext';
import ProtectedRoute from './routes/protectedroute';
import UseSessionTimeout from './sessiontimeout';
import indexDBUtil from './indexDB';
import TermsOfServices from './pages/termsofservices';
import PrivacyPolicy from './pages/privacypolicy';
import AddNetwork from './pages/AddNetwork';
import { updateVersion } from './utils';
import MigrationIntro from './pages/migration/MigrationIntro';
import MigrationPasswords from './pages/migration/MigrationPasswords';
import MigrationSetPassword from './pages/migration/MigrationSetPassword';
import NetworkMigration from './pages/migration/NetworkMigration';

function MigrationCheck() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    (async () => {
      const needsNetworkMigration = await indexDBUtil.needsNetworkMigration();
      if (needsNetworkMigration && location.pathname !== routes.NETWORK_MIGRATION) {
        navigate(routes.NETWORK_MIGRATION, { replace: true });
      }
    })();
  }, [navigate, location.pathname]);

  return null;
}

function App() {

  useEffect(() => {
    (async () => {
      let ls = localStorage.getItem("currentUser")
      ls = ls ? JSON.parse(ls) : null
      if (ls) {
        localStorage.setItem("currentUser", JSON.stringify({
          username: ls?.username,
          network: ls?.network
        }))
      }
      await indexDBUtil.encryptData()
      await updateVersion()
    })()
  }, []);


  return (
    <div >
      <TransactionsProvider>
          <BrowserRouter future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true, // Add this line
          }}>
            <MigrationCheck />
            <UserProvider>
              {/* <UseSessionTimeout /> */}
              {/* <DemoModeButton /> */}
              <Routes>
                <Route path={routes.HOME} element={<Layout />}>
                  {/* Migration routes */}
                  <Route path="/migration/intro" element={<MigrationIntro />} />
                  <Route path="/migration/passwords" element={<MigrationPasswords />} />
                  <Route path="/migration/set-password" element={<MigrationSetPassword />} />
                  <Route path={routes.NETWORK_MIGRATION} element={<NetworkMigration />} />

                  {/* Public routes */}
                  <Route path={routes.WELCOME} element={<Welcome />} />
                  <Route path={routes.CREATE_WALLET} element={<CreateWallet />} />
                  <Route path={routes.IMPORT_WALLET} element={<ImportWallet />} />
                  <Route path={routes.VERIFY_PHARSE} element={<VerifyPhrase />} />
                  <Route path={routes.RECOVERY_PHARSE} element={<RecoveryPhrase />} />
                  <Route path={routes.SETUP_WALLET} element={<SetupWallet />} />
                  <Route path={routes.SUCCESS} element={<WalletSuccess />} />
                  <Route path={routes.LOGIN} element={<Login />} />
                  <Route path={routes.TERMS_OF_SERVICES} element={<TermsOfServices />} />
                  <Route path={routes.PRIVACY_POLICY} element={<PrivacyPolicy />} />

                  {/* Protected routes */}
                  <Route path={routes.DASHBOARD} element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path={routes.HISTORY} element={
                    <ProtectedRoute>
                      <History />
                    </ProtectedRoute>
                  } />
                  <Route path={routes.SETTINGS} element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } />
                </Route>
              </Routes>
            </UserProvider>
          </BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#333',
                color: '#fff',
              },
            }}
          />
      </TransactionsProvider>
    </div>
  );
}

export default App;