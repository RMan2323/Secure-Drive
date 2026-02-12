import React from "react";

function SignUpForm({ email, setEmail, password, setPassword, handleSignUp }) {
  return (
    <form className="auth-form" onSubmit={handleSignUp}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit" className="primary-btn">Sign Up</button>
    </form>
  );
}

export default SignUpForm;