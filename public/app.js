const i18n = {
  he: {
    brand: "Poll Winner",
    newPoll: "סקר חדש",
    builderEyebrow: "יצירת סקר",
    builderTitle: "בונים סקר, משתפים ב־QR, ורואים מנצח בזמן אמת.",
    questionLabel: "שאלה",
    questionPlaceholder: "מה נאכל הערב?",
    answersLabel: "תשובות",
    addAnswer: "הוספת תשובה",
    allowMultiple: "אפשר לבחור כמה תשובות",
    oneVote: "הצבעה אחת לכל שם",
    showVoters: "להציג שמות מצביעים לכולם",
    createPoll: "יצירת סקר",
    previewEyebrow: "תצוגה",
    livePoll: "סקר חי",
    nameLabel: "השם שלך",
    namePlaceholder: "דנה",
    voteButton: "הצבעה",
    results: "תוצאות",
    waitingWinner: "מחכים להצבעות",
    admin: "ניהול",
    shareLink: "קישור לשיתוף",
    copyLink: "העתקת קישור",
    saveSettings: "שמירת הגדרות",
    remove: "מחיקה",
    optionPlaceholder: "תשובה",
    created: "הסקר נוצר. מעביר לעמוד הניהול...",
    createError: "צריך שאלה ולפחות שתי תשובות.",
    voteSaved: "ההצבעה נשמרה.",
    alreadyVoted: "השם הזה כבר הצביע.",
    voteError: "צריך להזין שם ולבחור תשובה.",
    settingsSaved: "ההגדרות נשמרו.",
    copied: "הקישור הועתק.",
    votes: "הצבעות",
    winner: "מנצח",
    tie: "תיקו",
    noPoll: "הסקר לא נמצא.",
    chooseOne: "אפשר לבחור תשובה אחת בלבד."
  },
  en: {
    brand: "Poll Winner",
    newPoll: "New poll",
    builderEyebrow: "Poll builder",
    builderTitle: "Build a poll, share a QR, and watch the winner update live.",
    questionLabel: "Question",
    questionPlaceholder: "What should we eat tonight?",
    answersLabel: "Answers",
    addAnswer: "Add answer",
    allowMultiple: "Allow multiple answers",
    oneVote: "One vote per name",
    showVoters: "Show voter names to everyone",
    createPoll: "Create poll",
    previewEyebrow: "Preview",
    livePoll: "Live poll",
    nameLabel: "Your name",
    namePlaceholder: "Dana",
    voteButton: "Vote",
    results: "Results",
    waitingWinner: "Waiting for votes",
    admin: "Admin",
    shareLink: "Share link",
    copyLink: "Copy link",
    saveSettings: "Save settings",
    remove: "Remove",
    optionPlaceholder: "Answer",
    created: "Poll created. Opening admin view...",
    createError: "Add a question and at least two answers.",
    voteSaved: "Vote saved.",
    alreadyVoted: "That name has already voted.",
    voteError: "Enter a name and pick an answer.",
    settingsSaved: "Settings saved.",
    copied: "Link copied.",
    votes: "votes",
    winner: "Winner",
    tie: "Tie",
    noPoll: "Poll not found.",
    chooseOne: "Only one answer is allowed."
  }
};

const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);

let language = localStorage.getItem("pollWinnerLanguage") || "he";
let currentPoll = null;
let stream = null;

const optionDefaults = {
  he: ["פיצה", "סושי", "המבורגר"],
  en: ["Pizza", "Sushi", "Burgers"]
};

applyLanguage();
setupBuilder();
route();

$("#langToggle").addEventListener("click", () => {
  language = language === "he" ? "en" : "he";
  localStorage.setItem("pollWinnerLanguage", language);
  applyLanguage();
  renderPreview();
  if (currentPoll) renderPoll(currentPoll);
});

