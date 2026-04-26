import { supabaseAdmin } from "./supabase";
import { generateCode } from "./llm";
import { fetchRepoForJudging, formatRepoForPrompt, parseGitHubUrl } from "./repo-fetcher";
import { Hackathon, Submission } from "./types";
// SOLANA-PORT: removed EVM/GenLayer call; GenLayer judging will be replaced by a Solana
// equivalent (or simplified Gemini-only flow) planned in Phase 5.
// (was: imports from "./genlayer" and "genlayer-js/types")
import { isViableSubmission } from "./validation";

export interface EvaluationResult {
  functionality_score: number;
  brief_compliance_score: number;
  code_quality_score: number;
  architecture_score: number;
  innovation_score: number;
  completeness_score: number;
  documentation_score: number;
  testing_score: number;
  security_score: number;
  deploy_readiness_score: number;
  total_score: number;
  judge_feedback: string;
}

type JudgingMeta = Record<string, unknown>;

interface JudgingRunResult {
  completed: boolean;
  queuedGenLayer: boolean;
  submissionsJudged: number;
}

// SOLANA-PORT: GenLayer contender type kept as a local placeholder so call sites still type-check.
// The GenLayer escalation flow is removed — only Gemini judging runs in Phase 0b.
type GenLayerContender = {
  team_id: string;
  team_name: string;
  repo_summary: string;
  gemini_score: number;
};

function parseJudgingMeta(raw: unknown): JudgingMeta {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed as JudgingMeta : {};
    } catch {
      return {};
    }
  }

  return raw && typeof raw === "object" ? raw as JudgingMeta : {};
}

async function updateHackathonJudgingMeta(hackathonId: string, meta: JudgingMeta, status?: string) {
  const payload: Record<string, unknown> = { judging_criteria: meta };
  if (status) payload.status = status;

  await supabaseAdmin.from("hackathons").update(payload).eq("id", hackathonId);
}

function buildTopContenders(
  evaluationsToUpsert: Array<{ submission_id: string; total_score: number; judge_feedback: string | null }>,
  submissions: Array<Submission & { teams?: { name?: string } | { name?: string }[] }>,
) {
  const topEvals = evaluationsToUpsert
    .filter((e) => e.total_score > 0)
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, 3);

  const contenders: GenLayerContender[] = [];
  for (const ev of topEvals) {
    const sub = submissions.find((s) => s.id === ev.submission_id);
    if (!sub) continue;
    const teamData = Array.isArray(sub.teams) ? sub.teams[0] : sub.teams;
    contenders.push({
      team_id: sub.team_id,
      team_name: teamData?.name || sub.team_id,
      repo_summary: (ev.judge_feedback || "").slice(0, 1500),
      gemini_score: ev.total_score,
    });
  }

  return { topEvals, contenders };
}

async function resolveWinnerAgentId(winnerTeamId: string) {
  const { data: leaderMember } = await supabaseAdmin
    .from("team_members")
    .select("agent_id")
    .eq("team_id", winnerTeamId)
    .eq("role", "leader")
    .single();

  if (leaderMember?.agent_id) return leaderMember.agent_id as string;

  const { data: anyMember } = await supabaseAdmin
    .from("team_members")
    .select("agent_id")
    .eq("team_id", winnerTeamId)
    .limit(1)
    .single();

  return (anyMember?.agent_id as string | undefined) || null;
}

async function finalizeJudging(
  hackathonId: string,
  meta: JudgingMeta,
  winnerTeamId: string,
  judgeMethod: string,
  notes: string,
) {
  meta.winner_team_id = winnerTeamId;
  meta.winner_agent_id = await resolveWinnerAgentId(winnerTeamId);
  meta.finalized_at = new Date().toISOString();
  meta.judge_method = judgeMethod;
  meta.notes = notes;

  await updateHackathonJudgingMeta(hackathonId, meta, "completed");
}

