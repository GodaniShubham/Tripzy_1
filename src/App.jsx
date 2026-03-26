import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AIPlanner from './pages/AIPlanner';
import Trips from './pages/Trips';
import Preferences from './pages/Preferences';
import Generating from './pages/Generating';
import Overview from './pages/Overview';
import Discover from './pages/Discover';
import Account from './pages/Account';
import AdminPanel from './pages/AdminPanel';
import { AuthProvider } from './components/AuthProvider';
import { trackAppVisit } from './lib/usageMetrics';

function App() {
  useEffect(() => {
    trackAppVisit();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ai-planner" element={<AIPlanner />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/preferences" element={<Preferences />} />
          <Route path="/generating" element={<Generating />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/s/:shareId" element={<Overview />} />
          <Route path="/account" element={<Account />} />
          <Route path="/dashboard" element={<Account />} />
          <Route path="/admin/*" element={<AdminPanel />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