function setupBuilder() {
  const optionsList = $("#optionsList");
  for (const text of optionDefaults[language]) addOption(text);
  $("#questionInput").addEventListener("input", renderPreview);
  $("#addOptionButton").addEventListener("click", () => addOption(""));
  $("#pollForm").addEventListener("submit", createPoll);

  optionsList.addEventListener("input", renderPreview);
  optionsList.addEventListener("click", (event) => {
    if (!event.target.matches(".remove-button")) return;
    if (optionsList.children.length <= 2) return;
    event.target.closest(".option-row").remove();
    renderPreview();
  });
  renderPreview();
}

function route() {
  const adminId = params.get("admin");
  const pollId = params.get("poll");
  if (adminId) {
    showView("adminView");
    loadPoll(adminId, params.get("token"), true);
    return;
  }
  if (pollId) {
    showView("pollView");
    loadPoll(pollId, null, false);
  }
}

function showView(id) {
  for (const view of ["builderView", "pollView", "adminView"]) {
    $(`#${view}`).classList.toggle("hidden", view !== id);
  }
}

function applyLanguage() {
  document.documentElement.lang = language;
  document.documentElement.dir = language === "he" ? "rtl" : "ltr";
  $("#langToggle").textContent = language === "he" ? "EN" : "עב";
  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll("[data-i18n-placeholder]")) {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  }
}

function t(key) {
  return i18n[language][key] || key;
}

function addOption(value) {
  const row = document.createElement("div");
  row.className = "option-row";
  row.innerHTML = `
    <input maxlength="80" placeholder="${t("optionPlaceholder")}" value="${escapeHtml(value)}" required />
    <button class="remove-button" type="button" title="${t("remove")}" aria-label="${t("remove")}">×</button>
  `;
  $("#optionsList").append(row);
  renderPreview();
}

function renderPreview() {
  const question = $("#questionInput").value.trim() || t("questionPlaceholder");
  const options = getOptionValues();
  $("#previewQuestion").textContent = question;
  $("#previewOptions").innerHTML = "";
  for (const option of options.length ? options : optionDefaults[language]) {
    const item = document.createElement("div");
    item.className = "preview-option";
    item.textContent = option;
    $("#previewOptions").append(item);
  }
}

function getOptionValues() {
  return [...document.querySelectorAll("#optionsList input")]
    .map((input) => input.value.trim())
    .filter(Boolean);
}

async function createPoll(event) {
  event.preventDefault();
  const question = $("#questionInput").value.trim();
  const options = getOptionValues();
  if (!question || options.length < 2) {
    $("#builderStatus").textContent = t("createError");
    return;
  }

  const response = await fetch("/api/polls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      options,
      language,
      allowMultipleAnswers: $("#allowMultipleAnswers").checked,
      oneVotePerName: $("#oneVotePerName").checked,
      showVoters: $("#showVoters").checked
    })
  });

  if (!response.ok) {
    $("#builderStatus").textContent = t("createError");
    return;
  }
  const payload = await response.json();
  $("#builderStatus").textContent = t("created");
  location.href = payload.adminUrl;
}

async function loadPoll(id, token, isAdmin) {
  const url = `/api/polls/${id}${token ? `?admin=${encodeURIComponent(token)}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    const target = isAdmin ? "#adminQuestion" : "#pollQuestion";
    $(target).textContent = t("noPoll");
    return;
  }

  currentPoll = await response.json();
  language = currentPoll.settings.language || language;
  localStorage.setItem("pollWinnerLanguage", language);
  applyLanguage();
  renderPoll(currentPoll);
  connectStream(id, isAdmin);
  if (isAdmin) setupAdmin(token);
}

function connectStream(id, isAdmin) {
  if (stream) stream.close();
  stream = new EventSource(`/api/polls/${id}/stream`);
  stream.addEventListener("poll", (event) => {
    const nextPoll = JSON.parse(event.data);
    currentPoll = { ...nextPoll, isAdmin };
    renderPoll(currentPoll);
  });
}