async function finalizeGeminiFallback(hackathonId: string, meta: JudgingMeta, reason?: string) {
  const fallbackTeamId = typeof meta.genlayer_fallback_team_id === "string"
    ? meta.genlayer_fallback_team_id
    : typeof meta.winner_team_id === "string"
      ? meta.winner_team_id
      : null;

  if (!fallbackTeamId) {
    throw new Error("No Gemini fallback winner available")
  }

  meta.genlayer_status = reason ? "failed" : meta.genlayer_status;
  if (reason) meta.genlayer_last_error = reason;

  await finalizeJudging(
    hackathonId,
    meta,
    fallbackTeamId,
    "gemini",
    reason
      ? `GenLayer fallback to Gemini winner after error: ${reason}`
      : "Automatically judged by Gemini AI. Code repositories were analyzed.",
  );
}

// SOLANA-PORT: removed EVM/GenLayer call; persistGenLayerVerdict + continueGenLayerJudging
// were the on-chain consensus driver. Replaced by Gemini-only judging in Phase 0b; a
// Solana-native verifier may be added in Phase 5.
export async function continueGenLayerJudging(_hackathonId: string): Promise<boolean> {
  return false;
}

/**
 * Build a judge system prompt that is fully personalized to the enterprise's
 * problem description, judging criteria, rules, and challenge type.
 */
function buildJudgeSystemPrompt(hackathon: Hackathon): string {
  // Parse enterprise context from judging_criteria (may contain JSON with enterprise context)
  let enterpriseContext = "";
  let customCriteria = "";

  if (hackathon.judging_criteria) {
    try {
      const parsed = JSON.parse(hackathon.judging_criteria);
      if (parsed.enterprise_problem) {
        enterpriseContext = `\nORIGINAL ENTERPRISE PROBLEM:\n${parsed.enterprise_problem}\n`;
      }
      if (parsed.enterprise_requirements) {
        enterpriseContext += `\nENTERPRISE REQUIREMENTS:\n${parsed.enterprise_requirements}\n`;
      }
      if (parsed.criteria_text) {
        customCriteria = `\nCUSTOM JUDGING CRITERIA:\n${parsed.criteria_text}\n`;
      }
    } catch {
      // Not JSON — treat as plain text criteria
      customCriteria = `\nCUSTOM JUDGING CRITERIA:\n${hackathon.judging_criteria}\n`;
    }
  }

  return `You are an elite software engineering judge for an AI agent hackathon on BuildersClaw.

YOUR MISSION: Evaluate a code repository submission. You will receive the FULL source code of the submitted project. You must analyze the actual code quality, architecture, and whether it genuinely solves the stated problem.

═══ HACKATHON CONTEXT ═══
Title: ${hackathon.title}
Challenge Type: ${hackathon.challenge_type || "general"}
${enterpriseContext}
CHALLENGE BRIEF (what the enterprise/organizer asked for):
${hackathon.brief}

${hackathon.description ? `ADDITIONAL DESCRIPTION:\n${hackathon.description}\n` : ""}
${hackathon.rules ? `RULES & CONSTRAINTS:\n${hackathon.rules}\n` : ""}
${customCriteria}

═══ EVALUATION CRITERIA ═══
Score each criterion 0-100. Be strict and fair. 100 = exceptional, 70 = good, 50 = mediocre, below 30 = failing.

1. **functionality_score**: Does the code actually work? Does it implement the core features described in the brief?
2. **brief_compliance_score**: How well does the submission address the specific problem/requirements stated in the challenge brief? This is the MOST IMPORTANT criterion.
3. **code_quality_score**: Clean code, proper naming, no obvious bugs, follows language idioms and best practices.
4. **architecture_score**: Good project structure, separation of concerns, appropriate patterns, scalability considerations.
5. **innovation_score**: Creative approaches, clever solutions, use of modern tools/techniques, going beyond minimum requirements.
6. **completeness_score**: Is the project complete or half-done? Are there TODOs, placeholder code, missing features?
7. **documentation_score**: README quality, code comments where needed, setup instructions, API docs if applicable.
8. **testing_score**: Are there tests? Test coverage? Do they test meaningful scenarios?
9. **security_score**: No hardcoded secrets, input validation, proper auth patterns, no obvious vulnerabilities.
10. **deploy_readiness_score**: Could this be deployed? Proper configs, environment handling, build scripts, CI/CD?

═══ OUTPUT FORMAT ═══
Return ONLY a valid JSON object (no markdown fences, no commentary).
IMPORTANT: All string values must be single-line JSON strings. Do not include literal newlines inside strings. Avoid double quotes inside the feedback text.
{
  "functionality_score": <0-100>,
  "brief_compliance_score": <0-100>,
  "code_quality_score": <0-100>,
  "architecture_score": <0-100>,
  "innovation_score": <0-100>,
  "completeness_score": <0-100>,
  "documentation_score": <0-100>,
  "testing_score": <0-100>,
  "security_score": <0-100>,
  "deploy_readiness_score": <0-100>,
  "judge_feedback": "One concise paragraph with strengths, weaknesses, and next steps. No line breaks."
}`;
}

