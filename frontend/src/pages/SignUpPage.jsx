import React, { useState } from "react";
import axios from "axios";
import { deriveWrappingKeyFromPassword, wrapMasterKey } from "../utils/keyMgmt";
import { useNavigate } from "react-router-dom";
import SignUpForm from "../components/SignUpForm";

function SignUpPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    async function handleSignUp(e) {
        e.preventDefault();
        try {
            //generate new master key for this user
            const masterKey = await crypto.subtle.generateKey(
                { name: "AES-GCM", length: 256 },
                true,
                ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
            );

            //derive wrapping key from password
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const { wrappedMasterKeyB64, ivB64, saltB64 } = await wrapMasterKey(masterKey, password, salt);

            // send to backend
            await axios.post("http://localhost:5000/api/register", {
                email,
                wrappedMasterKeyB64,
                ivB64,
                saltB64,
            });

            alert("Account created! Please log in.");
            navigate("/login");
        } catch (err) {
            console.error(err);
            alert("Signup failed");
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
            <h2>Sign Up</h2>
            <SignUpForm
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                handleSignUp={handleSignUp}
            />
            <p>
                Already have an account? <a href="/login">Login</a>
            </p>
        </div>
        </>
    );
}

export default SignUpPage;