document.addEventListener("DOMContentLoaded", async () => {
  // Already signed in? Skip straight to the dashboard.
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    window.location.href = "index.html";
    return;
  }

  const form = document.getElementById("login-form");
  const errorBox = document.getElementById("login-error");
  const submitBtn = document.getElementById("login-submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in...";

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign in";
      return;
    }

    window.location.href = "index.html";
  });
});
