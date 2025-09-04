import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Traits } from './pages/Traits';
import { Segments } from './pages/Segments';
import { Flags } from './pages/Flags';
import { Users } from './pages/Users';
import { UserDetail } from './pages/UserDetail';
import { Exports } from './pages/Exports';
import { Settings } from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

function AppInner() {
  const basename = import.meta.env.PROD ? '/frontend' : '';
  
  return (
    <Router basename={basename}>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/traits" element={<Traits />} />
          <Route path="/segments" element={<Segments />} />
          <Route path="/flags" element={<Flags />} />
          <Route path="/users" element={<Users />} />
          <Route path="/users/:userId" element={<UserDetail />} />
          <Route path="/exports" element={<Exports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
      <Toaster />
    </Router>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
