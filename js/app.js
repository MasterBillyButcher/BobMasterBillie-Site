/* =========================================================
   AUTH GUARD
   ========================================================= */
let currentUser = null;

async function requireAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return false;
  }
  currentUser = session.user;
  return true;
}

document.getElementById("sign-out").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
});

/* =========================================================
   TOAST NOTIFICATIONS
   ========================================================= */
function toast(message, kind = "error") {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = `toast toast--${kind} is-visible`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("is-visible"), kind === "error" ? 5000 : 2200);
}

/**
 * Wraps a button's click handler: disables the button and shows a
 * busy label while `fn` runs, shows a toast and re-enables the button
 * if `fn` throws or Supabase returns an error, so a failed action is
 * always visible instead of failing silently.
 */
async function withBusy(button, busyLabel, fn) {
  const original = button.textContent;
  button.disabled = true;
  if (busyLabel) button.textContent = busyLabel;
  try {
    await fn();
  } catch (err) {
    console.error(err);
    toast(err.message || "Something went wrong. Try again.");
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

/** Throws if a Supabase response carries an error, so callers can just `check(await supabaseClient...)`. */
function check(result) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

function confirmDestroy(message) {
  return window.confirm(message);
}

/* =========================================================
   STATE
   ========================================================= */
const ctx = { clients: [], clientId: null, data: null, activeTab: "overview" };

function showError(message) {
  const box = document.getElementById("load-error");
  box.textContent = message;
  box.hidden = false;
}

/* =========================================================
   DATA LOADING
   ========================================================= */
async function loadClients() {
  try {
    return check(await supabaseClient.from("clients").select("*").order("created_at", { ascending: true }));
  } catch (err) {
    showError("Could not load clients: " + err.message);
    return [];
  }
}

async function ensureChannelState(clientId) {
  const existing = check(await supabaseClient.from("channel_state").select("*").eq("client_id", clientId).maybeSingle());
  if (existing) return existing;
  return check(await supabaseClient.from("channel_state").insert({ client_id: clientId }).select().single());
}

async function loadClientData(clientId) {
  try {
    const [channel, veto, backlog, modActions, discordRoles, tickets, shifts, invoices] = await Promise.all([
      ensureChannelState(clientId),
      supabaseClient.from("veto_rights").select("*").eq("client_id", clientId).order("username").then(r => check(r)),
      supabaseClient.from("backlog_items").select("*").eq("client_id", clientId).order("created_at").then(r => check(r)),
      supabaseClient.from("mod_actions").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(200).then(r => check(r)),
      supabaseClient.from("discord_roles").select("*").eq("client_id", clientId).order("role_name").then(r => check(r)),
      supabaseClient.from("tickets").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).then(r => check(r)),
      supabaseClient.from("shifts").select("*").eq("client_id", clientId).order("day_label").then(r => check(r)),
      supabaseClient.from("invoices").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).then(r => check(r)),
    ]);
    return { channel, veto, backlog, modActions, discordRoles, tickets, shifts, invoices };
  } catch (err) {
    showError("Could not load this client's data: " + err.message);
    return null;
  }
}

async function refresh() {
  ctx.data = await loadClientData(ctx.clientId);
  renderActiveTab();
}

/* =========================================================
   BOOT
   ========================================================= */
async function boot() {
  if (!(await requireAuth())) return;

  ctx.clients = await loadClients();
  document.getElementById("loading").hidden = true;

  if (ctx.clients.length === 0) {
    ctx.activeTab = "clients";
    document.querySelectorAll(".console-tab").forEach(t => t.classList.toggle("is-active", t.dataset.tab === "clients"));
    renderClients();
    document.getElementById("tab-clients").hidden = false;
    document.getElementById("client-switcher-row")?.remove();
    return;
  }

  ctx.clientId = ctx.clients[0].id;
  populateClientSelect();
  await refresh();
}

function populateClientSelect() {
  const select = document.getElementById("client-select");
  select.innerHTML = ctx.clients.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  select.value = ctx.clientId;
  select.addEventListener("change", async () => {
    ctx.clientId = select.value;
    renderClientMeta();
    await refresh();
  });
  renderClientMeta();
}

