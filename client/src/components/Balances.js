import React, { useState, useEffect } from 'react';
import api from '../api';
import SettleUpModal from './SettleUpModal';
import BalanceSummary from './BalanceSummary';
import MemberList from './MemberList';
import PaymentHistory from './PaymentHistory';
import DebtSummary from './DebtSummary';
import './Balances.css';

const Balances = ({ group, onBack }) => {
  const [balanceData, setBalanceData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleWithUser, setSettleWithUser] = useState(null);
  const [currentUser] = useState(JSON.parse(localStorage.getItem('user')));

  const fetchData = async () => {
    setLoading(true);
    try {
      const [balancesRes, paymentsRes] = await Promise.all([
        api.get(`/balances/group/${group.id}`),
        api.get(`/payments?groupId=${group.id}`),
      ]);
      setBalanceData(balancesRes.data);
      setPaymentHistory(paymentsRes.data);
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [group.id]);

  const handleSettleClick = (user) => {
    setSettleWithUser(user);
    setShowSettleModal(true);
  };

  if (loading) {
    return <div className="loading">Calculating balances...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!balanceData) {
    return <div className="error-message">Failed to load balances</div>;
  }

  if (showSettleModal) {
    return (
      <SettleUpModal
        group={group}
        currentUser={currentUser}
        debtor={settleWithUser}
        onBack={() => setShowSettleModal(false)}
        onSettled={() => {
          setShowSettleModal(false);
          fetchData();
        }}
      />
    );
  }

  return (
    <div className="balances-container">
      <div className="balances-header">
        <button onClick={onBack} className="back-btn">
          ← Back to Group
        </button>
        <h2>Balances - {group.name}</h2>
      </div>

      <BalanceSummary summary={balanceData.summary} />

      <MemberList
        balances={balanceData.balances}
        currentUserId={currentUser.id}
        onSettle={handleSettleClick}
      />

      <DebtSummary
        creditors={balanceData.summary.creditors}
        debtors={balanceData.summary.debtors}
      />

      <PaymentHistory payments={paymentHistory} />
    </div>
  );
};

export default Balances;
