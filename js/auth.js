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
  const snap = await getDocs(collection(db, "departments"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => d.active !== false && d.is_active !== false)
    .filter(d => extractLeadEmails(d).includes(email));
}

// Resolusi RBAC & Profil Disciple + Department Lead
export async function resolveUserProfile(user) {
  const email = (user.email || "").trim().toLowerCase();
  const isBootstrapAdmin = BOOTSTRAP_ADMINS.includes(email);

  const [discipleSnap, ledDepartments] = await Promise.all([
    getDocs(query(collection(db, "disciples"), where("email", "==", email))),
    findDepartmentsLedByEmail(email)
  ]);

  const data = !discipleSnap.empty
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
}

export function initAuthObserver(onUserReady, onUserSignedOut) {
  completeMagicLinkIfPresent();
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const profile = await resolveUserProfile(user);
      onUserReady(profile);
    } else {
      onUserSignedOut();
    }
  });
}
