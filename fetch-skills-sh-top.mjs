import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcesDir = path.join(root, "sources");
const homePath = path.join(sourcesDir, "skills-sh-home.html");
const sourceUrl = "https://www.skills.sh/";
const apiBaseUrl = "https://www.skills.sh/api/skills";
const pageSize = 200;
const detailConcurrency = 8;
const datasets = [
  {
    outputPath: path.join(sourcesDir, "skills-sh-top.json"),
    topPercent: 2,
    excludedTopPercent: 0,
  },
  {
    outputPath: path.join(sourcesDir, "skills-sh-top10-remainder.json"),
    topPercent: 10,
    excludedTopPercent: 2,
  },
];

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
  return `skills.sh all-time leaderboard rank #${skill.rank || "unknown"} with ${installCount} installs. Source ${skill.source}; skill id ${skill.skillId}.`;
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

function skillKey(skill) {
  return `${skill.source || ""}::${skill.skillId || ""}`.toLowerCase();
}

function loadDetailCache() {
  const cache = new Map();
  for (const { outputPath } of datasets) {
    if (!fs.existsSync(outputPath)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(outputPath, "utf8"));
      for (const skill of data.skills || []) {
        cache.set(skillKey(skill), {
          description: skill.description || "",
          githubUrl: skill.githubUrl || "",
          topics: Array.isArray(skill.topics) ? skill.topics : [],
          installCommand: skill.installCommand || "",
        });
      }
    } catch (error) {
      console.warn(`Could not read existing detail cache from ${outputPath}: ${error.message}`);
    }
  }
  return cache;
}

async function fetchLeaderboardPages(view, targetCount) {
  const pageCount = Math.ceil(targetCount / pageSize);
  const pages = await mapLimit(Array.from({ length: pageCount }, (_, page) => page), 4, async (page) => {
    const response = await fetch(`${apiBaseUrl}/${view}/${page}`, {
      headers: {
        "user-agent": "Skill Atlas data refresh (https://github.com/tbuhl/AI_skill_overview)",
      },
    });
    if (!response.ok) throw new Error(`skills.sh API page ${page} returned ${response.status}`);
    return response.json();
  });

  const seen = new Set();
  const skills = [];
  for (const page of pages) {
    for (const skill of page.skills || []) {
      const key = skillKey(skill);
      if (seen.has(key)) continue;
      seen.add(key);
      skills.push(skill);
    }
  }
  return skills;
}

async function enrichSkills(selected, detailCache) {
  return mapLimit(selected, detailConcurrency, async ({ item, rank }) => {
    const url = `https://www.skills.sh/${item.source}/${item.skillId}`;
    const cached = detailCache.get(skillKey(item));
    if (cached?.description) {
      return {
        rank,
        source: item.source,
        skillId: item.skillId,
        name: item.name,
        installs: item.installs,
        weeklyInstalls: item.weeklyInstalls || [],
        isOfficial: Boolean(item.isOfficial),
        url,
        ...cached,
      };
    }

    try {
      const detailHtml = await fetchText(url);
      return {
        rank,
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
        rank,
        source: item.source,
        skillId: item.skillId,
        name: item.name,
        installs: item.installs,
        weeklyInstalls: item.weeklyInstalls || [],
        isOfficial: Boolean(item.isOfficial),
        url,
        description: fallbackDescription({ ...item, rank }),
        githubUrl,
        topics: [],
        installCommand: installCommandFor(item.source, item.skillId, githubUrl),
      };
    }
  });
}

async function main() {
  const homepage = await fetchText(sourceUrl);
  fs.writeFileSync(homePath, homepage, "utf8");

  const leaderboard = extractLeaderboard(homepage);
  const maxTopPercent = Math.max(...datasets.map((dataset) => dataset.topPercent));
  const maxTopCount = Math.ceil(leaderboard.totalSkills * (maxTopPercent / 100));
  const allRanked = await fetchLeaderboardPages(leaderboard.view, maxTopCount);
  const detailCache = loadDetailCache();

  for (const dataset of datasets) {
    const topCount = Math.ceil(leaderboard.totalSkills * (dataset.topPercent / 100));
    const excludedCount = Math.ceil(leaderboard.totalSkills * ((dataset.excludedTopPercent || 0) / 100));
    const selected = allRanked
      .slice(excludedCount, topCount)
      .map((item, index) => ({ item, rank: excludedCount + index + 1 }));
    const skills = await enrichSkills(selected, detailCache);
    const payload = {
      generatedAt: new Date().toISOString(),
      sourceUrl,
      view: leaderboard.view,
      totalSkills: leaderboard.totalSkills,
      allTimeTotal: leaderboard.allTimeTotal,
      topPercent: dataset.topPercent,
      excludedTopPercent: dataset.excludedTopPercent || 0,
      excludedCount,
      topCount,
      startRank: excludedCount + 1,
      endRank: excludedCount + skills.length,
      skills,
    };

    fs.writeFileSync(dataset.outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(
      `Wrote ${path.relative(root, dataset.outputPath)} with ranks ${payload.startRank}-${payload.endRank} of ${leaderboard.totalSkills} skills.`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
