import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = fs.existsSync(path.join(root, "awesome-agent-skills.md"))
  ? path.join(root, "awesome-agent-skills.md")
  : path.join(root, "sources", "awesome-agent-skills.md");

const markdown = fs.readFileSync(sourcePath, "utf8");

const userPinned = [
  {
    repo: "garrytan/gstack",
    title: "GStack",
    author: "garrytan",
    url: "https://github.com/garrytan/gstack",
    description:
      "Garry Tan's structured Claude Code setup: specialist CEO, designer, engineering manager, release, docs, browser, memory, and QA workflows.",
    tags: ["development", "product", "testing", "shipping", "workflow", "coding-agent"],
    platforms: ["Claude Code", "Codex", "Cursor", "Gemini CLI", "OpenCode", "Windsurf"],
  },
  {
    repo: "hardikpandya/stop-slop",
    title: "Stop Slop",
    author: "hardikpandya",
    url: "https://github.com/hardikpandya/stop-slop",
    description:
      "Removes predictable AI writing tells from prose, drafts, and reviews with directness, rhythm, and authenticity checks.",
    tags: ["writing", "editing", "anti-slop", "communication", "marketing"],
    platforms: ["Claude Code", "Codex", "ChatGPT", "Cursor"],
  },
  {
    repo: "safishamsi/graphify",
    title: "Graphify",
    author: "safishamsi",
    url: "https://github.com/safishamsi/graphify",
    description:
      "Turns code, SQL, docs, papers, images, and video into a queryable knowledge graph for coding assistants.",
    tags: ["codebase", "knowledge-graph", "research", "data-analysis", "development"],
    platforms: ["Claude Code", "Codex", "Cursor", "Gemini CLI", "OpenCode"],
  },
  {
    repo: "Egonex-AI/Understand-Anything",
    title: "Understand Anything",
    author: "Egonex-AI",
    url: "https://github.com/Egonex-AI/Understand-Anything",
    description:
      "Claude Code plugin that analyzes a project with multi-agent passes, builds a code knowledge graph, and gives an interactive dashboard.",
    tags: ["codebase", "knowledge-graph", "visualization", "development", "research"],
    platforms: ["Claude Code", "Codex", "Cursor", "Gemini CLI", "Copilot"],
  },
  {
    repo: "heygen-com/hyperframes",
    title: "HyperFrames",
    author: "heygen-com",
    url: "https://github.com/heygen-com/hyperframes",
    description:
      "Agent-first HTML, CSS, and JavaScript video composition framework with skills for planning, previewing, linting, and rendering videos.",
    tags: ["video", "creative", "frontend", "media", "development"],
    platforms: ["Claude Code", "Codex", "Cursor", "Gemini CLI"],
  },
];

const pinnedRepoKeys = new Set([
  "garrytan/gstack",
  "hardikpandya/stop-slop",
  "safishamsi/graphify",
  "egonex-ai/understand-anything",
  "mvanhorn/last30days-skill",
  "leonxlnx/taste-skill",
  "remotion-dev/remotion",
  "heygen-com/hyperframes",
  "anthropics/frontend-design",
  "anthropic/frontend-design",
  "anthropics/skills/frontend-design",
]);

const titleOverrides = new Map([
  ["mvanhorn/last30days-skill", "Last 30 Days"],
  ["egonex-ai/understand-anything", "Understand Anything"],
  ["lum1104/understand-anything", "Understand Anything"],
]);

