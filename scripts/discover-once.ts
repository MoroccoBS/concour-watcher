import { upsertDiscoveredPdfs } from "@/server/documents";
import { discoverSourceLinks } from "@/server/scraper";

async function main() {
  const links = await discoverSourceLinks();
  const result = await upsertDiscoveredPdfs(links);
  console.log(JSON.stringify({ found: links.length, ...result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
