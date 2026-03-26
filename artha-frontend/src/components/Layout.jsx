import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Layout({ children }) {
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("artha_jwt");
        const userId = localStorage.getItem("artha_user_id");

        if (!token || !userId) {
            navigate("/auth", { replace: true });
        }
    }, [navigate]);

    return (
        <>
            {children}
        </>
    );
}

export default Layout;
