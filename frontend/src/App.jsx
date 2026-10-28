import React, { useState, useEffect } from "react";
import { api } from "./services/api";
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import CustomerDashboard from "./components/CustomerDashboard";
import AdminFraudCenter from "./components/AdminFraudCenter";
import {
  TransferModal,
  BeneficiaryModal,
  LoanModal,
  NewAccountModal,
  DepositModal,
  FDModal,
  ProfileModal,
  StatementModal
} from "./components/Modals";

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("customer");
  const [accounts, setAccounts] = useState([]);

  // ── Existing modal states ──
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferPrefill, setTransferPrefill] = useState("");
  const [beneficiaryModalOpen, setBeneficiaryModalOpen] = useState(false);
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [newAccountModalOpen, setNewAccountModalOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);

  // ── NEW modal states ──
  const [fdModalOpen, setFdModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [statementModalOpen, setStatementModalOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("bank_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("bank_user");
        localStorage.removeItem("bank_token");
      }
    }
  }, []);

  const userId = user?._id || user?.id;

  useEffect(() => {
    if (userId) {
      loadAccounts();
    }
  }, [user]);

  const loadAccounts = async () => {
    try {
      const accs = await api.getCustomerAccounts(userId);
      setAccounts(accs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("bank_user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setAccounts([]);
    localStorage.removeItem("bank_user");
    localStorage.removeItem("bank_token");
  };

  const handleOpenTransfer = (prefillAccount) => {
    setTransferPrefill(prefillAccount || "");
    setTransferModalOpen(true);
  };

  const handleTransferSuccess = () => {
    setTransferModalOpen(false);
    loadAccounts();
  };

  const handleAccountCreated = () => {
    setNewAccountModalOpen(false);
    loadAccounts();
  };

  const handleDepositSuccess = () => {
    setDepositModalOpen(false);
    loadAccounts();
  };

  // ── NEW: FD creation success ──
  const handleFDSuccess = () => {
    setFdModalOpen(false);
    loadAccounts();
  };

  // ── NEW: Profile update success ──
  const handleProfileSuccess = (updatedUser) => {
    setProfileModalOpen(false);
    if (updatedUser) {
      setUser(updatedUser);
    }
  };

  if (!user) {
    return <AuthModal onLogin={handleLogin} />;
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />

      {activeTab === "customer" ? (
        <CustomerDashboard
          user={user}
          accounts={accounts}
          onRefreshAccounts={loadAccounts}
          onOpenTransfer={handleOpenTransfer}
          onOpenBeneficiary={() => setBeneficiaryModalOpen(true)}
          onOpenLoan={() => setLoanModalOpen(true)}
          onOpenNewAccount={() => setNewAccountModalOpen(true)}
          onOpenDeposit={() => setDepositModalOpen(true)}
          onOpenFD={() => setFdModalOpen(true)}
          onOpenProfile={() => setProfileModalOpen(true)}
          onOpenStatement={() => setStatementModalOpen(true)}
        />
      ) : (
        <AdminFraudCenter />
      )}

      {/* ── Existing Modals ── */}
      {transferModalOpen && (
        <TransferModal
          accounts={accounts}
          prefillToAccount={transferPrefill}
          onClose={() => setTransferModalOpen(false)}
          onSuccess={handleTransferSuccess}
        />
      )}

      {beneficiaryModalOpen && (
        <BeneficiaryModal
          user={user}
          onClose={() => setBeneficiaryModalOpen(false)}
          onSuccess={() => setBeneficiaryModalOpen(false)}
        />
      )}

      {loanModalOpen && (
        <LoanModal
          user={user}
          onClose={() => setLoanModalOpen(false)}
          onSuccess={() => setLoanModalOpen(false)}
        />
      )}

      {newAccountModalOpen && (
        <NewAccountModal
          user={user}
          onClose={() => setNewAccountModalOpen(false)}
          onSuccess={handleAccountCreated}
        />
      )}

      {depositModalOpen && (
        <DepositModal
          accounts={accounts}
          onClose={() => setDepositModalOpen(false)}
          onSuccess={handleDepositSuccess}
        />
      )}

      {/* ── NEW Modals ── */}
      {fdModalOpen && (
        <FDModal
          user={user}
          accounts={accounts}
          onClose={() => setFdModalOpen(false)}
          onSuccess={handleFDSuccess}
        />
      )}

      {profileModalOpen && (
        <ProfileModal
          user={user}
          onClose={() => setProfileModalOpen(false)}
          onSuccess={handleProfileSuccess}
        />
      )}

      {statementModalOpen && (
        <StatementModal
          accounts={accounts}
          onClose={() => setStatementModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
