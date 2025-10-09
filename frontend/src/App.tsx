import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Billing from './components/Billing';
import Settings from './components/Settings';

function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </Router>
      </ToastProvider>
    </LanguageProvider>
  );
}

export default App;