export function isSuperAdminUser(user) {
  return user?.role_name === "super_admin" && !user?.tenant_id;
}

// A teacher-cabinet user: the "teacher" role scoped to a tenant. Their
// /auth/me also carries a non-null teacher_id, but role + tenant is the
// canonical check (mirrors isSuperAdminUser) and routing keys off it.
export function isTeacherUser(user) {
  return user?.role_name === "teacher" && !!user?.tenant_id;
}
