const DATA = window.SKILL_DATA || { skills: [], sources: [], stats: {} };
const skills = DATA.skills || [];

const storage = (() => {
  try {
    const probe = "__skill_atlas_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    const memory = new Map();
    return {
      getItem: (key) => (memory.has(key) ? memory.get(key) : null),
      setItem: (key, value) => memory.set(key, String(value)),
      removeItem: (key) => memory.delete(key),
    };
  }
})();

function readStoredJSON(key, fallback) {
  try {
    return JSON.parse(storage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

const state = {
  query: "",
  context: storage.getItem("skill-atlas-context") || "",
  categories: new Set(),
  subcategories: new Set(),
  tags: new Set(),
  platforms: new Set(),
  source: "all",
  view: "cards",
  sort: "relevance",
  network: "smart",
  visible: 96,
  selectedId: skills.find((skill) => skill.pinned)?.id || skills[0]?.id || null,
  shortlist: new Set(readStoredJSON("skill-atlas-shortlist", [])),
};

const els = {
  search: document.querySelector("#search-input"),
  statTotal: document.querySelector("#stat-total"),
  statOfficial: document.querySelector("#stat-official"),
  statCommunity: document.querySelector("#stat-community"),
  statPinned: document.querySelector("#stat-pinned"),
  filteredCount: document.querySelector("#filtered-count"),
  categoryFilters: document.querySelector("#category-filters"),
  subcategoryFilters: document.querySelector("#subcategory-filters"),
  platformFilters: document.querySelector("#platform-filters"),
  tagFilters: document.querySelector("#tag-filters"),
  intentRow: document.querySelector("#intent-row"),
  activeFilters: document.querySelector("#active-filters"),
  cards: document.querySelector("#cards-view"),
  list: document.querySelector("#list-view"),
  networkView: document.querySelector("#network-view"),
  canvas: document.querySelector("#skill-network"),
  networkInsights: document.querySelector("#network-insights"),
  networkNote: document.querySelector("#network-note"),
  contextInput: document.querySelector("#context-input"),
  contextCount: document.querySelector("#context-count"),
  contextMatches: document.querySelector("#context-matches"),
  contextBrief: document.querySelector("#context-brief"),
  detailsEmpty: document.querySelector("#details-empty"),
  detailsContent: document.querySelector("#details-content"),
  shortlist: document.querySelector("#shortlist-list"),
  loadMore: document.querySelector("#load-more"),
  sort: document.querySelector("#sort-select"),
  toast: document.querySelector("#toast"),
  sources: document.querySelector("#source-links"),
};

const intents = [
  {
    label: "Design a polished UI",
    query: "frontend design ui ux",
    categories: ["Design & UX"],
    tags: ["frontend", "design"],
  },
  {
    label: "Understand a codebase",
    query: "codebase knowledge graph",
    categories: ["Research & Knowledge", "Code & Dev"],
    tags: ["knowledge-graph", "development"],
  },
  {
    label: "Stop generic writing",
    query: "slop prose writing copy",
    categories: ["Writing & Docs", "Marketing & Growth"],
    tags: ["anti-slop", "writing"],
  },
  {
    label: "Test a web app",
    query: "playwright browser testing qa",
    categories: ["Testing & QA"],
    tags: ["testing", "browser-automation"],
  },
  {
    label: "Research the market",
    query: "research trends social web",
    categories: ["Research & Knowledge", "Marketing & Growth"],
    tags: ["research"],
  },
  {
    label: "Make video or media",
    query: "video remotion hyperframes media",
    categories: ["Media & Creative"],
    tags: ["media"],
  },
  {
    label: "Secure the work",
    query: "security owasp threat secrets",
    categories: ["Security"],
    tags: ["security"],
  },
  {
    label: "Ship product",
    query: "deploy release startup product qa",
    categories: ["Product & Ops", "Cloud & DevOps"],
    tags: ["product"],
  },
];

const palette = {
  "Code & Dev": "#2f5f98",
  "Testing & QA": "#0f766e",
  "Design & UX": "#c85b45",
  "Research & Knowledge": "#6c5a9a",
  "Writing & Docs": "#9a6a18",
  "Marketing & Growth": "#9d4f72",
  "Data & Analytics": "#4f759b",
  Security: "#8a3a32",
  "Cloud & DevOps": "#436f39",
  "AI & Agents": "#315d5b",
  "Media & Creative": "#b45a34",
  "Product & Ops": "#6f6440",
  Mobile: "#486c9d",
  Education: "#5f7b3a",
};

const contextStopWords = new Set([
  "about",
  "after",
  "again",
  "agent",
  "agents",
  "also",
  "and",
  "any",
  "build",
  "could",
  "for",
  "from",
  "have",
  "into",
  "make",
  "need",
  "needs",
  "project",
  "should",
  "skill",
  "skills",
  "task",
  "that",
  "the",
  "their",
  "there",
  "this",
  "your",
  "using",
  "want",
  "with",
  "work",
  "would",
]);

const icon = {
  external:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7" /><path d="M10 14 21 3" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></svg>',
  star:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>',
  info:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 10v7" /><path d="M12 7h.01" /></svg>',
  copy:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8h10v12H8z" /><path d="M6 16H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></svg>',
};

let filteredSkills = [];
let scoredSkills = new Map();
let toastTimer = 0;
let networkNodes = [];
let hoverNode = null;

function number(value) {
  return new Intl.NumberFormat().format(value || 0);
}

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#. -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countBy(items, getter) {
  const counts = new Map();
  for (const item of items) {
    const values = Array.isArray(getter(item)) ? getter(item) : [getter(item)];
    for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function scoreSkill(skill) {
  const query = normalize(state.query);
  let score = skill.pinned ? 8 : 0;
  if (!query) return score;

  const tokens = query.split(" ").filter((token) => token.length > 2 && !contextStopWords.has(token));
  if (!tokens.length) return score;
  let matched = 0;
  for (const token of tokens) {
    if (skill.searchText.includes(token)) {
      matched += 1;
      score += 5;
      if (normalize(skill.title).includes(token)) score += 9;
      if (normalize(skill.repo).includes(token)) score += 8;
      if (skill.tags.some((tag) => normalize(tag).includes(token))) score += 7;
      if (normalize(skill.primaryCategory).includes(token)) score += 4;
    }
  }

  if (matched === 0) return -1;
  if (matched < Math.ceil(tokens.length * 0.55)) score -= 8;
  if (skill.pinned && matched > 0) score += 12;
  return score;
}

function contextTokens(text) {
  return [...new Set(normalize(text).split(" ").filter((token) => token.length > 2 && !contextStopWords.has(token)))];
}

function scoreSkillForContext(skill, tokens) {
  if (!tokens.length) return 0;
  let score = skill.pinned ? 4 : 0;
  if (state.shortlist.has(skill.id)) score += 10;

  const title = normalize(skill.title);
  const repo = normalize(skill.repo);
  const category = normalize(skill.primaryCategory);
  const subcategory = normalize(skill.subcategory);
  const tagText = normalize(skill.tags.join(" "));
  const description = normalize(skill.description);

  for (const token of tokens) {
    if (title.includes(token)) score += 16;
    if (repo.includes(token)) score += 12;
    if (subcategory.includes(token)) score += 10;
    if (category.includes(token)) score += 8;
    if (tagText.includes(token)) score += 7;
    if (description.includes(token)) score += 4;
  }

  const phrase = tokens.join(" ");
  if (phrase.length > 7 && skill.searchText.includes(phrase)) score += 18;
  return score;
}

function contextReason(skill, tokens) {
  const tagHits = skill.tags.filter((tag) => tokens.some((token) => normalize(tag).includes(token))).slice(0, 3);
  const titleHits = tokens.filter((token) => normalize(skill.title).includes(token)).slice(0, 2);
  const categoryHit = tokens.some((token) => normalize(`${skill.primaryCategory} ${skill.subcategory}`).includes(token));

  if (titleHits.length) return `name match: ${titleHits.join(", ")}`;
  if (tagHits.length) return `tag match: ${tagHits.join(", ")}`;
  if (categoryHit) return `${skill.primaryCategory} / ${skill.subcategory}`;
  if (state.shortlist.has(skill.id)) return "already shortlisted";
  if (skill.pinned) return "pinned reference skill";
  return `${skill.primaryCategory} / ${skill.subcategory}`;
}

function contextRecommendations(limit = 8) {
  const tokens = contextTokens(state.context);
  if (!tokens.length) {
    return [...state.shortlist]
      .map(getSkill)
      .filter(Boolean)
      .slice(0, limit)
      .map((skill) => ({ skill, score: 1, reason: "already shortlisted" }));
  }

  return skills
    .map((skill) => ({
      skill,
      score: scoreSkillForContext(skill, tokens),
      reason: contextReason(skill, tokens),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.skill.pinned) - Number(a.skill.pinned) || a.skill.title.localeCompare(b.skill.title))
    .slice(0, limit);
}

function passesFilters(skill) {
  if (state.categories.size && !state.categories.has(skill.primaryCategory)) return false;
  if (state.subcategories.size && !state.subcategories.has(skill.subcategory)) return false;
  if (state.tags.size && !skill.tags.some((tag) => state.tags.has(tag))) return false;
  if (state.platforms.size && !skill.platforms.some((platform) => state.platforms.has(platform))) return false;
  if (state.source === "official" && skill.status !== "official") return false;
  if (state.source === "community" && skill.status === "official") return false;
  if (state.source === "pinned" && !skill.pinned) return false;

  const score = scoreSkill(skill);
  scoredSkills.set(skill.id, score);
  return score >= 0;
}

function getFiltered() {
  scoredSkills = new Map();
  const next = skills.filter(passesFilters);
  const sort = state.sort;

  next.sort((a, b) => {
    if (sort === "relevance") return (scoredSkills.get(b.id) || 0) - (scoredSkills.get(a.id) || 0) || a.title.localeCompare(b.title);
    if (sort === "pinned") return Number(b.pinned) - Number(a.pinned) || a.title.localeCompare(b.title);
    if (sort === "name") return a.title.localeCompare(b.title);
    if (sort === "category") return a.primaryCategory.localeCompare(b.primaryCategory) || a.title.localeCompare(b.title);
    if (sort === "author") return a.author.localeCompare(b.author) || a.title.localeCompare(b.title);
    return 0;
  });

  return next;
}

function saveShortlist() {
  storage.setItem("skill-atlas-shortlist", JSON.stringify([...state.shortlist]));
}

function initials(author) {
  return (author || "?")
    .split(/[-_\s]/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function categoryStyle(category) {
  return `style="--cat:${palette[category] || "#315d5b"}"`;
}

function tagMarkup(skill, max = 4) {
  const tags = [
    `<span class="tag category">${escapeHTML(skill.primaryCategory)}</span>`,
    skill.subcategory ? `<span class="tag subcategory">${escapeHTML(skill.subcategory)}</span>` : "",
    skill.status === "official" ? '<span class="tag official">official</span>' : "",
    skill.pinned ? '<span class="tag pinned">pinned</span>' : "",
    ...skill.tags.slice(0, max).map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`),
  ];
  return tags.filter(Boolean).join("");
}

function renderStats() {
  els.statTotal.textContent = number(DATA.stats.total || skills.length);
  els.statOfficial.textContent = number(DATA.stats.official || skills.filter((skill) => skill.status === "official").length);
  els.statCommunity.textContent = number(DATA.stats.community || skills.filter((skill) => skill.status !== "official").length);
  els.statPinned.textContent = number(DATA.stats.pinned || skills.filter((skill) => skill.pinned).length);
}

function renderIntentButtons() {
  els.intentRow.innerHTML = intents
    .map(
      (intent, index) =>
        `<button class="intent-button" type="button" data-intent="${index}">${escapeHTML(intent.label)}</button>`,
    )
    .join("");
}

function renderFacets() {
  const categories = Object.entries(DATA.stats.categories || {})
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  els.categoryFilters.innerHTML = categories
    .map(
      ([category, count]) => `
        <button class="chip ${state.categories.has(category) ? "active" : ""}" type="button" data-filter="category" data-value="${escapeHTML(category)}">
          <span>${escapeHTML(category)}</span><small>${number(count)}</small>
        </button>`,
    )
    .join("");

  const subcategoryBase = state.categories.size
    ? skills.filter((skill) => state.categories.has(skill.primaryCategory))
    : skills;
  els.subcategoryFilters.innerHTML = countBy(subcategoryBase, (skill) => skill.subcategory)
    .slice(0, state.categories.size ? 28 : 18)
    .map(
      ([subcategory, count]) => `
        <button class="chip ${state.subcategories.has(subcategory) ? "active" : ""}" type="button" data-filter="subcategory" data-value="${escapeHTML(subcategory)}">
          <span>${escapeHTML(subcategory)}</span><small>${number(count)}</small>
        </button>`,
    )
    .join("");

  els.platformFilters.innerHTML = countBy(skills, (skill) => skill.platforms)
    .slice(0, 12)
    .map(
      ([platform, count]) => `
        <button class="chip ${state.platforms.has(platform) ? "active" : ""}" type="button" data-filter="platform" data-value="${escapeHTML(platform)}">
          <span>${escapeHTML(platform)}</span><small>${number(count)}</small>
        </button>`,
    )
    .join("");

  els.tagFilters.innerHTML = countBy(skills, (skill) => skill.tags)
    .filter(([tag]) => !["development", "agents"].includes(tag))
    .slice(0, 30)
    .map(
      ([tag, count]) => `
        <button class="chip ${state.tags.has(tag) ? "active" : ""}" type="button" data-filter="tag" data-value="${escapeHTML(tag)}">
          <span>${escapeHTML(tag)}</span><small>${number(count)}</small>
        </button>`,
    )
    .join("");

  document.querySelectorAll("#source-filter button").forEach((button) => {
    button.classList.toggle("active", button.dataset.source === state.source);
  });
}

function renderActiveFilters() {
  const tokens = [];
  if (state.query) tokens.push(["query", state.query, "Search"]);
  for (const category of state.categories) tokens.push(["category", category, "Category"]);
  for (const subcategory of state.subcategories) tokens.push(["subcategory", subcategory, "Subcategory"]);
  for (const tag of state.tags) tokens.push(["tag", tag, "Tag"]);
  for (const platform of state.platforms) tokens.push(["platform", platform, "Platform"]);
  if (state.source !== "all") tokens.push(["source", state.source, "Source"]);

  els.activeFilters.innerHTML = tokens
    .map(
      ([type, value, label]) => `
        <span class="active-token">
          ${escapeHTML(label)}: ${escapeHTML(value)}
          <button type="button" data-remove-filter="${escapeHTML(type)}" data-value="${escapeHTML(value)}" aria-label="Remove ${escapeHTML(label)} filter">x</button>
        </span>`,
    )
    .join("");
}

function cardMarkup(skill) {
  const shortlisted = state.shortlist.has(skill.id);
  return `
    <article class="skill-card ${skill.pinned ? "pinned" : ""}" data-id="${escapeHTML(skill.id)}" ${categoryStyle(skill.primaryCategory)}>
      <div class="card-top">
        <span class="avatar" aria-hidden="true">${escapeHTML(initials(skill.author))}</span>
        <div class="card-title">
          <h3>${escapeHTML(skill.title)}</h3>
          <p>${escapeHTML(skill.repo)} · ${escapeHTML(skill.source)}</p>
        </div>
        <div class="card-actions">
          <button class="card-icon ${shortlisted ? "active" : ""}" type="button" data-action="shortlist" data-id="${escapeHTML(skill.id)}" title="${shortlisted ? "Remove from shortlist" : "Add to shortlist"}" aria-label="${shortlisted ? "Remove from shortlist" : "Add to shortlist"}">${icon.star}</button>
          <a class="card-icon" href="${escapeHTML(skill.url)}" target="_blank" rel="noreferrer" title="Open source" aria-label="Open source">${icon.external}</a>
        </div>
      </div>
      <p class="description">${escapeHTML(skill.description)}</p>
      <div class="tag-row">${tagMarkup(skill)}</div>
    </article>`;
}

function listMarkup(skill) {
  return `
    <div class="list-row" data-id="${escapeHTML(skill.id)}">
      <div>
        <h3>${escapeHTML(skill.title)}</h3>
        <p>${escapeHTML(skill.repo)} · ${escapeHTML(skill.source)}</p>
      </div>
      <div class="list-meta">${tagMarkup(skill, 2)}</div>
      <p>${escapeHTML(skill.description)}</p>
      <div class="card-actions">
        <button class="card-icon ${state.shortlist.has(skill.id) ? "active" : ""}" type="button" data-action="shortlist" data-id="${escapeHTML(skill.id)}" title="Toggle shortlist" aria-label="Toggle shortlist">${icon.star}</button>
        <a class="card-icon" href="${escapeHTML(skill.url)}" target="_blank" rel="noreferrer" title="Open source" aria-label="Open source">${icon.external}</a>
      </div>
    </div>`;
}

function renderResults() {
  filteredSkills = getFiltered();
  const visible = filteredSkills.slice(0, state.visible);

  els.filteredCount.textContent = `${number(filteredSkills.length)} shown`;
  els.cards.hidden = state.view !== "cards";
  els.list.hidden = state.view !== "list";
  els.networkView.hidden = state.view !== "network";
  els.loadMore.hidden = state.view === "network" || state.visible >= filteredSkills.length;

  if (state.view === "cards") els.cards.innerHTML = visible.map(cardMarkup).join("") || emptyResults();
  if (state.view === "list") els.list.innerHTML = visible.map(listMarkup).join("") || emptyResults();
  if (state.view === "network") renderNetwork(filteredSkills);

  renderActiveFilters();
  renderDetails();
  renderShortlist();
  renderContext();
}

function emptyResults() {
  return `
    <div class="details-empty">
      ${icon.info}
      <h2>No matching skills</h2>
      <p>Try fewer filters, a broader category, or a shorter search.</p>
    </div>`;
}

function getSkill(id) {
  return skills.find((skill) => skill.id === id);
}

function relatedSkills(skill) {
  return skills
    .filter((candidate) => candidate.id !== skill.id)
    .map((candidate) => {
      const tagOverlap = candidate.tags.filter((tag) => skill.tags.includes(tag)).length;
      const categoryOverlap = candidate.primaryCategory === skill.primaryCategory ? 3 : 0;
      const authorOverlap = candidate.author === skill.author ? 2 : 0;
      const pinnedBoost = candidate.pinned ? 1 : 0;
      return { candidate, score: tagOverlap * 2 + categoryOverlap + authorOverlap + pinnedBoost };
    })
    .filter((item) => item.score > 1)
    .sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title))
    .slice(0, 6)
    .map((item) => item.candidate);
}

function fitText(skill) {
  const use = skill.tags.slice(0, 3).join(", ") || skill.primaryCategory.toLowerCase();
  const platform = skill.platforms.slice(0, 3).join(", ");
  return [
    ["Best fit", `${skill.primaryCategory} work involving ${use}.`],
    ["Source", `${skill.status === "official" ? "Official or team-published" : "Community-published"} entry from ${skill.source}.`],
    ["Likely agent surface", platform ? platform : "Any agent that supports skill instructions."],
  ];
}

function renderDetails() {
  const skill = getSkill(state.selectedId);
  if (!skill) {
    els.detailsEmpty.hidden = false;
    els.detailsContent.hidden = true;
    return;
  }

  els.detailsEmpty.hidden = true;
  els.detailsContent.hidden = false;
  const shortlisted = state.shortlist.has(skill.id);
  const related = relatedSkills(skill);

  els.detailsContent.innerHTML = `
    <div class="detail-heading">
      <span class="avatar" aria-hidden="true">${escapeHTML(initials(skill.author))}</span>
      <div>
        <h2>${escapeHTML(skill.title)}</h2>
        <p>${escapeHTML(skill.repo)} · ${escapeHTML(skill.collection)}</p>
      </div>
    </div>
    <p class="detail-description">${escapeHTML(skill.description)}</p>
    <div class="tag-row">${tagMarkup(skill, 8)}</div>
    <div class="detail-actions">
      <a class="primary-link" href="${escapeHTML(skill.url)}" target="_blank" rel="noreferrer">Open source ${icon.external}</a>
      <button class="icon-button ${shortlisted ? "active" : ""}" type="button" data-action="shortlist" data-id="${escapeHTML(skill.id)}" title="${shortlisted ? "Remove from shortlist" : "Add to shortlist"}" aria-label="${shortlisted ? "Remove from shortlist" : "Add to shortlist"}">${icon.star}</button>
    </div>
    <div class="fit-list">
      ${fitText(skill)
        .map(
          ([label, value]) => `
            <div class="fit-item"><strong>${escapeHTML(label)}</strong><span>${escapeHTML(value)}</span></div>`,
        )
        .join("")}
    </div>
    <h3>Related Skills</h3>
    <div class="related-list">
      ${
        related.length
          ? related
              .map(
                (item) => `
                  <button class="related-button" type="button" data-action="select" data-id="${escapeHTML(item.id)}">
                    ${escapeHTML(item.title)}
                    <small>${escapeHTML(item.primaryCategory)} · ${escapeHTML(item.author)}</small>
                  </button>`,
              )
              .join("")
          : '<p class="empty-small">No close neighbors yet.</p>'
      }
    </div>`;
}

function renderShortlist() {
  const items = [...state.shortlist].map(getSkill).filter(Boolean);
  els.shortlist.innerHTML = items.length
    ? items
        .map(
          (skill) => `
            <button class="shortlist-item" type="button" data-action="select" data-id="${escapeHTML(skill.id)}">
              ${escapeHTML(skill.title)}
              <small>${escapeHTML(skill.repo)} · ${escapeHTML(skill.primaryCategory)}</small>
            </button>`,
        )
        .join("")
    : '<p class="empty-small">Save candidates as you browse.</p>';
}

function disclosureBrief(items = contextRecommendations(7)) {
  const context = state.context.trim() || "[Add task context here]";
  if (!items.length) {
    return `Task context:\n${context}\n\nDisclosed skills:\nNo matching skills selected yet.`;
  }

  return `Task context:\n${context}\n\nDisclosed skills for this context:\n${items
    .map(
      ({ skill, reason }, index) =>
        `${index + 1}. ${skill.title} (${skill.repo})\n   Fit: ${reason}; ${skill.primaryCategory} / ${skill.subcategory}\n   Use when: ${skill.description}\n   Source: ${skill.url}`,
    )
    .join("\n")}\n\nInstruction to the AI agent:\nConsider these disclosed skills before starting. Use only the smallest relevant subset, explain which skill(s) you are applying, and ignore any listed skill that does not fit the task.`;
}

function renderContext() {
  if (!els.contextInput) return;
  if (els.contextInput.value !== state.context) els.contextInput.value = state.context;
  const recommendations = contextRecommendations(8);
  els.contextCount.textContent = `${number(recommendations.length)} matched`;
  els.contextMatches.innerHTML = recommendations.length
    ? recommendations
        .map(
          ({ skill, score, reason }) => `
            <article class="context-match" data-id="${escapeHTML(skill.id)}">
              <div>
                <strong>${escapeHTML(skill.title)}</strong>
                <small>${escapeHTML(skill.repo)} · ${escapeHTML(skill.primaryCategory)} / ${escapeHTML(skill.subcategory)}</small>
              </div>
              <p>${escapeHTML(reason)} · score ${number(score)}</p>
              <div class="context-match-actions">
                <button type="button" data-action="select" data-id="${escapeHTML(skill.id)}">Inspect</button>
                <button type="button" data-action="shortlist" data-id="${escapeHTML(skill.id)}">${state.shortlist.has(skill.id) ? "Saved" : "Save"}</button>
              </div>
            </article>`,
        )
        .join("")
    : '<p class="empty-small">Shortlist a skill or add task context.</p>';
  els.contextBrief.value = disclosureBrief(recommendations.slice(0, 7));
}

function renderSources() {
  els.sources.innerHTML = (DATA.sources || [])
    .map(
      (source) => `
        <a class="source-card" href="${escapeHTML(source.url)}" target="_blank" rel="noreferrer">
          <strong>${escapeHTML(source.name)}</strong>
          <p>${escapeHTML(source.note)}</p>
        </a>`,
    )
    .join("");
}

function toggleSet(set, value) {
  if (set.has(value)) set.delete(value);
  else set.add(value);
}

function pruneSubcategories() {
  if (!state.categories.size || !state.subcategories.size) return;
  const valid = new Set(
    skills
      .filter((skill) => state.categories.has(skill.primaryCategory))
      .map((skill) => skill.subcategory),
  );
  state.subcategories = new Set([...state.subcategories].filter((subcategory) => valid.has(subcategory)));
}

function resetFilters() {
  state.query = "";
  state.categories.clear();
  state.subcategories.clear();
  state.tags.clear();
  state.platforms.clear();
  state.source = "all";
  state.visible = 96;
  els.search.value = "";
  renderAll();
}

function applyIntent(intent) {
  state.query = intent.query;
  state.categories = new Set(intent.categories);
  state.subcategories.clear();
  state.tags = new Set(intent.tags);
  state.platforms.clear();
  state.source = "all";
  state.visible = 96;
  els.search.value = state.query;
  renderAll();
}

function selectSkill(id, scroll = false) {
  state.selectedId = id;
  renderDetails();
  if (scroll) document.querySelector(".details")?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (state.view === "network") renderNetwork(filteredSkills);
}

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  return fallbackCopy(text);
}

function fallbackCopy(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.append(area);
  area.focus();
  area.select();
  document.execCommand("copy");
  area.remove();
  return Promise.resolve();
}

function stackBrief() {
  const items = [...state.shortlist].map(getSkill).filter(Boolean);
  if (!items.length) return "No skills shortlisted yet.";
  return `Help me choose and install an AI-agent skill stack for this goal:\n\n[Describe my goal here]\n\nShortlisted skills:\n${items
    .map((skill, index) => `${index + 1}. ${skill.title} (${skill.repo})\n   ${skill.description}\n   ${skill.url}`)
    .join("\n")}\n\nCompare overlap, pick the smallest useful set, and suggest the order to try them.`;
}

function randomMatch() {
  const pool = filteredSkills.length ? filteredSkills : skills;
  if (!pool.length) return;
  const skill = pool[Math.floor(Math.random() * pool.length)];
  selectSkill(skill.id, true);
  showToast(`Jumped to ${skill.title}`);
}

function renderAll() {
  renderFacets();
  renderResults();
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash << 5) - hash + value.charCodeAt(i);
  return Math.abs(hash);
}

function effectiveNetworkMode() {
  if (state.network !== "smart") return state.network;
  if (state.subcategories.size) return "tag";
  if (state.categories.size === 1) return "subcategory";
  return "category";
}

function otherHubLabel(mode) {
  if (mode === "author") return "Other authors";
  if (mode === "subcategory") return "Other subcategories";
  if (mode === "tag") return "Other tags";
  return "Other categories";
}

function directGroupForSkill(skill, mode) {
  if (mode === "category") return skill.primaryCategory;
  if (mode === "subcategory") return skill.subcategory || "General";
  if (mode === "author") return skill.author;
  return skill.tags[0] || "General";
}

function groupForSkill(skill, mode, availableHubs) {
  if (mode === "tag") {
    const found = skill.tags.find((tag) => availableHubs.includes(tag));
    return found || otherHubLabel(mode);
  }
  const label = directGroupForSkill(skill, mode);
  return availableHubs.includes(label) ? label : otherHubLabel(mode);
}

function getNetworkHubs(items, mode) {
  const limit = mode === "category" ? 16 : mode === "author" ? 13 : 18;
  const counted =
    mode === "tag"
      ? countBy(items, (skill) => skill.tags)
      : countBy(items, (skill) => directGroupForSkill(skill, mode));
  const hubs = counted.slice(0, limit).map(([label]) => label);
  if (counted.length > limit) hubs.push(otherHubLabel(mode));
  return hubs;
}

function renderNetwork(items) {
  const canvas = els.canvas;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(700, Math.floor(rect.width));
  const height = Math.max(420, Math.floor(rect.height));
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#0f171b";
  ctx.fillRect(0, 0, width, height);
  drawNetworkGrid(ctx, width, height);

  const mode = effectiveNetworkMode();
  const visible = items.slice(0, 220);
  const hubs = getNetworkHubs(visible, mode);
  const cx = width / 2;
  const cy = height / 2;
  const hubRadius = Math.min(width, height) * 0.33;
  const nodes = [];
  const links = [];
  const buckets = new Map(hubs.map((hub) => [hub, []]));

  visible.forEach((skill) => {
    const label = groupForSkill(skill, mode, hubs);
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label).push(skill);
  });

  hubs.forEach((label, index) => {
    const angle = (Math.PI * 2 * index) / hubs.length - Math.PI / 2;
    const x = cx + Math.cos(angle) * hubRadius;
    const y = cy + Math.sin(angle) * hubRadius * 0.82;
    nodes.push({
      id: `hub-${label}`,
      type: "hub",
      label,
      x,
      y,
      r: Math.max(19, Math.min(34, 18 + label.length * 0.3)),
      count: buckets.get(label)?.length || 0,
      mode,
      color: mode === "category" ? palette[label] || "#42b7aa" : "#42b7aa",
    });
  });

  const hubMap = new Map(nodes.map((node) => [node.label, node]));
  for (const [hubLabel, bucket] of buckets.entries()) {
    const hub = hubMap.get(hubLabel);
    if (!hub) continue;
    bucket.forEach((skill, index) => {
      const hash = hashString(skill.id);
      const ring = Math.floor(index / 22);
      const angle = (Math.PI * 2 * index) / Math.max(7, Math.min(bucket.length, 30)) + ((hash % 41) / 100);
      const distance = 44 + ring * 24 + (index % 4) * 14 + (hash % 11);
      const x = Math.max(18, Math.min(width - 18, hub.x + Math.cos(angle) * distance));
      const y = Math.max(18, Math.min(height - 18, hub.y + Math.sin(angle) * distance));
      const node = {
        id: skill.id,
        type: "skill",
        label: skill.title,
        skill,
        x,
        y,
        r: skill.pinned ? 7.8 : 5.4,
        color: palette[skill.primaryCategory] || "#72d7ca",
      };
      nodes.push(node);
      links.push([hub, node]);
    });
  }

  if (!hubs.length) {
    ctx.fillStyle = "#d8eee9";
    ctx.font = "700 16px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No matching skills to map", cx, cy);
    networkNodes = [];
    els.networkInsights.innerHTML = "";
    els.networkNote.textContent = "Try fewer filters to rebuild the map.";
    return;
  }

  for (const [hub, node] of links) {
    const color = node.skill.pinned ? "rgba(243, 196, 102, 0.4)" : "rgba(188, 218, 213, 0.16)";
    ctx.beginPath();
    ctx.moveTo(hub.x, hub.y);
    ctx.lineTo(node.x, node.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = node.skill.pinned ? 1.5 : 1;
    ctx.stroke();
  }

  for (const node of nodes) {
    if (node.type !== "skill") continue;
    const selected = node.id === state.selectedId;
    const hovered = hoverNode?.id === node.id;
    ctx.beginPath();
    ctx.arc(node.x, node.y, selected || hovered ? node.r + 3 : node.r, 0, Math.PI * 2);
    ctx.fillStyle = node.color;
    ctx.globalAlpha = selected ? 1 : 0.82;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = selected ? "#ffffff" : node.skill.pinned ? "#f3c466" : "rgba(255,255,255,0.32)";
    ctx.lineWidth = selected ? 2.5 : node.skill.pinned ? 1.8 : 0.8;
    ctx.stroke();
  }

  for (const node of nodes) {
    if (node.type !== "hub") continue;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r + 6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    ctx.fillStyle = node.color;
    ctx.globalAlpha = 0.96;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.76)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 12px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    wrapCanvasLabel(ctx, node.label, node.x, node.y, node.r * 1.75, 13, 2);
    ctx.fillStyle = "rgba(255,255,255,0.74)";
    ctx.font = "700 10px Inter, system-ui, sans-serif";
    ctx.fillText(number(node.count), node.x, node.y + node.r + 15);
  }

  const labels = nodes.filter((node) => node.type === "skill" && (node.id === state.selectedId || hoverNode?.id === node.id)).slice(-2);
  for (const node of labels) {
    drawLabel(ctx, node.label, node.x, node.y - 16);
  }

  networkNodes = nodes;
  renderNetworkInsights(mode, hubs, buckets);
  els.networkNote.textContent = `Showing ${number(visible.length)} of ${number(items.length)} matching skills, grouped by ${mode}.`;
}

function drawNetworkGrid(ctx, width, height) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 44) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 44) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(66,183,170,0.08)";
  ctx.fillRect(0, 0, width, 2);
  ctx.restore();
}

function renderNetworkInsights(mode, hubs, buckets) {
  const title = mode === "subcategory" ? "Subcategory clusters" : `${mode.charAt(0).toUpperCase()}${mode.slice(1)} clusters`;
  const chips = hubs
    .map((hub) => [hub, buckets.get(hub)?.length || 0])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(
      ([label, count]) => `
        <button class="network-chip" type="button" data-network-hub="${escapeHTML(label)}" data-network-hub-mode="${escapeHTML(mode)}">
          <span>${escapeHTML(label)}</span><small>${number(count)}</small>
        </button>`,
    )
    .join("");
  els.networkInsights.innerHTML = `<strong>${escapeHTML(title)}</strong><div>${chips}</div>`;
}

function wrapCanvasLabel(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const visible = lines.slice(0, maxLines);
  visible.forEach((item, index) => ctx.fillText(item, x, y + (index - (visible.length - 1) / 2) * lineHeight));
}

function drawLabel(ctx, text, x, y) {
  ctx.font = "700 12px Inter, system-ui, sans-serif";
  const label = text.length > 32 ? `${text.slice(0, 29)}...` : text;
  const width = ctx.measureText(label).width + 14;
  ctx.fillStyle = "rgba(216,238,233,0.96)";
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  roundRect(ctx, x - width / 2, y - 26, width, 24, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#0f171b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y - 14);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function canvasNodeAt(event) {
  const rect = els.canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  let closest = null;
  let closestDistance = Infinity;
  for (const node of networkNodes) {
    const distance = Math.hypot(node.x - x, node.y - y);
    if (distance < node.r + 9 && distance < closestDistance) {
      closest = node;
      closestDistance = distance;
    }
  }
  return closest;
}

function applyHub(node) {
  const mode = node.mode || effectiveNetworkMode();
  if (node.label.startsWith("Other")) return;

  if (mode === "category") {
    state.categories = new Set([node.label]);
    state.subcategories.clear();
  } else if (mode === "subcategory") {
    state.subcategories = new Set([node.label]);
    const categories = [...new Set(skills.filter((skill) => skill.subcategory === node.label).map((skill) => skill.primaryCategory))];
    if (categories.length === 1) state.categories = new Set(categories);
  } else if (mode === "tag") {
    state.tags = new Set([node.label]);
  } else if (mode === "author") {
    state.query = node.label;
    els.search.value = node.label;
  }
  state.visible = 96;
  renderAll();
}

function handleDocumentClick(event) {
  const navTarget = event.target.closest("[data-nav-target]");
  if (navTarget) {
    const target = document.getElementById(navTarget.dataset.navTarget);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    if (navTarget.dataset.navTarget === "network" && state.view !== "network") {
      state.view = "network";
      document.querySelectorAll("#view-mode button").forEach((item) => item.classList.toggle("active", item.dataset.view === "network"));
      renderResults();
    }
    return;
  }

  const hubChip = event.target.closest("[data-network-hub]");
  if (hubChip) {
    applyHub({ label: hubChip.dataset.networkHub, mode: hubChip.dataset.networkHubMode });
    return;
  }

  const actionTarget = event.target.closest("[data-action]");
  if (actionTarget) {
    const id = actionTarget.dataset.id;
    const action = actionTarget.dataset.action;
    if (action === "select") selectSkill(id, true);
    if (action === "shortlist") {
      if (state.shortlist.has(id)) {
        state.shortlist.delete(id);
        showToast("Removed from shortlist");
      } else {
        state.shortlist.add(id);
        showToast("Added to shortlist");
      }
      saveShortlist();
      renderResults();
    }
    return;
  }

  const card = event.target.closest(".skill-card, .list-row");
  if (card && !event.target.closest("a,button")) selectSkill(card.dataset.id, false);

  const filter = event.target.closest("[data-filter]");
  if (filter) {
    const value = filter.dataset.value;
    if (filter.dataset.filter === "category") {
      toggleSet(state.categories, value);
      pruneSubcategories();
    }
    if (filter.dataset.filter === "subcategory") toggleSet(state.subcategories, value);
    if (filter.dataset.filter === "tag") toggleSet(state.tags, value);
    if (filter.dataset.filter === "platform") toggleSet(state.platforms, value);
    state.visible = 96;
    renderAll();
  }

  const remove = event.target.closest("[data-remove-filter]");
  if (remove) {
    const value = remove.dataset.value;
    const type = remove.dataset.removeFilter;
    if (type === "query") {
      state.query = "";
      els.search.value = "";
    }
    if (type === "category") state.categories.delete(value);
    if (type === "subcategory") state.subcategories.delete(value);
    if (type === "tag") state.tags.delete(value);
    if (type === "platform") state.platforms.delete(value);
    if (type === "source") state.source = "all";
    renderAll();
  }

  const intent = event.target.closest("[data-intent]");
  if (intent) applyIntent(intents[Number(intent.dataset.intent)]);
}

function initEvents() {
  els.search.addEventListener("input", (event) => {
    state.query = event.target.value;
    state.visible = 96;
    renderResults();
  });

  document.querySelector("#reset-filters").addEventListener("click", resetFilters);
  document.querySelector("#random-skill").addEventListener("click", randomMatch);

  document.querySelector("#source-filter").addEventListener("click", (event) => {
    const button = event.target.closest("[data-source]");
    if (!button) return;
    state.source = button.dataset.source;
    state.visible = 96;
    renderAll();
  });

  document.querySelector("#view-mode").addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (!button) return;
    state.view = button.dataset.view;
    document.querySelectorAll("#view-mode button").forEach((item) => item.classList.toggle("active", item === button));
    renderResults();
  });

  document.querySelector("#network-mode").addEventListener("click", (event) => {
    const button = event.target.closest("[data-network]");
    if (!button) return;
    state.network = button.dataset.network;
    document.querySelectorAll("#network-mode button").forEach((item) => item.classList.toggle("active", item === button));
    renderNetwork(filteredSkills);
  });

  els.sort.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderResults();
  });

  els.loadMore.addEventListener("click", () => {
    state.visible += 96;
    renderResults();
  });

  document.querySelector("#clear-shortlist").addEventListener("click", () => {
    state.shortlist.clear();
    saveShortlist();
    renderResults();
    showToast("Shortlist cleared");
  });

  document.querySelector("#copy-brief").addEventListener("click", () => {
    copyText(stackBrief()).then(() => showToast("Stack brief copied"));
  });

  els.contextInput?.addEventListener("input", (event) => {
    state.context = event.target.value;
    storage.setItem("skill-atlas-context", state.context);
    renderContext();
  });

  document.querySelector("#context-use-search")?.addEventListener("click", () => {
    state.query = contextTokens(state.context).join(" ");
    els.search.value = state.query;
    state.visible = 96;
    renderResults();
    showToast("Context applied to search");
  });

  document.querySelector("#context-add-top")?.addEventListener("click", () => {
    const added = contextRecommendations(5).filter(({ skill }) => {
      const isNew = !state.shortlist.has(skill.id);
      state.shortlist.add(skill.id);
      return isNew;
    }).length;
    saveShortlist();
    renderResults();
    showToast(added ? `Added ${added} skills` : "Top skills already saved");
  });

  document.querySelector("#context-copy")?.addEventListener("click", () => {
    copyText(els.contextBrief.value).then(() => showToast("Context copied"));
  });

  document.querySelector("#context-clear")?.addEventListener("click", () => {
    state.context = "";
    storage.removeItem("skill-atlas-context");
    renderContext();
    showToast("Context cleared");
  });

  els.canvas.addEventListener("pointermove", (event) => {
    const node = canvasNodeAt(event);
    if (node?.id === hoverNode?.id) return;
    hoverNode = node;
    els.canvas.style.cursor = node ? "pointer" : "crosshair";
    if (state.view === "network") renderNetwork(filteredSkills);
  });

  els.canvas.addEventListener("pointerleave", () => {
    hoverNode = null;
    els.canvas.style.cursor = "crosshair";
    if (state.view === "network") renderNetwork(filteredSkills);
  });

  els.canvas.addEventListener("click", (event) => {
    const node = canvasNodeAt(event);
    if (!node) return;
    if (node.type === "hub") applyHub(node);
    if (node.type === "skill") selectSkill(node.id, true);
  });

  window.addEventListener("resize", () => {
    if (state.view === "network") renderNetwork(filteredSkills);
  });

  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches(".skill-card, .list-row")) {
      event.preventDefault();
      selectSkill(event.target.dataset.id, true);
    }
  });
}

function init() {
  renderStats();
  renderIntentButtons();
  renderSources();
  initEvents();
  renderAll();
}

init();
