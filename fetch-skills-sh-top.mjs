import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcesDir = path.join(root, "sources");
const homePath = path.join(sourcesDir, "skills-sh-home.html");
const outputPath = path.join(sourcesDir, "skills-sh-top.json");
const sourceUrl = "https://www.skills.sh/";
const topPercent = 2;
const detailConcurrency = 8;

fs.mkdirSync(sourcesDir, { recursive: true });

function decodeEntities(value = "") {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value = "") {
  return decodeEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value, limit = 520) {
  if (!value || value.length <= limit) return value;
  const sliced = value.slice(0, limit - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${sliced.slice(0, lastSpace > 320 ? lastSpace : sliced.length).trim()}...`;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Skill Atlas data refresh (https://github.com/tbuhl/AI_skill_overview)",
    },
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

function extractLeaderboard(html) {
  const skillMarker = html.indexOf('\\"skillId\\"');
  const start = html.lastIndexOf('[{\\"source\\"', skillMarker);
  const end = html.indexOf('}],\\"totalSkills\\"', start);

  if (start < 0 || end < 0) {
    throw new Error("Could not find the skills.sh leaderboard payload in the homepage HTML.");
  }

  const skills = JSON.parse(html.slice(start, end + 2).replace(/\\"/g, '"'));
  const metadata = html
    .slice(end + 2, end + 260)
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n");
  const totalSkills = Number(metadata.match(/"totalSkills":(\d+)/)?.[1] || skills.length);
  const allTimeTotal = Number(metadata.match(/"allTimeTotal":(\d+)/)?.[1] || 0);
  const view = metadata.match(/"view":"([^"]+)"/)?.[1] || "all-time";

  return { skills, totalSkills, allTimeTotal, view };
}

function parseJsonLd(html) {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const [, raw] of scripts) {
    try {
      const parsed = JSON.parse(decodeEntities(raw));
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const app = items.find((item) => item?.["@type"] === "SoftwareApplication");
      if (app) return app;
    } catch {
      // Ignore non-application JSON-LD blocks.
    }
  }
  return null;
}

function parseTopics(html) {
  const headingIndex = html.indexOf("<h1");
  const gridIndex = html.indexOf('<div class="grid grid-cols-1', headingIndex);
  const scopedHtml = headingIndex >= 0 && gridIndex > headingIndex ? html.slice(headingIndex, gridIndex) : html;
  const topics = new Set();
  for (const [, raw] of scopedHtml.matchAll(/<a[^>]+href="\/topic\/[^"]+"[^>]*>([\s\S]*?)<\/a>/g)) {
    const topic = stripTags(raw);
    if (topic) topics.add(topic);
  }
  return [...topics];
}

function parseGitHubUrl(html, source) {
  const sideLink = html.match(/href="(https:\/\/github\.com\/[^"?#\s]+\/[^"?#\s]+)"/i)?.[1];
  if (sideLink) return sideLink.replace(/\/$/, "");
  return source.includes("/") ? `https://github.com/${source}` : "";
}

function installCommandFor(source, skillId, githubUrl) {
  const target = githubUrl || source;
  return target ? `npx skills add ${target} --skill ${skillId}` : "";
}

function parseMetaDescription(html) {
  const match = html.match(/<meta name="description" content="([^"]*)"/i);
  return match ? stripTags(match[1]) : "";
}

function fallbackDescription(skill) {
  const installCount = new Intl.NumberFormat("en-US").format(skill.installs || 0);
  return `Top ${topPercent}% skills.sh all-time leaderboard skill with ${installCount} installs. Source ${skill.source}; skill id ${skill.skillId}.`;
}

function parseDetail(html, skill) {
  const app = parseJsonLd(html);
  const description = truncate(stripTags(app?.description || parseMetaDescription(html) || fallbackDescription(skill)));
  const githubUrl = parseGitHubUrl(html, skill.source);
  const topics = parseTopics(html);
  const installCommand = installCommandFor(skill.source, skill.skillId, githubUrl);

  return {
    description,
    githubUrl,
    topics,
    installCommand,
  };
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const homepage = await fetchText(sourceUrl);
  fs.writeFileSync(homePath, homepage, "utf8");

  const leaderboard = extractLeaderboard(homepage);
  const topCount = Math.ceil(leaderboard.totalSkills * (topPercent / 100));
  const selected = leaderboard.skills.slice(0, topCount);

  const skills = await mapLimit(selected, detailConcurrency, async (item, index) => {
    const url = `https://www.skills.sh/${item.source}/${item.skillId}`;
    try {
      const detailHtml = await fetchText(url);
      return {
        rank: index + 1,
        source: item.source,
        skillId: item.skillId,
        name: item.name,
        installs: item.installs,
        weeklyInstalls: item.weeklyInstalls || [],
        isOfficial: Boolean(item.isOfficial),
        url,
        ...parseDetail(detailHtml, item),
      };
    } catch (error) {
      console.warn(`Detail fetch failed for ${url}: ${error.message}`);
      const githubUrl = item.source.includes("/") ? `https://github.com/${item.source}` : "";
      return {
        rank: index + 1,
        source: item.source,
        skillId: item.skillId,
        name: item.name,
        installs: item.installs,
        weeklyInstalls: item.weeklyInstalls || [],
        isOfficial: Boolean(item.isOfficial),
        url,
        description: fallbackDescription(item),
        githubUrl,
        topics: [],
        installCommand: installCommandFor(item.source, item.skillId, githubUrl),
      };
    }
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceUrl,
    view: leaderboard.view,
    totalSkills: leaderboard.totalSkills,
    allTimeTotal: leaderboard.allTimeTotal,
    topPercent,
    topCount,
    skills,
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${path.relative(root, outputPath)} with top ${topCount} of ${leaderboard.totalSkills} skills.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
