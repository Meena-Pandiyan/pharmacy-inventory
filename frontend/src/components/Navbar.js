import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <div style={{ background: "#222", color: "#fff", padding: 10 }}>
      <Link to="/dashboard">Dashboard</Link> | 
      <Link to="/medicines"> Medicines</Link> | 
      <Link to="/suppliers"> Suppliers</Link> | 
      <Link to="/sales"> Sales</Link> | 
      <Link to="/reports"> Reports</Link> | 
      <Link to="/expiry"> Expiry</Link>
    </div>
  );
}