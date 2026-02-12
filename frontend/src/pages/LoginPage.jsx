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
            //get wrapped master key + salt
            const keyRes = await axios.post(
                "http://localhost:5000/api/get-wrapped-key",
                { email }
            );

            const { wrappedMasterKeyB64, ivB64, saltB64 } = keyRes.data;

            //derive wrapping key from password
            const wrappingKey = await deriveWrappingKeyFromPassword(password, saltB64);

            //unwrap master key
            const masterKey = await unwrapMasterKey(
                wrappedMasterKeyB64,
                ivB64,
                wrappingKey
            );

            window.__MASTER_KEY = masterKey;

            //now authenticate and get session token
            const loginRes = await axios.post(
                "http://localhost:5000/api/login",
                { email }
            );

            localStorage.setItem("authToken", loginRes.data.token);
            setToken(loginRes.data.token);

            //store master key
            const exportedKey = await crypto.subtle.exportKey("raw", masterKey);
            localStorage.setItem(
                "masterKeyB64",
                btoa(String.fromCharCode(...new Uint8Array(exportedKey)))
            );

            alert("Login successful — master key unwrapped!");
            navigate("/");
        } catch (err) {
            console.error(err);
            alert("Login failed");
        }
    }

    return (
        <>
            <header className="drive-header">
                <div role="heading" aria-level="1" className="header-title">
                    Secure Drive
                </div>
            </header>
            <div className="auth-container">
                <h2>Login</h2>
                <form className="auth-form" onSubmit={handleLogin}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="username"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                    />
                    <button type="submit" className="primary-btn">Login</button>
                </form>
                <p className="auth-switch">
                    Don't have an account? <a href="/signup">Sign Up</a>
                </p>
            </div>
        </>
    );
}

export default LoginPage;