function renderClientMeta() {
  const client = ctx.clients.find(c => c.id === ctx.clientId);
  const meta = document.getElementById("client-meta");
  if (!client) { meta.innerHTML = ""; return; }
  const parts = [];
  if (client.twitch_channel) parts.push(`<span>Twitch: ${escapeHtml(client.twitch_channel)}</span>`);
  if (client.discord_server) parts.push(`<span>Discord: ${escapeHtml(client.discord_server)}</span>`);
  if (client.youtube_channel) parts.push(`<span>YouTube: ${escapeHtml(client.youtube_channel)}</span>`);
  meta.innerHTML = parts.join("");
}

/* =========================================================
   TAB SWITCHING
   ========================================================= */
document.getElementById("console-tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".console-tab");
  if (!btn) return;
  ctx.activeTab = btn.dataset.tab;
  document.querySelectorAll(".console-tab").forEach(t => t.classList.toggle("is-active", t === btn));
  renderActiveTab();
});

function renderActiveTab() {
  document.querySelectorAll(".tab-panel").forEach(p => p.hidden = true);
  const panel = document.getElementById(`tab-${ctx.activeTab}`);
  panel.hidden = false;

  if (!ctx.data && ctx.activeTab !== "clients" && ctx.activeTab !== "reference") return;

  const renderers = {
    overview: renderOverview, modlog: renderModLog, discord: renderDiscord,
    veto: renderVeto, backlog: renderBacklog, schedule: renderSchedule,
    billing: renderBilling, clients: renderClients, reference: renderReference,
  };
  renderers[ctx.activeTab]();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* =========================================================
   OVERVIEW
   ========================================================= */
function renderOverview() {
  const { channel, veto, tickets, invoices } = ctx.data;
  const vetoTotal = veto.reduce((s, v) => s + v.count, 0);
  const openTickets = tickets.filter(t => t.status === "open").length;
  const pendingInvoices = invoices.filter(i => i.status === "pending").length;
  const client = ctx.clients.find(c => c.id === ctx.clientId);

  document.getElementById("tab-overview").innerHTML = `
    <header class="console-section-head"><h1>${escapeHtml(client.name)}</h1><p>What's running for this client right now.</p></header>
    <div class="grid-3">
      <div class="card">
        <span class="tag ${channel.is_live ? "tag--live" : "tag--off"}">${channel.is_live ? "Live now" : "Not live"}</span>
        <p style="margin-top:12px;margin-bottom:14px;">${channel.is_live ? "Chat's rolling." : "Nothing live right now."}</p>
        <button class="btn btn-secondary" id="toggle-live">${channel.is_live ? "Flip to not live" : "Flip to live now"}</button>
      </div>
      <div class="card">
        <h3>Hype &amp; treasure trains</h3>
        <label class="check-row"><input type="checkbox" id="toggle-hype" ${channel.hype_train ? "checked" : ""}> Complete Lvl 1 Hype Train</label>
        <label class="check-row"><input type="checkbox" id="toggle-treasure" ${channel.treasure_train ? "checked" : ""}> Complete Lvl 1 Treasure Train</label>
      </div>
      <div class="card">
        <h3>At a glance</h3>
        <div class="status-row"><span class="label">Open veto rights</span><span class="value">${vetoTotal}</span></div>
        <div class="status-row"><span class="label">Open tickets</span><span class="value">${openTickets}</span></div>
        <div class="status-row"><span class="label">Pending invoices</span><span class="value">${pendingInvoices}</span></div>
      </div>
    </div>`;

  const liveBtn = document.getElementById("toggle-live");
  liveBtn.addEventListener("click", () => withBusy(liveBtn, null, async () => {
    const wasLive = channel.is_live;
    check(await supabaseClient.rpc("toggle_live", { p_client_id: ctx.clientId }));
    if (!wasLive) {
      const c = ctx.clients.find(cl => cl.id === ctx.clientId);
      notifyDiscord(ctx.clientId, `${c.name} just went live.`);
    }
    await refresh();
  }));

  document.getElementById("toggle-hype").addEventListener("change", async (e) => {
    e.target.disabled = true;
    try {
      check(await supabaseClient.rpc("toggle_hype_train", { p_client_id: ctx.clientId }));
      await refresh();
    } catch (err) {
      toast(err.message);
      e.target.checked = !e.target.checked;
      e.target.disabled = false;
    }
  });
  document.getElementById("toggle-treasure").addEventListener("change", async (e) => {
    e.target.disabled = true;
    try {
      check(await supabaseClient.rpc("toggle_treasure_train", { p_client_id: ctx.clientId }));
      await refresh();
    } catch (err) {
      toast(err.message);
      e.target.checked = !e.target.checked;
      e.target.disabled = false;
    }
  });
}

/* =========================================================
   MODERATION LOG
   ========================================================= */
function renderModLog() {
  const { modActions } = ctx.data;
  document.getElementById("tab-modlog").innerHTML = `
    <header class="console-section-head"><h1>Moderation log</h1><p>One record for every ban, timeout, warn or kick, across Twitch, Discord and YouTube.</p></header>
    <form class="mini-form" id="modlog-form">
      <div class="field"><label>Platform</label>
        <select id="ml-platform"><option value="twitch">Twitch</option><option value="discord">Discord</option><option value="youtube">YouTube</option></select>
      </div>
      <div class="field"><label>Action</label>
        <select id="ml-action"><option value="timeout">Timeout</option><option value="ban">Ban</option><option value="unban">Unban</option><option value="warn">Warn</option><option value="kick">Kick</option></select>
      </div>
      <div class="field"><label>User</label><input id="ml-user" placeholder="username"></div>
      <div class="field"><label>Reason</label><input id="ml-reason" placeholder="optional"></div>
      <div class="field"><label>Moderator</label><input id="ml-mod" placeholder="optional"></div>
      <button class="btn btn-primary" type="submit">Log action</button>
    </form>
    <table class="log-table">
      <thead><tr><th>Date</th><th>Platform</th><th>Action</th><th>User</th><th>Reason</th><th>Moderator</th></tr></thead>
      <tbody>
        ${modActions.length === 0 ? '<tr><td colspan="6">No actions logged yet.</td></tr>' : modActions.map(a => `
          <tr><td>${fmtDate(a.created_at)}</td><td class="platform">${a.platform}</td><td>${a.action_type}</td>
          <td>${escapeHtml(a.target_user)}</td><td>${escapeHtml(a.reason) || "-"}</td><td>${escapeHtml(a.moderator) || "-"}</td></tr>`).join("")}
      </tbody>
    </table>`;

  const form = document.getElementById("modlog-form");
  const submitBtn = form.querySelector("button[type=submit]");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const targetUser = document.getElementById("ml-user").value.trim();
    if (!targetUser) { toast("Enter a username first."); return; }
    withBusy(submitBtn, "Logging...", async () => {
      check(await supabaseClient.from("mod_actions").insert({
        id: newId(), client_id: ctx.clientId,
        platform: document.getElementById("ml-platform").value,
        action_type: document.getElementById("ml-action").value,
        target_user: targetUser,
        reason: document.getElementById("ml-reason").value.trim() || null,
        moderator: document.getElementById("ml-mod").value.trim() || null,
      }));
      await refresh();
    });
  });
}

