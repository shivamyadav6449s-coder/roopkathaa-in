/* ==========================================================
   ROOPKATHAA.IN — AUTH GUARD (for index.html / the shop pages)
   ----------------------------------------------------------
   The shop is public now — guests can browse everything without
   logging in. This script just checks (quietly, in the background)
   whether the visitor happens to already be logged in:
     - if yes: shows their name in the navbar instead of a bare
       icon, and wires up the Logout button
     - if no: leaves the navbar as a plain "Login" entry point —
       it does NOT redirect anyone away from the page
   Login is only actually required later, at checkout (see the
   auth check inside openCheckout() in script.js). Other scripts
   can check window.RK_AUTH.loggedIn to see the result of this
   check once it has run.
========================================================== */

(function () {
    "use strict";

    function $(id) { return document.getElementById(id); }

    window.RK_AUTH = { loggedIn: false, user: null };

    function goToLogin() {
        window.location.href = "/login.html";
    }

    function firstName(fullName) {
        return String(fullName || "").trim().split(/\s+/)[0] || "Account";
    }

    function wireGuestAccountButton() {
        var accountBtn = $("accountBtn");
        if (accountBtn) {
            accountBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                goToLogin();
            });
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        fetch("/api/auth/me", { credentials: "include" })
            .then(function (res) {
                if (!res.ok) throw new Error("not authenticated");
                return res.json();
            })
            .then(function (data) {
                var user = data.user;
                if (!user) throw new Error("no user");

                window.RK_AUTH = { loggedIn: true, user: user };

                var nameEl = $("navUserName");
                var dropdownName = $("dropdownUserName");
                var dropdownEmail = $("dropdownUserEmail");

                if (nameEl) nameEl.textContent = firstName(user.fullName);
                if (dropdownName) dropdownName.textContent = user.fullName;
                if (dropdownEmail) dropdownEmail.textContent = user.email;

                var accountBtn = $("accountBtn");
                var dropdown = $("accountDropdown");
                if (accountBtn && dropdown) {
                    accountBtn.addEventListener("click", function (e) {
                        e.stopPropagation();
                        dropdown.hidden = !dropdown.hidden;
                    });
                    document.addEventListener("click", function (e) {
                        if (!dropdown.hidden && !dropdown.contains(e.target) && e.target !== accountBtn) {
                            dropdown.hidden = true;
                        }
                    });
                }

                var logoutBtn = $("logoutBtn");
                if (logoutBtn) {
                    logoutBtn.addEventListener("click", function () {
                        fetch("/api/auth/logout", { method: "POST", credentials: "include" })
                            .then(goToLogin)
                            .catch(goToLogin);
                    });
                }
            })
            .catch(function () {
                // Not logged in — that's fine, the visitor is a guest.
                // Don't redirect; just leave the account icon as a
                // plain link to the login page.
                window.RK_AUTH = { loggedIn: false, user: null };
                wireGuestAccountButton();
            });
    });
})();
