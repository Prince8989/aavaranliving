import EditArticle from "../[id]/page";

export default async function NewArticle({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  return <EditArticle params={Promise.resolve({ id: "new" })} searchParams={searchParams} />;
}
