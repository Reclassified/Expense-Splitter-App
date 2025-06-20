import React from 'react';

const getBalanceColor = (balance) => {
  if (balance > 0) return 'positive';
  if (balance < 0) return 'negative';
  return 'neutral';
};

const getBalanceText = (balance) => {
  if (balance > 0) return `+$${balance.toFixed(2)}`;
  if (balance < 0) return `-$${Math.abs(balance).toFixed(2)}`;
  return '$0.00';
};

const MemberList = ({ balances, currentUserId, onSettle }) => (
  <div className="balances-section">
    <h3>Member Balances</h3>
    <div className="balances-list">
      {balances.map((balance) => {
        const isCurrentUser = balance.userId === currentUserId;
        const canSettle = !isCurrentUser && balance.netBalance > 0;
        return (
          <div key={balance.userId} className="balance-card">
            <div className="balance-info">
              <h4>{balance.username}</h4>
              <div className="balance-details">
                <p>Paid: ${balance.totalPaid.toFixed(2)}</p>
                <p>Owed: ${balance.totalOwed.toFixed(2)}</p>
              </div>
            </div>
            <div
              className={`balance-amount ${getBalanceColor(balance.netBalance)}`}
            >
              {getBalanceText(balance.netBalance)}
            </div>
            {canSettle && (
              <button
                onClick={() => onSettle(balance)}
                className="settle-up-btn"
              >
                Settle Up
              </button>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export default MemberList;
