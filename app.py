import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

import streamlit as st
import streamlit.components.v1 as components

DATA_FILE = Path(__file__).with_name("polls.json")

HE = {
    "app_title": "Deloitte Oscars",
    "hero": "\u05d1\u05d5\u05e0\u05d9\u05dd \u05e1\u05e7\u05e8, \u05de\u05e9\u05ea\u05e4\u05d9\u05dd QR, \u05d5\u05e8\u05d5\u05d0\u05d9\u05dd \u05de\u05e0\u05e6\u05d7.",
    "question": "\u05e9\u05d0\u05dc\u05d4",
    "answers": "\u05ea\u05e9\u05d5\u05d1\u05d5\u05ea",
    "answer": "\u05ea\u05e9\u05d5\u05d1\u05d4",
    "create": "\u05d9\u05e6\u05d9\u05e8\u05ea \u05e1\u05e7\u05e8",
    "multiple": "\u05d0\u05e4\u05e9\u05e8 \u05dc\u05d1\u05d7\u05d5\u05e8 \u05db\u05de\u05d4 \u05ea\u05e9\u05d5\u05d1\u05d5\u05ea",
    "one_vote": "\u05d4\u05e6\u05d1\u05e2\u05d4 \u05d0\u05d7\u05ea \u05dc\u05db\u05dc \u05e9\u05dd",
    "show_names": "\u05dc\u05d4\u05e6\u05d9\u05d2 \u05e9\u05de\u05d5\u05ea \u05de\u05e6\u05d1\u05d9\u05e2\u05d9\u05dd",
    "name": "\u05d4\u05e9\u05dd \u05e9\u05dc\u05da",
    "vote": "\u05d4\u05e6\u05d1\u05e2\u05d4",
    "results": "\u05ea\u05d5\u05e6\u05d0\u05d5\u05ea",
    "winner": "\u05de\u05e0\u05e6\u05d7",
    "tie": "\u05ea\u05d9\u05e7\u05d5",
    "waiting": "\u05de\u05d7\u05db\u05d9\u05dd \u05dc\u05d4\u05e6\u05d1\u05e2\u05d5\u05ea",
    "votes": "\u05d4\u05e6\u05d1\u05e2\u05d5\u05ea",
    "share": "\u05e7\u05d9\u05e9\u05d5\u05e8 \u05dc\u05e9\u05d9\u05ea\u05d5\u05e3",
    "admin": "\u05e7\u05d9\u05e9\u05d5\u05e8 \u05e0\u05d9\u05d4\u05d5\u05dc",
    "settings": "\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea",
    "save": "\u05e9\u05de\u05d9\u05e8\u05d4",
    "saved": "\u05e0\u05e9\u05de\u05e8",
    "missing": "\u05e6\u05e8\u05d9\u05da \u05dc\u05de\u05dc\u05d0 \u05e9\u05dd \u05d5\u05dc\u05d1\u05d7\u05d5\u05e8 \u05ea\u05e9\u05d5\u05d1\u05d4",
    "duplicate": "\u05d4\u05e9\u05dd \u05d4\u05d6\u05d4 \u05db\u05d1\u05e8 \u05d4\u05e6\u05d1\u05d9\u05e2",
    "refresh": "\u05e8\u05e2\u05e0\u05d5\u05df",
    "not_found": "\u05d4\u05e1\u05e7\u05e8 \u05dc\u05d0 \u05e0\u05de\u05e6\u05d0",
}

EN = {
    "app_title": "Deloitte Oscars",
    "hero": "Build a poll, share a QR, and watch the winner.",
    "question": "Question",
    "answers": "Answers",
    "answer": "Answer",
    "create": "Create poll",
    "multiple": "Allow multiple answers",
    "one_vote": "One vote per name",
    "show_names": "Show voter names",
    "name": "Your name",
    "vote": "Vote",
    "results": "Results",
    "winner": "Winner",
    "tie": "Tie",
    "waiting": "Waiting for votes",
    "votes": "votes",
    "share": "Share link",
    "admin": "Admin link",
    "settings": "Settings",
    "save": "Save",
    "saved": "Saved",
    "missing": "Enter your name and choose an answer",
    "duplicate": "That name has already voted",
    "refresh": "Refresh",
    "not_found": "Poll not found",
}