/* =========================================================
   DISCORD (roles + tickets)
   ========================================================= */
function renderDiscord() {
  const { discordRoles, tickets } = ctx.data;
  document.getElementById("tab-discord").innerHTML = `
    <header class="console-section-head"><h1>Discord</h1><p>Role reference and open support tickets for this client's server.</p></header>
    <div class="card" style="margin-bottom:28px;">
      <h3>Roles</h3>
      <form class="mini-form" id="role-form">
        <div class="field"><label>Role name</label><input id="role-name" placeholder="Moderator"></div>
        <div class="field"><label>Permission note</label><input id="role-note" placeholder="Kick, timeout, manage messages"></div>
        <div class="field"><label>Members</label><input id="role-count" type="number" placeholder="0" style="min-width:80px;"></div>
        <button class="btn btn-primary" type="submit">Add role</button>
      </form>
      <ul class="list-plain">
        ${discordRoles.length === 0 ? "<li>No roles recorded yet.</li>" : discordRoles.map(r => `
          <li><span><strong>${escapeHtml(r.role_name)}</strong>${r.permission_note ? `: ${escapeHtml(r.permission_note)}` : ""}${r.member_count != null ? ` (${r.member_count} members)` : ""}</span>
          <button class="list-remove" data-remove-role="${r.id}">Remove</button></li>`).join("")}
      </ul>
    </div>
    <div class="card">
      <h3>Support tickets</h3>
      <form class="mini-form" id="ticket-form">
        <div class="field"><label>Subject</label><input id="ticket-subject" placeholder="What's the issue"></div>
        <div class="field"><label>Opened by</label><input id="ticket-opener" placeholder="username"></div>
        <button class="btn btn-primary" type="submit">Open ticket</button>
      </form>
      <table class="log-table">
        <thead><tr><th>Date</th><th>Subject</th><th>Opened by</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${tickets.length === 0 ? '<tr><td colspan="5">No tickets yet.</td></tr>' : tickets.map(t => `
            <tr><td>${fmtDate(t.created_at)}</td><td>${escapeHtml(t.subject)}</td><td>${escapeHtml(t.opened_by) || "-"}</td>
            <td><span class="status-pill ${t.status}">${t.status}</span></td>
            <td><button class="list-remove" data-toggle-ticket="${t.id}">${t.status === "open" ? "Close" : "Reopen"}</button></td></tr>`).join("")}
        </tbody>
      </table>
    </div>`;

  const roleForm = document.getElementById("role-form");
  roleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const roleName = document.getElementById("role-name").value.trim();
    if (!roleName) { toast("Enter a role name first."); return; }
    const btn = roleForm.querySelector("button[type=submit]");
    withBusy(btn, "Adding...", async () => {
      const countVal = document.getElementById("role-count").value;
      check(await supabaseClient.from("discord_roles").insert({
        id: newId(), client_id: ctx.clientId, role_name: roleName,
        permission_note: document.getElementById("role-note").value.trim() || null,
        member_count: countVal ? Number(countVal) : null,
      }));
      await refresh();
    });
  });

  const ticketForm = document.getElementById("ticket-form");
  ticketForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const subject = document.getElementById("ticket-subject").value.trim();
    if (!subject) { toast("Enter a subject first."); return; }
    const btn = ticketForm.querySelector("button[type=submit]");
    withBusy(btn, "Opening...", async () => {
      const openedBy = document.getElementById("ticket-opener").value.trim() || null;
      check(await supabaseClient.from("tickets").insert({
        id: newId(), client_id: ctx.clientId, subject, opened_by: openedBy, status: "open",
      }));
      notifyDiscord(ctx.clientId, `New ticket opened${openedBy ? ` by ${openedBy}` : ""}: ${subject}`);
      await refresh();
    });
  });
}

