export type SessionUser = {
    id: string;
    name: string;
    email: string;
    role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "CASHIER" | string;
    isActive?: boolean;
};