st.set_page_config(page_title="Deloitte Oscars", page_icon="🏆", layout="wide")

if "lang" not in st.session_state:
    st.session_state.lang = "he"

lang = st.sidebar.radio("Language / \u05e9\u05e4\u05d4", ["he", "en"], index=0 if st.session_state.lang == "he" else 1)
st.session_state.lang = lang
TXT = HE if lang == "he" else EN

if lang == "he":
    st.markdown("<style>html,body,[data-testid='stAppViewContainer']{direction:rtl;text-align:right}</style>", unsafe_allow_html=True)

st.markdown(
    """
    <style>
    .block-container {padding-top: 2rem; max-width: 1120px;}
    [data-testid="stMetricValue"] {font-size: 2rem;}
    </style>
    """,
    unsafe_allow_html=True,
)


def t(key):
    return TXT[key]


def now():
    return datetime.now(timezone.utc).isoformat()


def load_data():
    if not DATA_FILE.exists():
        return {"polls": {}}
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def save_data(data):
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def base_url():
    try:
        return st.context.url.split("?")[0]
    except Exception:
        return ""


def make_url(**params):
    return base_url() + "?" + urlencode(params)


def qr(url):
    src = "https://api.qrserver.com/v1/create-qr-code/?" + urlencode({"size": "280x280", "data": url})
    components.html(
        f'<img alt="QR" src="{src}" style="width:280px;height:280px;border:1px solid #d8dee8;border-radius:8px;padding:8px;background:white">',
        height=310,
    )


def auto_refresh():
    components.html("<script>setTimeout(() => window.parent.location.reload(), 5000)</script>", height=0)


def poll_stats(poll):
    counts = {option["id"]: 0 for option in poll["options"]}
    voters = {option["id"]: [] for option in poll["options"]}
    for vote in poll["votes"]:
        for option_id in vote["option_ids"]:
            if option_id in counts:
                counts[option_id] += 1
                voters[option_id].append(vote["name"])
    top = max(counts.values(), default=0)
    winners = [] if top == 0 else [option_id for option_id, count in counts.items() if count == top]
    return counts, voters, winners


def show_results(poll, is_admin=False):
    counts, voters, winners = poll_stats(poll)
    st.subheader(t("results"))
    winner_names = [option["text"] for option in poll["options"] if option["id"] in winners]
    if winner_names:
        label = t("tie") if len(winner_names) > 1 else t("winner")
        st.success(f"{label}: {', '.join(winner_names)}")
    else:
        st.info(t("waiting"))

    st.metric(t("votes"), len(poll["votes"]))
    max_votes = max(1, *counts.values())
    for option in poll["options"]:
        label = f'{option["text"]} · {counts[option["id"]]} {t("votes")}'
        if is_admin or poll["settings"].get("show_names"):
            names = ", ".join(voters[option["id"]])
            if names:
                label += " · " + names
        st.progress(counts[option["id"]] / max_votes, text=label)


