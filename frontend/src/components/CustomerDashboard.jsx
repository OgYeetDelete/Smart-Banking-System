import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { CreditCard, ArrowRightLeft, Users, FileText, Plus, RefreshCw, AlertTriangle } from "./Icons";

export default function CustomerDashboard({
  user,
  accounts,
  onRefreshAccounts,
  onOpenTransfer,
  onOpenBeneficiary,
  onOpenLoan,
  onOpenNewAccount,
  onOpenDeposit
}) {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loans, setLoans] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(accounts[0] || null);
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts]);

  // Fetch beneficiaries, loans, and notifications
  useEffect(() => {
    if (user?.id) {
      loadUserData();
    }
  }, [user]);

  // Fetch transactions whenever selectedAccount changes
  useEffect(() => {
    if (selectedAccount?.accountNumber) {
      loadTransactions(selectedAccount.accountNumber);
    }
  }, [selectedAccount]);

  const loadUserData = async () => {
    try {
      const [bList, lList, nList] = await Promise.all([
        api.getCustomerBeneficiaries(user.id).catch(() => []),
        api.getCustomerLoans(user.id).catch(() => []),
        api.getNotifications().catch(() => [])
      ]);
      setBeneficiaries(bList);
      setLoans(lList);
      setNotifications(nList);
    } catch (e) {
      console.error(e);
    }
  };

  const loadTransactions = async (accNum) => {
    setLoadingTx(true);
    try {
      const txs = await api.getTransferHistory(accNum);
      setTransactions(txs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTx(false);
    }
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px 48px" }}>
      
      {/* Live TTL Alerts Banner if any */}
      {notifications.length > 0 && (
        <div className="glass-panel" style={{
          marginBottom: "24px",
          padding: "12px 20px",
          borderColor: "rgba(245, 158, 11, 0.4)",
          background: "rgba(245, 158, 11, 0.08)",
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          <AlertTriangle size={20} className="glow-text-red" style={{ color: "var(--warning)" }} />
          <div style={{ flex: 1, fontSize: "0.85rem" }}>
            <strong>Live Security Broadcast (TTL Auto-Purge):</strong> {notifications[0].message}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Expires in 5m</span>
        </div>
      )}

      {/* Top Stats & Accounts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "32px" }}>
        
        {/* Main Bank Card */}
        <div className="glass-panel" style={{
          padding: "24px",
          background: "linear-gradient(135deg, rgba(30, 58, 138, 0.6), rgba(15, 23, 42, 0.9))",
          borderColor: "rgba(59, 130, 246, 0.4)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: "0.8rem", color: "#93c5fd", fontWeight: 600, textTransform: "uppercase" }}>
                {selectedAccount ? `${selectedAccount.accountType} Account` : "No Account Selected"}
              </span>
              <CreditCard size={24} style={{ color: "#60a5fa" }} />
            </div>

            <div style={{ margin: "16px 0 8px" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>Available Balance</div>
              <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "white", letterSpacing: "-1px" }}>
                ₹{selectedAccount ? selectedAccount.balance?.toLocaleString() : "0"}
              </div>
            </div>

            <div className="mono" style={{ fontSize: "0.95rem", color: "#cbd5e1", letterSpacing: "1px" }}>
              {selectedAccount ? `•••• •••• ${selectedAccount.accountNumber}` : "Open an account to start"}
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
            <button onClick={onOpenTransfer} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
              <ArrowRightLeft size={16} />
              Transfer Funds
            </button>
            <button onClick={onOpenDeposit} className="btn btn-secondary btn-sm">
              <Plus size={16} />
              Deposit
            </button>
          </div>
        </div>

        {/* All Accounts Picker */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Your Accounts ({accounts.length})</h2>
            <button onClick={onOpenNewAccount} className="btn btn-secondary btn-sm">
              <Plus size={14} /> Open Account
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "180px", overflowY: "auto" }}>
            {accounts.map(acc => (
              <div
                key={acc._id}
                onClick={() => setSelectedAccount(acc)}
                className="glass-panel-interactive"
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderColor: selectedAccount?._id === acc._id ? "var(--primary)" : "var(--border-color)",
                  background: selectedAccount?._id === acc._id ? "rgba(59, 130, 246, 0.15)" : "rgba(30, 41, 59, 0.4)"
                }}
              >
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{acc.accountType}</div>
                  <div className="mono" style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                    #{acc.accountNumber}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--success)" }}>
                    ₹{acc.balance?.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Beneficiaries */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Beneficiaries ({beneficiaries.length})</h2>
            <button onClick={onOpenBeneficiary} className="btn btn-secondary btn-sm">
              <Plus size={14} /> Add
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "180px", overflowY: "auto" }}>
            {beneficiaries.length === 0 ? (
              <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", padding: "12px 0" }}>
                No beneficiaries saved yet. Add trusted payees to avoid fraud verification flags!
              </div>
            ) : (
              beneficiaries.map(b => (
                <div key={b._id} style={{
                  padding: "10px 14px",
                  background: "rgba(15, 23, 42, 0.5)",
                  borderRadius: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: "1px solid var(--border-color)"
                }}>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{b.beneficiaryName}</div>
                    <div className="mono" style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{b.accountNumber}</div>
                  </div>
                  <button onClick={() => onOpenTransfer(b.accountNumber)} className="btn btn-secondary btn-sm" style={{ padding: "4px 8px", fontSize: "0.75rem" }}>
                    Send
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Main Content Grid: Transactions & Loans */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
        
        {/* Transaction Ledger */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Transaction History</h2>
              <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                Uses MongoDB Compound Index: <code className="mono">&#123; fromAccount: 1, transferredAt: -1 &#125;</code>
              </div>
            </div>
            {selectedAccount && (
              <button onClick={() => loadTransactions(selectedAccount.accountNumber)} className="btn btn-secondary btn-sm">
                <RefreshCw size={14} /> Refresh
              </button>
            )}
          </div>

          {loadingTx ? (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--text-dim)" }}>
              Scanning indexed ledger...
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--text-dim)" }}>
              No transactions recorded for this account.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Counterparty</th>
                    <th>Date & Time</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => {
                    const isDebit = tx.fromAccount === selectedAccount?.accountNumber;
                    return (
                      <tr key={tx._id}>
                        <td>
                          <span className={`badge ${isDebit ? "badge-critical" : "badge-success"}`}>
                            {isDebit ? "DEBIT" : "CREDIT"}
                          </span>
                        </td>
                        <td className="mono" style={{ fontSize: "0.85rem" }}>
                          {isDebit ? `To: ${tx.toAccount}` : `From: ${tx.fromAccount}`}
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                          {new Date(tx.transferredAt).toLocaleString()}
                        </td>
                        <td style={{
                          fontWeight: 700,
                          color: isDebit ? "#f87171" : "#4ade80",
                          fontFamily: "var(--font-mono)"
                        }}>
                          {isDebit ? `- ₹${tx.amount.toLocaleString()}` : `+ ₹${tx.amount.toLocaleString()}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Loan Portfolio */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>My Loans</h2>
              <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>Auto-cleanup (TTL 1-Yr)</div>
            </div>
            <button onClick={onOpenLoan} className="btn btn-secondary btn-sm">
              <Plus size={14} /> Apply
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {loans.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-dim)", fontSize: "0.85rem" }}>
                No active loan applications.
              </div>
            ) : (
              loans.map(loan => (
                <div key={loan._id} style={{
                  padding: "14px",
                  background: "rgba(15, 23, 42, 0.6)",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{loan.loanType}</div>
                    <span className={`badge ${
                      loan.status === "Approved" ? "badge-success" :
                      loan.status === "Rejected" ? "badge-critical" : "badge-high"
                    }`}>
                      {loan.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "white" }}>
                    ₹{loan.amount?.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px" }}>
                    Applied on: {new Date(loan.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
