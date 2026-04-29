import { AdminClient } from "@/app/admin/admin-client";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; token?: string }>;
}) {
  const params = await searchParams;

  return <AdminClient initialCode={params.code ?? ""} initialToken={params.token ?? ""} />;
}
