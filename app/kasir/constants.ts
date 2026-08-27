export const MENU_ITEMS = [
    { sku: "BEV-AMERICANO-H", name: "Americano (Hot)", category: "BEVERAGE", price: 18000, icon: "☕" },
    { sku: "BEV-AMERICANO-C", name: "Americano (Cold)", category: "BEVERAGE", price: 20000, icon: "🧊☕" },
    { sku: "BEV-CAPPUCCINO-H", name: "Cappuccino (Hot)", category: "BEVERAGE", price: 20000, icon: "☕" },
    { sku: "BEV-CAPPUCCINO-C", name: "Cappuccino (Cold)", category: "BEVERAGE", price: 22000, icon: "🧊☕" },
    { sku: "BEV-SANGER-H", name: "Sanger (Hot)", category: "BEVERAGE", price: 20000, icon: "☕" },
    { sku: "BEV-GULA-AREN", name: "Kopi Susu Gula Aren", category: "BEVERAGE", price: 28000, icon: "🧋" },
    { sku: "BEV-MIXFRUIT", name: "Mixfruit Coffee", category: "BEVERAGE", price: 28000, icon: "🍹" },
    { sku: "FOOD-KATSU-CURRY", name: "Katsu Curry Japan", category: "FOOD", price: 35000, icon: "🍛" },
    { sku: "FOOD-AYAM-LADA", name: "Ayam Lada Hitam", category: "FOOD", price: 35000, icon: "🍱" },
    { sku: "FOOD-MATAU-BREAD", name: "Matau Bread", category: "FOOD", price: 28000, icon: "🥖" },
    { sku: "SNACK-CIRENG", name: "Cireng", category: "SNACK", price: 22000, icon: "🥟" },
    { sku: "SNACK-DIMSUM", name: "Dimsum Ayam", category: "SNACK", price: 15000, icon: "🥟" },
    { sku: "SNACK-TOAST-CHOC", name: "Toast Coklat", category: "SNACK", price: 20000, icon: "🍞" },
];

export const formatRp = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

export interface CartItem {
    sku: string;
    name: string;
    category: string;
    price: number;
    icon: string;
    qty: number;
}

export interface HeldBill {
    id: string;
    customerName: string;
    tableNumber: string;
    items: CartItem[];
    createdAt: string;
}

export interface TransactionRecord {
    id: string;
    orderNumber: string;
    customerName: string | null;
    tableNumber: string | null;
    items: { productName: string; quantity: number; unitPrice: number; totalPrice: number; costPrice: number }[];
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount: number;
    changeAmount: number;
    paymentMethod: string | null;
    profit: number;
    createdAt: string;
}