/**
 * Build the user prompt with the actual repository content.
 */
function buildJudgeUserPrompt(repoContent: string, submission: Submission): string {
  const parts: string[] = [];

  parts.push("═══ SUBMISSION TO EVALUATE ═══\n");

  if (submission.preview_url) {
    parts.push(`Submitted Repo URL: ${submission.preview_url}`);
  }

  // Parse build_log for repo_url and notes
  try {
    const meta = JSON.parse(submission.build_log || "{}");
    if (meta.repo_url) parts.push(`Repository URL: ${meta.repo_url}`);
    if (meta.notes) parts.push(`Submitter Notes: ${meta.notes}`);
  } catch { /* ignore */ }

  parts.push("\n═══ REPOSITORY SOURCE CODE ═══\n");
  parts.push(repoContent);
  parts.push("\n═══ END OF SUBMISSION ═══");
  parts.push("\nEvaluate this submission now. Return ONLY the JSON object.");

  return parts.join("\n");
}

/**
 * Extract the repo URL from a submission.
 * Priority: build_log.repo_url > build_log.project_url > preview_url
 */
function getSubmissionRepoUrl(submission: Submission): string | null {
  // Try build_log first
  try {
    const meta = JSON.parse(submission.build_log || "{}");
    if (meta.repo_url && parseGitHubUrl(meta.repo_url)) return meta.repo_url;
    if (meta.project_url && parseGitHubUrl(meta.project_url)) return meta.project_url;
  } catch { /* ignore */ }

  // Try preview_url
  if (submission.preview_url && parseGitHubUrl(submission.preview_url)) {
    return submission.preview_url;
  }

  return null;
}

export async function judgeSubmission(
  submission: Submission,
  hackathon: Hackathon,
): Promise<EvaluationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured for platform judging");
  }

  // ── Fetch repository code ──
  const repoUrl = getSubmissionRepoUrl(submission);
  let repoContent: string;

  if (repoUrl) {
    const analysis = await fetchRepoForJudging(repoUrl, 40, 200_000);
    repoContent = formatRepoForPrompt(analysis);
  } else if (submission.html_content) {
    // Fallback: inline HTML content (legacy submissions)
    repoContent = `[LEGACY SUBMISSION - Inline HTML Only]\n\n\`\`\`html\n${submission.html_content}\n\`\`\``;
  } else {
    repoContent = "[ERROR] No repository URL or code content provided in this submission.";
  }

  // ── Build prompts contextualized to the enterprise's problem ──
  const systemPrompt = buildJudgeSystemPrompt(hackathon);
  const userPrompt = buildJudgeUserPrompt(repoContent, submission);

  try {
    let parsed: Omit<EvaluationResult, "total_score"> | null = null;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const result = await generateCode({
          provider: "gemini",
          apiKey,
          systemPrompt,
          userPrompt,
          maxTokens: 2048,
          temperature: 0, // Force deterministic judging output as much as possible
        });

        const jsonStr = result.text.replace(/```json/g, "").replace(/```/g, "").trim();
        parsed = JSON.parse(jsonStr) as Omit<EvaluationResult, "total_score">;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }
      }
    }

    if (!parsed) {
      throw lastError instanceof Error ? lastError : new Error(String(lastError ?? "Unknown Gemini judging failure"));
    }

    // Weighted total score: brief_compliance is worth 2x
    const weights = {
      functionality_score: 1.5,
      brief_compliance_score: 2.0,  // Most important
      code_quality_score: 1.0,
      architecture_score: 1.0,
      innovation_score: 0.8,
      completeness_score: 1.2,
      documentation_score: 0.6,
      testing_score: 0.8,
      security_score: 0.8,
      deploy_readiness_score: 0.7,
    };

    const weightedSum = Object.entries(weights).reduce((sum, [key, weight]) => {
      const score = (parsed as unknown as Record<string, number>)[key] || 0;
      return sum + score * weight;
    }, 0);

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const total_score = Math.round(weightedSum / totalWeight);

    return { ...parsed, total_score };
  } catch (error: unknown) {
    console.error("Judging failed for submission", submission.id, error);
    const errMsg = error instanceof Error ? error.message : String(error);

    return {
      functionality_score: 0,
      brief_compliance_score: 0,
      code_quality_score: 0,
      architecture_score: 0,
      innovation_score: 0,
      completeness_score: 0,
      documentation_score: 0,
      testing_score: 0,
      security_score: 0,
      deploy_readiness_score: 0,
      total_score: 0,
      judge_feedback: "Error evaluating submission: " + errMsg,
    };
  }
}

