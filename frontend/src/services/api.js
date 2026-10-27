const API_BASE = "http://localhost:5000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("bank_token");
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { ...getAuthHeaders(), ...options.headers };
  
  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err.message);
    throw err;
  }
}

export const api = {
  // Authentication
  register: (body) => request("/customers/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/customers/login", { method: "POST", body: JSON.stringify(body) }),
  getAllCustomers: () => request("/customers/all"),
  getSecurityLogs: () => request("/customers/security-logs"),

  // Accounts
  createAccount: (body) => request("/accounts/create", { method: "POST", body: JSON.stringify(body) }),
  depositFunds: (body) => request("/accounts/deposit", { method: "POST", body: JSON.stringify(body) }),
  getCustomerAccounts: (customerId) => request(`/accounts/customer/${customerId}`),
  getAccountByNumber: (accountNumber) => request(`/accounts/details/${accountNumber}`),
  getAccountReport: () => request("/accounts/report"),
  getAllAccounts: () => request("/accounts/all"),

  // Transfers
  transferFunds: (body) => request("/transfers/transfer", { method: "POST", body: JSON.stringify(body) }),
  getTransferHistory: (accountNumber) => request(`/transfers/history/${accountNumber}`),
  getSpendingAnalytics: () => request("/transfers/analytics/spending"),

  // Beneficiaries
  addBeneficiary: (body) => request("/beneficiaries/add", { method: "POST", body: JSON.stringify(body) }),
  getCustomerBeneficiaries: (customerId) => request(`/beneficiaries/customer/${customerId}`),

  // Loans
  applyLoan: (body) => request("/loans/apply", { method: "POST", body: JSON.stringify(body) }),
  getCustomerLoans: (customerId) => request(`/loans/customer/${customerId}`),
  getLoanStats: () => request("/loans/stats"),
  updateLoanStatus: (id, status) => request(`/loans/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  // Fraud Monitoring
  getFraudAlerts: (params = "") => request(`/fraud-alerts${params ? `?${params}` : ""}`),
  getFraudStats: () => request("/fraud-alerts/stats"),
  updateFraudStatus: (id, status) => request(`/fraud-alerts/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  // Notifications (TTL backed)
  getNotifications: () => request("/notifications"),
  createNotification: (body) => request("/notifications/create", { method: "POST", body: JSON.stringify(body) })
};
