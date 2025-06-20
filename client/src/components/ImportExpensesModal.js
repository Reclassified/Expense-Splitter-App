import React, { useState } from 'react';
import api from '../api';
import './Expenses.css';

const ImportExpensesModal = ({ group, onBack, onImported }) => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file.');
      return;
    }
    setImporting(true);
    setError('');
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(`/expenses/group/${group.id}/import/csv`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setImportResult(response.data);
      onImported(); // Refresh parent component
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="create-expense-overlay">
      <div className="create-expense-modal">
        <div className="modal-header">
          <h3>Import Expenses from CSV</h3>
          <button onClick={onBack} className="close-btn">×</button>
        </div>
        
        <div className="form-group">
          <label>CSV File</label>
          <input type="file" accept=".csv" onChange={handleFileChange} />
          <p className="help-text">CSV must have headers: title, amount, paid_by, members, description (optional).</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {importResult && (
          <div className="import-result">
            <p>{importResult.message}</p>
            <p>Successfully imported: {importResult.successfulImports}</p>
            {importResult.errors.length > 0 && (
              <div>
                <p>Errors:</p>
                <ul>
                  {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button onClick={onBack} className="cancel-btn">Close</button>
          <button onClick={handleImport} className="create-btn" disabled={importing}>
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportExpensesModal; 