//TODO: FORMAT THIS FILE
export function isUser(user: any) {
  if (user && user.role !== "GUEST") return true;
  return false;
}

export function isGuest(user: any) {
  if (user && user.role === "GUEST") return true;
  return false;
}

export function isAdmin(user: any) {
  if (user && user.role === "ADMIN") return true;
  return false;
}
