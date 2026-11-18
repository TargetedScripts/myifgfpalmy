
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

// Resolusi RBAC & Profil Disciple
export async function resolveUserProfile(user) {
  const email = user.email.toLowerCase();
  const isBootstrapAdmin = BOOTSTRAP_ADMINS.includes(email);

  const q = query(collection(db, "disciples"), where("email", "==", email));
  const snap = await getDocs(q);

  if (snap.empty) {
    return {
      uid: user.uid,
      email: email,
      displayName: user.displayName || email.split("@")[0],
      discipleDoc: null,
      accessLevel: isBootstrapAdmin ? "super_admin" : "unregistered"
    };
  }

  const docSnap = snap.docs[0];
  const data = { id: docSnap.id, ...docSnap.data() };

  // Penentuan RBAC sesuai Master Spec Bagian 2
  let accessLevel = "member";
  if (isBootstrapAdmin || data.system_role === "super_admin") {
    accessLevel = "super_admin";
  } else if (data.coordinator_departments && data.coordinator_departments.length > 0) {
    accessLevel = "coordinator";
  } else if (data.has_active_roles === true) {
    accessLevel = "volunteer";
  }

  return {
    uid: user.uid,
    email: email,
    displayName: data.full_name || user.displayName || email,
    discipleDoc: data,
    accessLevel
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
