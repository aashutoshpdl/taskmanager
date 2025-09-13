// pages/Home.tsx
import React from "react";
import { useAuth } from "../context/useauth";
import { useNavigate } from "react-router-dom";

const Home: React.FC = () => {
  const { signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    await signInWithGoogle();
    navigate("/dashboard");
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      {user ? (
        <button onClick={() => navigate("/dashboard")}>Go to Dashboard</button>
      ) : (
        <button onClick={handleLogin}>Sign in with Google</button>
      )}
    </div>
  );
};

export default Home;