/** Fire-and-forget: a failed Discord notification should never block the action that triggered it. */
function notifyDiscord(clientId, message) {
  supabaseClient.functions.invoke("discord-notify", { body: { clientId, message } })
    .catch(err => console.error("Discord notify failed:", err));
}

/* =========================================================
   VETO & VIP
   ========================================================= */
function renderVeto() {
  const { veto, channel } = ctx.data;
  document.getElementById("tab-veto").innerHTML = `
    <header class="console-section-head"><h1>Veto power &amp; VIP watch</h1><p>Who can veto a decision, and who's earning VIP back.</p></header>
    <form class="mini-form" id="veto-add-form">
      <div class="field"><label>Viewer</label><input id="veto-username" placeholder="username"></div>
      <button class="btn btn-primary" type="submit">Add viewer</button>
    </form>
    <table class="veto-table" style="margin-bottom:24px;">
      <thead><tr><th>Viewer</th><th>Active veto rights</th><th></th></tr></thead>
      <tbody>
        ${veto.length === 0 ? '<tr><td colspan="3">No viewers tracked yet.</td></tr>' : veto.map(v => `
          <tr><td>${escapeHtml(v.username)}</td><td class="veto-count">${v.count}</td>
          <td><button class="chip-btn" data-veto-adjust="${v.id}" data-delta="-1">-</button>
          <button class="chip-btn" data-veto-adjust="${v.id}" data-delta="1">+</button>
          <button class="list-remove" data-veto-remove="${v.id}">Remove</button></td></tr>`).join("")}
      </tbody>
    </table>
    <div class="card">
      <h3>VIP watch</h3>
      <p>Track whether an earned-back VIP chance is still open.</p>
      <button class="btn btn-secondary" id="toggle-vip" style="margin-top:12px;">${channel.vip_resolved ? "Reopen chance" : "Mark chance used"}</button>
    </div>`;

  const addForm = document.getElementById("veto-add-form");
  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("veto-username").value.trim();
    if (!username) { toast("Enter a username first."); return; }
    const btn = addForm.querySelector("button[type=submit]");
    withBusy(btn, "Adding...", async () => {
      check(await supabaseClient.from("veto_rights").insert({ id: newId(), client_id: ctx.clientId, username, count: 0 }));
      await refresh();
    });
  });

  const vipBtn = document.getElementById("toggle-vip");
  vipBtn.addEventListener("click", () => withBusy(vipBtn, null, async () => {
    check(await supabaseClient.rpc("toggle_vip_resolved", { p_client_id: ctx.clientId }));
    await refresh();
  }));
}

