import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import DrivePage from "./pages/DrivePage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";

function App() {
    const [token, setToken] = useState(localStorage.getItem("authToken"));

    useEffect(() => {
        const handleStorage = () => setToken(localStorage.getItem("authToken"));
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    return (
        <Router>
            <Routes>
                <Route
                    path="/"
                    element={token ? <DrivePage /> : <Navigate to="/login" />}
                />
                <Route path="/login" element={<LoginPage setToken={setToken} />} />
                <Route path="/signup" element={<SignUpPage />} />
            </Routes>
        </Router>
    );
}

export default App;