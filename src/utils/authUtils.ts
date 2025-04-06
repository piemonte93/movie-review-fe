export const isAdmin = (user) => user?.roles?.includes("ROLE_ADMIN") || false;
