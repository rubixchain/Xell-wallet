import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
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
  const [isMigrating, setIsMigrating] = React.useState(false);

  useEffect(() => {
    (async () => {
      const needsNetworkMigration = await indexDBUtil.needsNetworkMigration();
      if (needsNetworkMigration) {
        setIsMigrating(true);
        try {
          const { migrateToNetworkStructure } = await import('./indexDB/migration');
          await migrateToNetworkStructure();
          setIsMigrating(false);
        } catch (error) {
          console.error('Migration failed:', error);
          setIsMigrating(false);
        }
      }
    })();
  }, []);

  if (isMigrating) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #10b981',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#374151', fontSize: '16px', fontWeight: '600' }}>
            Updating your wallet...
          </p>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
            Please wait a moment
          </p>
        </div>
      </div>
    );
  }

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