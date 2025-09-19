import React, { useState } from "react";
import axios from "axios";
import { deriveWrappingKeyFromPassword, unwrapMasterKey } from "../utils/keyMgmt";
import { useNavigate } from "react-router-dom";
import LoginForm from "../components/LoginForm";

function LoginPage({ setToken }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    async function handleLogin(e) {
        e.preventDefault();
        try {
            const r = await axios.post("http://localhost:5000/api/get-wrapped-key", { email });
            const { wrappedMasterKeyB64, ivB64, saltB64, token } = r.data;

            const wrappingKey = await deriveWrappingKeyFromPassword(password, saltB64);
            const masterKey = await unwrapMasterKey(wrappedMasterKeyB64, ivB64, wrappingKey);

            window.__MASTER_KEY = masterKey;

            localStorage.setItem("authToken", "dummy-session-token"); // TODO use JWT
            setToken("dummy-session-token"); //update token state in App.jsx

            alert("Login successful — master key unwrapped!");

            //export and store master key in localStorage
            const exportedKey = await crypto.subtle.exportKey("raw", masterKey);
            localStorage.setItem(
                "masterKeyB64",
                btoa(String.fromCharCode(...new Uint8Array(exportedKey)))
            );

            navigate("/");
        } catch (err) {
            console.error(err);
            alert("Login failed");
        }
    }

    return (
        <div className="auth-container">
            <h2>Login</h2>
            <LoginForm
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                handleLogin={handleLogin}
            />
            <p>
                Don't have an account? <a href="/signup">Sign up</a>
            </p>
        </div>
    );
}

export default LoginPage;