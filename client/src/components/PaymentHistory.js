import React from 'react';

const PaymentHistory = ({ payments }) => (
  <div className="payment-history-section">
    <h3>Payment History</h3>
    {payments.length === 0 ? (
      <p>No payments recorded yet.</p>
    ) : (
      <ul className="payment-history-list">
        {payments.map((p) => (
          <li key={p.id}>
            {p.payer_name} paid {p.payee_name} ${p.amount}
            <span>{new Date(p.payment_date).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default PaymentHistory;
