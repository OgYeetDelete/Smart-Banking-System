import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import CustomerDashboard from "./components/CustomerDashboard";
import AdminFraudCenter from "./components/AdminFraudCenter";
import AuthModal from "./components/AuthModal";
import {
  TransferModal,
  BeneficiaryModal,
  LoanModal,
  NewAccountModal,
  DepositModal
} from "./components/Modals";
import { api } from "./services/api";

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("customer");
  const [accounts, setAccounts] = useState([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  // Modals state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [beneficiaryModalOpen, setBeneficiaryModalOpen] = useState(false);
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [newAccountModalOpen, setNewAccountModalOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [transferTargetAccount, setTransferTargetAccount] = useState("");

  // Check stored user on load
  useEffect(() => {
    const storedUser = localStorage.getItem("bank_user");
    const storedToken = localStorage.getItem("bank_token");
    if (storedUser && storedToken) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        if (parsed.role === "admin") {
          setActiveTab("admin");
        }
      } catch (e) {
        localStorage.clear();
      }
    }
  }, []);

  // Fetch accounts when user logs in
  useEffect(() => {
    if (user?.id) {
      loadCustomerAccounts();
    }
  }, [user]);

  // Periodic alert count check for admin
  useEffect(() => {
    if (user?.role === "admin") {
      const checkAlerts = async () => {
        try {
          const stats = await api.getFraudStats();
          setUnreadAlerts(stats?.pendingAlerts || 0);
        } catch (e) {}
      };
      checkAlerts();
      const intv = setInterval(checkAlerts, 5000);
      return () => clearInterval(intv);
    }
  }, [user]);

  const loadCustomerAccounts = async () => {
    try {
      const accList = await api.getCustomerAccounts(user.id);
      setAccounts(accList);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("bank_token");
    localStorage.removeItem("bank_user");
    setUser(null);
    setAccounts([]);
    setActiveTab("customer");
  };

  const handleOpenTransfer = (targetAcc = "") => {
    setTransferTargetAccount(targetAcc);
    setTransferModalOpen(true);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      
      {/* Navigation */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadAlertsCount={unreadAlerts}
      />

      {/* Main View Area */}
      <main style={{ flex: 1 }}>
        {!user ? (
          <AuthModal onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />
        ) : activeTab === "admin" && user.role === "admin" ? (
          <AdminFraudCenter />
        ) : (
          <CustomerDashboard
            user={user}
            accounts={accounts}
            onRefreshAccounts={loadCustomerAccounts}
            onOpenTransfer={handleOpenTransfer}
            onOpenBeneficiary={() => setBeneficiaryModalOpen(true)}
            onOpenLoan={() => setLoanModalOpen(true)}
            onOpenNewAccount={() => setNewAccountModalOpen(true)}
            onOpenDeposit={() => setDepositModalOpen(true)}
          />
        )}
      </main>

      {/* Modals */}
      {user && (
        <>
          <TransferModal
            isOpen={transferModalOpen}
            onClose={() => setTransferModalOpen(false)}
            accounts={accounts}
            defaultToAccount={transferTargetAccount}
            onSuccess={loadCustomerAccounts}
          />

          <BeneficiaryModal
            isOpen={beneficiaryModalOpen}
            onClose={() => setBeneficiaryModalOpen(false)}
            customerId={user.id}
            onSuccess={() => {}}
          />

          <LoanModal
            isOpen={loanModalOpen}
            onClose={() => setLoanModalOpen(false)}
            customerId={user.id}
            onSuccess={() => {}}
          />

          <NewAccountModal
            isOpen={newAccountModalOpen}
            onClose={() => setNewAccountModalOpen(false)}
            customerId={user.id}
            onSuccess={loadCustomerAccounts}
          />

          <DepositModal
            isOpen={depositModalOpen}
            onClose={() => setDepositModalOpen(false)}
            accounts={accounts}
            onSuccess={loadCustomerAccounts}
          />
        </>
      )}

      {/* Footer */}
      <footer style={{
        textAlign: "center",
        padding: "20px",
        fontSize: "0.8rem",
        color: "var(--text-dim)",
        borderTop: "1px solid var(--border-color)",
        background: "rgba(9, 13, 22, 0.8)"
      }}>
        Smart Digital Banking System with Real-Time Fraud Detection • Srijan Sengupta & Shubho Das • Review 3 Final Build
      </footer>

    </div>
  );
}