function renderPoll(poll) {
  if (poll.isAdmin) {
    $("#adminQuestion").textContent = poll.question;
    $("#adminAllowMultiple").checked = poll.settings.allowMultipleAnswers;
    $("#adminOneVote").checked = poll.settings.oneVotePerName;
    $("#adminShowVoters").checked = poll.settings.showVoters;
    renderResults(poll, $("#adminResultsList"), $("#adminWinnerTitle"), $("#adminVotesCount"));
    const shareUrl = `${location.origin}/?poll=${poll.id}`;
    $("#shareLink").value = shareUrl;
    drawQr($("#qrCanvas"), shareUrl);
    return;
  }

  $("#pollQuestion").textContent = poll.question;
  const selected = new Set([...document.querySelectorAll("#voteOptions input:checked")].map((input) => input.value));
  $("#voteOptions").innerHTML = "";
  const inputType = poll.settings.allowMultipleAnswers ? "checkbox" : "radio";
  for (const option of poll.options) {
    const label = document.createElement("label");
    label.className = "vote-option";
    label.innerHTML = `
      <input type="${inputType}" name="option" value="${option.id}" ${selected.has(option.id) ? "checked" : ""} />
      <span>${escapeHtml(option.text)}</span>
    `;
    $("#voteOptions").append(label);
  }
  renderResults(poll, $("#resultsList"), $("#winnerTitle"), $("#votesCount"));
}

function renderResults(poll, list, title, count) {
  const maxVotes = Math.max(1, ...poll.options.map((option) => option.votes));
  count.textContent = poll.votesCount;
  if (!poll.winners.length) {
    title.textContent = t("waitingWinner");
  } else {
    const names = poll.options
      .filter((option) => poll.winners.includes(option.id))
      .map((option) => option.text)
      .join(", ");
    title.textContent = `${poll.winners.length > 1 ? t("tie") : t("winner")}: ${names}`;
  }

  list.innerHTML = "";
  for (const option of poll.options) {
    const item = document.createElement("div");
    item.className = `result-item ${poll.winners.includes(option.id) ? "winner" : ""}`;
    const percent = Math.round((option.votes / maxVotes) * 100);
    const voters = option.voters.length
      ? `<div class="voter-list">${escapeHtml(option.voters.join(", "))}</div>`
      : "";
    item.innerHTML = `
      <div class="result-top">
        <span>${escapeHtml(option.text)}</span>
        <span>${option.votes} ${t("votes")}</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${percent}%"></div></div>
      ${voters}
    `;
    list.append(item);
  }
}

$("#voteForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const voterName = $("#voterName").value.trim();
  const optionIds = [...document.querySelectorAll("#voteOptions input:checked")].map((input) => input.value);
  if (!voterName || optionIds.length === 0) {
    $("#voteStatus").textContent = t("voteError");
    return;
  }
  if (!currentPoll.settings.allowMultipleAnswers && optionIds.length > 1) {
    $("#voteStatus").textContent = t("chooseOne");
    return;
  }

  const response = await fetch(`/api/polls/${currentPoll.id}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voterName, optionIds })
  });
  if (response.status === 409) {
    $("#voteStatus").textContent = t("alreadyVoted");
    return;
  }
  if (!response.ok) {
    $("#voteStatus").textContent = t("voteError");
    return;
  }
  $("#voteStatus").textContent = t("voteSaved");
});

function setupAdmin(token) {
  $("#copyLinkButton").onclick = async () => {
    await navigator.clipboard.writeText($("#shareLink").value);
    $("#adminStatus").textContent = t("copied");
  };

  $("#adminSettings").onsubmit = async (event) => {
    event.preventDefault();
    const response = await fetch(`/api/polls/${currentPoll.id}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminToken: token,
        allowMultipleAnswers: $("#adminAllowMultiple").checked,
        oneVotePerName: $("#adminOneVote").checked,
        showVoters: $("#adminShowVoters").checked,
        language
      })
    });
    $("#adminStatus").textContent = response.ok ? t("settingsSaved") : t("voteError");
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
