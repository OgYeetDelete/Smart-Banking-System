import React, { useState } from "react";
import { api } from "../services/api";
import { ArrowRightLeft, Plus, CreditCard, Users, FileText } from "./Icons";

export function TransferModal({ isOpen, onClose, accounts, defaultToAccount, onSuccess }) {
  if (!isOpen) return null;

  const [fromAccount, setFromAccount] = useState(accounts[0]?.accountNumber || "");
  const [toAccount, setToAccount] = useState(defaultToAccount || "");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await api.transferFunds({
        fromAccount,
        toAccount,
        amount: Number(amount)
      });
      setSuccess(`Transfer of ₹${Number(amount).toLocaleString()} completed successfully! Remaining balance: ₹${res.remainingBalance?.toLocaleString()}`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ArrowRightLeft size={20} style={{ color: "var(--primary)" }} />
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Execute Fund Transfer</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
        </div>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5", padding: "10px 14px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", color: "#6ee7b7", padding: "10px 14px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "16px" }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Debit From Account</label>
            <select className="form-select" value={fromAccount} onChange={e => setFromAccount(e.target.value)}>
              {accounts.map(acc => (
                <option key={acc._id} value={acc.accountNumber}>
                  {acc.accountType} (#{acc.accountNumber}) — ₹{acc.balance?.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Beneficiary / Receiver Account Number</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 1793095400123"
              value={toAccount}
              onChange={e => setToAccount(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Transfer Amount (₹)</label>
            <input
              type="number"
              className="form-input"
              placeholder="e.g. 1000 or 3500"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="1"
              required
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px", display: "block" }}>
              * Transfers &ge; ₹3,000 or to non-beneficiaries automatically trigger the Change Stream fraud monitor.
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
              {loading ? "Processing Transfer..." : "Confirm & Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BeneficiaryModal({ isOpen, onClose, customerId, onSuccess }) {
  if (!isOpen) return null;

  const [beneficiaryName, setName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.addBeneficiary({ customerId, beneficiaryName, accountNumber });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Add Pre-Registered Beneficiary</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
        </div>

        {error && <div style={{ color: "var(--danger)", fontSize: "0.85rem", marginBottom: "12px" }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Beneficiary Full Name</label>
            <input type="text" className="form-input" placeholder="e.g. Rahul Sharma" value={beneficiaryName} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Bank Account Number</label>
            <input type="text" className="form-input" placeholder="13-digit account number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} required />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
              {loading ? "Adding..." : "Save Beneficiary"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LoanModal({ isOpen, onClose, customerId, onSuccess }) {
  if (!isOpen) return null;

  const [loanType, setLoanType] = useState("Personal Loan");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.applyLoan({ customerId, loanType, amount: Number(amount) });
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "20px" }}>Apply for a Bank Loan</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Loan Classification</label>
            <select className="form-select" value={loanType} onChange={e => setLoanType(e.target.value)}>
              <option value="Personal Loan">Personal Loan</option>
              <option value="Home Loan">Home Loan</option>
              <option value="Education Loan">Education Loan</option>
              <option value="Business Loan">Business Loan</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Requested Loan Amount (₹)</label>
            <input type="number" className="form-input" placeholder="e.g. 250000" value={amount} onChange={e => setAmount(e.target.value)} required min="1000" />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
              {loading ? "Submitting..." : "Apply Loan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function NewAccountModal({ isOpen, onClose, customerId, onSuccess }) {
  if (!isOpen) return null;
  const [accountType, setAccountType] = useState("Savings");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.createAccount({ customerId, accountType });
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "20px" }}>Open New Bank Account</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Account Category (Schema Enforced)</label>
            <select className="form-select" value={accountType} onChange={e => setAccountType(e.target.value)}>
              <option value="Savings">Savings Account (Initial ₹5,000)</option>
              <option value="Current">Current Account (Initial ₹5,000)</option>
              <option value="Salary">Salary Account (Initial ₹5,000)</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
              {loading ? "Opening Account..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DepositModal({ isOpen, onClose, accounts, onSuccess }) {
  if (!isOpen) return null;
  const [accountNumber, setAccountNumber] = useState(accounts[0]?.accountNumber || "");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.depositFunds({ accountNumber, amount: Number(amount) });
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "20px" }}>Deposit Funds</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Target Account</label>
            <select className="form-select" value={accountNumber} onChange={e => setAccountNumber(e.target.value)}>
              {accounts.map(acc => (
                <option key={acc._id} value={acc.accountNumber}>
                  {acc.accountType} (#{acc.accountNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Deposit Amount (₹)</label>
            <input type="number" className="form-input" placeholder="e.g. 50000" value={amount} onChange={e => setAmount(e.target.value)} required min="1" />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
              {loading ? "Processing..." : "Deposit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
