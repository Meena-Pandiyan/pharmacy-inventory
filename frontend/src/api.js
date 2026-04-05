import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login only on 401
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Auth
export const loginUser = (data) => API.post("/auth/login", data);
export const registerUser = (data) => API.post("/auth/register", data);

// Medicines
export const getMedicines = () => API.get("/medicines");
export const addMedicine = (data) => API.post("/medicines", data);
export const updateMedicine = (id, data) => API.put(`/medicines/${id}`, data);
export const deleteMedicine = (id) => API.delete(`/medicines/${id}`);

// Sales
export const getSales = () => API.get("/sales");
export const getSaleById = (id) => API.get(`/sales/${id}`);
export const addSale = (data) => API.post("/sales", data);

// Suppliers
export const getSuppliers = () => API.get("/suppliers");
export const getSupplierStats = () => API.get("/suppliers/stats");
export const getSupplierById = (id) => API.get(`/suppliers/${id}`);
export const addSupplier = (data) => API.post("/suppliers", data);
export const updateSupplier = (id, data) => API.put(`/suppliers/${id}`, data);
export const deleteSupplier = (id) => API.delete(`/suppliers/${id}`);

// Reports & Expiry
export const getReports = (params = {}) => API.get("/reports", { params });
export const getExpiry = () => API.get("/expiry");

// Purchase Orders
export const getPurchaseOrders = () => API.get("/purchase-orders");
export const updatePurchaseOrder = (id, data) => API.put(`/purchase-orders/${id}`, data);
export const createPurchaseOrder = (data) => API.post("/purchase-orders", data);
export const deletePurchaseOrder = (id) => API.delete(`/purchase-orders/${id}`);
export const sendPurchaseOrderEmail = (id) => API.post(`/purchase-orders/${id}/send-email`);

export default API;
