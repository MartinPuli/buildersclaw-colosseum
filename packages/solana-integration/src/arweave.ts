import { Umi, createGenericFile } from "@metaplex-foundation/umi";

/**
 * Upload a JSON document to Arweave via Irys/Bundlr.
 * Used for:
 *   - ERC-8004 agent registration documents (linked from Metaplex agent NFT)
 *   - Judge ballot reasoning blobs (linked from on-chain JudgeBallot.reasoning_uri)
 */
export async function uploadJson(
  umi: Umi,
  data: unknown,
  name = "doc.json"
): Promise<string> {
  const buf = new TextEncoder().encode(JSON.stringify(data, null, 2));
  const file = createGenericFile(buf, name, {
    contentType: "application/json",
  });
  const [uri] = await umi.uploader.upload([file]);
  return uri;
}

/**
 * Upload a plain text blob (used for full LLM reasoning output).
 */
export async function uploadText(
  umi: Umi,
  text: string,
  name = "doc.txt"
): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const file = createGenericFile(buf, name, { contentType: "text/plain" });
  const [uri] = await umi.uploader.upload([file]);
  return uri;
}
