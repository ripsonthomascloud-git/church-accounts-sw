import Modal from '../common/Modal';
import Button from '../common/Button';

const ReconcileModal = ({
  isOpen,
  onClose,
  bankStatement,
  transaction,
  onConfirm,
  loading
}) => {
  const formatDate = (date) => {
    if (!date) return 'N/A';
    if (date.toDate) {
      return date.toDate().toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (!bankStatement || !transaction) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Reconciliation">
      <div className="space-y-6">
        <p className="text-gray-700">
          Are you sure you want to reconcile this bank statement with the selected transaction?
        </p>

        {/* Bank Statement Details */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-3">Bank Statement</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700">Date:</span>
              <span className="font-medium text-blue-900">
                {formatDate(bankStatement.postingDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Description:</span>
              <span className="font-medium text-blue-900 truncate ml-4">
                {bankStatement.description}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Amount:</span>
              <span className={`font-bold ${
                bankStatement.amount < 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {formatAmount(bankStatement.amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Type:</span>
              <span className="font-medium text-blue-900">{bankStatement.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Account:</span>
              <span className="font-medium text-blue-900">{bankStatement.accountType}</span>
            </div>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-green-900 mb-3">Transaction</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-green-700">Date:</span>
              <span className="font-medium text-green-900">
                {formatDate(transaction.date)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Category:</span>
              <span className="font-medium text-green-900">{transaction.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Description:</span>
              <span className="font-medium text-green-900 truncate ml-4">
                {transaction.description || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Amount:</span>
              <span className="font-bold text-green-900">
                {formatAmount(transaction.amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Type:</span>
              <span className="font-medium text-green-900 capitalize">
                {transaction.transactionType}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Account:</span>
              <span className="font-medium text-green-900">{transaction.accountType}</span>
            </div>
          </div>
        </div>

        {/* Warning if amounts don't match exactly */}
        {Math.abs(Math.abs(bankStatement.amount) - transaction.amount) > 0.01 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> The amounts don't match exactly. Please verify before reconciling.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Reconciling...' : 'Confirm Reconciliation'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ReconcileModal;
