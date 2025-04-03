import { fetchFromSureCart, getProducts } from "@/lib/surecart";

export default async function ProductsPage() {
  const products = await getProducts();

  console.log(products);

  return <div>Products</div>;
}
