const SUPER_ADMIN_EMAILS = [
  "sapupodaiserie@gmail.com"
];

export function getUserRole(user) {
  if (!user) return null;

  const email = (user.email || "").toLowerCase().trim();

  if (SUPER_ADMIN_EMAILS.includes(email)) {
    return "superadmin";
  }

  return "admin";
}

export function saveUserSession(user) {
  if (!user) return;

  localStorage.setItem("userEmail", user.email || "");
  localStorage.setItem("userName", user.displayName || user.email || "Administrator");
  localStorage.setItem("userRole", getUserRole(user));
}

export function clearUserSession() {
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userName");
  localStorage.removeItem("userRole");
}
