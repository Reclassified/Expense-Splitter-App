import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Groups from './components/Groups';
import CreateGroup from './components/CreateGroup';
import GroupDetails from './components/GroupDetails';
import Expenses from './components/Expenses';
import Balances from './components/Balances';
import CreateExpense from './components/CreateExpense';
import EditExpense from './components/EditExpense';
import ExpenseDetails from './components/ExpenseDetails';
import RecurringExpenses from './components/RecurringExpenses';
import CreateRecurringExpense from './components/CreateRecurringExpense';
import EditRecurringExpense from './components/EditRecurringExpense';
import Notifications from './components/Notifications';
import api from './api';
import './App.css';

function App() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');
  const [viewProps, setViewProps] = useState({});
  const [context, setContext] = useState({});
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
      setView('dashboard');
      fetchUnreadCount();
    }
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications');
      const unread = res.data.filter((n) => !n.is_read).length;
      setUnreadNotifications(unread);
    } catch (error) {
      // silent fail
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setView('login');
    setContext({});
    setUnreadNotifications(0);
  };

  const handleNavigate = (newView, props = {}) => {
    if (newView === 'group-details') {
      setContext({ ...context, group: props });
    }
    if (newView === 'dashboard') {
      // Force dashboard to refresh
    }
    setView(newView);
    setViewProps(props);
  };

  const renderView = () => {
    if (!user) {
      switch (view) {
        case 'register':
          return (
            <Register
              onLogin={handleLogin}
              onSwitchToLogin={() => setView('login')}
            />
          );
        default:
          return (
            <Login
              onLogin={handleLogin}
              onSwitchToRegister={() => setView('register')}
            />
          );
      }
    }

    switch (view) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'groups':
        return <Groups onNavigate={handleNavigate} />;
      case 'create-group':
        return <CreateGroup onBack={() => handleNavigate('groups')} />;
      case 'group-details':
        return (
          <GroupDetails
            group={context.group}
            onNavigate={handleNavigate}
            onBack={() => handleNavigate('groups')}
          />
        );
      case 'recurring-expenses':
        return (
          <RecurringExpenses
            group={context.group}
            onNavigate={handleNavigate}
            onBack={() => handleNavigate('group-details', context.group)}
          />
        );
      case 'create-recurring-expense':
        return (
          <CreateRecurringExpense
            group={context.group}
            onBack={() => handleNavigate('recurring-expenses', context.group)}
          />
        );
      case 'edit-recurring-expense':
        return (
          <EditRecurringExpense
            expense={viewProps}
            group={context.group}
            onBack={() => handleNavigate('recurring-expenses', context.group)}
          />
        );
      case 'expenses':
        return (
          <Expenses
            group={context.group}
            onNavigate={handleNavigate}
            onBack={() => handleNavigate('group-details', context.group)}
          />
        );
      case 'create-expense':
        return (
          <CreateExpense
            group={context.group}
            onBack={() => handleNavigate('expenses', context.group)}
          />
        );
      case 'edit-expense':
        return (
          <EditExpense
            expense={viewProps}
            group={context.group}
            onBack={() => handleNavigate('expenses', context.group)}
          />
        );
      case 'expense-details':
        return (
          <ExpenseDetails
            expense={viewProps}
            onBack={() => handleNavigate('expenses', context.group)}
          />
        );
      case 'balances':
        return (
          <Balances
            group={context.group}
            onBack={() => handleNavigate('group-details', context.group)}
          />
        );
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1>{t('Welcome to Splitter App')}</h1>
          <button onClick={() => i18n.changeLanguage('en')}>EN</button>
          <button onClick={() => i18n.changeLanguage('fr')}>FR</button>
        </div>
        {user && (
          <div className="header-right">
            <div
              className="notifications-icon"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              🔔
              {unreadNotifications > 0 && (
                <span className="badge">{unreadNotifications}</span>
              )}
            </div>
            {showNotifications && (
              <Notifications
                onMarkAsRead={() => fetchUnreadCount()}
                onNavigate={(view, props) => {
                  setShowNotifications(false);
                  handleNavigate(view, props);
                }}
              />
            )}
            <button onClick={handleLogout} className="btn btn-danger">
              Logout
            </button>
          </div>
        )}
      </header>
      <main className="main-content">{renderView()}</main>
    </div>
  );
}

export default App;