def builder(data):
    st.title(t("app_title"))
    st.caption(t("hero"))

    with st.form("builder"):
        question = st.text_input(t("question"), placeholder="Best team moment? / \u05de\u05d4 \u05d4\u05e8\u05d2\u05e2 \u05d4\u05db\u05d9 \u05d8\u05d5\u05d1?")
        count = st.number_input(t("answers"), min_value=2, max_value=20, value=4, step=1)
        answers = [st.text_input(f'{t("answer")} {index + 1}') for index in range(count)]
        allow_multiple = st.checkbox(t("multiple"), True)
        one_vote_per_name = st.checkbox(t("one_vote"), True)
        show_names = st.checkbox(t("show_names"), False)
        submitted = st.form_submit_button(t("create"), type="primary")

    if submitted:
        clean_answers = [answer.strip() for answer in answers if answer.strip()]
        if not question.strip() or len(clean_answers) < 2:
            st.error(t("missing"))
            return

        poll_id = uuid.uuid4().hex[:8]
        token = uuid.uuid4().hex
        data["polls"][poll_id] = {
            "id": poll_id,
            "token": token,
            "question": question.strip(),
            "options": [{"id": uuid.uuid4().hex[:8], "text": answer} for answer in clean_answers],
            "settings": {
                "allow_multiple": allow_multiple,
                "one_vote_per_name": one_vote_per_name,
                "show_names": show_names,
                "language": lang,
            },
            "votes": [],
            "created_at": now(),
        }
        save_data(data)
        st.success(t("saved"))
        share_url = make_url(poll=poll_id)
        admin_url = make_url(admin=poll_id, token=token)
        st.text_input(t("share"), share_url, disabled=True)
        st.text_input(t("admin"), admin_url, disabled=True)
        qr(share_url)


def vote_view(data, poll_id):
    poll = data["polls"].get(poll_id)
    if not poll:
        st.error(t("not_found"))
        return

    st.title(poll["question"])
    with st.form("vote_form"):
        voter_name = st.text_input(t("name"))
        labels = {option["text"]: option["id"] for option in poll["options"]}
        if poll["settings"].get("allow_multiple"):
            selected = st.multiselect(t("answers"), list(labels))
            option_ids = [labels[item] for item in selected]
        else:
            selected = st.radio(t("answers"), list(labels), index=None)
            option_ids = [labels[selected]] if selected else []
        submitted = st.form_submit_button(t("vote"), type="primary")

    if submitted:
        clean_name = voter_name.strip()
        if not clean_name or not option_ids:
            st.error(t("missing"))
            return
        if poll["settings"].get("one_vote_per_name"):
            duplicate = any(vote["name"].casefold() == clean_name.casefold() for vote in poll["votes"])
            if duplicate:
                st.error(t("duplicate"))
                return
        poll["votes"].append({"id": uuid.uuid4().hex[:10], "name": clean_name, "option_ids": option_ids, "created_at": now()})
        save_data(data)
        st.success(t("saved"))

    if st.button(t("refresh")):
        st.rerun()
    show_results(poll)
    auto_refresh()


def admin_view(data, poll_id, token):
    poll = data["polls"].get(poll_id)
    if not poll or poll.get("token") != token:
        st.error(t("not_found"))
        return

    st.title(poll["question"])
    left, right = st.columns([1, 2])
    with left:
        qr(make_url(poll=poll_id))
    with right:
        st.text_input(t("share"), make_url(poll=poll_id), disabled=True)
        st.text_input(t("admin"), make_url(admin=poll_id, token=token), disabled=True)

    st.subheader(t("settings"))
    with st.form("settings"):
        poll["settings"]["allow_multiple"] = st.checkbox(t("multiple"), poll["settings"].get("allow_multiple", True))
        poll["settings"]["one_vote_per_name"] = st.checkbox(t("one_vote"), poll["settings"].get("one_vote_per_name", True))
        poll["settings"]["show_names"] = st.checkbox(t("show_names"), poll["settings"].get("show_names", False))
        if st.form_submit_button(t("save"), type="primary"):
            save_data(data)
            st.success(t("saved"))

    if st.button(t("refresh")):
        st.rerun()
    show_results(poll, is_admin=True)
    auto_refresh()


data = load_data()
query = st.query_params
if "poll" in query:
    vote_view(data, query["poll"])
elif "admin" in query and "token" in query:
    admin_view(data, query["admin"], query["token"])
else:
    builder(data)
