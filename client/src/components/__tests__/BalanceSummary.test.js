import React from 'react';
import { render } from '@testing-library/react';
import BalanceSummary from '../BalanceSummary';

describe('BalanceSummary', () => {
  const summary = {
    totalExpenses: 123.45,
    totalPaid: 100.0,
    isBalanced: false,
  };

  it('renders correctly and matches snapshot', () => {
    const { container } = render(<BalanceSummary summary={summary} />);
    expect(container).toMatchSnapshot();
  });

  it('shows correct values and status', () => {
    const { getByText } = render(<BalanceSummary summary={summary} />);
    expect(getByText('Total Expenses:')).toBeInTheDocument();
    expect(getByText('$123.45')).toBeInTheDocument();
    expect(getByText('Total Paid:')).toBeInTheDocument();
    expect(getByText('$100.00')).toBeInTheDocument();
    expect(getByText('Status:')).toBeInTheDocument();
    expect(getByText('Unbalanced')).toBeInTheDocument();
  });
}); 