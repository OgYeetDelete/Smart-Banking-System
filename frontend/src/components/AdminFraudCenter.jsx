import React, { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { ShieldAlert, Activity, CheckCircle, AlertTriangle, RefreshCw, Users, Search, Snowflake, Unlock, Database, BarChart, Landmark } from "./Icons";

/* ── Error Boundary to catch render crashes ── */
class AdminErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div style={{
            background: "rgba(239, 68, 68, 0.15)", border: "2px solid #ef4444",
            borderRadius: "16px", padding: "32px", maxWidth: "600px", margin: "0 auto"
          }}>
            <h2 style={{ color: "#fca5a5", fontSize: "1.3rem", marginBottom: "12px" }}>
              ⚠ Admin Panel Render Error
            </h2>
            <pre style={{
              color: "#f87171", fontSize: "0.85rem", whiteSpace: "pre-wrap",
              wordBreak: "break-all", textAlign: "left", background: "rgba(0,0,0,0.3)",
              padding: "16px", borderRadius: "8px", maxHeight: "200px", overflow: "auto"
            }}>
              {this.state.error.toString()}
            </pre>
            <button onClick={() => this.setState({ error: null })}
              style={{ marginTop: "16px", padding: "10px 24px", borderRadius: "8px", background: "#3b82f6", color: "white", border: "none", cursor: "pointer", fontWeight: 600 }}>
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AdminFraudCenter() {
  return (
    <AdminErrorBoundary>
      <AdminFraudCenterInner />
    </AdminErrorBoundary>
  );
}

function AdminFraudCenterInner() {
  // ── Existing state ──
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [fraudStats, setFraudStats] = useState({});
  const [accountReport, setAccountReport] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [loanStats, setLoanStats] = useState({});
  const [allAccounts, setAllAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ── NEW state ──
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [enrichedTransfers, setEnrichedTransfers] = useState([]);
  const [loadingEnriched, setLoadingEnriched] = useState(false);

  const [distribution, setDistribution] = useState([]);
  const [loadingDist, setLoadingDist] = useState(false);

  const [facetData, setFacetData] = useState(null);
  const [loadingFacet, setLoadingFacet] = useState(false);

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditStats, setAuditStats] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [freezingAccount, setFreezingAccount] = useState(null);

  // ── NEW: Loan management state ──
  const [allLoans, setAllLoans] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [updatingLoan, setUpdatingLoan] = useState(null);

  // ── Active tab for the new analytics sections ──
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState("enriched");

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setLoadError("");
    const errors = [];
    try {
      const [alerts, stats, report, logs, lstats, accs, loans] = await Promise.all([
        api.getFraudAlerts().catch(e => { errors.push("Fraud alerts: " + e.message); return []; }),
        api.getFraudStats().catch(e => { errors.push("Fraud stats: " + e.message); return {}; }),
        api.getAccountReport().catch(e => { errors.push("Account report: " + e.message); return []; }),
        api.getSecurityLogs().catch(e => { errors.push("Security logs: " + e.message); return []; }),
        api.getLoanStats().catch(e => { errors.push("Loan stats: " + e.message); return {}; }),
        api.getAllAccounts().catch(e => { errors.push("Accounts: " + e.message); return []; }),
        (api.getAllLoans ? api.getAllLoans() : Promise.resolve([])).catch(e => { errors.push("Loans: " + e.message); return []; })
      ]);
      setFraudAlerts(Array.isArray(alerts) ? alerts : []);
      // Backend now returns {total, pending, confirmed, avgRisk, bySeverity, byStatus}
      // Safety: if it somehow returns an array (old format), compute KPIs from it
      if (Array.isArray(stats)) {
        const total = stats.reduce((s, r) => s + (r.count || 0), 0);
        const avgRisk = stats.length > 0 ? stats.reduce((s, r) => s + (r.avgRiskScore || 0), 0) / stats.length : 0;
        setFraudStats({ total, pending: total, confirmed: 0, avgRisk, bySeverity: stats });
      } else {
        setFraudStats(stats && typeof stats === "object" ? stats : {});
      }
      setAccountReport(Array.isArray(report) ? report : []);
      setSecurityLogs(Array.isArray(logs) ? logs : []);
      setLoanStats(lstats && typeof lstats === "object" ? lstats : {});
      setAllAccounts(Array.isArray(accs) ? accs : []);
      setAllLoans(Array.isArray(loans) ? loans : []);
      if (errors.length > 0) {
        setLoadError(errors.join(" | "));
        console.warn("Admin panel load errors:", errors);
      }
    } catch (e) {
      console.error("Admin panel critical error:", e);
      setLoadError("Failed to load admin data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── NEW: Text Search handler ──
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const data = await api.searchCustomers(searchQuery);
      // Backend returns { query, count, results } — unwrap the array
      const list = Array.isArray(data) ? data : (data?.results || data?.data || []);
      setSearchResults(list);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // ── NEW: Freeze / Unfreeze handler ──
  const handleToggleFreeze = async (acc) => {
    const action = acc.isFrozen ? "unfreeze" : "freeze";
    if (!window.confirm(`${action === "freeze" ? "Freeze" : "Unfreeze"} account #${acc.accountNumber}?`)) return;
    setFreezingAccount(acc.accountNumber);
    try {
      if (action === "freeze") {
        await api.freezeAccount(acc.accountNumber);
      } else {
        await api.unfreezeAccount(acc.accountNumber);
      }
      // Refresh accounts list
      const accs = await api.getAllAccounts().catch(() => []);
      setAllAccounts(accs);
    } catch (err) {
      alert(`Failed to ${action}: ` + err.message);
    } finally {
      setFreezingAccount(null);
    }
  };

  // ── NEW: Loan approve/reject handler ──
  const handleLoanAction = async (loanId, status) => {
    const label = status === "Approved" ? "approve" : "reject";
    if (!window.confirm(`Are you sure you want to ${label} this loan?`)) return;
    setUpdatingLoan(loanId);
    try {
      await api.updateLoanStatus(loanId, status);
      // Refresh loans list
      const loans = await api.getAllLoans().catch(() => []);
      setAllLoans(loans);
    } catch (err) {
      alert(`Failed to ${label} loan: ` + err.message);
    } finally {
      setUpdatingLoan(null);
    }
  };

  // ── NEW: Load enriched transfers ($lookup) ──
  const loadEnrichedTransfers = async () => {
    setLoadingEnriched(true);
    try {
      const data = await api.getEnrichedTransfers();
      setEnrichedTransfers(Array.isArray(data) ? data : (data?.transfers || data?.data || []));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEnriched(false);
    }
  };

  // ── NEW: Load $bucket distribution ──
  const loadDistribution = async () => {
    setLoadingDist(true);
    try {
      const data = await api.getTransactionDistribution();
      setDistribution(Array.isArray(data) ? data : (data?.buckets || data?.data || []));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDist(false);
    }
  };

  // ── NEW: Load $facet analytics ──
  const loadFacetAnalytics = async () => {
    setLoadingFacet(true);
    try {
      const data = await api.getLoanFacetAnalytics();
      setFacetData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFacet(false);
    }
  };

  // ── NEW: Load audit logs (capped collection) ──
  const loadAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const [logs, stats] = await Promise.all([
        api.getAuditLogs(),
        api.getAuditStats()
      ]);
      setAuditLogs(Array.isArray(logs) ? logs : (logs?.logs || logs?.data || []));
      setAuditStats(stats && typeof stats === "object" ? stats : null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Load analytics data on tab switch
  useEffect(() => {
    if (activeAnalyticsTab === "enriched" && (!Array.isArray(enrichedTransfers) || enrichedTransfers.length === 0)) loadEnrichedTransfers();
    if (activeAnalyticsTab === "distribution" && (!Array.isArray(distribution) || distribution.length === 0)) loadDistribution();
    if (activeAnalyticsTab === "facet" && !facetData) loadFacetAnalytics();
    if (activeAnalyticsTab === "audit" && (!Array.isArray(auditLogs) || auditLogs.length === 0)) loadAuditLogs();
  }, [activeAnalyticsTab]);

  const handleFraudAction = async (alertId, status) => {
    try {
      await api.updateFraudStatus(alertId, status);
      setFraudAlerts(prev => prev.map(a => a._id === alertId ? { ...a, status } : a));
    } catch (err) {
      alert("Action failed: " + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: "16px" }}>
        <div className="loading-spinner" />
        <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading Admin Fraud Center...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 24px 48px" }}>

      {/* ── Visible Admin Header ── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1))",
        border: "1px solid rgba(59, 130, 246, 0.3)",
        borderRadius: "16px",
        padding: "20px 24px",
        marginBottom: "24px",
        display: "flex",
        alignItems: "center",
        gap: "16px"
      }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "12px",
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
        }}>
          <ShieldAlert size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0 }}>Admin Fraud Center</h1>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Real-time monitoring • Loan management • MongoDB analytics
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {loadError && (
        <div style={{
          background: "rgba(239, 68, 68, 0.12)",
          border: "1px solid rgba(239, 68, 68, 0.4)",
          color: "#fca5a5",
          padding: "14px 20px",
          borderRadius: "12px",
          marginBottom: "20px",
          fontSize: "0.85rem"
        }}>
          <strong>⚠ Some data failed to load:</strong> {loadError}
          <div style={{ marginTop: "6px", fontSize: "0.8rem", color: "var(--text-dim)" }}>
            Make sure the backend server is running on <code className="mono">localhost:5000</code> and you are logged in as an admin.
          </div>
        </div>
      )}

      {/* ── NEW: Customer Text Search Bar ── */}
      <div className="glass-panel" style={{ marginBottom: "24px", padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Search size={20} style={{ color: "var(--primary)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "4px" }}>
              MongoDB Text Index: <code className="mono">$text search with textScore ranking</code>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Search customers by name or email..."
                style={{
                  flex: 1, padding: "8px 14px", borderRadius: "8px", border: "1px solid var(--border-color)",
                  background: "rgba(15, 23, 42, 0.6)", color: "white", fontSize: "0.9rem", outline: "none"
                }}
              />
              <button onClick={handleSearch} disabled={searching} className="btn btn-primary btn-sm">
                {searching ? "Searching..." : "Search"}
              </button>
            </div>
          </div>
        </div>

        {searchResults.length > 0 && (
          <div style={{ marginTop: "12px", maxHeight: "200px", overflowY: "auto" }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map(c => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td className="mono" style={{ fontSize: "0.8rem" }}>{c.email}</td>
                    <td style={{ fontSize: "0.85rem" }}>{c.phone || "—"}</td>
                    <td>
                      <span className="badge badge-medium" style={{ fontSize: "0.75rem" }}>
                        {c.score?.toFixed(2) || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <StatCard
          icon={<ShieldAlert size={22} className="glow-text-red" />}
          label="Total Fraud Alerts"
          value={fraudStats.total || 0}
          accent="var(--danger)"
        />
        <StatCard
          icon={<AlertTriangle size={22} style={{ color: "var(--warning)" }} />}
          label="Pending Review"
          value={fraudStats.pending || 0}
          accent="var(--warning)"
        />
        <StatCard
          icon={<CheckCircle size={22} style={{ color: "var(--success)" }} />}
          label="Confirmed Fraud"
          value={fraudStats.confirmed || 0}
          accent="var(--success)"
        />
        <StatCard
          icon={<Activity size={22} style={{ color: "var(--primary)" }} />}
          label="Avg Risk Score"
          value={fraudStats.avgRisk?.toFixed(1) || "0.0"}
          accent="var(--primary)"
        />
      </div>

      {/* Two-Column: Fraud Alerts + Account Freeze Controls */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px", marginBottom: "28px" }}>

        {/* Fraud Alert Stream */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                <ShieldAlert size={18} style={{ verticalAlign: "middle", marginRight: "6px" }} />
                Real-Time Fraud Stream
              </h2>
              <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                Powered by MongoDB Change Streams (oplog tailing)
              </div>
            </div>
            <button onClick={loadAllData} className="btn btn-secondary btn-sm">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          <div style={{ maxHeight: "360px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
            {fraudAlerts.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-dim)" }}>
                No fraud alerts detected. System is monitoring all transactions.
              </div>
            ) : (
              fraudAlerts.map(alert => (
                <div key={alert._id} className="glass-panel" style={{
                  padding: "14px 18px",
                  borderColor: alert.severity === "Critical" ? "rgba(239, 68, 68, 0.4)" :
                    alert.severity === "High" ? "rgba(245, 158, 11, 0.4)" : "var(--border-color)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <span className={`badge ${
                        alert.severity === "Critical" ? "badge-critical" :
                        alert.severity === "High" ? "badge-high" : "badge-medium"
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="mono" style={{ fontSize: "0.8rem", marginLeft: "8px", color: "var(--text-dim)" }}>
                        Risk: {alert.riskScore}/100
                      </span>
                    </div>
                    <span className={`badge ${alert.status === "Confirmed" ? "badge-critical" : alert.status === "Cleared" ? "badge-success" : "badge-medium"}`}>
                      {alert.status}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginBottom: "8px" }}>
                    Account: <span className="mono">{alert.accountNumber}</span> — ₹{alert.amount?.toLocaleString()} — {new Date(alert.createdAt).toLocaleString()}
                  </div>

                  {alert.rulesTriggered?.length > 0 && (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                      {alert.rulesTriggered.map((rule, i) => (
                        <span key={i} style={{
                          padding: "2px 8px", borderRadius: "6px", fontSize: "0.7rem",
                          background: "rgba(99, 102, 241, 0.2)", color: "#a5b4fc", border: "1px solid rgba(99, 102, 241, 0.3)"
                        }}>
                          {rule}
                        </span>
                      ))}
                    </div>
                  )}

                  {(alert.status === "Open" || alert.status === "Pending") && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => handleFraudAction(alert._id, "Cleared")} className="btn btn-sm" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#6ee7b7", border: "1px solid rgba(16, 185, 129, 0.3)", fontSize: "0.75rem" }}>
                        Clear
                      </button>
                      <button onClick={() => handleFraudAction(alert._id, "Confirmed")} className="btn btn-sm" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.3)", fontSize: "0.75rem" }}>
                        Confirm Fraud
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Account Freeze/Unfreeze Controls ── */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              <Snowflake size={18} style={{ verticalAlign: "middle", marginRight: "6px" }} />
              Account Freeze Control
            </h2>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>Admin-only — logs to Capped Audit Collection</div>
          </div>

          <div style={{ maxHeight: "360px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
            {allAccounts.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--text-dim)", fontSize: "0.85rem" }}>
                No accounts in system.
              </div>
            ) : (
              allAccounts.map(acc => (
                <div key={acc._id} style={{
                  padding: "12px 16px",
                  background: acc.isFrozen ? "rgba(239, 68, 68, 0.08)" : "rgba(15, 23, 42, 0.5)",
                  borderRadius: "10px",
                  border: `1px solid ${acc.isFrozen ? "rgba(239, 68, 68, 0.3)" : "var(--border-color)"}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="mono" style={{ fontSize: "0.85rem", fontWeight: 600 }}>#{acc.accountNumber}</span>
                      {acc.isFrozen && (
                        <span className="badge badge-critical" style={{ fontSize: "0.7rem" }}>FROZEN</span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                      {acc.accountType} — ₹{acc.balance?.toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleFreeze(acc)}
                    disabled={freezingAccount === acc.accountNumber}
                    className="btn btn-sm"
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.75rem",
                      background: acc.isFrozen ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                      color: acc.isFrozen ? "#6ee7b7" : "#fca5a5",
                      border: `1px solid ${acc.isFrozen ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    {acc.isFrozen ? <Unlock size={12} /> : <Snowflake size={12} />}
                    {freezingAccount === acc.accountNumber ? "..." : acc.isFrozen ? "Unfreeze" : "Freeze"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── NEW: Loan Management Panel ── */}
      <div className="glass-panel" style={{ padding: "24px", marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              <Landmark size={18} style={{ verticalAlign: "middle", marginRight: "6px" }} />
              Loan Management
            </h2>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
              Approve / Reject loan applications — auto-disburses to customer's account on approval
            </div>
          </div>
          <button onClick={async () => {
            setLoadingLoans(true);
            try { const loans = await api.getAllLoans(); setAllLoans(loans); } catch(e) { console.error(e); }
            finally { setLoadingLoans(false); }
          }} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loadingLoans ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--text-dim)" }}>Loading loans...</div>
        ) : allLoans.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--text-dim)" }}>
            No loan applications in the system.
          </div>
        ) : (
          <div style={{ overflowX: "auto", maxHeight: "400px", overflowY: "auto" }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Loan Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Applied On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allLoans.map(loan => (
                  <tr key={loan._id}>
                    <td style={{ fontWeight: 600 }}>
                      {loan.customerId?.name || "Unknown"}
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                        {loan.customerId?.email || ""}
                      </div>
                    </td>
                    <td>{loan.loanType}</td>
                    <td className="mono" style={{ fontWeight: 700, color: "var(--success)" }}>
                      ₹{loan.amount?.toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${
                        loan.status === "Pending" ? "badge-high" :
                        loan.status === "Approved" || loan.status === "Disbursed" ? "badge-success" :
                        loan.status === "Rejected" ? "badge-critical" : "badge-medium"
                      }`}>
                        {loan.status}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                      {new Date(loan.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      {loan.status === "Pending" ? (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => handleLoanAction(loan._id, "Approved")}
                            disabled={updatingLoan === loan._id}
                            className="btn btn-sm"
                            style={{
                              background: "rgba(16, 185, 129, 0.15)", color: "#6ee7b7",
                              border: "1px solid rgba(16, 185, 129, 0.3)", fontSize: "0.75rem"
                            }}
                          >
                            {updatingLoan === loan._id ? "..." : "✓ Approve"}
                          </button>
                          <button
                            onClick={() => handleLoanAction(loan._id, "Rejected")}
                            disabled={updatingLoan === loan._id}
                            className="btn btn-sm"
                            style={{
                              background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5",
                              border: "1px solid rgba(239, 68, 68, 0.3)", fontSize: "0.75rem"
                            }}
                          >
                            {updatingLoan === loan._id ? "..." : "✗ Reject"}
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Existing: Account Portfolio Aggregation */}
      <div className="glass-panel" style={{ padding: "24px", marginBottom: "28px" }}>
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Account Portfolio Aggregation</h2>
          <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
            MongoDB Aggregation Pipeline: <code className="mono">$group → $sum → $avg → $sort</code>
          </div>
        </div>
        {accountReport.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "20px" }}>No data available.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Account Type</th>
                  <th>Total Accounts</th>
                  <th>Total Balance</th>
                  <th>Average Balance</th>
                  <th>Max Balance</th>
                </tr>
              </thead>
              <tbody>
                {accountReport.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{r._id}</td>
                    <td>{r.totalAccounts}</td>
                    <td className="mono" style={{ color: "var(--success)" }}>₹{r.totalBalance?.toLocaleString()}</td>
                    <td className="mono">₹{r.averageBalance?.toFixed(0)?.toLocaleString()}</td>
                    <td className="mono">₹{r.maxBalance?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          NEW: MongoDB Advanced Analytics Tabbed Panel
         ══════════════════════════════════════════════════ */}
      <div className="glass-panel" style={{ padding: "24px", marginBottom: "28px" }}>
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
            <Database size={18} style={{ verticalAlign: "middle", marginRight: "6px" }} />
            MongoDB Advanced Analytics
          </h2>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", flexWrap: "wrap" }}>
          {[
            { key: "enriched", label: "$lookup Transfers", icon: <Users size={14} /> },
            { key: "distribution", label: "$bucket Distribution", icon: <BarChart size={14} /> },
            { key: "facet", label: "$facet Loan Analytics", icon: <Activity size={14} /> },
            { key: "audit", label: "Capped Audit Log", icon: <Database size={14} /> }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveAnalyticsTab(tab.key)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px 8px 0 0",
                border: "none",
                background: activeAnalyticsTab === tab.key ? "rgba(59, 130, 246, 0.2)" : "transparent",
                color: activeAnalyticsTab === tab.key ? "var(--primary)" : "var(--text-dim)",
                fontWeight: activeAnalyticsTab === tab.key ? 700 : 400,
                cursor: "pointer",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                borderBottom: activeAnalyticsTab === tab.key ? "2px solid var(--primary)" : "2px solid transparent",
                transition: "all 0.2s"
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}

        {/* ── $lookup Enriched Transfers ── */}
        {activeAnalyticsTab === "enriched" && (
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginBottom: "12px" }}>
              Pipeline: <code className="mono">$lookup (LEFT JOIN) → $unwind → $project → $sort</code> — Joins transfers with customer names
            </div>
            {loadingEnriched ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-dim)" }}>Loading enriched data...</div>
            ) : enrichedTransfers.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-dim)" }}>
                No transfer data. <button onClick={loadEnrichedTransfers} className="btn btn-secondary btn-sm" style={{ marginLeft: "8px" }}>Retry</button>
              </div>
            ) : (
              <div style={{ overflowX: "auto", maxHeight: "400px", overflowY: "auto" }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>From Account</th>
                      <th>Sender Name</th>
                      <th>To Account</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrichedTransfers.map((tx, i) => (
                      <tr key={i}>
                        <td className="mono" style={{ fontSize: "0.8rem" }}>{tx.fromAccount}</td>
                        <td style={{ fontWeight: 600, color: "#93c5fd" }}>{tx.senderName || "Unknown"}</td>
                        <td className="mono" style={{ fontSize: "0.8rem" }}>{tx.toAccount}</td>
                        <td style={{ fontWeight: 700, color: "var(--success)", fontFamily: "var(--font-mono)" }}>
                          ₹{tx.amount?.toLocaleString()}
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                          {new Date(tx.transferredAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── $bucket Transaction Distribution ── */}
        {activeAnalyticsTab === "distribution" && (
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginBottom: "12px" }}>
              Pipeline: <code className="mono">$bucket</code> — Groups transactions into amount ranges (histogram)
            </div>
            {loadingDist ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-dim)" }}>Loading distribution data...</div>
            ) : distribution.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-dim)" }}>
                No data. <button onClick={loadDistribution} className="btn btn-secondary btn-sm" style={{ marginLeft: "8px" }}>Retry</button>
              </div>
            ) : (
              <div>
                {/* Visual bars */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {distribution.map((bucket, i) => {
                    const maxCount = Math.max(...distribution.map(b => b.count || 0), 1);
                    const pct = ((bucket.count || 0) / maxCount) * 100;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "160px", fontSize: "0.85rem", fontWeight: 600, flexShrink: 0 }}>
                          {bucket.label || `₹${bucket._id?.toLocaleString()}`}
                        </div>
                        <div style={{ flex: 1, background: "rgba(15, 23, 42, 0.6)", borderRadius: "8px", height: "28px", position: "relative", overflow: "hidden" }}>
                          <div style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: `linear-gradient(90deg, rgba(59, 130, 246, 0.6), rgba(99, 102, 241, 0.6))`,
                            borderRadius: "8px",
                            transition: "width 0.5s ease"
                          }} />
                          <span style={{
                            position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)",
                            fontSize: "0.8rem", fontWeight: 700, color: "white", textShadow: "0 1px 2px rgba(0,0,0,0.5)"
                          }}>
                            {bucket.count} txns — ₹{(bucket.totalAmount || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── $facet Loan Analytics ── */}
        {activeAnalyticsTab === "facet" && (
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginBottom: "12px" }}>
              Pipeline: <code className="mono">$facet</code> — 4 sub-pipelines in a single query (byStatus, byType, avgAmountByType, recentApplications)
            </div>
            {loadingFacet ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-dim)" }}>Loading facet analytics...</div>
            ) : !facetData ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-dim)" }}>
                No data. <button onClick={loadFacetAnalytics} className="btn btn-secondary btn-sm" style={{ marginLeft: "8px" }}>Retry</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* By Status */}
                <div style={{ background: "rgba(15, 23, 42, 0.5)", borderRadius: "12px", padding: "16px", border: "1px solid var(--border-color)" }}>
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "10px", color: "#93c5fd" }}>By Status</h3>
                  {(facetData.byStatus || []).map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "0.85rem" }}>
                      <span>{s._id}</span>
                      <span className="mono" style={{ fontWeight: 600 }}>{s.count}</span>
                    </div>
                  ))}
                </div>

                {/* By Type */}
                <div style={{ background: "rgba(15, 23, 42, 0.5)", borderRadius: "12px", padding: "16px", border: "1px solid var(--border-color)" }}>
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "10px", color: "#93c5fd" }}>By Type</h3>
                  {(facetData.byType || []).map((t, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "0.85rem" }}>
                      <span>{t._id}</span>
                      <span className="mono" style={{ fontWeight: 600 }}>{t.count} — ₹{t.totalAmount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {/* Avg Amount By Type */}
                <div style={{ background: "rgba(15, 23, 42, 0.5)", borderRadius: "12px", padding: "16px", border: "1px solid var(--border-color)" }}>
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "10px", color: "#93c5fd" }}>Avg Amount by Type</h3>
                  {(facetData.avgAmountByType || []).map((a, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "0.85rem" }}>
                      <span>{a._id}</span>
                      <span className="mono" style={{ fontWeight: 600, color: "var(--success)" }}>₹{a.avgAmount?.toFixed(0)?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {/* Recent Applications */}
                <div style={{ background: "rgba(15, 23, 42, 0.5)", borderRadius: "12px", padding: "16px", border: "1px solid var(--border-color)" }}>
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "10px", color: "#93c5fd" }}>Recent Applications</h3>
                  {(facetData.recentApplications || []).length === 0 ? (
                    <div style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>None</div>
                  ) : (
                    (facetData.recentApplications || []).map((r, i) => (
                      <div key={i} style={{ padding: "4px 0", fontSize: "0.85rem", borderBottom: "1px solid var(--border-color)" }}>
                        <span style={{ fontWeight: 600 }}>{r.loanType}</span>
                        <span className="mono" style={{ marginLeft: "8px" }}>₹{r.amount?.toLocaleString()}</span>
                        <span style={{ float: "right", fontSize: "0.75rem", color: "var(--text-dim)" }}>
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Capped Collection Audit Log ── */}
        {activeAnalyticsTab === "audit" && (
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginBottom: "12px" }}>
              Capped Collection: <code className="mono">1MB / 500 docs max — auto-rotating, $natural sort</code>
            </div>

            {auditStats && (
              <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                <div style={{ padding: "8px 16px", borderRadius: "8px", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Total Entries</span>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>{auditStats.totalEntries || 0}</div>
                </div>
                {(auditStats.byAction || []).map((a, i) => (
                  <div key={i} style={{ padding: "8px 16px", borderRadius: "8px", background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{a._id}</span>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>{a.count}</div>
                  </div>
                ))}
              </div>
            )}

            {loadingAudit ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-dim)" }}>Loading audit logs...</div>
            ) : auditLogs.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-dim)" }}>
                Audit log is empty. <button onClick={loadAuditLogs} className="btn btn-secondary btn-sm" style={{ marginLeft: "8px" }}>Retry</button>
              </div>
            ) : (
              <div style={{ overflowX: "auto", maxHeight: "300px", overflowY: "auto" }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Performed By</th>
                      <th>Target</th>
                      <th>Details</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, i) => (
                      <tr key={i}>
                        <td>
                          <span className="badge badge-medium" style={{ fontSize: "0.7rem" }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.8rem" }}>{log.performedBy}</td>
                        <td className="mono" style={{ fontSize: "0.8rem" }}>{log.targetResource || "—"}</td>
                        <td style={{ fontSize: "0.8rem", color: "var(--text-dim)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {log.details || "—"}
                        </td>
                        <td style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                          {new Date(log.timestamp).toLocaleString()}
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

      {/* TTL Security Logs */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>TTL Security Logs</h2>
          <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
            Auto-purge after 5 minutes via <code className="mono">expireAfterSeconds: 300</code>
          </div>
        </div>

        {securityLogs.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "20px" }}>
            No recent security events (logs expire after 5 minutes).
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Email</th>
                  <th>IP Address</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {securityLogs.map((log, i) => (
                  <tr key={i}>
                    <td>
                      <span className={`badge ${log.action === "LOGIN_FAILED" ? "badge-critical" : "badge-success"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>{log.email}</td>
                    <td className="mono" style={{ fontSize: "0.8rem" }}>{log.ipAddress || "—"}</td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Reusable Stat Card ── */
function StatCard({ icon, label, value, accent }) {
  return (
    <div className="glass-panel" style={{
      padding: "20px",
      display: "flex",
      alignItems: "center",
      gap: "16px"
    }}>
      <div style={{
        width: "48px",
        height: "48px",
        borderRadius: "12px",
        background: `${accent}15`,
        border: `1px solid ${accent}30`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{label}</div>
        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "white" }}>{value}</div>
      </div>
    </div>
  );
}