const categoryRules = [
  ["Code & Dev", ["development", "coding", "codebase", "typescript", "python", "java", "rust", "frontend", "backend", "refactoring", "github", "git", "api", "sdk", "framework"]],
  ["Testing & QA", ["testing", "qa", "playwright", "selenium", "cypress", "browser", "accessibility", "test", "audit"]],
  ["Design & UX", ["design", "frontend", "ui", "ux", "visual", "figma", "theme", "brand", "animation", "gsap"]],
  ["Research & Knowledge", ["research", "knowledge", "search", "rag", "graph", "wiki", "memory", "context", "documentation"]],
  ["Writing & Docs", ["writing", "document", "docs", "docx", "pdf", "presentation", "slides", "copy", "editing", "prose", "markdown"]],
  ["Marketing & Growth", ["marketing", "seo", "growth", "social", "twitter", "x/", "content", "copywriting", "sales", "gtm", "ads"]],
  ["Data & Analytics", ["data", "analytics", "sql", "postgres", "database", "duckdb", "clickhouse", "spreadsheet", "xlsx", "visualization"]],
  ["Security", ["security", "owasp", "threat", "pentest", "vulnerability", "secrets", "auth", "compliance", "malware"]],
  ["Cloud & DevOps", ["cloud", "terraform", "aws", "azure", "gcp", "kubernetes", "deploy", "infra", "devops", "sre", "ci/cd"]],
  ["AI & Agents", ["agent", "mcp", "llm", "prompt", "eval", "model", "gemini", "openai", "anthropic", "replicate", "hugging"]],
  ["Media & Creative", ["video", "audio", "image", "art", "creative", "music", "gif", "remotion", "canvas", "3d", "three"]],
  ["Product & Ops", ["product", "pm", "startup", "founder", "linear", "notion", "meeting", "workflow", "operations", "finance"]],
  ["Mobile", ["ios", "android", "swift", "swiftui", "react native", "flutter", "app store"]],
  ["Education", ["tutor", "learning", "study", "quiz", "course", "teaching"]],
];

