
// =========================================================
// LOGIN - ADMIN / STAFF + MFA SUPPORT
// =========================================================

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
        const data = await apiRequest(
            "/auth/login",
            "POST",
            { email, password },
            false
        );

        // -------------------------------------------------
        // ADMIN MFA REQUIRED
        // -------------------------------------------------
        if (data.mfa_required === true) {
            if (!data.mfa_token) {
                throw new Error(
                    "Login verification could not start. Please try again."
                );
            }

            // Do not save the temporary MFA token as a login token.
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            localStorage.setItem("mfa_token", data.mfa_token);

            errorElement.textContent =
                "Additional verification is required. OTP verification must be completed before accessing the dashboard.";

            return;
        }

        // -------------------------------------------------
        // NORMAL LOGIN
        // -------------------------------------------------
        if (
            typeof data.access_token !== "string" ||
            !data.access_token.trim() ||
            data.access_token === "undefined"
        ) {
            throw new Error(
                "Login failed: the server did not return a valid access token."
            );
        }

        if (
            !data.user ||
            typeof data.user !== "object" ||
            !data.user.role
        ) {
            throw new Error(
                "Login failed: user information was missing from the server response."
            );
        }

        // Save only validated login information.
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Clear any previous MFA challenge.
        localStorage.removeItem("mfa_token");

        // Navigate only after successful login.
        window.location.href = "dashboard.html";

    } catch (error) {
        console.error("Login error:", error);

        // Never display whether a particular email exists.
        errorElement.textContent =
            "Invalid email or password.";
    } finally {
        buttonText.textContent = "Sign in";
        spinner.classList.add("hidden");
    }
});
