import React from 'react';
import { render } from '@testing-library/react';
import DebtSummary from '../DebtSummary';

describe('DebtSummary', () => {
  const creditors = [
    { userId: 1, username: 'Alice', netBalance: 50.25 },
  ];
  const debtors = [
    { userId: 2, username: 'Bob', netBalance: -50.25 },
  ];

  it('renders correctly and matches snapshot', () => {
    const { container } = render(
      <DebtSummary creditors={creditors} debtors={debtors} />
    );
    expect(container).toMatchSnapshot();
  });

  it('shows correct creditor and debtor info', () => {
    const { getByText } = render(
      <DebtSummary creditors={creditors} debtors={debtors} />
    );
    expect(getByText("Who's Owed Money")).toBeInTheDocument();
    expect(getByText('Alice')).toBeInTheDocument();
    expect(getByText('+$50.25')).toBeInTheDocument();
    expect(getByText('Who Owes Money')).toBeInTheDocument();
    expect(getByText('Bob')).toBeInTheDocument();
    expect(getByText('-$50.25')).toBeInTheDocument();
  });
}); 