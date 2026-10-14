

  /* =========================================================
     STATE
  ========================================================= */

  let leads = [];
  let actions = [];
  let selectedLeadId = null;
  let currentActionFilter = "";


  /* =========================================================
     HELPERS
  ========================================================= */

  const $ = id => document.getElementById(id);


  function esc(value) {

    return String(value ?? "")
      .replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char]));

  }


  function showToast(message, error = false) {

    const toast = $("toast");

    toast.textContent = message;
    toast.className =
      "toast" + (error ? " error" : "");

    toast.style.display = "block";

    clearTimeout(window.__toastTimer);

    window.__toastTimer =
      setTimeout(() => {
        toast.style.display = "none";
      }, 3500);

  }


  async function api(url, options = {}) {

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });


    const data =
      await response.json().catch(() => ({}));


    if (!response.ok) {

      let detail = data.detail;

      if (Array.isArray(detail)) {

        detail = detail
          .map(item =>
            item.msg || JSON.stringify(item)
          )
          .join("; ");

      }

      throw new Error(
        detail || `HTTP ${response.status}`
      );

    }


    return data;

  }


  function formatDate(value) {

    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString();

  }


  function formatDateShort(value) {

    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString();

  }


  function scoreValue(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(100, number)
    );

  }


  function statusClass(status) {

    const value =
      String(status || "")
        .toLowerCase()
        .replaceAll(" ", "_");


    if (value === "qualified") {
      return "badge badge-qualified";
    }

    if (value === "disqualified") {
      return "badge badge-disqualified";
    }

    if (value === "review" || value === "needs_review") {
      return "badge badge-review";
    }

    if (value === "nurture") {
      return "badge badge-nurture";
    }

    return "badge badge-neutral";

  }


  function statusLabel(status) {

    if (!status) {
      return "Unknown";
    }

    const value = String(status).trim().toLowerCase();

    if (value === "review" || value === "needs_review") {
      return "Needs Review";
    }

    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, char =>
        char.toUpperCase()
      );

  }


  function isDisqualified(lead) {

    return String(lead?.status || "")
      .toLowerCase()
      === "disqualified";

  }


  function scoreHtml(score) {

    const value =
      scoreValue(score);


    return `
      <div class="score">

        <div
          class="score-ring"
          style="--score:${value}">

          <span class="score-number">
            ${Math.round(value)}
          </span>

        </div>

      </div>
    `;

  }


  function valueOrDash(value) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    return esc(value);

  }


  function detail(label, value, full = false) {

    return `
      <div class="detail ${full ? "full" : ""}">

        <div class="detail-label">
          ${esc(label)}
        </div>

        <div class="detail-value">
          ${valueOrDash(value)}
        </div>

      </div>
    `;

  }


  function scoreBar(label, value) {

    const number =
      scoreValue(value);


    return `
      <div class="score-bar-row">

        <span>
          ${esc(label)}
        </span>

        <div class="bar">
          <span style="width:${number}%"></span>
        </div>

        <strong>
          ${Math.round(number)}
        </strong>

      </div>
    `;

  }


  function datetimeLocalValue(value) {

    if (!value) {
      return "";
    }

    const date =
      new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const pad =
      number =>
        String(number).padStart(2, "0");


    return `${date.getFullYear()}-${
      pad(date.getMonth() + 1)
    }-${
      pad(date.getDate())
    }T${
      pad(date.getHours())
    }:${
      pad(date.getMinutes())
    }`;

  }


  /* =========================================================
     NAVIGATION
  ========================================================= */

  const viewMeta = {

    overview: {
      title: "Overview",
      subtitle:
        "Sales workspace for qualification, review and follow-up."
    },

    leads: {
      title: "Leads",
      subtitle:
        "Explore and work with the complete lead database."
    },

    actions: {
      title: "Sales Actions",
      subtitle:
        "Work scheduled follow-ups and next actions."
    },

    activity: {
      title: "Activity",
      subtitle:
        "Review historical activity across lead records."
    },

    reviews: {
      title: "Reviews",
      subtitle:
        "Human review queue for unreviewed leads."
    }

  };


  function switchView(view) {

    document
      .querySelectorAll(".view")
      .forEach(section => {
        section.classList.remove("active");
      });


    const target =
      $("view-" + view);


    if (target) {
      target.classList.add("active");
    }


    document
      .querySelectorAll(".nav-btn")
      .forEach(button => {

        button.classList.toggle(
          "active",
          button.dataset.view === view
        );

      });


    $("page-title").textContent =
      viewMeta[view]?.title ||
      "LeadPilot";


    $("page-subtitle").textContent =
      viewMeta[view]?.subtitle ||
      "";


    if (view === "leads") {
      renderLeads();
    }


    if (view === "actions") {
      loadActionsView(
        currentActionFilter
      );
    }


    if (view === "activity") {
      loadGlobalActivity();
    }


    if (view === "reviews") {
      renderReviews();
    }

  }


  function openLeadView(filters = {}) {

    switchView("leads");


    $("lead-search").value = "";


    if (
      Object.prototype.hasOwnProperty.call(
        filters,
        "status"
      )
    ) {
      $("lead-status-filter").value =
        filters.status || "";
    }


    if (
      Object.prototype.hasOwnProperty.call(
        filters,
        "reviewed"
      )
    ) {
      $("lead-review-filter").value =
        filters.reviewed === false
          ? "false"
          : "true";
    }


    renderLeads();

  }


  /* =========================================================
     LEAD LOADING
  ========================================================= */

  async function loadAllLeads() {

    const all = [];

    let skip = 0;

    const limit = 100;


    while (true) {

      const page =
        await api(
          `/leads?skip=${skip}&limit=${limit}`
        );


      if (!Array.isArray(page)) {
        break;
      }


      all.push(...page);


      if (page.length < limit) {
        break;
      }


      skip += limit;


      if (skip > 100000) {
        break;
      }

    }


    leads = all;

  }


  async function loadAllActions() {

    const data =
      await api("/sales/actions");


    actions =
      Array.isArray(data)
        ? data
        : [];

  }


  /* =========================================================
     COUNTERS
  ========================================================= */

  function updateCounters() {

    const total =
      leads.length;


    const qualified =
      leads.filter(
        lead =>
          String(lead.status || "")
            .toLowerCase()
          === "qualified"
      ).length;


    const review =
      leads.filter(
        lead =>
          !lead.reviewed
      ).length;


    $("kpi-total").textContent =
      total;


    $("kpi-qualified").textContent =
      qualified;


    $("kpi-review").textContent =
      review;


    $("kpi-actions").textContent =
      actions.length;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const overdueCount = actions.filter(action => action.next_action_at && new Date(action.next_action_at) < startOfToday).length;
    const todayCount = actions.filter(action => action.next_action_at && new Date(action.next_action_at) >= startOfToday && new Date(action.next_action_at) < startOfTomorrow).length;
    const upcomingCount = actions.filter(action => action.next_action_at && new Date(action.next_action_at) >= startOfTomorrow).length;
    $("kpi-overdue").textContent = overdueCount;
    $("kpi-due-today").textContent = todayCount;
    $("kpi-upcoming").textContent = upcomingCount;


    $("nav-leads").textContent =
      total;


    $("nav-actions").textContent =
      actions.length;


    $("nav-reviews").textContent =
      review;

  }


  /* =========================================================
     OVERVIEW
  ========================================================= */

  function openActionsFilter(filter) {
    switchView("actions");
    loadActionsView(filter);
  }


  function renderOverview() {

    const recent =
      [...leads]
        .sort(
          (a, b) =>
            new Date(b.created_at || 0) -
            new Date(a.created_at || 0)
        )
        .slice(0, 8);


    $("overview-leads").innerHTML =
      recent.length

        ? recent.map(lead => `

            <tr onclick="openLead(${lead.id})">

              <td>

                <div class="lead-name">
                  ${esc(lead.name)}
                </div>

                <div class="lead-company">
                  ${esc(lead.company || "")}
                </div>

              </td>


              <td>

                <span class="${statusClass(lead.status)}">
                  ${esc(statusLabel(lead.status))}
                </span>

              </td>


              <td>
                ${scoreHtml(lead.score)}
              </td>


              <td>

                ${
                  lead.reviewed

                    ? `
                      <span class="badge badge-qualified">
                        Reviewed
                      </span>
                    `

                    : `
                      <span class="badge badge-review">
                        Needs Review
                      </span>
                    `
                }

              </td>


              <td>
                ${
                  isDisqualified(lead)
                    ? `<span class="muted">
                         Retained record
                       </span>`
                    : valueOrDash(lead.next_action)
                }
              </td>

            </tr>

          `).join("")

        : `
          <tr>
            <td colspan="5">
              <div class="empty">
                No leads yet.
              </div>
            </td>
          </tr>
        `;


    renderOverviewActions();
    renderQualificationSnapshot();

  }


  function renderOverviewActions() {

    const activeActions =
      actions
        .filter(action => {

          const lead =
            leads.find(
              item =>
                item.id === action.lead_id
            );

          return lead
            ? !isDisqualified(lead)
            : true;

        })
        .sort(
          (a, b) =>
            new Date(a.next_action_at || 0) -
            new Date(b.next_action_at || 0)
        )
        .slice(0, 6);


    $("overview-actions").innerHTML =
      activeActions.length

        ? activeActions
            .map(actionHtml)
            .join("")

        : `
          <div class="empty">
            No active sales actions.
          </div>
        `;

  }


  function renderQualificationSnapshot() {

    const total =
      leads.length;


    const qualified =
      leads.filter(
        lead =>
          String(lead.status || "")
            .toLowerCase()
          === "qualified"
      ).length;


    const disqualified =
      leads.filter(
        lead =>
          isDisqualified(lead)
      ).length;


    const review =
      leads.filter(
        lead =>
          !lead.reviewed
      ).length;


    function row(
      label,
      value,
      color
    ) {

      const percent =
        total
          ? Math.round(
              (value / total) * 100
            )
          : 0;


      return `
        <div style="margin-bottom:14px;">

          <div style="
            display:flex;
            justify-content:space-between;
            margin-bottom:5px;
            font-size:10px;
          ">

            <span>
              ${esc(label)}
            </span>

            <strong>
              ${value}
            </strong>

          </div>


          <div
            class="bar"
            style="background:#e2e8f0;">

            <span
              style="
                width:${percent}%;
                background:${color};
              ">
            </span>

          </div>

        </div>
      `;

    }


    $("qualification-snapshot").innerHTML = `

      ${row(
        "Qualified",
        qualified,
        "#2563eb"
      )}

      ${row(
        "Needs Review",
        review,
        "#ca8a04"
      )}

      ${row(
        "Disqualified",
        disqualified,
        "#dc2626"
      )}

      <div class="notice" style="margin:12px 0 0;">

        Disqualified records are retained for history and analysis,
        but they are not treated as active sales opportunities.

      </div>

    `;

  }


  /* =========================================================
     LEADS TABLE
  ========================================================= */

  function renderLeads() {

    const search =
      $("lead-search")
        .value
        .trim()
        .toLowerCase();


    const status =
      $("lead-status-filter")
        .value;


    const reviewed =
      $("lead-review-filter")
        .value;


    const sort =
      $("lead-sort")
        .value;


    let filtered =
      leads.filter(lead => {

        const searchable = [
          lead.name,
          lead.company,
          lead.email,
          lead.industry,
          lead.job_title,
          lead.problem,
          lead.desired_outcome
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();


        if (
          search &&
          !searchable.includes(search)
        ) {
          return false;
        }


        const leadStatus = String(lead.status || "").trim().toLowerCase();
        const selectedStatus = status === "needs_review" ? "review" : status;

        if (selectedStatus && leadStatus !== selectedStatus) {
          return false;
        }


        if (
          reviewed &&
          String(Boolean(lead.reviewed))
          !== reviewed
        ) {
          return false;
        }


        return true;

      });


    if (sort === "score-high") {

      filtered.sort(
        (a, b) =>
          scoreValue(b.score) -
          scoreValue(a.score)
      );

    }

    else if (sort === "score-low") {

      filtered.sort(
        (a, b) =>
          scoreValue(a.score) -
          scoreValue(b.score)
      );

    }

    else if (sort === "name") {

      filtered.sort(
        (a, b) =>
          String(a.name || "")
            .localeCompare(
              String(b.name || "")
            )
      );

    }

    else {

      filtered.sort(
        (a, b) =>
          new Date(b.created_at || 0) -
          new Date(a.created_at || 0)
      );

    }


    $("lead-result-title").textContent =
      status
        ? `${statusLabel(status)} Leads`
        : "All Leads";


    $("lead-result-count").textContent =
      `${filtered.length} shown`;


    $("leads-table").innerHTML =
      filtered.length

        ? filtered.map(lead => {

            const disqualified =
              isDisqualified(lead);


            return `

              <tr onclick="openLead(${lead.id})">

                <td>

                  <div class="lead-name">
                    ${esc(lead.name)}
                  </div>

                  <div class="lead-company">

                    ${esc(lead.company || "")}

                    ${
                      lead.email
                        ? ` · ${esc(lead.email)}`
                        : ""
                    }

                  </div>

                </td>


                <td>

                  <span
                    class="${statusClass(lead.status)}">

                    ${esc(
                      statusLabel(
                        lead.status
                      )
                    )}

                  </span>

                </td>


                <td>
                  ${scoreHtml(lead.score)}
                </td>


                <td>

                  <div style="
                    color:var(--text-3);
                    font-size:9px;
                  ">

                    Fit:
                    <strong>
                      ${valueOrDash(lead.fit_score)}
                    </strong>

                    · Readiness:
                    <strong>
                      ${valueOrDash(lead.readiness_score)}
                    </strong>

                    · Intent:
                    <strong>
                      ${valueOrDash(lead.intent_score)}
                    </strong>

                  </div>

                </td>


                <td>

                  ${
                    lead.reviewed

                      ? `
                        <span class="badge badge-qualified">
                          Reviewed
                        </span>
                      `

                      : `
                        <span class="badge badge-review">
                          Needs Review
                        </span>
                      `
                  }

                </td>


                <td>

                  ${
                    disqualified

                      ? `
                        <span
                          class="muted"
                          title="Disqualified leads are retained for history but excluded from active sales work.">
                          Retained
                        </span>
                      `

                      : valueOrDash(
                          lead.next_action
                        )
                  }

                </td>

              </tr>

            `;

          }).join("")

        : `

          <tr>

            <td colspan="6">

              <div class="empty">
                No leads match the current filters.
              </div>

            </td>

          </tr>

        `;

  }


  /* =========================================================
     ACTION QUEUE
  ========================================================= */

  function isOverdue(value) {

    if (!value) {
      return false;
    }

    return new Date(value) <
      new Date();

  }


  function actionHtml(action) {

    const lead =
      leads.find(
        item =>
          item.id === action.lead_id
      );


    /*
     * A disqualified lead is deliberately not treated
     * as an active sales action.
     */
    if (
      lead &&
      isDisqualified(lead)
    ) {
      return "";
    }


    const overdue =
      isOverdue(
        action.next_action_at
      );


    return `

      <div
        class="action-item"
        onclick="openLead(${action.lead_id})">

        <div>

          <div class="action-lead">
            ${esc(
              action.name ||
              "Unnamed lead"
            )}
          </div>

          <div class="action-meta">

            ${esc(
              action.company || ""
            )}

            · Score
            ${esc(
              action.score ?? "—"
            )}

            ·
            ${esc(
              statusLabel(
                action.status
              )
            )}

          </div>

          <div class="action-text">
            ${esc(
              action.next_action ||
              "No action description"
            )}
          </div>

        </div>


        <div
          class="action-date ${
            overdue ? "overdue" : ""
          }">

          ${
            overdue
              ? "OVERDUE"
              : "SCHEDULED"
          }

          <br>

          ${formatDate(
            action.next_action_at
          )}

        </div>

      </div>

    `;

  }


  async function loadActionsView(
    filter = ""
  ) {

    currentActionFilter =
      filter;


    const query =
      filter
        ? `?due=${encodeURIComponent(filter)}`
        : "";


    try {

      const data =
        await api(
          "/sales/actions" +
          query
        );


      const result =
        Array.isArray(data)
          ? data
          : [];


      const active =
        result.filter(action => {

          const lead =
            leads.find(
              item =>
                item.id ===
                action.lead_id
            );

          return !lead ||
            !isDisqualified(lead);

        });


      $("actions-count").textContent =
        `${active.length} actions`;


      $("actions-list").innerHTML =
        active.length

          ? active
              .map(actionHtml)
              .join("")

          : `
            <div class="empty">
              No active sales actions found.
            </div>
          `;

    }

    catch (error) {

      $("actions-list").innerHTML = `

        <div class="empty">
          Unable to load sales actions.
        </div>

      `;

      showToast(
        error.message,
        true
      );

    }

  }


  /* =========================================================
     REVIEW QUEUE
  ========================================================= */

  function renderReviews() {

    const reviewLeads =
      leads
        .filter(
          lead =>
            !lead.reviewed
        )
        .sort(
          (a, b) =>
            scoreValue(b.score) -
            scoreValue(a.score)
        );


    $("review-count").textContent =
      `${reviewLeads.length} awaiting review`;


    $("reviews-table").innerHTML =
      reviewLeads.length

        ? reviewLeads.map(lead => `

            <tr onclick="openLead(${lead.id})">

              <td>

                <div class="lead-name">
                  ${esc(lead.name)}
                </div>

                <div class="lead-company">
                  ${esc(lead.company || "")}
                </div>

              </td>


              <td>

                <span
                  class="${statusClass(lead.status)}">

                  ${esc(
                    statusLabel(
                      lead.status
                    )
                  )}

                </span>

              </td>


              <td>
                ${scoreHtml(lead.score)}
              </td>


              <td>
                ${missingInfoSummary(lead)}
              </td>


              <td>
                ${valueOrDash(
                  lead.recommended_action
                )}
              </td>

            </tr>

          `).join("")

        : `

          <tr>

            <td colspan="5">

              <div class="empty">
                Review queue is clear.
              </div>

            </td>

          </tr>

        `;

  }


  function missingInfoSummary(lead) {

    if (!lead.missing_information) {

      return `
        <span class="muted">
          None recorded
        </span>
      `;

    }


    const value =
      Array.isArray(
        lead.missing_information
      )
        ? lead.missing_information.join(", ")
        : String(
            lead.missing_information
          );


    return esc(
      value.length > 100
        ? value.slice(0, 100) + "..."
        : value
    );

  }


  /* =========================================================
     LEAD DRAWER
  ========================================================= */

  async function openLead(id) {

    selectedLeadId = id;


    $("drawer-backdrop")
      .classList
      .add("open");


    $("lead-drawer")
      .classList
      .add("open");


    $("drawer-content").innerHTML =
      `<div class="loading">Loading lead...</div>`;


    try {

      const lead =
        await api(
          `/leads/${id}`
        );


      $("drawer-name").textContent =
        lead.name ||
        "Lead";


      $("drawer-company").textContent =
        [
          lead.company,
          lead.email
        ]
          .filter(Boolean)
          .join(" · ");


      $("drawer-content").innerHTML =
        renderLeadDrawer(
          lead
        );
      $("drawer-backdrop").classList.remove("open");
      document.querySelector(".app")?.classList.add("with-lead-panel");
      mountDrawerTabs();
      await loadLeadActivities(lead.id);

    }

    catch (error) {

      $("drawer-content").innerHTML = `

        <div class="empty">
          ${esc(error.message)}
        </div>

      `;

      showToast(
        error.message,
        true
      );

    }

  }


  function closeDrawer() {

    $("drawer-backdrop")
      .classList
      .remove("open");


    $("lead-drawer").classList.remove("open");
    document.querySelector(".app")?.classList.remove("with-lead-panel");
    closeActivityModal();
    selectedLeadId = null;

  }


  // Close the lead details panel when interacting elsewhere in the workspace.
  // Keep it open while using the Log Activity composer associated with this lead.
  document.addEventListener("pointerdown", event => {
    const drawer = $("lead-drawer");
    if (!drawer?.classList.contains("open")) return;

    const activityModal = $("activity-modal");
    if (activityModal?.classList.contains("open") &&
        activityModal.querySelector(".modal")?.contains(event.target)) {
      return;
    }

    if (!drawer.contains(event.target)) {
      closeDrawer();
    }
  }, true);


  function renderLeadDrawer(lead) {

    const reasons =
      normalizeList(
        lead.reasons
      );


    const missing =
      normalizeList(
        lead.missing_information
      );


    const disqualified =
      isDisqualified(
        lead
      );


    return `

      <!-- LEAD STATE -->

      <div class="drawer-section">

        <div class="drawer-section-title">
          Lead State
        </div>


        <div style="
          display:flex;
          gap:6px;
          flex-wrap:wrap;
        ">

          <span
            class="${statusClass(
              lead.status
            )}">

            ${esc(
              statusLabel(
                lead.status
              )
            )}

          </span>


          ${
            lead.reviewed

              ? `
                <span class="badge badge-qualified">
                  Reviewed
                </span>
              `

              : `
                <span class="badge badge-review">
                  Needs Review
                </span>
              `
          }


          ${
            disqualified

              ? `
                <span class="badge badge-neutral">
                  Retained Record
                </span>
              `

              : ""
          }

        </div>

      </div>


      <!-- QUALIFICATION -->

      <div class="drawer-section">

        <div class="drawer-section-title">
          AI Qualification
        </div>


        <div class="qualification-box">

          <div class="qualification-top">

            <div>

              <div class="drawer-section-title"
                   style="margin:0;">
                Overall Score
              </div>

              <div class="big-score">
                ${valueOrDash(
                  lead.score
                )}
              </div>

            </div>


            <span
              class="${statusClass(
                lead.status
              )}">

              ${esc(
                statusLabel(
                  lead.status
                )
              )}

            </span>

          </div>


          <div style="
            margin-top:7px;
            color:var(--text-2);
            font-size:9px;
          ">

            Confidence:
            <strong>
              ${valueOrDash(
                lead.confidence
              )}
            </strong>

          </div>


          <div class="score-bars">

            ${scoreBar(
              "Fit",
              lead.fit_score
            )}

            ${scoreBar(
              "Readiness",
              lead.readiness_score
            )}

            ${scoreBar(
              "Intent",
              lead.intent_score
            )}

          </div>

        </div>

      </div>


      <!-- CONTACT -->

      <div class="drawer-section">

        <div class="drawer-section-title">
          Contact & Company
        </div>


        <div class="detail-grid">

          ${detail(
            "Name",
            lead.name
          )}

          ${detail(
            "Email",
            lead.email
          )}

          ${detail(
            "Company",
            lead.company
          )}

          ${detail(
            "Industry",
            lead.industry
          )}

          ${detail(
            "Job Title",
            lead.job_title
          )}

          ${detail(
            "Company Size",
            lead.company_size
          )}

          ${detail(
            "Annual Revenue",
            lead.annual_revenue
          )}

          ${detail(
            "Decision Role",
            lead.decision_role
          )}

        </div>

      </div>


      <!-- BUYING CONTEXT -->

      <div class="drawer-section">

        <div class="drawer-section-title">
          Buying Context
        </div>


        <div class="detail-grid">

          ${detail(
            "Problem",
            lead.problem,
            true
          )}

          ${detail(
            "Desired Outcome",
            lead.desired_outcome,
            true
          )}

          ${detail(
            "Timeline",
            lead.timeline
          )}

          ${detail(
            "Budget",
            lead.budget
          )}

          ${detail(
            "Message",
            lead.message,
            true
          )}

        </div>

      </div>


      <!-- QUALIFICATION REASONS -->

      <div class="drawer-section">

        <div class="drawer-section-title">
          Qualification Reasons
        </div>


        ${
          reasons.length

            ? `
              <div style="
                display:grid;
                gap:6px;
              ">

                ${
                  reasons.map(
                    item => `

                      <div class="detail">

                        <div class="detail-value">
                          • ${esc(item)}
                        </div>

                      </div>

                    `
                  ).join("")
                }

              </div>
            `

            : `

              <div class="detail">

                <div class="detail-value">
                  No qualification reasons recorded.
                </div>

              </div>

            `
        }

      </div>


      <!-- MISSING INFORMATION -->

      <div class="drawer-section">

        <div class="drawer-section-title">
          Missing Information
        </div>


        ${
          missing.length

            ? `
              <div style="
                display:grid;
                gap:6px;
              ">

                ${
                  missing.map(
                    item => `

                      <div class="detail">

                        <div class="detail-value">
                          • ${esc(item)}
                        </div>

                      </div>

                    `
                  ).join("")
                }

              </div>
            `

            : `

              <div class="detail">

                <div class="detail-value">
                  No missing information recorded.
                </div>

              </div>

            `
        }

      </div>


      <!-- RECOMMENDED ACTION -->

      <div class="drawer-section">

        <div class="drawer-section-title">
          Recommended Action
        </div>


        <div class="detail full">

          <div class="detail-value">
            ${valueOrDash(
              lead.recommended_action
            )}
          </div>

        </div>

      </div>


      <!-- SALES ACTION -->

      <div class="drawer-section">

        <div class="drawer-section-title">
          Sales Action
        </div>


        ${
          disqualified

            ? `

              <div class="notice">

                <strong>
                  Not an active sales opportunity.
                </strong>

                <br>

                This lead is disqualified, so it is excluded
                from the active sales-action workflow.

                Its record and history remain available.

              </div>

            `

            : `

              <div class="detail-grid">

                ${detail(
                  "Current Next Action",
                  lead.next_action,
                  true
                )}

                ${detail(
                  "Action Date",
                  formatDate(
                    lead.next_action_at
                  ),
                  true
                )}

              </div>


              <form
                id="next-action-form"
                style="margin-top:9px;">

                <div class="field">

                  <label>
                    Next Action
                  </label>

                  <input
                    name="next_action"
                    value="${esc(
                      lead.next_action || ""
                    )}"
                    placeholder="e.g. Call prospect">

                </div>


                <div
                  class="field"
                  style="margin-top:8px;">

                  <label>
                    Next Action Date
                  </label>

                  <input
                    name="next_action_at"
                    type="datetime-local"
                    value="${datetimeLocalValue(
                      lead.next_action_at
                    )}">

                </div>


                <button
                  type="submit"
                  class="btn btn-primary btn-small"
                  style="margin-top:8px;">

                  Save Next Action

                </button>

              </form>

            `
        }

      </div>


      <!-- REVIEW -->

      <div class="drawer-section">

        <div class="drawer-section-title">
          Human Review
        </div>


        <div class="detail-grid">

          ${detail(
            "Reviewed",
            lead.reviewed
              ? "Yes"
              : "No"
          )}

          ${detail(
            "Reviewed At",
            formatDate(
              lead.reviewed_at
            )
          )}

        </div>


        ${
          !lead.reviewed

            ? `

              <button
                class="btn btn-primary"
                style="margin-top:8px;"
                onclick="reviewLead(${lead.id})">

                Mark Reviewed

              </button>

            `

            : ""
        }

      </div>


      <!-- ACTIVITY -->

      <div class="drawer-section">

        <div class="drawer-section-title">
          Lead Activity History
        </div>


        <div
          id="lead-activities"
          class="lead-activity-timeline">

          <div class="loading">
            Loading activity...
          </div>

        </div>

      </div>


      ${
        disqualified

          ? `

            <div class="notice">

              <strong>
                Disqualified record retained.
              </strong>

              <br>

              The system keeps this lead for historical context,
              qualification analysis and possible future
              re-engagement.

            </div>

          `

          : ""
      }


      <!-- DELETE NOTE -->

      <div class="notice">

        <strong>
          Record management
        </strong>

        <br>

        Permanent deletion is not currently enabled because
        the backend does not expose a lead-delete endpoint.
        This prevents the interface from pretending that
        historical sales records can be safely destroyed.

      </div>

    `;

  }


  function normalizeList(value) {

    if (!value) {
      return [];
    }


    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }


    return String(value)
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean);

  }


  /* =========================================================
     REVIEW
  ========================================================= */

  async function reviewLead(id) {

    try {

      await api(
        `/leads/${id}/review`,
        {
          method: "PATCH"
        }
      );


      showToast(
        "Lead marked as reviewed."
      );


      await refreshAll();


      if (
        selectedLeadId === id
      ) {
        await openLead(id);
      }

    }

    catch (error) {

      showToast(
        error.message,
        true
      );

    }

  }


  /* =========================================================
     ACTIVITY
  ========================================================= */

  function mountDrawerTabs() {
    const host = $("drawer-content");
    if (!host || host.querySelector(".lead-tabs")) return;
    const sections = Array.from(host.querySelectorAll(":scope > .drawer-section"));
    if (!sections.length) return;
    const nav = document.createElement("div");
    nav.className = "lead-tabs";
    nav.innerHTML = '<button type="button" class="lead-tab" data-tab="overview" onclick="switchLeadTab(\'overview\')">Overview</button><button type="button" class="lead-tab active" data-tab="activity" onclick="switchLeadTab(\'activity\')">Activity</button><button type="button" class="lead-tab" data-tab="details" onclick="switchLeadTab(\'details\')">Details</button>';
    const panels = {
      overview: document.createElement("section"),
      activity: document.createElement("section"),
      details: document.createElement("section")
    };
    Object.entries(panels).forEach(([key,panel]) => {
      panel.className = "lead-tab-panel" + (key === "activity" ? " active" : "");
      panel.dataset.panel = key;
    });
    sections.forEach(section => {
      const title = (section.querySelector(".drawer-section-title")?.textContent || "").trim().toLowerCase();
      let target = "details";
      if (title.includes("lead state") || title.includes("ai qualification")) target = "overview";
      if (title.includes("next sales action") || title.includes("activity history")) target = "activity";
      panels[target].appendChild(section);
    });
    Array.from(host.children).forEach(child => {
      if (!child.classList.contains("drawer-section")) panels.details.appendChild(child);
    });
    host.replaceChildren(nav, panels.overview, panels.activity, panels.details);
  }

  function switchLeadTab(tab) {
    const host = $("drawer-content");
    if (!host) return;
    host.querySelectorAll(".lead-tab").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
    host.querySelectorAll(".lead-tab-panel").forEach(panel => panel.classList.toggle("active", panel.dataset.panel === tab));
  }


  async function loadLeadActivities(id) {

    const container =
      $("lead-activities");


    if (!container) {
      return;
    }


    try {

      const data =
        await api(
          `/leads/${id}/activities`
        );


      const activities =
        Array.isArray(data)
          ? data
          : [];


      const sorted = [...activities].sort(
        (a, b) => new Date(a.occurred_at || a.created_at || 0) - new Date(b.occurred_at || b.created_at || 0)
      );
      const lead = leads.find(item => String(item.id) === String(id));
      container.innerHTML = renderActionTimeline(lead, sorted) + `
        <button class="btn btn-primary timeline-log-button" type="button" onclick="openActivityModal(${Number(id)})">＋ Log Activity</button>`;

    }

    catch (error) {

      container.innerHTML = `

        <div class="empty"
             style="padding:20px 5px;">

          Activity unavailable.

        </div>

      `;

    }

  }


  function activityTypeLabel(type) {
    const labels = { call:"Phone Call", email:"Email Sent", meeting:"Meeting", note:"Note", other:"Activity", demo:"Demo" };
    const key = String(type || "other").toLowerCase();
    return labels[key] || (key.charAt(0).toUpperCase() + key.slice(1));
  }
  function activityIcon(type) {
    const icons = { call:"☎", email:"✉", meeting:"▦", note:"▤", other:"•", demo:"▦" };
    return icons[String(type || "other").toLowerCase()] || icons.other;
  }
  function actionDescription(value) {
    const text = String(value || "").trim();
    if (!text || text === "None") return "";
    return text.replace(/ \(due .+\)$/, "");
  }
  function parseActionTransition(event) {
    const match = String(event.notes || "").match(/^Next action changed from '(.*)' to '(.*)'\.$/);
    if (!match) return null;
    return { from: actionDescription(match[1]), to: actionDescription(match[2]) };
  }
  function renderTimelineActivity(activity) {
    const type = String(activity.activity_type || "other").toLowerCase();
    const isSystemEvent = activity.activity_kind === "system_event";
    return `
      <article class="activity-item timeline-entry activity-${esc(type)} ${isSystemEvent ? "system-event" : ""}">
        <div class="activity-icon ${esc(type)}">${activityIcon(type)}</div>
        <div class="activity-card">
          <div class="activity-card-top">
            <strong class="activity-type">${esc(isSystemEvent ? "System Event" : activityTypeLabel(type))}</strong>
            <time class="activity-time">${formatDate(activity.occurred_at || activity.created_at)}</time>
          </div>
          ${activity.outcome ? `<div class="activity-outcome">${esc(activity.outcome)}</div>` : ""}
          ${activity.notes ? `<div class="activity-notes">${esc(activity.notes)}</div>` : ""}
          ${Array.isArray(activity.tags) && activity.tags.length ? `<div class="activity-tags">${activity.tags.map(tag => `<span class="activity-tag">${esc(tag)}</span>`).join("")}</div>` : ""}
        </div>
      </article>`;
  }
  function renderActionCard(action, index, isCurrent, activities, hasCurrent) {
    const status = isCurrent ? "Current" : (index === (hasCurrent ? 1 : 0) ? "Previous" : "Older");
    const title = isCurrent ? "Next Action (Current)" : `Last Action (${status})`;
    const due = action.due ? esc(formatDate(action.due)) : "Date not scheduled";
    return `
      <section class="timeline-action-group ${isCurrent ? "is-current" : "is-previous"}">
        <article class="timeline-action-card">
          <div class="activity-icon meeting">▦</div>
          <div class="timeline-action-content">
            <div class="activity-card-top"><strong>${esc(title)}</strong><span class="badge ${isCurrent ? "badge-active" : "badge-neutral"}">${esc(status)}</span></div>
            <div class="timeline-action-name">${esc(action.title || "No action text")}</div>
            <div class="timeline-upcoming-meta">Due: ${due}</div>
            ${action.tags?.length ? `<div class="activity-tags">${action.tags.map(tag => `<span class="activity-tag">${esc(tag)}</span>`).join("")}</div>` : ""}
          </div>
        </article>
        ${activities.map(renderTimelineActivity).join("")}
      </section>`;
  }
  function renderActionTimeline(lead, activities) {
    const systemEvents = activities.filter(item => item.activity_kind === "system_event")
      .sort((a,b) => new Date(a.occurred_at || a.created_at) - new Date(b.occurred_at || b.created_at));
    const normalActivities = activities.filter(item => item.activity_kind !== "system_event")
      .sort((a,b) => new Date(a.occurred_at || a.created_at) - new Date(b.occurred_at || b.created_at));
    const groups = [];
    const stamp = item => new Date(item.occurred_at || item.created_at || 0).getTime();
    for (const event of systemEvents) {
      const transition = parseActionTransition(event);
      if (!transition) continue;
      const at = stamp(event);
      if (groups.length) groups[groups.length - 1].end = at;
      else if (transition.from) groups.push({ title: transition.from, start: -Infinity, end: at, due: null, tags: [] });
      if (transition.to) {
        const dueMatch = String(event.notes || "").match(/ to '.*? \(due (.+)\)'\.$/);
        groups.push({ title: transition.to, start: at, end: Infinity, due: dueMatch ? dueMatch[1] : null, tags: [] });
      }
    }
    if (lead && lead.next_action) {
      const currentTitle = String(lead.next_action).trim();
      const last = groups[groups.length - 1];
      if (!last || last.title !== currentTitle) {
        if (last) last.end = Infinity;
        groups.push({ title: currentTitle, start: last ? stamp(systemEvents[systemEvents.length - 1]) : -Infinity, end: Infinity, due: lead.next_action_at, tags: [] });
      } else {
        last.due = lead.next_action_at || last.due;
        last.end = Infinity;
      }
    }
    if (!groups.length && normalActivities.length) {
      groups.push({ title: "Activity history", start: -Infinity, end: Infinity, due: null, tags: [], fallback: true });
    }
    if (groups.length) {
      const firstStart = groups[0].start;
      const earlier = normalActivities.filter(item => stamp(item) < firstStart);
      if (earlier.length) groups.unshift({ title: "Earlier Activity", start: -Infinity, end: firstStart, due: null, tags: [], fallback: true });
    }
    if (!groups.length && normalActivities.length) {
      groups.push({ title: "Earlier Activity", start: -Infinity, end: Infinity, due: null, tags: [], fallback: true });
    }
    const displayGroups = [...groups].reverse();
    const rendered = displayGroups.map((group, index) => {
      const groupActivities = normalActivities.filter(item => stamp(item) >= group.start && stamp(item) < group.end);
      const isCurrent = Boolean(lead && lead.next_action && group.title === String(lead.next_action).trim() && group.end === Infinity && !group.fallback);
      return group.fallback
        ? `<section class="timeline-action-group is-previous"><div class="timeline-group-heading">Earlier Activity</div>${groupActivities.map(renderTimelineActivity).join("")}</section>`
        : renderActionCard(group, index, isCurrent, groupActivities, Boolean(lead && lead.next_action));
    });
    return rendered.length ? rendered.join("") : '<div class="empty timeline-empty">No next action or activity recorded yet.</div>';
  }
  function activityHtml(activity, lead = null) {
    const type = String(activity.activity_type || "other").toLowerCase();
    const isSystemEvent = activity.activity_kind === "system_event";
    const label = isSystemEvent ? "System Event" : activityTypeLabel(type);
    return `
      <article class="activity-item ${isSystemEvent ? "system-event" : ""}">
        <div class="activity-icon ${esc(type)}">${activityIcon(type)}</div>
        <div class="activity-card-top">
          <strong class="activity-type">${esc(label)}</strong>
          ${isSystemEvent ? '<span class="badge badge-system">Automated</span>' : ""}
          <time class="activity-time">${formatDate(activity.occurred_at || activity.created_at)}</time>
        </div>
        ${lead ? `<div class="activity-lead-ref">${esc(lead.name || "")}${lead.company ? " · " + esc(lead.company) : ""}</div>` : ""}
        ${activity.outcome ? `<div class="activity-outcome">${esc(activity.outcome)}</div>` : ""}
        ${activity.notes ? `<div class="activity-notes">${esc(activity.notes)}</div>` : ""}
        ${Array.isArray(activity.tags) && activity.tags.length ? `<div class="activity-tags">${activity.tags.map(tag => `<span class="activity-tag">${esc(tag)}</span>`).join("")}</div>` : ""}
      </article>`;
  }


  async function loadGlobalActivity() {

    const container =
      $("global-activity");


    container.innerHTML = `

      <div class="loading">
        Loading activity history...
      </div>

    `;


    try {

      const data = await api("/activities?limit=5000");
      const results = Array.isArray(data) ? data : [];


      $("activity-count").textContent =
        `${results.length} activities`;


      $("global-activity").innerHTML =
        results.length

          ? results
              .map(
                activity =>
                  activityHtml(
                    activity,
                    { name: activity.lead_name, company: activity.company }
                  )
              )
              .join("")

          : `

            <div class="empty">
              No activity has been recorded yet.
            </div>

          `;

    }

    catch (error) {

      container.innerHTML = `

        <div class="empty">
          Unable to load activity history.
        </div>

      `;

      showToast(
        error.message,
        true
      );

    }

  }


  /* =========================================================
     ACTIVITY MODAL
  ========================================================= */

  let activityTags = [];

  function renderActivityTags() {
    const host = $("activity-tag-chips");
    const hidden = $("activity-tags-value");
    if (!host || !hidden) return;
    hidden.value = activityTags.join(",");
    host.innerHTML = activityTags.map((tag, index) => `
      <span class="activity-tag-chip">
        <button type="button" class="activity-tag-label" data-insert-tag="${index}">${esc(tag)}</button>
        <button type="button" class="activity-tag-remove" data-remove-tag="${index}" aria-label="Remove ${esc(tag)}">×</button>
      </span>
    `).join("");
  }

  function addActivityTag() {
    const input = $("activity-tag-input");
    const tag = String(input.value || "").trim().replace(/^#+/, "");
    if (!tag) return;
    if (!activityTags.some(existing => existing.toLowerCase() === tag.toLowerCase())) {
      activityTags.push(tag);
      renderActivityTags();
    }
    input.value = "";
    input.hidden = true;
    const confirm = $("activity-tag-confirm");
    if (confirm) confirm.hidden = true;
    const toggle = $("activity-tag-add-toggle");
    if (toggle) toggle.hidden = false;
    if (toggle) toggle.focus();
  }

  function removeActivityTag(index) {
    activityTags = activityTags.filter((tag, i) => i !== Number(index));
    renderActivityTags();
  }

  function insertActivityTag(index) {
    const tag = activityTags[Number(index)];
    const notes = $("activity-form").querySelector('[name="notes"]');
    if (!tag || !notes) return;
    const token = "#" + tag.replace(/\s+/g, "_");
    const prefix = notes.value && !/\s$/.test(notes.value) ? " " : "";
    notes.value += prefix + token;
    notes.focus();
  }

  $("activity-tag-chips").addEventListener("click", event => {
    const remove = event.target.closest("[data-remove-tag]");
    if (remove) {
      removeActivityTag(remove.dataset.removeTag);
      return;
    }
    const insert = event.target.closest("[data-insert-tag]");
    if (insert) insertActivityTag(insert.dataset.insertTag);
  });

  $("activity-tag-input").addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      addActivityTag();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.currentTarget.hidden = true;
      $("activity-tag-confirm").hidden = true;
      $("activity-tag-add-toggle").hidden = false;
    }
  });
  $("activity-tag-add-toggle").addEventListener("click", () => {
    $("activity-tag-add-toggle").hidden = true;
    $("activity-tag-input").hidden = false;
    $("activity-tag-confirm").hidden = false;
    $("activity-tag-input").focus();
  });
  $("activity-tag-confirm").addEventListener("click", addActivityTag);
  document.querySelectorAll(".activity-type-tab").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".activity-type-tab").forEach(tab => tab.classList.toggle("active", tab === button));
      $("activity-type-value").value = button.dataset.activityType;
    });
  });


  function openActivityModal(
    leadId
  ) {

    selectedLeadId =
      leadId;


    const lead =
      leads.find(
        item =>
          item.id === leadId
      );


    $("activity-modal-lead")
      .textContent =
      lead
        ? [
            lead.name,
            lead.company
          ]
            .filter(Boolean)
            .join(" · ")
        : "";


    const form = $("activity-form");
    form.reset();
    activityTags = [];
    renderActivityTags();
    $("activity-tag-input").hidden = true;
    $("activity-tag-confirm").hidden = true;
    $("activity-tag-add-toggle").hidden = false;
    document.querySelectorAll(".activity-type-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.activityType === "call"));
    $("activity-type-value").value = "call";
    const occurredAt = form.querySelector('[name="occurred_at"]');
    if (occurredAt) {
      const now = new Date();
      occurredAt.value = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    const activityModal = $("activity-modal");
    activityModal.classList.toggle(
      "with-lead-panel",
      Boolean($("lead-drawer")?.classList.contains("open"))
    );
    activityModal.classList.add("open");
    const notes = form.querySelector('[name="notes"]');
    if (notes) notes.focus();

  }


  function closeActivityModal() {

    $("activity-modal").classList.remove("open", "with-lead-panel");

  }

  // Dismiss the composer when the user interacts anywhere outside its card.
  // Capture phase prevents the click that opens the composer from dismissing it immediately.
  document.addEventListener("pointerdown", event => {
    const activityModal = $("activity-modal");
    if (!activityModal?.classList.contains("open")) return;
    const modalCard = activityModal.querySelector(".modal");
    if (modalCard && !modalCard.contains(event.target)) {
      closeActivityModal();
    }
  }, true);


  let isSavingActivity = false;

  $("activity-form").onsubmit =
    async event => {
      event.preventDefault();
      if (!selectedLeadId || isSavingActivity) return;

      const form = event.currentTarget;
      const submitButton = form.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.textContent;
      isSavingActivity = true;
      submitButton.disabled = true;
      submitButton.textContent = "Saving activity...";

      try {
        const data = Object.fromEntries(new FormData(form));
        data.outcome = String(data.outcome || "").trim() || null;
        data.notes = String(data.notes || "").trim() || null;
        data.tags = String(data.tags || "")
          .split(",")
          .map(tag => tag.trim())
          .filter(Boolean);
        data.occurred_at = data.occurred_at
          ? new Date(data.occurred_at).toISOString()
          : new Date().toISOString();

        const leadId = selectedLeadId;
        await api(`/leads/${leadId}/activities`, {
          method: "POST",
          body: JSON.stringify(data)
        });

        showToast("Activity recorded.");
        form.reset();
        closeActivityModal();
        await loadLeadActivities(leadId);
        await loadGlobalActivity();
      } catch (error) {
        showToast(error.message, true);
      } finally {
        isSavingActivity = false;
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    };


  /* =========================================================
     NEXT ACTION
  ========================================================= */

  let isSavingNextAction = false;

  function attachNextActionForm(lead) {
    const form = $("next-action-form");
    if (!form) return;

    form.onsubmit = async event => {
      event.preventDefault();
      if (isSavingNextAction) return;

      const submitButton = form.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.textContent;
      isSavingNextAction = true;
      submitButton.disabled = true;
      submitButton.textContent = "Saving...";

      try {
        const data = Object.fromEntries(new FormData(form));
        const actionText = String(data.next_action || "").trim();
        const body = {
          next_action: actionText || null,
          next_action_at: actionText && data.next_action_at
            ? new Date(data.next_action_at).toISOString()
            : null
        };

        await api(`/leads/${lead.id}/next-action`, {
          method: "PATCH",
          body: JSON.stringify(body)
        });

        showToast(actionText ? "Next sales action saved." : "Next sales action cleared.");
        await refreshAll();
        await openLead(lead.id);
      } catch (error) {
        showToast(error.message, true);
      } finally {
        isSavingNextAction = false;
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    };
  }

  /*
   * Because the drawer HTML is rendered dynamically,
   * attach its form after each render.
   */

  const originalOpenLead =
    openLead;


  openLead = async function(id) {

    await originalOpenLead(id);


    if (
      selectedLeadId !== null
    ) {

      const lead =
        leads.find(
          item =>
            item.id ===
            selectedLeadId
        );


      if (lead) {
        attachNextActionForm(
          lead
        );
      }

    }

  };


  /* =========================================================
     CREATE LEAD
  ========================================================= */

  function openCreateModal() {

    $("create-modal")
      .classList
      .add("open");

  }


  function closeCreateModal() {

    $("create-modal")
      .classList
      .remove("open");

  }


  let isCreatingLead = false;

  $("lead-form").onsubmit =
    async event => {

      event.preventDefault();

      if (isCreatingLead) {
        return;
      }

      const form = event.currentTarget;
      const submitButton = form.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.textContent;
      isCreatingLead = true;
      submitButton.disabled = true;
      submitButton.textContent = "Creating lead...";

      try {

        const formData =
          new FormData(
            event.target
          );


        const payload =
          Object.fromEntries(
            formData
          );

        for (const [key, value] of Object.entries(payload)) {
          if (typeof value === "string") {
            payload[key] = value.trim();
          }
        }

        payload.company_size = Number(payload.company_size);
        ["annual_revenue", "budget"].forEach(field => {
          const raw = payload[field];
          payload[field] = raw === "" || raw == null ? null : Number(raw);
        });
        payload.email = String(payload.email || "").trim().toLowerCase();


        const result =
          await api(
            "/leads",
            {
              method: "POST",
              body: JSON.stringify(
                payload
              )
            }
          );


        showToast(
          "Lead created and qualified."
        );


        event.target.reset();

        closeCreateModal();


        await refreshAll();


        if (result?.id) {
          await openLead(
            result.id
          );
        }

      }

      catch (error) {

        showToast(
          error.message,
          true
        );

      }

      finally {
        isCreatingLead = false;
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }

    };


  /* =========================================================
     REFRESH
  ========================================================= */

  async function refreshAll() {

    try {

      await Promise.all([
        loadAllLeads(),
        loadAllActions()
      ]);


      updateCounters();

      renderOverview();

      renderLeads();

      renderReviews();


      if (
        document
          .getElementById(
            "view-actions"
          )
          .classList
          .contains("active")
      ) {
        await loadActionsView(
          currentActionFilter
        );
      }


      showToast(
        "Workspace refreshed."
      );

    }

    catch (error) {

      showToast(
        error.message,
        true
      );

    }

  }


  /* =========================================================
     KEYBOARD
  ========================================================= */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape"
      ) {

        closeDrawer();
        closeCreateModal();
        closeActivityModal();

      }

    }
  );


  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  refreshAll();

