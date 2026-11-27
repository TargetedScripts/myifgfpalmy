// js/auth.js
import { auth, db } from "./firebase-config.js";
import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Whitelist email Super Admin awal sebelum database disciples terisi
const BOOTSTRAP_ADMINS = [
  "admin@ifgfpalmy.org",
  "tedysutedja@gmail.com"
];

function withTimeout(promise, ms = 8000, fallbackValue = null) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallbackValue), ms))
  ]);
}

function formatAuthError(error) {
  const code = error?.code || "";
  if (code === "auth/unauthorized-domain") {
    return "Domain belum terdaftar di Firebase Authentication Authorized Domains.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Google Sign-In belum diaktifkan di Firebase Authentication -> Sign-in method.";
  }
  if (code === "auth/network-request-failed") {
    return "Koneksi jaringan gagal saat menghubungi Google Sign-In.";
  }
  return error?.message || "Authentication failed.";
}

// Gunakan Redirect agar bebas blokir COOP / Pop-up Blocker di subdomain
export async function loginWithGoogle() {
  try {
    await signInWithRedirect(auth, googleProvider);
    return { success: true, redirecting: true };
  } catch (error) {
    console.error("Google Redirect Sign-In Error:", error);
    const message = formatAuthError(error);
    alert("Sign-in failed: " + message);
    return { success: false, code: error?.code || "auth/unknown", message, error };
  }
}

export async function sendMagicLink(email) {
  const cleanEmail = (email || "").trim();
  const actionCodeSettings = {
    url: window.location.origin + window.location.pathname,
    handleCodeInApp: true
  };
  try {
    await sendSignInLinkToEmail(auth, cleanEmail, actionCodeSettings);
    window.localStorage.setItem("ifgf_email_for_signin", cleanEmail);
    return { success: true };
  } catch (error) {
    console.error("Magic Link Error:", error);
    return { success: false, code: error?.code || "auth/unknown", message: formatAuthError(error) };
  }
}

// Tangkap hasil redirect Google Sign-In maupun Email Magic Link saat halaman dimuat
export async function completePendingSignIn() {
  try {
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult?.user) {
      return redirectResult.user;
    }
  } catch (error) {
    console.error("Redirect result error:", error);
    alert("Google Sign-In gagal diselesaikan: " + formatAuthError(error));
  }

  try {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem("ifgf_email_for_signin");
      if (!email) {
        email = window.prompt("Please confirm your email address to complete sign-in:");
      }
      if (email) {
        try {
          const linkResult = await signInWithEmailLink(auth, email.trim(), window.location.href);
          window.localStorage.removeItem("ifgf_email_for_signin");
          window.history.replaceState({}, document.title, window.location.pathname);
          return linkResult.user;
        } catch (error) {
          console.error("Magic link sign-in failed:", error);
          alert("Magic link expired or invalid: " + formatAuthError(error));
        }
      }
    }
  } catch (err) {
    console.warn("Magic link check skipped:", err);
  }

  return null;
}

export async function logoutUser() {
  await signOut(auth);
}

function extractLeadEmails(deptData) {
  const raw = deptData?.lead_emails || deptData?.lead_email || deptData?.head_email || [];
  if (Array.isArray(raw)) {
    return raw.map(e => (e || "").toString().trim().toLowerCase()).filter(Boolean);
  }
  return raw
    .toString()
    .split(/[,;\n]+/)
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

async function findDepartmentsLedByEmail(email) {
  if (!email) return [];
  try {
    const snap = await withTimeout(getDocs(collection(db, "departments")), 7000, null);
    if (!snap) return [];
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(d => d.active !== false && d.is_active !== false)
      .filter(d => extractLeadEmails(d).includes(email));
  } catch (err) {
    console.warn("findDepartmentsLedByEmail fallback:", err);
    return [];
  }
}

// Resolusi RBAC & Profil Disciple + Department Lead
export async function resolveUserProfile(user) {
  const email = (user?.email || "").trim().toLowerCase();
  const isBootstrapAdmin = BOOTSTRAP_ADMINS.includes(email);

  const fallbackProfile = {
    uid: user.uid,
    email,
    displayName: user.displayName || email.split("@")[0] || "User",
    discipleDoc: null,
    ledDepartments: [],
    accessLevel: isBootstrapAdmin ? "super_admin" : "member",
    isAdmin: isBootstrapAdmin
  };

  if (!email) return fallbackProfile;

  try {
    const [discipleSnap, ledDepartments] = await Promise.all([
      withTimeout(
        getDocs(query(collection(db, "disciples"), where("email", "==", email))),
        7000,
        null
      ),
      findDepartmentsLedByEmail(email)
    ]);

    const data = discipleSnap && !discipleSnap.empty
      ? { id: discipleSnap.docs[0].id, ...discipleSnap.docs[0].data() }
      : null;

    const coordDepts = Array.isArray(data?.coordinator_departments)
      ? data.coordinator_departments
      : [];

    let accessLevel = data ? "member" : "unregistered";
    if (isBootstrapAdmin || data?.system_role === "super_admin") {
      accessLevel = "super_admin";
    } else if (ledDepartments.length > 0) {
      accessLevel = "department_lead";
    } else if (coordDepts.length > 0) {
      accessLevel = "coordinator";
    } else if (data?.has_active_roles === true) {
      accessLevel = "volunteer";
    }

    return {
      uid: user.uid,
      email,
      displayName: data?.full_name || user.displayName || email.split("@")[0],
      discipleDoc: data,
      ledDepartments,
      accessLevel,
      isAdmin: accessLevel === "super_admin"
    };
  } catch (err) {
    console.warn("resolveUserProfile fallback used:", err);
    return fallbackProfile;
  }
}

export function initAuthObserver(onUserReady, onUserSignedOut) {
  let settled = false;

  const startObserver = () => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await resolveUserProfile(user);
        settled = true;
        if (typeof onUserReady === "function") {
          onUserReady(profile);
        }
      } else {
        settled = true;
        if (typeof onUserSignedOut === "function") {
          onUserSignedOut();
        }
      }
    }, (err) => {
      console.error("Auth observer error:", err);
      if (!settled) {
        settled = true;
        if (typeof onUserSignedOut === "function") {
          onUserSignedOut();
        }
      }
    });
  };

  completePendingSignIn().finally(startObserver);
}
