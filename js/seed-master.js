// js/seed-master.js
import { db } from "./firebase-config.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const DEFAULT_DEPARTMENTS = [
  { id: "dept_pulpite", name: "PULPIT & EDITORIAL", sort_order: 1, active: true },
  { id: "dept_praise", name: "PRAISE & WORSHIP", sort_order: 2, active: true },
  { id: "dept_creative", name: "CREATIVE & PRODUCTION", sort_order: 3, active: true },
  { id: "dept_kitchen", name: "KITCHEN & CATERING", sort_order: 4, active: true },
  { id: "dept_welcome", name: "WELCOME & HOSPITALITY", sort_order: 5, active: true }
];

const DEFAULT_ROLES = [
  // PULPIT & EDITORIAL
  { id: "role_service_mc", name: "Service MC / Host", dept_id: "dept_pulpite", dept_name: "PULPIT & EDITORIAL", min_dj_level: "Come", can_reimburse: false, sort_order: 1, active: true },

  // PRAISE & WORSHIP (Worship Leader + Singer 1, 2, 3 berurutan sebagai satu kelompok)
  { id: "role_worship_leader", name: "Worship Leader", dept_id: "dept_praise", dept_name: "PRAISE & WORSHIP", min_dj_level: "Grow", can_reimburse: false, sort_order: 1, active: true },
  { id: "role_singer_1", name: "Singer 1", dept_id: "dept_praise", dept_name: "PRAISE & WORSHIP", min_dj_level: "Come", can_reimburse: false, sort_order: 2, active: true },
  { id: "role_singer_2", name: "Singer 2", dept_id: "dept_praise", dept_name: "PRAISE & WORSHIP", min_dj_level: "Come", can_reimburse: false, sort_order: 3, active: true },
  { id: "role_singer_3", name: "Singer 3", dept_id: "dept_praise", dept_name: "PRAISE & WORSHIP", min_dj_level: "Come", can_reimburse: false, sort_order: 4, active: true },
  { id: "role_acoustic_electric_guitar", name: "Acoustic / Electric Guitar", dept_id: "dept_praise", dept_name: "PRAISE & WORSHIP", min_dj_level: "Come", can_reimburse: false, sort_order: 5, active: true },
  { id: "role_bass_guitar", name: "Bass Guitar", dept_id: "dept_praise", dept_name: "PRAISE & WORSHIP", min_dj_level: "Come", can_reimburse: false, sort_order: 6, active: true },
  { id: "role_drums_cajon", name: "Drums / Cajon", dept_id: "dept_praise", dept_name: "PRAISE & WORSHIP", min_dj_level: "Come", can_reimburse: false, sort_order: 7, active: true },
  { id: "role_keyboard_piano", name: "Keyboard / Piano", dept_id: "dept_praise", dept_name: "PRAISE & WORSHIP", min_dj_level: "Come", can_reimburse: false, sort_order: 8, active: true },

  // CREATIVE & PRODUCTION (Sound Engineer + Lighting + Multi Media + Camera)
  { id: "role_sound_engineer", name: "Sound Engineer", dept_id: "dept_creative", dept_name: "CREATIVE & PRODUCTION", min_dj_level: "Come", can_reimburse: false, sort_order: 1, active: true },
  { id: "role_lighting", name: "Lighting", dept_id: "dept_creative", dept_name: "CREATIVE & PRODUCTION", min_dj_level: "Come", can_reimburse: false, sort_order: 2, active: true },
  { id: "role_multi_media", name: "Multi Media", dept_id: "dept_creative", dept_name: "CREATIVE & PRODUCTION", min_dj_level: "Come", can_reimburse: false, sort_order: 3, active: true },
  { id: "role_camera", name: "Camera", dept_id: "dept_creative", dept_name: "CREATIVE & PRODUCTION", min_dj_level: "Come", can_reimburse: false, sort_order: 4, active: true },

  // KITCHEN & CATERING
  { id: "role_barista_coffee", name: "Barista / Coffee Station", dept_id: "dept_kitchen", dept_name: "KITCHEN & CATERING", min_dj_level: "Come", can_reimburse: true, sort_order: 1, active: true },
  { id: "role_fellowship_refreshments", name: "Fellowship Refreshments", dept_id: "dept_kitchen", dept_name: "KITCHEN & CATERING", min_dj_level: "Come", can_reimburse: true, sort_order: 2, active: true },

  // WELCOME & HOSPITALITY
  { id: "role_greeter_usher", name: "Greeter / Usher", dept_id: "dept_welcome", dept_name: "WELCOME & HOSPITALITY", min_dj_level: "Come", can_reimburse: false, sort_order: 1, active: true }
];

export async function seedMasterData() {
  for (const dept of DEFAULT_DEPARTMENTS) {
    await setDoc(doc(db, "departments", dept.id), {
      ...dept,
      updated_at: serverTimestamp()
    }, { merge: true });
  }

  for (const role of DEFAULT_ROLES) {
    await setDoc(doc(db, "roles", role.id), {
      ...role,
      updated_at: serverTimestamp()
    }, { merge: true });
  }

  return {
    departments: DEFAULT_DEPARTMENTS.length,
    roles: DEFAULT_ROLES.length
  };
}
