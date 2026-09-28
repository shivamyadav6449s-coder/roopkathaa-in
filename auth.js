/* ==========================================================
   ROOPKATHAA.IN — LOGIN / REGISTER / FORGOT / RESET PASSWORD
   Client-side logic for login.html and reset-password.html.
   Talks to the real backend API in /server (server.js + auth.js)
   — nothing here is a fake/visual-only form.
========================================================== */

(function () {
    "use strict";

    var API_BASE = "/api/auth";

    /* ---------- tiny helpers ---------- */

    function $(id) { return document.getElementById(id); }

    function postJson(path, body) {
        return fetch(API_BASE + path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body || {})
        }).then(function (res) {
            return res.json().then(function (data) {
                return { ok: res.ok, status: res.status, data: data };
            });
        }).catch(function () {
            return { ok: false, status: 0, data: { error: "Could not reach the server. Is it running?" } };
        });
    }

    function showAlert(el, message, isSuccess) {
        if (!el) return;
        el.textContent = message;
        el.hidden = !message;
        el.classList.toggle("success", !!isSuccess);
    }

    function clearFieldErrors(form) {
        form.querySelectorAll(".field-error").forEach(function (el) { el.textContent = ""; });
        form.querySelectorAll(".input-error").forEach(function (el) { el.classList.remove("input-error"); });
    }

    function setFieldError(form, fieldName, message) {
        var input = form.querySelector("[name=" + fieldName + "]");
        var errorEl = form.querySelector("#" + fieldName + "Error, [id$='" + capitalize(fieldName) + "Error']");
        if (input) input.classList.add("input-error");
        // Fall back: look for an error span right after the field by matching id prefix.
        if (!errorEl && input) {
            errorEl = document.getElementById(input.id + "Error");
        }
        if (errorEl) errorEl.textContent = message;
    }

    function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
    }

    function isValidMobile(mobile) {
        return /^[6-9]\d{9}$/.test(String(mobile).trim());
    }

    function isStrongPassword(pw) {
        return typeof pw === "string" && pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
    }

    function setLoading(btn, loading, label) {
        if (!btn) return;
        btn.disabled = loading;
        btn.textContent = loading ? "PLEASE WAIT…" : label;
    }

    function redirectHome() {
        // If we got sent here from a specific place (e.g. checkout
        // redirected a guest here to log in first), go back there
        // instead of always landing on "/". Only ever follow a
        // same-site path (starts with a single "/", never "//..."),
        // so this can't be used to redirect somewhere off-site.
        var params = new URLSearchParams(window.location.search);
        var redirect = params.get("redirect");
        if (redirect && redirect.charAt(0) === "/" && redirect.charAt(1) !== "/") {
            window.location.href = redirect;
            return;
        }
        window.location.href = "/";
    }

    /* ---------- show / hide password ---------- */

    document.querySelectorAll(".toggle-pw").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var target = $(btn.getAttribute("data-target"));
            if (!target) return;
            var showing = target.type === "text";
            target.type = showing ? "password" : "text";
            btn.textContent = showing ? "Show" : "Hide";
        });
    });

    /* ================= LOGIN PAGE (login.html) ================= */

    var authTabs = $("authTabs");
    if (authTabs) {
        var views = {
            login: $("loginForm"),
            register: $("registerForm"),
            forgot: $("forgotForm")
        };

        function switchView(name) {
            Object.keys(views).forEach(function (key) {
                if (views[key]) views[key].hidden = key !== name;
            });
            authTabs.querySelectorAll(".auth-tab").forEach(function (tab) {
                tab.classList.toggle("active", tab.getAttribute("data-tab") === name);
            });
            // Forgot password has no tab of its own — clear active state.
            if (name === "forgot") {
                authTabs.querySelectorAll(".auth-tab").forEach(function (tab) { tab.classList.remove("active"); });
            }
        }

        authTabs.querySelectorAll(".auth-tab").forEach(function (tab) {
            tab.addEventListener("click", function () {
                switchView(tab.getAttribute("data-tab"));
            });
        });

        document.querySelectorAll("[data-switch]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                switchView(btn.getAttribute("data-switch"));
            });
        });

        var forgotLink = $("forgotPasswordLink");
        if (forgotLink) {
            forgotLink.addEventListener("click", function () { switchView("forgot"); });
        }

        /* ---- LOGIN submit ---- */
        var loginForm = $("loginForm");
        loginForm.addEventListener("submit", function (e) {
            e.preventDefault();
            clearFieldErrors(loginForm);
            showAlert($("loginAlert"), "");

            var email = $("loginEmail").value.trim();
            var password = $("loginPassword").value;
            var remember = $("rememberMe").checked;

            var hasError = false;
            if (!email) { setFieldError(loginForm, "email", "Email is required"); hasError = true; }
            else if (!isValidEmail(email)) { setFieldError(loginForm, "email", "Enter a valid email address"); hasError = true; }
            if (!password) { setFieldError(loginForm, "password", "Password is required"); hasError = true; }
            if (hasError) return;

            setLoading($("loginSubmitBtn"), true, "LOGIN");
            postJson("/login", { email: email, password: password, remember: remember }).then(function (res) {
                setLoading($("loginSubmitBtn"), false, "LOGIN");
                if (res.ok) {
                    redirectHome();
                } else {
                    showAlert($("loginAlert"), (res.data && res.data.error) || "Something went wrong. Please try again.");
                }
            });
        });

        /* ---- REGISTER submit ---- */
        var registerForm = $("registerForm");
        registerForm.addEventListener("submit", function (e) {
            e.preventDefault();
            clearFieldErrors(registerForm);
            showAlert($("registerAlert"), "");

            var fullName = $("regFullName").value.trim();
            var email = $("regEmail").value.trim();
            var mobile = $("regMobile").value.trim();
            var password = $("regPassword").value;
            var confirmPassword = $("regConfirmPassword").value;

            var hasError = false;
            if (!fullName) { setFieldError(registerForm, "fullName", "Full name is required"); hasError = true; }
            if (!email) { setFieldError(registerForm, "email", "Email is required"); hasError = true; }
            else if (!isValidEmail(email)) { setFieldError(registerForm, "email", "Enter a valid email address"); hasError = true; }
            if (!mobile) { setFieldError(registerForm, "mobile", "Mobile number is required"); hasError = true; }
            else if (!isValidMobile(mobile)) { setFieldError(registerForm, "mobile", "Enter a valid 10-digit mobile number"); hasError = true; }
            if (!password) { setFieldError(registerForm, "password", "Password is required"); hasError = true; }
            else if (!isStrongPassword(password)) { setFieldError(registerForm, "password", "At least 8 characters, with a letter and a number"); hasError = true; }
            if (!confirmPassword) { setFieldError(registerForm, "confirmPassword", "Please confirm your password"); hasError = true; }
            else if (password !== confirmPassword) { setFieldError(registerForm, "confirmPassword", "Passwords do not match"); hasError = true; }
            if (hasError) return;

            setLoading($("registerSubmitBtn"), true, "CREATE ACCOUNT");
            postJson("/register", {
                fullName: fullName, email: email, mobile: mobile,
                password: password, confirmPassword: confirmPassword
            }).then(function (res) {
                setLoading($("registerSubmitBtn"), false, "CREATE ACCOUNT");
                if (res.ok) {
                    redirectHome();
                    return;
                }
                if (res.data && res.data.errors) {
                    Object.keys(res.data.errors).forEach(function (field) {
                        setFieldError(registerForm, field, res.data.errors[field]);
                    });
                } else {
                    showAlert($("registerAlert"), (res.data && res.data.error) || "Something went wrong. Please try again.");
                }
            });
        });

        /* ---- FORGOT PASSWORD submit ---- */
        var forgotForm = $("forgotForm");
        forgotForm.addEventListener("submit", function (e) {
            e.preventDefault();
            clearFieldErrors(forgotForm);
            showAlert($("forgotAlert"), "");
            $("resetLinkBox").hidden = true;

            var email = $("forgotEmail").value.trim();
            if (!email) { setFieldError(forgotForm, "email", "Email is required"); return; }
            if (!isValidEmail(email)) { setFieldError(forgotForm, "email", "Enter a valid email address"); return; }

            setLoading($("forgotSubmitBtn"), true, "SEND RESET LINK");
            postJson("/forgot-password", { email: email }).then(function (res) {
                setLoading($("forgotSubmitBtn"), false, "SEND RESET LINK");
                if (res.ok) {
                    showAlert($("forgotAlert"), res.data.message || "If that email is registered, a reset link has been generated.", true);
                    if (res.data.resetLink) {
                        var anchor = $("resetLinkAnchor");
                        anchor.href = res.data.resetLink;
                        anchor.textContent = res.data.resetLink;
                        $("resetLinkBox").hidden = false;
                    }
                } else {
                    showAlert($("forgotAlert"), (res.data && res.data.error) || "Something went wrong. Please try again.");
                }
            });
        });
    }

    /* ================= RESET PASSWORD PAGE (reset-password.html) ================= */

    var resetForm = $("resetForm");
    if (resetForm) {
        var params = new URLSearchParams(window.location.search);
        var token = params.get("token");

        resetForm.addEventListener("submit", function (e) {
            e.preventDefault();
            clearFieldErrors(resetForm);
            showAlert($("resetAlert"), "");

            var newPassword = $("newPassword").value;
            var confirmNewPassword = $("confirmNewPassword").value;

            var hasError = false;
            if (!token) {
                showAlert($("resetAlert"), "This reset link is missing its token. Please request a new one from the login page.");
                return;
            }
            if (!newPassword) { setFieldError(resetForm, "newPassword", "Password is required"); hasError = true; }
            else if (!isStrongPassword(newPassword)) { setFieldError(resetForm, "newPassword", "At least 8 characters, with a letter and a number"); hasError = true; }
            if (!confirmNewPassword) { setFieldError(resetForm, "confirmNewPassword", "Please confirm your password"); hasError = true; }
            else if (newPassword !== confirmNewPassword) { setFieldError(resetForm, "confirmNewPassword", "Passwords do not match"); hasError = true; }
            if (hasError) return;

            setLoading($("resetSubmitBtn"), true, "RESET PASSWORD");
            postJson("/reset-password", {
                token: token, newPassword: newPassword, confirmPassword: confirmNewPassword
            }).then(function (res) {
                setLoading($("resetSubmitBtn"), false, "RESET PASSWORD");
                if (res.ok) {
                    showAlert($("resetAlert"), (res.data.message || "Password updated.") + " Redirecting to login…", true);
                    setTimeout(function () { window.location.href = "/login.html"; }, 1600);
                } else {
                    showAlert($("resetAlert"), (res.data && res.data.error) || "Something went wrong. Please try again.");
                }
            });
        });
    }
})();