/* =========================================================
   BACKLOG
   ========================================================= */
function renderBacklog() {
  const { backlog } = ctx.data;
  document.getElementById("tab-backlog").innerHTML = `
    <header class="console-section-head"><h1>Movie / segment backlog</h1><p>Queue for "Currently watching," feeds the !now command.</p></header>
    <form class="field-row" id="backlog-form">
      <input type="text" id="backlog-title" placeholder="Add a title..." maxlength="80">
      <button class="btn btn-primary" type="submit">Add</button>
    </form>
    <ul class="list-plain">
      ${backlog.length === 0 ? "<li>Backlog is empty.</li>" : backlog.map(item => `
        <li><span>${escapeHtml(item.title)}</span><button class="list-remove" data-remove-backlog="${item.id}">Remove</button></li>`).join("")}
    </ul>`;

  const form = document.getElementById("backlog-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("backlog-title").value.trim();
    if (!title) { toast("Enter a title first."); return; }
    const btn = form.querySelector("button[type=submit]");
    withBusy(btn, "Adding...", async () => {
      check(await supabaseClient.from("backlog_items").insert({ id: newId(), client_id: ctx.clientId, title }));
      await refresh();
    });
  });
}

/* =========================================================
   SCHEDULE
   ========================================================= */
function renderSchedule() {
  const { shifts } = ctx.data;
  document.getElementById("tab-schedule").innerHTML = `
    <header class="console-section-head"><h1>Schedule</h1><p>Who's covering chat, and when.</p></header>
    <form class="mini-form" id="shift-form">
      <div class="field"><label>Moderator</label><input id="shift-mod" placeholder="name"></div>
      <div class="field"><label>Day</label><input id="shift-day" placeholder="Mon" style="min-width:90px;"></div>
      <div class="field"><label>Start</label><input id="shift-start" placeholder="18:00" style="min-width:90px;"></div>
      <div class="field"><label>End</label><input id="shift-end" placeholder="21:00" style="min-width:90px;"></div>
      <div class="field"><label>Platform</label>
        <select id="shift-platform"><option value="twitch">Twitch</option><option value="discord">Discord</option><option value="youtube">YouTube</option></select>
      </div>
      <button class="btn btn-primary" type="submit">Add shift</button>
    </form>
    <table class="log-table">
      <thead><tr><th>Day</th><th>Time</th><th>Moderator</th><th>Platform</th><th></th></tr></thead>
      <tbody>
        ${shifts.length === 0 ? '<tr><td colspan="5">No shifts scheduled yet.</td></tr>' : shifts.map(s => `
          <tr><td>${escapeHtml(s.day_label)}</td><td>${escapeHtml(s.start_time)} - ${escapeHtml(s.end_time)}</td>
          <td>${escapeHtml(s.mod_name)}</td><td class="platform">${s.platform}</td>
          <td><button class="list-remove" data-remove-shift="${s.id}">Remove</button></td></tr>`).join("")}
      </tbody>
    </table>`;

  const form = document.getElementById("shift-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const modName = document.getElementById("shift-mod").value.trim();
    const dayLabel = document.getElementById("shift-day").value.trim();
    const startTime = document.getElementById("shift-start").value.trim();
    const endTime = document.getElementById("shift-end").value.trim();
    if (!modName || !dayLabel || !startTime || !endTime) { toast("Fill in moderator, day, start and end first."); return; }
    const btn = form.querySelector("button[type=submit]");
    withBusy(btn, "Adding...", async () => {
      check(await supabaseClient.from("shifts").insert({
        id: newId(), client_id: ctx.clientId, mod_name: modName, day_label: dayLabel,
        start_time: startTime, end_time: endTime, platform: document.getElementById("shift-platform").value,
      }));
      await refresh();
    });
  });
}

/* =========================================================
   BILLING
   ========================================================= */
