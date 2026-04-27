import { Octokit } from "@octokit/rest";

export interface RepoSnapshot {
  owner: string;
  repo: string;
  files: { path: string; content: string }[];
  totalBytes: number;
}

/**
 * Pulls up to maxFiles files (default 40) and maxBytes total bytes
 * (default 200KB) from a public GitHub repo. Same shape as the
 * imported BuildersClaw repo-fetcher contract.
 */
export async function fetchRepoSnapshot(
  repoUrl: string,
  opts: { maxFiles?: number; maxBytes?: number } = {}
): Promise<RepoSnapshot> {
  const m = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!m) throw new Error(`Bad repo URL: ${repoUrl}`);
  const [, owner, rawRepo] = m;
  const repo = rawRepo.replace(/\.git$/, "");

  const oct = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const tree = await oct.git.getTree({
    owner,
    repo,
    tree_sha: "HEAD",
    recursive: "1",
  });

  const blobs = (tree.data.tree ?? [])
    .filter((t) => t.type === "blob")
    .slice(0, opts.maxFiles ?? 40);

  const cap = opts.maxBytes ?? 200_000;
  let bytesUsed = 0;
  const files: { path: string; content: string }[] = [];

  for (const b of blobs) {
    if (bytesUsed >= cap) break;
    if (!b.sha || !b.path) continue;
    const blob = await oct.git.getBlob({ owner, repo, file_sha: b.sha });
    const content = Buffer.from(blob.data.content, "base64").toString("utf-8");
    files.push({ path: b.path, content });
    bytesUsed += content.length;
  }

  return { owner, repo, files, totalBytes: bytesUsed };
}
