import EditProductPage from "../[id]/page";

export default function NewProductPage() {
  return <EditProductPage params={Promise.resolve({ id: "new" })} />;
}
