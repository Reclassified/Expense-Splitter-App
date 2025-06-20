import React from 'react';

const BalanceSummary = ({ summary }) => (
  <div className="summary-section">
    <h3>Group Summary</h3>
    <div className="summary-stats">
      <div className="stat-item">
        <span className="stat-label">Total Expenses:</span>
        <span className="stat-value">${summary.totalExpenses.toFixed(2)}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Total Paid:</span>
        <span className="stat-value">${summary.totalPaid.toFixed(2)}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Status:</span>
        <span
          className={`stat-value ${summary.isBalanced ? 'balanced' : 'unbalanced'}`}
        >
          {summary.isBalanced ? 'Balanced' : 'Unbalanced'}
        </span>
      </div>
    </div>
  </div>
);

export default BalanceSummary;