export async function judgeHackathon(hackathonId: string) {
  const { data: hackathon } = await supabaseAdmin
    .from("hackathons")
    .select("*")
    .eq("id", hackathonId)
    .single();

  if (!hackathon) throw new Error("Hackathon not found");

  // ── Concurrency guard: atomically claim "judging" status ──
  if (hackathon.status === "completed") return true;

  // Try to claim — works from open, in_progress, OR judging (retry after failure)
  const { data: locked, error: lockErr } = await supabaseAdmin
    .from("hackathons")
    .update({ status: "judging" })
    .in("status", ["open", "in_progress", "judging"])
    .eq("id", hackathonId)
    .select("id")
    .single();

  if (lockErr || !locked) return true;

  // Parse existing judging metadata
  let updatedMeta: Record<string, unknown> = {};
  if (hackathon.judging_criteria) {
    try {
      updatedMeta = typeof hackathon.judging_criteria === "string"
        ? JSON.parse(hackathon.judging_criteria)
        : hackathon.judging_criteria;
    } catch { /* ignore */ }
  }

  try {
    const { data: allSubmissions } = await supabaseAdmin
      .from("submissions")
      .select("*, teams(name, status)")
      .eq("hackathon_id", hackathonId);

    if (!allSubmissions || allSubmissions.length === 0) {
      updatedMeta.notes = "Ended with 0 submissions.";
      updatedMeta.finalized_at = new Date().toISOString();
      await supabaseAdmin
        .from("hackathons")
        .update({ status: "completed", judging_criteria: updatedMeta })
        .eq("id", hackathonId);
      return true;
    }

    // ── SECURITY: Filter out non-viable submissions ──
    // Only judge submissions that have a valid repo URL and are completed.
    // Teams that never submitted (or submitted garbage) should not waste judge tokens.
    const viableSubmissions: typeof allSubmissions = [];
    const skippedSubmissions: Array<{ team_id: string; reason: string }> = [];

    for (const sub of allSubmissions) {
      const check = isViableSubmission(sub);
      if (check.viable) {
        viableSubmissions.push(sub);
      } else {
        skippedSubmissions.push({ team_id: sub.team_id, reason: check.reason });
        console.warn(
          `[JUDGE] Skipping submission ${sub.id} (team ${sub.team_id}): ${check.reason}`
        );

        // Record a zero-score evaluation for skipped submissions
        await supabaseAdmin
          .from("evaluations")
          .upsert({
            submission_id: sub.id,
            functionality_score: 0, brief_compliance_score: 0, code_quality_score: 0,
            architecture_score: 0, innovation_score: 0, completeness_score: 0,
            documentation_score: 0, testing_score: 0, security_score: 0,
            deploy_readiness_score: 0, total_score: 0,
            judge_feedback: `Submission skipped: ${check.reason}. Teams must submit a valid GitHub repository URL to be judged.`,
            raw_response: JSON.stringify({ skipped: true, reason: check.reason }),
          }, { onConflict: "submission_id" });
      }
    }

    if (viableSubmissions.length === 0) {
      updatedMeta.notes = `Ended with ${allSubmissions.length} submissions but none had viable repos. ${skippedSubmissions.map(s => s.reason).join("; ")}`;
      updatedMeta.finalized_at = new Date().toISOString();
      updatedMeta.skipped_submissions = skippedSubmissions;
      await supabaseAdmin
        .from("hackathons")
        .update({ status: "completed", judging_criteria: updatedMeta })
        .eq("id", hackathonId);
      return true;
    }

    const submissions = viableSubmissions;
    if (skippedSubmissions.length > 0) {
      updatedMeta.skipped_submissions = skippedSubmissions;
      console.log(`[JUDGE] ${viableSubmissions.length} viable / ${skippedSubmissions.length} skipped out of ${allSubmissions.length} total submissions`);
    }

    // Judge all submissions (with per-submission error handling)
    const evaluationsToUpsert = [];
    for (const submission of submissions) {
      try {
        const result = await judgeSubmission(submission, hackathon);

        evaluationsToUpsert.push({
          submission_id: submission.id,
          functionality_score: result.functionality_score,
          brief_compliance_score: result.brief_compliance_score,
          code_quality_score: result.code_quality_score,
          architecture_score: result.architecture_score,
          innovation_score: result.innovation_score,
          completeness_score: result.completeness_score,
          documentation_score: result.documentation_score,
          testing_score: result.testing_score,
          security_score: result.security_score,
          deploy_readiness_score: result.deploy_readiness_score,
          total_score: result.total_score,
          judge_feedback: result.judge_feedback,
          raw_response: JSON.stringify(result),
        });
      } catch (subErr: unknown) {
        const msg = subErr instanceof Error ? subErr.message : String(subErr);
        console.error(`Judge error for submission ${submission.id}:`, msg);
        evaluationsToUpsert.push({
          submission_id: submission.id,
          functionality_score: 0, brief_compliance_score: 0, code_quality_score: 0,
          architecture_score: 0, innovation_score: 0, completeness_score: 0,
          documentation_score: 0, testing_score: 0, security_score: 0,
          deploy_readiness_score: 0, total_score: 0,
          judge_feedback: `Evaluation failed: ${msg}`,
          raw_response: JSON.stringify({ error: msg }),
        });
      }
    }

    if (evaluationsToUpsert.length > 0) {
      await supabaseAdmin
        .from("evaluations")
        .upsert(evaluationsToUpsert, { onConflict: "submission_id" });
    }

    // SOLANA-PORT: removed EVM/GenLayer call; only Gemini's top-scorer wins for now.
    // The GenLayer on-chain consensus escalation is planned for a Solana equivalent in Phase 5.
    evaluationsToUpsert.sort((a, b) => b.total_score - a.total_score);
    const topEvals = evaluationsToUpsert.filter((e) => e.total_score > 0).slice(0, 3);

    let winnerTeamId: string | null = null;
    let winnerAgentId: string | null = null;
    const genlayerUsed = false;

    // Pick Gemini's top scorer
    if (!winnerTeamId) {
      const winningEval = evaluationsToUpsert[0];
      const winningSub = submissions.find((s) => s.id === winningEval.submission_id);
      if (winningSub && winningEval.total_score > 0) {
        winnerTeamId = winningSub.team_id;
      }
    }

    // Resolve winner agent
    if (winnerTeamId) {
      winnerAgentId = await resolveWinnerAgentId(winnerTeamId);
      updatedMeta.winner_team_id = winnerTeamId;
      if (winnerAgentId) updatedMeta.winner_agent_id = winnerAgentId;
    }

    if (!winnerTeamId) {
      throw new Error("No winner could be determined from the submission evaluations");
    }

    updatedMeta.finalized_at = new Date().toISOString();
    updatedMeta.judge_method = genlayerUsed ? "gemini+genlayer" : "gemini";
    updatedMeta.notes = genlayerUsed
      ? `Gemini pre-scored ${submissions.length} submissions. Top ${topEvals.length} went to GenLayer on-chain consensus. Winner verified by 5 independent validators.`
      : submissions.length === 1
        ? "Won by default (only participant). Judged for feedback."
        : "Automatically judged by Gemini AI. Code repositories were analyzed.";

    await updateHackathonJudgingMeta(hackathonId, updatedMeta, "completed");

    return {
      completed: true,
      queuedGenLayer: false,
      submissionsJudged: submissions.length,
    } satisfies JudgingRunResult;
  } catch (err) {
    // On unexpected failure, revert to in_progress so cron can retry
    console.error(`judgeHackathon(${hackathonId}) fatal error, reverting status:`, err);
    await supabaseAdmin
      .from("hackathons")
      .update({ status: "in_progress" })
      .eq("id", hackathonId)
      .eq("status", "judging");
    throw err;
  }
}
