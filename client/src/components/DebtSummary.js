import React from 'react';

const DebtSummary = ({ creditors, debtors }) => (
  <>
    {creditors.length > 0 && (
      <div className="creditors-section">
        <h3>Who's Owed Money</h3>
        <div className="creditors-list">
          {creditors.map((creditor) => (
            <div key={creditor.userId} className="creditor-item">
              <span className="creditor-name">{creditor.username}</span>
              <span className="creditor-amount positive">
                +${creditor.netBalance.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
    {debtors.length > 0 && (
      <div className="debtors-section">
        <h3>Who Owes Money</h3>
        <div className="debtors-list">
          {debtors.map((debtor) => (
            <div key={debtor.userId} className="debtor-item">
              <span className="debtor-name">{debtor.username}</span>
              <span className="debtor-amount negative">
                -${Math.abs(debtor.netBalance).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
  </>
);

export default DebtSummary;
