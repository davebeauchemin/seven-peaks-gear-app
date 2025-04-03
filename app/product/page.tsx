import { getProduct } from "@/lib/surecart";

export default async function ProductPage() {
  const product = await getProduct("e7dad057-cc0e-4f0c-8a8f-226a0894e855");
  console.log(product);
  return <div>Product</div>;
}