function renderBilling() {
  const { invoices } = ctx.data;
  const pendingTotal = invoices.filter(i => i.status === "pending").reduce((s, i) => s + Number(i.hours) * Number(i.rate), 0);

  document.getElementById("tab-billing").innerHTML = `
    <header class="console-section-head"><h1>Billing</h1><p>Hours logged per period, and what's still owed.</p></header>
    <form class="mini-form" id="invoice-form">
      <div class="field"><label>Period</label><input id="inv-period" placeholder="September 2026"></div>
      <div class="field"><label>Hours</label><input id="inv-hours" type="number" step="0.5" placeholder="0" style="min-width:80px;"></div>
      <div class="field"><label>Rate</label><input id="inv-rate" type="number" step="0.5" placeholder="0" style="min-width:80px;"></div>
      <button class="btn btn-primary" type="submit">Add invoice</button>
    </form>
    <p class="card-note" style="margin-bottom:14px;">Pending total: ${pendingTotal.toFixed(2)}</p>
    <table class="log-table">
      <thead><tr><th>Period</th><th>Hours</th><th>Rate</th><th>Amount</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${invoices.length === 0 ? '<tr><td colspan="6">No invoices yet.</td></tr>' : invoices.map(i => `
          <tr><td>${escapeHtml(i.period_label)}</td><td>${i.hours}</td><td>${i.rate}</td>
          <td>${(Number(i.hours) * Number(i.rate)).toFixed(2)}</td>
          <td><span class="status-pill ${i.status}">${i.status}</span></td>
          <td><button class="list-remove" data-toggle-invoice="${i.id}">${i.status === "pending" ? "Mark paid" : "Mark pending"}</button>
          <button class="list-remove" data-remove-invoice="${i.id}">Remove</button></td></tr>`).join("")}
      </tbody>
    </table>`;

  const form = document.getElementById("invoice-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const periodLabel = document.getElementById("inv-period").value.trim();
    const hours = document.getElementById("inv-hours").value;
    const rate = document.getElementById("inv-rate").value;
    if (!periodLabel || !hours || !rate) { toast("Fill in period, hours and rate first."); return; }
    const btn = form.querySelector("button[type=submit]");
    withBusy(btn, "Adding...", async () => {
      check(await supabaseClient.from("invoices").insert({
        id: newId(), client_id: ctx.clientId, period_label: periodLabel, hours: Number(hours), rate: Number(rate), status: "pending",
      }));
      await refresh();
    });
  });
}

/* =========================================================
   CLIENTS
   ========================================================= */
function renderClients() {
  document.getElementById("tab-clients").innerHTML = `
    <header class="console-section-head"><h1>Clients</h1><p>Everyone you currently manage moderation for.</p></header>
    <form class="mini-form" id="client-form">
      <div class="field"><label>Name</label><input id="client-name" placeholder="Streamer or server name"></div>
      <div class="field"><label>Twitch channel</label><input id="client-twitch" placeholder="login name"></div>
      <div class="field"><label>Discord server</label><input id="client-discord" placeholder="display name"></div>
      <div class="field"><label>YouTube channel</label><input id="client-youtube" placeholder="optional"></div>
      <div class="field"><label>Status</label>
        <select id="client-status"><option value="active">Active</option><option value="paused">Paused</option><option value="ended">Ended</option></select>
      </div>
      <button class="btn btn-primary" type="submit">Add client</button>
    </form>
    <form class="mini-form" onsubmit="return false;">
      <div class="field" style="min-width:260px;"><label>Discord server ID (for the client above)</label>
        <input id="client-discord-guild" placeholder="right-click server icon, Copy Server ID"></div>
      <div class="field" style="min-width:320px;"><label>Discord incoming webhook URL</label>
        <input id="client-discord-webhook" placeholder="Server Settings, Integrations, Webhooks"></div>
    </form>
    <div class="client-card-grid">
      ${ctx.clients.map(c => `
        <div class="card client-manage-card">
          <div>
            <div class="name">${escapeHtml(c.name)}</div>
            <div class="meta">${[c.twitch_channel, c.discord_server, c.youtube_channel].filter(Boolean).map(escapeHtml).join(" · ") || "No platforms recorded"}</div>
            <span class="status-pill ${c.status === "active" ? "open" : "closed"}" style="margin-top:8px;display:inline-block;">${c.status}</span>
            <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
              ${c.twitch_channel ? `<button class="btn btn-secondary" data-connect-twitch="${c.id}" style="font-size:12.5px;padding:6px 12px;">${c.twitch_user_id ? "Reconnect Twitch webhooks" : "Connect Twitch webhooks"}</button>` : ""}
              ${c.discord_guild_id ? `<span class="status-pill open">Discord polling on</span>` : ""}
              ${c.discord_webhook_url ? `<span class="status-pill open">Discord alerts on</span>` : ""}
            </div>
          </div>
          <button class="list-remove" data-remove-client="${c.id}">Remove</button>
        </div>`).join("")}
    </div>`;

  const form = document.getElementById("client-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("client-name").value.trim();
    if (!name) { toast("Enter a name first."); return; }
    const btn = form.querySelector("button[type=submit]");
    withBusy(btn, "Adding...", async () => {
      const id = newId();
      check(await supabaseClient.from("clients").insert({
        id, name,
        twitch_channel: document.getElementById("client-twitch").value.trim() || null,
        discord_server: document.getElementById("client-discord").value.trim() || null,
        youtube_channel: document.getElementById("client-youtube").value.trim() || null,
        discord_guild_id: document.getElementById("client-discord-guild").value.trim() || null,
        discord_webhook_url: document.getElementById("client-discord-webhook").value.trim() || null,
        status: document.getElementById("client-status").value,
      }));
      check(await supabaseClient.from("channel_state").insert({ client_id: id }));

      ctx.clients = await loadClients();
      const wasEmpty = !ctx.clientId;
      if (wasEmpty) {
        ctx.clientId = id;
        document.getElementById("client-switcher-row")?.remove();
        const row = document.createElement("div");
        row.className = "client-switcher";
        row.id = "client-switcher-row";
        row.innerHTML = `<select id="client-select"></select><div class="client-meta" id="client-meta"></div>`;
        document.querySelector(".console-main").insertBefore(row, document.getElementById("load-error"));
        populateClientSelect();
        ctx.activeTab = "overview";
        document.querySelectorAll(".console-tab").forEach(t => t.classList.toggle("is-active", t.dataset.tab === "overview"));
        await refresh();
      } else {
        populateClientSelect();
        renderClients();
      }
      toast(`${name} added.`, "success");
    });
  });
}

