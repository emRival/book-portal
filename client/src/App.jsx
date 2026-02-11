import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const Reader = React.lazy(() => import('./pages/Reader'));
const BookDetail = React.lazy(() => import('./pages/BookDetail'));

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-bg-white">
    <div className="text-xs font-bold uppercase tracking-[0.3em] opacity-40 animate-pulse">Loading...</div>
  </div>
);

function App() {
  return (
    <Router>
      <div className="font-inter antialiased text-text-main bg-bg-white min-h-screen">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/read/:id" element={<Reader />} />
            <Route path="/book/:slug" element={<BookDetail />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin-dashboard"
              element={
                <PrivateRoute>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
