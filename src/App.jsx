import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function App() {
  const [session, setSession] = useState(null);
  const [file, setFile] = useState(null);

  // --- Load session and listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      console.log("SESSION ON LOAD:", data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      console.log("AUTH CHANGE:", session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Sign in (test account)
  const signIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "test@posevault.dev",
      password: "Test1234!",
    });
    if (error) return alert(`Sign-in failed: ${error.message}`);
    console.log("SIGNED IN:", data);
  };

  // --- Upload file to Worker/R2
  const uploadToR2 = async () => {
    if (!session) return alert("You must be signed in!");
    if (!file) return alert("Select a file first!");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("https://r2-worker.sitranephotography.workers.dev", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await res.json();
      if (!res.ok || !result.ok) {
        console.error("Upload failed:", result);
        return alert(`Upload failed: ${result.error || "Unknown error"}`);
      }

      console.log("UPLOAD RESULT:", result);
      alert(`Upload succeeded! File key: ${result.key}`);
    } catch (err) {
      console.error(err);
      alert("Upload failed (network error)");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>PoseVault Auth & Upload Test</h1>

      {!session ? (
        <button onClick={signIn}>Sign In</button>
      ) : (
        <>
          <p>Signed in as: {session.user.email}</p>

          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <button onClick={uploadToR2} style={{ marginLeft: 10 }}>
            Upload to R2
          </button>
        </>
      )}
    </div>
  );
}
