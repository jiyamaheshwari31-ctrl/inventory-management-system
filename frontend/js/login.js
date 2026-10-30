const loginForm = document.getElementById("login-form");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const errorElement = document.getElementById("error-msg");
    const buttonText = document.getElementById("login-btn-text");
    const spinner = document.getElementById("login-spinner");

    errorElement.textContent = "";
    buttonText.textContent = "Signing in...";
    spinner.classList.remove("hidden");

    try {
        // Step 1: Verify email and password.
        const data = await apiRequest(
            "/auth/login",
            "POST",
            { email, password },
            false
        );

        let loginData = data;

        // Step 2: If MFA is required, verify the authenticator code.
        if (data.mfa_required === true) {
            if (!data.mfa_token) {
                throw new Error("The server did not return an MFA challenge token.");
            }

            // Do not retain stale credentials from an earlier session.
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("access_token");

            const otp = window.prompt(
                "Enter the 6-digit code from your authenticator app:"
            );

            if (otp === null) {
                throw new Error("MFA verification cancelled. Please sign in again.");
            }

            const totpCode = otp.trim();

            if (!/^\d{6}$/.test(totpCode)) {
                throw new Error("Enter a valid 6-digit authenticator code.");
            }

            buttonText.textContent = "Verifying OTP...";

            const response = await fetch(
                `${API_BASE}/auth/mfa/verify-login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${data.mfa_token}`
                    },
                    body: JSON.stringify({
                        totp_code: totpCode
                    })
                }
            );

            loginData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    loginData.error ||
                    loginData.message ||
                    "MFA verification failed."
                );
            }
        }

        // Step 3: Save credentials only after successful authentication.
        if (
            typeof loginData.access_token !== "string" ||
            !loginData.access_token.trim() ||
            loginData.access_token === "undefined" ||
            !loginData.user ||
            typeof loginData.user !== "object" ||
            !loginData.user.role
        ) {
            throw new Error("Login response is missing valid user or token information.");
        }

        localStorage.setItem("token", loginData.access_token);
        localStorage.setItem("user", JSON.stringify(loginData.user));
        localStorage.removeItem("mfa_token");
        localStorage.removeItem("access_token");

        // Step 4: Open the dashboard only after authentication succeeds.
        window.location.href = "dashboard.html";

    } catch (error) {
        console.error("Login error:", error);
        errorElement.textContent = error.message || "Login failed. Please try again.";

    } finally {
        buttonText.textContent = "Sign in";
        spinner.classList.add("hidden");
    }
});