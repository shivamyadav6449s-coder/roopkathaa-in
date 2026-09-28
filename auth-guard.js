/* ==========================================================
   ROOPKATHAA.IN — AUTH GUARD (for index.html / the shop pages)
   ----------------------------------------------------------
   The server already refuses to serve "/" to anyone without a
   valid login session and redirects them to /login.html — that
   is the real protected route. This script is the second half:
   once the page IS loaded (meaning the visitor is genuinely
   logged in), it fetches who they are and:
     - shows their name in the navbar instead of a bare icon
     - wires up the Logout button
   It also redirects to the login page as a safety net if the
   session turns out to be invalid (e.g. it expired while this
   tab was sitting open).
========================================================== */

(function () {
    "use strict";

    function $(id) { return document.getElementById(id); }

    function goToLogin() {
        window.location.href = "/login.html";
    }

    function firstName(fullName) {
        return String(fullName || "").trim().split(/\s+/)[0] || "Account";
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
                goToLogin();
            });
    });
})();
