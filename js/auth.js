// js/auth.js
import { auth, db } from "./firebase-config.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
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

export async function loginWithGoogle() {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    alert("Sign-in failed: " + error.message);
  }
}

export async function sendMagicLink(email) {
  const actionCodeSettings = {
    url: window.location.origin + window.location.pathname,
    handleCodeInApp: true
  };
  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem("ifgf_email_for_signin", email);
    return { success: true };
  } catch (error) {
    console.error("Magic Link Error:", error);
    return { success: false, message: error.message };
  }
}

// Cek apakah halaman dibuka dari klik Email Magic Link
export async function completeMagicLinkIfPresent() {
  try {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem("ifgf_email_for_signin");
      if (!email) {
        email = window.prompt("Please confirm your email address to complete sign-in:");
      }
      if (email) {
        try {
          await signInWithEmailLink(auth, email, window.location.href);
          window.localStorage.removeItem("ifgf_email_for_signin");
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          alert("Magic link expired or invalid: " + error.message);
        }
      }
    }
  } catch (err) {
    console.warn("Magic link check skipped:", err);
  }
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

  completeMagicLinkIfPresent().finally(startObserver);
}
