import { providerEligible } from "../providers/eligibility";
import { officialProviders } from "../providers/official-policy";
export function OfficialChannels({ category }: {category: "Anime" | "K-Drama"}) {
  const channels = Object.entries(officialProviders).filter(([, provider]) => providerEligible("official-channel", provider.channelUrl)).filter(([key]) => category === "Anime" ? !["kbs-world", "sbs-world"].includes(key) : ["kbs-world", "sbs-world"].includes(key));
  if (!channels.length) return null;
  return <details className="official-channel-directory"><summary>Explore official {category === "Anime" ? "anime" : "broadcaster"} channels</summary><p>Channel discovery only. Individual videos may have region, membership or embedding restrictions. A channel listing does not approve its uploads.</p><ul>{channels.map(([key,provider]) => <li key={key}><a href={provider.channelUrl} target="_blank" rel="noopener noreferrer">{provider.name} ↗<span className="sr-only"> (opens a new tab)</span></a></li>)}</ul></details>;
}
