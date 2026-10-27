import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { ShieldAlert, AlertTriangle, RefreshCw, CheckCircle, Activity, FileText } from "./Icons";

export default function AdminFraudCenter() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [accountReport, setAccountReport] = useState([]);
  const [loanStats, setLoanStats] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadAllAdminData = async () => {
    try {
      const [alertList, statData, accReport, lStats, secLogs] = await Promise.all([
        api.getFraudAlerts().catch(() => []),
        api.getFraudStats().catch(() => null),
        api.getAccountReport().catch(() => []),
        api.getLoanStats().catch(() => []),
        api.getSecurityLogs().catch(() => [])
      ]);

      setAlerts(alertList);
      setStats(statData);
      setAccountReport(accReport);
      setLoanStats(lStats);
      setSecurityLogs(secLogs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
    if (!autoRefresh) return;
    const interval = setInterval(loadAllAdminData, 4000); // 4-sec poll for real-time feed
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleUpdateStatus = async (alertId, newStatus) => {
    try {
      await api.updateFraudStatus(alertId, newStatus);
      loadAllAdminData();
    } catch (e) {
      alert("Failed to update alert: " + e.message);
    }
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px 48px" }}>
      
      {/* Header with Live Ticker */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Fraud Monitoring & Risk Center</h1>
            <span className="badge badge-critical" style={{ animation: "pulseRed 2s infinite" }}>
              LIVE MONITORING
            </span>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Real-time heuristic evaluation hooked into MongoDB Change Streams & Multi-Document Transactions
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--text-muted)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-sync (4s)
          </label>
          <button onClick={loadAllAdminData} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "18px", marginBottom: "28px" }}>
        
        <div className="glass-panel" style={{ padding: "20px", borderColor: "rgba(239, 68, 68, 0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 600 }}>FLAGGED ALERTS</span>
            <ShieldAlert size={20} style={{ color: "#ef4444" }} />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#f87171", marginTop: "8px" }}>
            {stats?.totalAlerts || alerts.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
            {stats?.pendingAlerts || 0} requiring review
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 600 }}>RISK SEVERITY BREAKDOWN</span>
            <AlertTriangle size={20} style={{ color: "#f59e0b" }} />
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
            <span className="badge badge-critical">
              {alerts.filter(a => a.severity === "CRITICAL").length} Critical
            </span>
            <span className="badge badge-high">
              {alerts.filter(a => a.severity === "HIGH").length} High
            </span>
            <span className="badge badge-medium">
              {alerts.filter(a => a.severity === "MEDIUM").length} Medium
            </span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 600 }}>AGGREGATED BALANCE AT RISK</span>
            <Activity size={20} style={{ color: "#3b82f6" }} />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "white", marginTop: "8px" }}>
            ₹{alerts.reduce((acc, a) => acc + (a.amount || 0), 0).toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Computed via MongoDB Aggregation
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 600 }}>ACTIVE TTL LOGS</span>
            <FileText size={20} style={{ color: "#10b981" }} />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#34d399", marginTop: "8px" }}>
            {securityLogs.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Auto-purges after 300s
          </div>
        </div>

      </div>

      {/* Flagged Incidents Stream */}
      <div className="glass-panel" style={{ padding: "24px", marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Real-Time Suspicious Transactions Stream</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
              Evaluated on three risk vectors: Velocity (>3/5m), Value (>₹3k/₹50k), and Beneficiary Trust Verification
            </p>
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{alerts.length} incidents recorded</span>
        </div>

        {alerts.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)" }}>
            <CheckCircle size={36} style={{ color: "var(--success)", margin: "0 auto 12px", display: "block" }} />
            No active fraud threats detected. Perform a high-value or rapid transfer to trigger live detection.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {alerts.map(alert => (
              <div key={alert._id} style={{
                background: "rgba(15, 23, 42, 0.7)",
                borderRadius: "14px",
                padding: "18px 20px",
                border: "1px solid",
                borderColor: alert.severity === "CRITICAL" ? "rgba(239, 68, 68, 0.4)" :
                             alert.severity === "HIGH" ? "rgba(245, 158, 11, 0.4)" : "rgba(59, 130, 246, 0.3)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className={`badge ${
                      alert.severity === "CRITICAL" ? "badge-critical" :
                      alert.severity === "HIGH" ? "badge-high" : "badge-medium"
                    }`}>
                      {alert.severity} • {alert.riskScore}% RISK
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                      {new Date(alert.detectedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => handleUpdateStatus(alert._id, "CLEARED")}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(alert._id, "CONFIRMED_FRAUD")}
                      className="btn btn-danger btn-sm"
                      style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                    >
                      Confirm Fraud
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", margin: "12px 0" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>FROM SENDER ACCOUNT</div>
                    <div className="mono" style={{ fontSize: "0.9rem", fontWeight: 600 }}>{alert.fromAccount}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>TO RECEIVER ACCOUNT</div>
                    <div className="mono" style={{ fontSize: "0.9rem", fontWeight: 600 }}>{alert.toAccount}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>AMOUNT FLAGGED</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f87171" }}>
                      ₹{alert.amount?.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Rules triggered list */}
                <div style={{
                  background: "rgba(0, 0, 0, 0.3)",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  borderLeft: "3px solid #ef4444"
                }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                    RULE HEURISTICS TRIGGERED:
                  </div>
                  {alert.rulesTriggered?.map((rule, idx) => (
                    <div key={idx} style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: "2px" }}>
                      • <strong>[{rule.ruleCode}]</strong>: {rule.description}
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", fontSize: "0.75rem", color: "var(--text-dim)" }}>
                  <span>Status: <strong style={{ color: "white" }}>{alert.status}</strong></span>
                  <span className="mono">ID: {alert._id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Grid: Aggregation Pipelines (Accounts & Loans) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        
        {/* MongoDB Aggregation: Account Portfolio */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "6px" }}>
            Account Portfolio (MongoDB Aggregation)
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginBottom: "16px" }}>
            Computed server-side using <code>$group</code> & <code>$avg</code>
          </p>

          <table className="custom-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Total Accounts</th>
                <th>Aggregated Balance</th>
                <th>Avg Balance</th>
              </tr>
            </thead>
            <tbody>
              {accountReport.map(r => (
                <tr key={r._id}>
                  <td style={{ fontWeight: 600 }}>{r._id}</td>
                  <td>{r.totalAccounts}</td>
                  <td style={{ fontWeight: 700, color: "var(--success)" }}>₹{r.totalBalance?.toLocaleString()}</td>
                  <td>₹{Math.round(r.averageBalance || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MongoDB TTL Security Logs */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "6px" }}>
            Security Audit Trail (TTL 5-Minute Index)
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginBottom: "16px" }}>
            Auto-purging temporary session & authentication audit logs
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
            {securityLogs.length === 0 ? (
              <div style={{ padding: "16px 0", color: "var(--text-dim)", fontSize: "0.85rem" }}>
                No recent security incidents.
              </div>
            ) : (
              securityLogs.map(log => (
                <div key={log._id} style={{
                  padding: "8px 12px",
                  background: "rgba(15, 23, 42, 0.5)",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.8rem"
                }}>
                  <div>
                    <strong>{log.email}</strong> — <span style={{ color: "var(--text-dim)" }}>{log.action}</span>
                  </div>
                  <span className={`badge ${log.status === "SUCCESS" ? "badge-success" : "badge-critical"}`} style={{ fontSize: "0.7rem" }}>
                    {log.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
