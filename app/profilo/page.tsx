import { redirect } from "next/navigation";

// Il personaggio ora sta nel Guardaroba di ogni gruppo (ogni gruppo ha il suo).
export default async function VecchioProfilo({ searchParams }: PageProps<"/profilo">) {
  const { gruppo } = await searchParams;
  redirect(typeof gruppo === "string" ? `/gruppo/${gruppo}/guardaroba` : "/");
}
