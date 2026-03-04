import { Link, useNavigate } from "react-router-dom";
import "../styles.css";

function Navbar() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("artha_jwt");
        localStorage.removeItem("artha_user_id");
        navigate("/auth", { replace: true });
    };

    return (
        <nav className="app-navbar">
            <div className="navbar-container">
                <div className="navbar-logo">
                    <Link to="/dashboard">Artha</Link>
                </div>
                <ul className="navbar-links">
                    <li>
                        <Link to="/dashboard">Dashboard</Link>
                    </li>
                    <li>
                        <Link to="/profile">Profile</Link>
                    </li>
                    <li>
                        <button onClick={handleLogout} className="navbar-logout-btn">
                            Logout
                        </button>
                    </li>
                </ul>
            </div>
        </nav>
    );
}

export default Navbar;
