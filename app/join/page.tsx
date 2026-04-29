import { JoinClient } from "@/app/join/join-client";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;

  return <JoinClient initialCode={params.code ?? ""} />;
}