const subcategoryRules = {
  "Code & Dev": [
    ["Frontend UI", ["frontend", "ui", "ux", "react", "next.js", "tailwind", "component", "webapp"]],
    ["Backend & APIs", ["backend", "api", "server", "fastify", "node", "rails", "django", "endpoint"]],
    ["Languages", ["typescript", "python", "java", "rust", "swift", "go", "c#", ".net"]],
    ["Frameworks", ["angular", "react native", "flutter", "makepad", "framework", "sdk"]],
    ["Git & Review", ["git", "github", "pull request", "code review", "branch", "commit"]],
    ["Architecture", ["architecture", "refactor", "clean architecture", "domain-driven", "system design"]],
    ["Developer Workflow", ["workflow", "bootstrap", "setup", "cli", "automation", "developer"]],
  ],
  "Testing & QA": [
    ["Browser & E2E", ["browser", "playwright", "selenium", "cypress", "webdriver", "chromium"]],
    ["Unit & Integration", ["unit", "junit", "pytest", "vitest", "jest", "testng", "xunit", "integration"]],
    ["Accessibility", ["accessibility", "wcag", "a11y"]],
    ["Performance QA", ["benchmark", "performance", "core web vitals", "load time"]],
    ["Mobile QA", ["ios", "android", "app store", "simulator", "xcuitest"]],
    ["Test Automation", ["automation", "test automation", "testcafe", "regression"]],
  ],
  "Design & UX": [
    ["Interface Design", ["frontend", "ui", "ux", "interface", "component", "design system"]],
    ["Visual Systems", ["visual", "brand", "theme", "typography", "color", "style"]],
    ["Motion & Interaction", ["animation", "motion", "gsap", "scrolltrigger", "interaction"]],
    ["Diagrams", ["diagram", "mermaid", "excalidraw", "architecture diagram"]],
    ["Design QA", ["review", "audit", "slop", "polish", "quality"]],
  ],
  "Research & Knowledge": [
    ["Web Research", ["research", "reddit", "youtube", "hacker news", "polymarket", "web"]],
    ["Knowledge Graphs", ["knowledge graph", "graph", "codebase graph", "semantic"]],
    ["Memory & Context", ["memory", "context", "compression", "wiki", "long-term"]],
    ["Search & RAG", ["search", "rag", "retrieval", "vector"]],
    ["Documentation Research", ["documentation", "docs", "notion", "document"]],
  ],
  "Writing & Docs": [
    ["Documents", ["docx", "pdf", "document", "forms", "word"]],
    ["Slides", ["pptx", "slides", "presentation", "deck"]],
    ["Spreadsheets", ["xlsx", "spreadsheet", "excel"]],
    ["Copy Editing", ["copy", "editing", "proofread", "polish", "rewrite"]],
    ["Prose Style", ["prose", "writing style", "voice", "tone", "humanizer", "slop"]],
    ["Technical Docs", ["readme", "documentation", "diataxis", "markdown"]],
  ],
  "Marketing & Growth": [
    ["SEO & AEO", ["seo", "aeo", "geo", "search engine", "app store optimization", "aso"]],
    ["Social Content", ["twitter", "x/", "linkedin", "social", "post", "threads"]],
    ["Ads", ["ads", "advertising", "google ads", "meta ads", "creative"]],
    ["GTM & Launch", ["gtm", "launch", "positioning", "product hunt", "directory"]],
    ["Sales & Outreach", ["sales", "outreach", "email", "cold"]],
    ["Growth Strategy", ["growth", "funnel", "conversion", "acquisition"]],
  ],
  "Data & Analytics": [
    ["SQL & Databases", ["sql", "postgres", "clickhouse", "duckdb", "mongodb", "database"]],
    ["Spreadsheets", ["spreadsheet", "xlsx", "excel", "csv"]],
    ["Analytics", ["analytics", "metrics", "dashboard", "analysis", "ab test"]],
    ["Visualization", ["visualization", "chart", "graph", "plot"]],
    ["Data Engineering", ["pipeline", "etl", "datasource", "warehouse"]],
  ],
  Security: [
    ["AppSec", ["appsec", "owasp", "vulnerability", "security review"]],
    ["Threat Modeling", ["threat", "stride", "risk", "model"]],
    ["Secrets & Auth", ["secret", "auth", "oauth", "key", "environment variable"]],
    ["Pentest & Red Team", ["pentest", "red team", "fuzz", "malware", "attack"]],
    ["Compliance", ["compliance", "policy", "audit", "governance"]],
  ],
  "Cloud & DevOps": [
    ["Terraform & IaC", ["terraform", "opentofu", "module", "iac"]],
    ["Deployment", ["deploy", "vercel", "netlify", "cloudflare", "release"]],
    ["Kubernetes", ["kubernetes", "cluster", "k8s", "mirrord"]],
    ["Cloud Providers", ["aws", "azure", "gcp", "google cloud", "firebase"]],
    ["SRE & Observability", ["sre", "monitoring", "observability", "canary", "incident"]],
  ],
  "AI & Agents": [
    ["Agent Building", ["agent", "multi-agent", "orchestration", "workflow"]],
    ["MCP & Tools", ["mcp", "tool", "server", "integration"]],
    ["Model APIs", ["openai", "anthropic", "gemini", "vertex", "replicate", "model"]],
    ["Evals", ["eval", "judge", "benchmark", "validation"]],
    ["Prompting", ["prompt", "context engineering", "instruction", "skill creator"]],
  ],
  "Media & Creative": [
    ["Video", ["video", "remotion", "hyperframes", "walkthrough"]],
    ["Image", ["image", "canvas", "gif", "background removal"]],
    ["Audio & Music", ["audio", "music", "speech", "tts", "transcription"]],
    ["Generative Art", ["art", "p5", "generative", "creative"]],
    ["3D & Motion", ["three", "3d", "animation", "motion"]],
  ],
  "Product & Ops": [
    ["Product Management", ["product", "pm", "roadmap", "prd", "requirements"]],
    ["Startup & Founder", ["startup", "founder", "yc", "office hours"]],
    ["Operations", ["workflow", "operations", "linear", "jira", "notion"]],
    ["Meetings", ["meeting", "agenda", "pre-read", "google meet", "zoom"]],
    ["Finance", ["finance", "cfo", "tax", "accounting"]],
  ],
  Mobile: [
    ["iOS & Swift", ["ios", "swift", "swiftui", "xcuitest", "app store connect"]],
    ["Android & Flutter", ["android", "flutter", "kotlin"]],
    ["React Native", ["react native", "expo"]],
    ["App Store", ["app store", "preflight", "metadata", "aso"]],
  ],
  Education: [
    ["Tutoring", ["tutor", "teaching", "coach"]],
    ["Study & Quizzes", ["study", "quiz", "flashcard", "obsidian"]],
    ["Courses", ["course", "curriculum", "learning"]],
  ],
};

const stopWords = new Set([
  "and",
  "the",
  "for",
  "with",
  "from",
  "into",
  "using",
  "skills",
  "skill",
  "team",
  "official",
  "community",
  "agent",
  "agents",
  "claude",
  "code",
]);

function cleanHeading(value) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N} .&/+()-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
}