/* =========================================================
   REFERENCE (static)
   ========================================================= */
const REFERENCE_COMMANDS = [
  { group: "Twitch: broadcaster & moderator", items: [
    ["/timeout [user] [sec]", "Temporary ban, defaults to 10 minutes"],
    ["/ban [user]", "Permanent ban"],
    ["/slow [sec]", "Enable slow mode"],
    ["/followers [time]", "Followers-only chat"],
    ["/clear", "Wipe chat"],
    ["/poll", "Start a poll"],
    ["/raid [channel]", "Start a raid"],
  ]},
  { group: "Nightbot", items: [
    ["!sr [url/keywords]", "Request a song"],
    ["!songs skip", "Skip the current song"],
    ["!queue", "Show the song queue"],
    ["!raffle", "Start a raffle"],
    ["!8ball [question]", "Magic 8-ball response"],
  ]},
  { group: "Discord: common moderation", items: [
    ["/timeout [user] [duration]", "Temporary mute via Discord's built-in timeout"],
    ["/ban [user] [reason]", "Ban a member"],
    ["/kick [user] [reason]", "Remove a member without banning"],
    ["/warn [user] [reason]", "Log a warning (MEE6 / Dyno)"],
    ["/purge [count]", "Bulk delete recent messages"],
  ]},
];

function renderReference() {
  document.getElementById("tab-reference").innerHTML = `
    <header class="console-section-head"><h1>Reference</h1><p>Commands used most often, across platforms.</p></header>
    ${REFERENCE_COMMANDS.map(group => `
      <div class="cmd-group"><h4>${group.group}</h4>
        ${group.items.map(([name, desc]) => `<div class="cmd-row"><span class="name">${name}</span><span class="desc">${desc}</span></div>`).join("")}
      </div>`).join("")}`;
}

/* =========================================================
   DELEGATED CLICK HANDLERS
   Bound once, here, to the tab containers that exist from page load.
   Reading from ctx.data at click time (not a render-time closure)
   means these stay correct across every re-render, since re-rendering
   only replaces innerHTML, it never recreates these container elements.
   ========================================================= */
