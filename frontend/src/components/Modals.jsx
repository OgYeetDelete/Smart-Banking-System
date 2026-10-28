import React, { useState } from "react";
import { api } from "../services/api";
import { ArrowRightLeft, Plus, CreditCard, Landmark, Edit, Calendar } from "./Icons";

/* ═══════════════════════ ORIGINAL MODALS ═══════════════════════ */

export function TransferModal({ onClose, accounts, prefillToAccount, onSuccess }) {
  const [fromAccount, setFromAccount] = useState(accounts[0]?.accountNumber || "");
  const [toAccount, setToAccount] = useState(prefillToAccount || "");
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

export function BeneficiaryModal({ onClose, user, onSuccess }) {
  const [beneficiaryName, setName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.addBeneficiary({ customerId: user._id || user.id, beneficiaryName, accountNumber });
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

export function LoanModal({ onClose, user, onSuccess }) {
  const [loanType, setLoanType] = useState("Personal Loan");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.applyLoan({ customerId: user._id || user.id, loanType, amount: Number(amount) });
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

export function NewAccountModal({ onClose, user, onSuccess }) {
  const [accountType, setAccountType] = useState("Savings");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.createAccount({ customerId: user._id || user.id, accountType });
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

export function DepositModal({ onClose, accounts, onSuccess }) {
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

/* ═══════════════ NEW MODALS FOR NEW FEATURES ═══════════════ */

/**
 * NEW: Fixed Deposit Modal (User Functionality #3)
 * Uses ACID Multi-Document Transaction on backend
 */
export function FDModal({ onClose, accounts, onSuccess }) {
  const [accountId, setAccountId] = useState(accounts[0]?._id || "");
  const [principal, setPrincipal] = useState("");
  const [tenureMonths, setTenureMonths] = useState("6");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const rateMap = { "3": "5.5%", "6": "5.5%", "12": "6.5%", "24": "7.0%", "36": "7.5%", "60": "7.5%" };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await api.createFD({
        accountId,
        principal: Number(principal),
        tenureMonths: Number(tenureMonths)
      });
      const fd = res.fixedDeposit || res;
      setSuccess(`FD created! Principal ₹${Number(principal).toLocaleString()} at ${fd.interestRate}% for ${tenureMonths} months. Maturity: ₹${fd.maturityAmount?.toLocaleString()}`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
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
            <Landmark size={20} style={{ color: "var(--primary)" }} />
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Create Fixed Deposit</h3>
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
            <label className="form-label">Source Account (ACID Transaction Debit)</label>
            <select className="form-select" value={accountId} onChange={e => setAccountId(e.target.value)}>
              {accounts.map(acc => (
                <option key={acc._id} value={acc._id}>
                  {acc.accountType} (#{acc.accountNumber}) — ₹{acc.balance?.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Principal Amount (₹) — Min ₹1,000</label>
            <input type="number" className="form-input" placeholder="e.g. 50000" value={principal} onChange={e => setPrincipal(e.target.value)} min="1000" required />
          </div>

          <div className="form-group">
            <label className="form-label">Tenure (Months)</label>
            <select className="form-select" value={tenureMonths} onChange={e => setTenureMonths(e.target.value)}>
              <option value="3">3 Months — {rateMap["3"]} p.a.</option>
              <option value="6">6 Months — {rateMap["6"]} p.a.</option>
              <option value="12">12 Months — {rateMap["12"]} p.a.</option>
              <option value="24">24 Months — {rateMap["24"]} p.a.</option>
              <option value="36">36 Months — {rateMap["36"]} p.a.</option>
              <option value="60">60 Months — {rateMap["60"]} p.a.</option>
            </select>
          </div>

          <div style={{
            background: "rgba(59, 130, 246, 0.1)",
            borderLeft: "3px solid var(--primary)",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            marginBottom: "16px"
          }}>
            Uses MongoDB Multi-Document ACID Transaction: debits account &amp; creates FD atomically. Early withdrawal returns principal only (no interest).
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
              {loading ? "Creating FD..." : "Open Fixed Deposit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * NEW: Profile Update Modal (User Functionality #1)
 * Requires bcrypt-verified old password for password changes
 */
export function ProfileModal({ onClose, user, onSuccess }) {
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const body = { name, phone };
      if (newPassword) {
        if (!oldPassword) {
          setError("Old password is required to change your password.");
          setLoading(false);
          return;
        }
        body.oldPassword = oldPassword;
        body.newPassword = newPassword;
      }
      await api.updateProfile(body);
      setSuccess("Profile updated successfully!");
      setTimeout(() => {
        // Update local storage user
        const storedUser = JSON.parse(localStorage.getItem("bank_user") || "{}");
        storedUser.name = name;
        storedUser.phone = phone;
        localStorage.setItem("bank_user", JSON.stringify(storedUser));
        onSuccess(storedUser);
        onClose();
      }, 1200);
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
            <Edit size={20} style={{ color: "var(--primary)" }} />
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Edit Profile</h3>
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
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input type="tel" className="form-input" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>

          <div style={{ borderTop: "1px solid var(--border-color)", marginTop: "16px", paddingTop: "16px" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginBottom: "12px" }}>
              Change Password (optional — leave blank to keep current)
            </div>
            <div className="form-group">
              <label className="form-label">Current Password (bcrypt verified)</label>
              <input type="password" className="form-input" placeholder="Required only for password change" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" className="form-input" placeholder="Min 6 characters ($jsonSchema enforced)" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
              {loading ? "Saving..." : "Update Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * NEW: Date-Range Statement Modal (User Functionality #5)
 * Fetches filtered transfers by fromDate/toDate
 */
export function StatementModal({ onClose, accounts }) {
  const [accountNumber, setAccountNumber] = useState(accounts[0]?.accountNumber || "");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFetch = async (e) => {
    e.preventDefault();
    if (!fromDate || !toDate) {
      setError("Both dates are required");
      return;
    }
    setError("");
    setResults(null);
    setLoading(true);
    try {
      const data = await api.getStatement(accountNumber, fromDate, toDate);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: "680px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Calendar size={20} style={{ color: "var(--primary)" }} />
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Account Statement (Date Range)</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
        </div>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5", padding: "10px 14px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleFetch}>
          <div className="form-group">
            <label className="form-label">Account</label>
            <select className="form-select" value={accountNumber} onChange={e => setAccountNumber(e.target.value)}>
              {accounts.map(acc => (
                <option key={acc._id} value={acc.accountNumber}>
                  {acc.accountType} (#{acc.accountNumber})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="form-group">
              <label className="form-label">From Date</label>
              <input type="date" className="form-input" value={fromDate} onChange={e => setFromDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">To Date</label>
              <input type="date" className="form-input" value={toDate} onChange={e => setToDate(e.target.value)} required />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%" }}>
            {loading ? "Fetching Statement..." : "Generate Statement"}
          </button>
        </form>

        {/* Results Table */}
        {results && (
          <div style={{ marginTop: "20px" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginBottom: "10px" }}>
              {results.length} transaction(s) found between {fromDate} and {toDate}
            </div>
            {results.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "var(--text-dim)" }}>No transactions in this period.</div>
            ) : (
              <div style={{ maxHeight: "260px", overflowY: "auto" }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(tx => (
                      <tr key={tx._id}>
                        <td style={{ fontSize: "0.8rem" }}>{new Date(tx.transferredAt).toLocaleDateString()}</td>
                        <td className="mono" style={{ fontSize: "0.8rem" }}>{tx.fromAccount}</td>
                        <td className="mono" style={{ fontSize: "0.8rem" }}>{tx.toAccount}</td>
                        <td style={{ fontWeight: 700, color: tx.fromAccount === accountNumber ? "#f87171" : "#4ade80" }}>
                          {tx.fromAccount === accountNumber ? "-" : "+"}₹{tx.amount?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
