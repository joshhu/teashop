export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  is_active: boolean;
  created_at: string;
};

export type CartLine = {
  product: Product;
  quantity: number;
};

export type CheckoutForm = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
};