document.getElementById("tab-discord").addEventListener("click", (e) => {
  const removeBtn = e.target.closest("[data-remove-role]");
  if (removeBtn) {
    if (!confirmDestroy("Remove this role from the reference list?")) return;
    withBusy(removeBtn, null, async () => {
      check(await supabaseClient.from("discord_roles").delete().eq("id", removeBtn.dataset.removeRole));
      await refresh();
    });
    return;
  }
  const toggleBtn = e.target.closest("[data-toggle-ticket]");
  if (toggleBtn) {
    withBusy(toggleBtn, "...", async () => {
      check(await supabaseClient.rpc("toggle_ticket_status", { p_id: toggleBtn.dataset.toggleTicket }));
      await refresh();
    });
  }
});

document.getElementById("tab-veto").addEventListener("click", (e) => {
  const adjustBtn = e.target.closest("[data-veto-adjust]");
  if (adjustBtn) {
    withBusy(adjustBtn, null, async () => {
      check(await supabaseClient.rpc("adjust_veto_count", { p_id: adjustBtn.dataset.vetoAdjust, p_delta: Number(adjustBtn.dataset.delta) }));
      await refresh();
    });
    return;
  }
  const removeBtn = e.target.closest("[data-veto-remove]");
  if (removeBtn) {
    if (!confirmDestroy("Remove this viewer from veto tracking?")) return;
    withBusy(removeBtn, null, async () => {
      check(await supabaseClient.from("veto_rights").delete().eq("id", removeBtn.dataset.vetoRemove));
      await refresh();
    });
  }
});

document.getElementById("tab-backlog").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-remove-backlog]");
  if (!btn) return;
  withBusy(btn, null, async () => {
    check(await supabaseClient.from("backlog_items").delete().eq("id", btn.dataset.removeBacklog));
    await refresh();
  });
});

document.getElementById("tab-schedule").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-remove-shift]");
  if (!btn) return;
  if (!confirmDestroy("Remove this shift?")) return;
  withBusy(btn, null, async () => {
    check(await supabaseClient.from("shifts").delete().eq("id", btn.dataset.removeShift));
    await refresh();
  });
});

document.getElementById("tab-billing").addEventListener("click", (e) => {
  const toggleBtn = e.target.closest("[data-toggle-invoice]");
  if (toggleBtn) {
    withBusy(toggleBtn, "...", async () => {
      check(await supabaseClient.rpc("toggle_invoice_status", { p_id: toggleBtn.dataset.toggleInvoice }));
      await refresh();
    });
    return;
  }
  const removeBtn = e.target.closest("[data-remove-invoice]");
  if (removeBtn) {
    if (!confirmDestroy("Remove this invoice? This can't be undone.")) return;
    withBusy(removeBtn, null, async () => {
      check(await supabaseClient.from("invoices").delete().eq("id", removeBtn.dataset.removeInvoice));
      await refresh();
    });
  }
});

document.getElementById("tab-clients").addEventListener("click", (e) => {
  const connectBtn = e.target.closest("[data-connect-twitch]");
  if (connectBtn) {
    withBusy(connectBtn, "Connecting...", async () => {
      const { data, error } = await supabaseClient.functions.invoke("twitch-connect", {
        body: { clientId: connectBtn.dataset.connectTwitch },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      window.location.href = data.authorizeUrl;
    });
    return;
  }

  const btn = e.target.closest("[data-remove-client]");
  if (!btn) return;
  if (!confirmDestroy("Remove this client and all their data? This can't be undone.")) return;
  withBusy(btn, null, async () => {
    check(await supabaseClient.from("clients").delete().eq("id", btn.dataset.removeClient));
    ctx.clients = await loadClients();
    if (ctx.clientId === btn.dataset.removeClient) {
      ctx.clientId = ctx.clients[0]?.id || null;
      if (ctx.clientId) await refresh();
    }
    if (ctx.clients.length > 0) populateClientSelect();
    renderClients();
  });
});

/* =========================================================
   OAuth return handling (?twitch=connected|denied|error)
   ========================================================= */
(function handleTwitchReturn() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("twitch");
  if (!status) return;
  const messages = {
    connected: ["Twitch webhooks connected.", "success"],
    denied: ["Twitch connection was cancelled.", "error"],
    error: ["Something went wrong connecting Twitch. Check the Edge Function logs.", "error"],
  };
  const [msg, kind] = messages[status] || [null, null];
  if (msg) setTimeout(() => toast(msg, kind), 300);
  params.delete("twitch");
  const newUrl = window.location.pathname + (params.toString() ? `?${params}` : "");
  window.history.replaceState({}, "", newUrl);
})();

boot();
