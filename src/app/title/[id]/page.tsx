import { permanentRedirect, notFound } from "next/navigation";
import sources from "../../../../docs/demo-artwork-sources.json";
/** Keep existing saved Phase 2 links and typed internal IDs working. */
export default async function LegacyTitle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const typed = /^tmdb:(movie|tv):([1-9]\d*)$/.exec(id);
  if (typed) permanentRedirect(`/${typed[1]}/${typed[2]}`);
  const source = sources.find((source) => source.id === id);
  const match = source && /\/(movie|tv)\/([1-9]\d*)/.exec(source.sourcePage);
  if (!match) notFound();
  permanentRedirect(`/${match[1]}/${match[2]}`);
}
