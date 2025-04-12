import { getSureCartProducts } from "@/lib/surecart/surecart-products";
import ClientProductPage from "./client-product-page";

export default async function Products() {
  return <ClientProductPage />;
}

export const metadata = {
  title: "Products | Seven Peaks Gear",
  description: "Browse our collection of premium bikes for every terrain.",
};
