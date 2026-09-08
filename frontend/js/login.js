// =========================================================
// LOGIN
// =========================================================

const loginForm =
    document.getElementById("login-form");


loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const email =
            document
                .getElementById("email")
                .value
                .trim();


        const password =
            document
                .getElementById("password")
                .value;


        const errorElement =
            document.getElementById("error-msg");


        const buttonText =
            document.getElementById("login-btn-text");


        const spinner =
            document.getElementById("login-spinner");


        errorElement.textContent = "";


        buttonText.textContent =
            "Signing in...";

        spinner.classList.remove("hidden");


        try {

            /*
             * API_BASE already ends with /api.
             *
             * Therefore:
             *
             * /auth/login
             *
             * becomes:
             *
             * http://localhost:8080/api/auth/login
             */

            const data =
                await apiRequest(
                    "/auth/login",
                    "POST",
                    {
                        email,
                        password
                    },
                    false
                );


            localStorage.setItem(
                "token",
                data.access_token
            );


            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );


            window.location.href =
                "dashboard.html";


        } catch (error) {

            errorElement.textContent =
                error.message ||
                "Invalid email or password";


        } finally {

            buttonText.textContent =
                "Sign in";

            spinner.classList.add("hidden");

        }

    }
);