function titleCase(value) {
  const normalized = value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return value;
  return normalized
    .split(" ")
    .map((part) => {
      if (/^[A-Z0-9]{2,}$/.test(part)) return part;
      if (part.length <= 2 && part === part.toUpperCase()) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function deriveRepoParts(label, url) {
  const cleanLabel = label.replace(/\s+/g, " ").trim();
  if (cleanLabel.includes("/")) {
    const [author, ...rest] = cleanLabel.split("/");
    return {
      repo: cleanLabel,
      author,
      skillName: rest.join("/"),
      title: titleCase(rest.at(-1) || author),
    };
  }

  if (url.includes("github.com/")) {
    const parts = url.split("github.com/")[1].split(/[?#]/)[0].split("/").filter(Boolean);
    if (parts.length >= 2) {
      return {
        repo: `${parts[0]}/${parts[1]}`,
        author: parts[0],
        skillName: parts.at(-1) || parts[1],
        title: cleanLabel,
      };
    }
  }

  return {
    repo: cleanLabel,
    author: cleanLabel.split(/[ /-]/)[0] || "unknown",
    skillName: cleanLabel,
    title: cleanLabel,
  };
}

function inferTags(parts) {
  const text = parts.join(" ").toLowerCase();
  const tags = new Set();

  const dictionary = [
    ["frontend", ["frontend", "ui", "ux", "web design", "react", "next.js", "tailwind", "figma", "component"]],
    ["backend", ["backend", "api", "server", "database", "postgres", "node", "rails", "fastify", "serverless"]],
    ["development", ["code", "coding", "developer", "development", "refactor", "typescript", "python", "java", "rust", "sdk", "framework"]],
    ["testing", ["test", "testing", "qa", "playwright", "selenium", "cypress", "vitest", "pytest", "junit", "webdriver"]],
    ["security", ["security", "owasp", "threat", "vulnerability", "pentest", "secrets", "auth", "compliance"]],
    ["research", ["research", "search", "web", "internet", "reddit", "hacker news", "youtube", "polymarket", "deep research"]],
    ["knowledge-graph", ["knowledge graph", "graph", "codebase graph", "dependency graph"]],
    ["data-analysis", ["data", "analytics", "analysis", "sql", "spreadsheet", "xlsx", "visualization", "dashboard"]],
    ["writing", ["writing", "writer", "copy", "prose", "content", "editing", "proofread", "documentation"]],
    ["documents", ["document", "docx", "pdf", "slides", "pptx", "presentation", "markdown", "notion"]],
    ["marketing", ["marketing", "seo", "growth", "social", "twitter", "x/", "ads", "gtm", "launch", "sales"]],
    ["design", ["design", "brand", "visual", "theme", "typography", "animation", "gsap", "canvas"]],
    ["media", ["video", "audio", "image", "gif", "music", "remotion", "hyperframes", "avatar"]],
    ["cloud", ["cloud", "aws", "azure", "gcp", "terraform", "kubernetes", "deploy", "infrastructure", "sre"]],
    ["browser-automation", ["browser", "web scraping", "scrape", "crawl", "playwright", "chromium"]],
    ["agents", ["agent", "mcp", "llm", "prompt", "eval", "model", "claude", "codex", "gemini", "cursor"]],
    ["product", ["product", "startup", "founder", "pm", "roadmap", "linear", "meeting", "workflow"]],
    ["mobile", ["ios", "android", "swift", "swiftui", "react native", "flutter", "app store"]],
    ["education", ["tutor", "learning", "study", "quiz", "course", "teaching"]],
    ["anti-slop", ["slop", "generic", "ai tells", "boring", "templated"]],
  ];

  for (const [tag, needles] of dictionary) {
    if (needles.some((needle) => text.includes(needle))) tags.add(tag);
  }

  const keywords = text
    .replace(/https?:\/\/\S+/g, " ")
    .match(/[a-z][a-z0-9+#.-]{2,}/g) || [];
  for (const word of keywords) {
    const clean = word.replace(/[.,;:()[\]]/g, "");
    if (stopWords.has(clean) || clean.length > 22) continue;
    if (["postgres", "terraform", "stripe", "notion", "figma", "openai", "gemini", "remotion", "vercel", "cloudflare", "supabase", "mongodb", "firebase", "duckdb"].includes(clean)) {
      tags.add(clean);
    }
  }

  return [...tags].slice(0, 8);
}

function primaryCategory(tags, collection, description) {
  const text = `${tags.join(" ")} ${collection} ${description}`.toLowerCase();
  let best = { category: "AI & Agents", score: 0 };
  for (const [category, needles] of categoryRules) {
    const score = needles.reduce((sum, needle) => sum + (text.includes(needle) ? 1 : 0), 0);
    if (score > best.score) best = { category, score };
  }
  return best.category;
}

function inferSubcategory(category, tags, collection, description, repo, title) {
  const text = `${repo} ${title} ${tags.join(" ")} ${collection} ${description}`.toLowerCase();
  const rules = subcategoryRules[category] || [];
  let best = { subcategory: "General", score: 0 };
  for (const [subcategory, needles] of rules) {
    const score = needles.reduce((sum, needle) => sum + (text.includes(needle) ? 1 : 0), 0);
    if (score > best.score) best = { subcategory, score };
  }
  return best.subcategory;
}

function inferPlatforms(text) {
  const hay = text.toLowerCase();
  const platforms = new Set();
  const checks = [
    ["Claude Code", ["claude code", "claude-code", "claude"]],
    ["Codex", ["codex"]],
    ["Cursor", ["cursor"]],
    ["Gemini CLI", ["gemini cli", "gemini"]],
    ["GitHub Copilot", ["copilot"]],
    ["OpenCode", ["opencode"]],
    ["Windsurf", ["windsurf"]],
    ["Antigravity", ["antigravity"]],
  ];

  for (const [platform, needles] of checks) {
    if (needles.some((needle) => hay.includes(needle))) platforms.add(platform);
  }
  if (platforms.size === 0) {
    platforms.add("Claude Code");
    if (hay.includes("officialskills") || hay.includes("github")) platforms.add("Codex");
  }
  return [...platforms];
}

function sourceKind(domain, url) {
  if (domain.includes("officialskills")) return "Official registry";
  if (domain.includes("skills.sh")) return "Skills registry";
  if (domain.includes("github.com")) return "GitHub";
  if (domain.includes("notion.so")) return "Notion";
  return domain;
}

function normalizeEntry(entry) {
  const domain = getDomain(entry.url);
  const tags = [...new Set(entry.tags || inferTags([entry.repo, entry.title, entry.description, entry.collection || ""]))];
  const collection = entry.collection || "Pinned from brief";
  const description = entry.description.replace(/\s+/g, " ").trim();
  const status = entry.status || (entry.official || domain.includes("officialskills") ? "official" : "community");
  const repoKey = (entry.repo || entry.url).toLowerCase();
  const category = entry.primaryCategory || primaryCategory(tags, collection, description);
  const subcategory = entry.subcategory || inferSubcategory(category, tags, collection, description, entry.repo, entry.title);

  return {
    id: slugify(`${entry.repo || entry.title}-${entry.url}`),
    repo: entry.repo,
    title: titleOverrides.get(repoKey) || entry.title || titleCase(entry.skillName || entry.repo),
    skillName: entry.skillName || entry.title || entry.repo,
    author: entry.author || "unknown",
    description,
    url: entry.url,
    domain,
    source: sourceKind(domain, entry.url),
    status,
    collection,
    primaryCategory: category,
    subcategory,
    tags,
    platforms: entry.platforms || inferPlatforms(`${entry.repo} ${entry.title} ${description} ${entry.url}`),
    pinned: Boolean(entry.pinned || pinnedRepoKeys.has(repoKey)),
    searchText: "",
  };
}

function parseMarkdown() {
  const entries = [];
  const seen = new Set();
  let current = "General";
  let inCommunity = false;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    const summary = line.match(/<summary><h3[^>]*>(.*?)<\/h3><\/summary>/i);
    if (summary) {
      current = cleanHeading(summary[1]);
      continue;
    }

    const heading = line.match(/^###\s+(.+)$/);
    if (heading) {
      current = cleanHeading(heading[1]);
      if (/community skills/i.test(current)) inCommunity = true;
      continue;
    }

    if (/^##\s+/.test(line) && /community skills/i.test(line)) inCommunity = true;
    if (/^##\s+/.test(line) && /(quality|contributing|license|security notice)/i.test(line)) break;

    const entry = line.match(/^- \*\*\[([^\]]+)\]\(([^)]+)\)\*\*(?::|\s+-)\s+(.+)$/);
    if (!entry) continue;

    const [, label, url, rawDescription] = entry;
    if (!/^https?:\/\//.test(url)) continue;
    const parts = deriveRepoParts(label, url);
    const key = `${parts.repo.toLowerCase()}|${url.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const official = !inCommunity && (/^skills by/i.test(current) || /official/i.test(current) || url.includes("officialskills.sh"));
    entries.push(
      normalizeEntry({
        ...parts,
        url,
        description: rawDescription.replace(/\s+/g, " ").trim(),
        collection: current,
        official,
      }),
    );
  }

  return entries;
}

const parsed = parseMarkdown();
const byRepoOrUrl = new Map();

for (const item of parsed) {
  byRepoOrUrl.set(`${item.repo.toLowerCase()}|${item.url.toLowerCase()}`, item);
}

for (const manual of userPinned) {
  const normalized = normalizeEntry({ ...manual, pinned: true, collection: "Pinned from brief" });
  const matching = [...byRepoOrUrl.values()].find(
    (item) =>
      item.repo.toLowerCase() === normalized.repo.toLowerCase() ||
      item.url.toLowerCase() === normalized.url.toLowerCase(),
  );
  if (matching) {
    matching.pinned = true;
    matching.description = matching.description.length >= normalized.description.length ? matching.description : normalized.description;
    matching.tags = [...new Set([...matching.tags, ...normalized.tags])].slice(0, 10);
    matching.platforms = [...new Set([...matching.platforms, ...normalized.platforms])];
  } else {
    byRepoOrUrl.set(`${normalized.repo.toLowerCase()}|${normalized.url.toLowerCase()}`, normalized);
  }
}

const skills = [...byRepoOrUrl.values()]
  .map((skill) => ({
    ...skill,
    searchText: [
      skill.title,
      skill.repo,
      skill.author,
      skill.description,
      skill.primaryCategory,
      skill.subcategory,
      skill.collection,
      skill.tags.join(" "),
      skill.platforms.join(" "),
      skill.source,
    ]
      .join(" ")
      .toLowerCase(),
  }))
  .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.primaryCategory.localeCompare(b.primaryCategory) || a.title.localeCompare(b.title));

const stats = {
  total: skills.length,
  pinned: skills.filter((skill) => skill.pinned).length,
  official: skills.filter((skill) => skill.status === "official").length,
  community: skills.filter((skill) => skill.status !== "official").length,
  categories: Object.fromEntries(
    [...new Set(skills.map((skill) => skill.primaryCategory))]
      .sort()
      .map((category) => [category, skills.filter((skill) => skill.primaryCategory === category).length]),
  ),
  subcategories: Object.fromEntries(
    [...new Set(skills.map((skill) => skill.subcategory))]
      .sort()
      .map((subcategory) => [subcategory, skills.filter((skill) => skill.subcategory === subcategory).length]),
  ),
};

const payload = {
  generatedAt: new Date().toISOString(),
  sources: [
    {
      name: "VoltAgent awesome-agent-skills",
      url: "https://github.com/VoltAgent/awesome-agent-skills",
      note: "Primary curated Markdown source for official and community agent skills.",
    },
    {
      name: "Anthropic skills",
      url: "https://github.com/anthropics/skills",
      note: "Reference examples and skill specification context.",
    },
    {
      name: "MCP Servers Agent Skills Library",
      url: "https://mcpservers.org/agent-skills",
      note: "Cross-check for live agent-skill directory framing and major author groups.",
    },
    {
      name: "Pinned examples from the brief",
      url: "https://github.com/garrytan/gstack",
      note: "GStack, Stop Slop, Graphify, Understand Anything, Last 30 Days, Frontend Design, Taste Skill, Remotion, and HyperFrames are highlighted.",
    },
  ],
  stats,
  skills,
};

const output = `window.SKILL_DATA = ${JSON.stringify(payload, null, 2)};\n`;
fs.writeFileSync(path.join(root, "skills-data.js"), output, "utf8");
console.log(`Wrote skills-data.js with ${skills.length} skills.`);
