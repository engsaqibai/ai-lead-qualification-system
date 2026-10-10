

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

    if (value === "needs_review") {
      return "badge badge-review";
    }

    return "badge badge-neutral";

  }


  function statusLabel(status) {

    if (!status) {
      return "Unknown";
    }

    return String(status)
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


        if (
          status &&
          String(lead.status || "")
            .toLowerCase()
          !== status.toLowerCase()
        ) {
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


        <button
          class="btn btn-primary btn-small"
          onclick="openActivityModal(${lead.id})">

          + Log Activity

        </button>


        <div
          id="lead-activities"
          style="margin-top:10px;">

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


      if (!activities.length) {

        container.innerHTML = `

          <div class="empty"
               style="padding:20px 5px;">

            No activity recorded yet.

          </div>

        `;

        return;

      }


      const sorted = [...activities].sort(
        (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
      );
      const lead = leads.find(item => String(item.id) === String(id));
      const upcoming = lead && lead.next_action
        ? `<div class="timeline-upcoming"><div class="activity-card-top"><strong>${esc(lead.next_action)}</strong><span class="badge badge-active">Next Action</span></div><div class="timeline-upcoming-meta">${lead.next_action_at ? esc(formatDate(lead.next_action_at)) : "Date not scheduled"}</div></div>`
        : "";
      container.innerHTML = upcoming + (sorted.length
        ? sorted.map(activity => activityHtml(activity)).join("")
        : '<div class="empty timeline-empty">No activity recorded yet. Use “Log Activity” to record the first call, email or meeting.</div>');

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
    const labels = { call:"Phone Call", email:"Email Sent", meeting:"Meeting", note:"Internal Note", other:"Activity" };
    const key = String(type || "other").toLowerCase();
    return labels[key] || (key.charAt(0).toUpperCase() + key.slice(1));
  }
  function activityIcon(type) {
    const icons = { call:"☎", email:"✉", meeting:"▦", note:"▤", other:"•" };
    return icons[String(type || "other").toLowerCase()] || icons.other;
  }
  function activityHtml(activity, lead = null) {
    const type = String(activity.activity_type || "other").toLowerCase();
    return `
      <article class="activity-item">
        <div class="activity-icon ${esc(type)}">${activityIcon(type)}</div>
        <div class="activity-card-top">
          <strong class="activity-type">${esc(activityTypeLabel(type))}</strong>
          <time class="activity-time">${formatDate(activity.created_at)}</time>
        </div>
        ${lead ? `<div class="activity-lead-ref">${esc(lead.name || "")}${lead.company ? " · " + esc(lead.company) : ""}</div>` : ""}
        ${activity.outcome ? `<div class="activity-outcome">${esc(activity.outcome)}</div>` : ""}
        ${activity.notes ? `<div class="activity-notes">${esc(activity.notes)}</div>` : ""}
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

      const results = [];


      /*
       * Activities are stored per lead.
       * Fetch them in small batches instead of launching
       * an unlimited number of requests simultaneously.
       */

      const batchSize = 6;


      for (
        let i = 0;
        i < leads.length;
        i += batchSize
      ) {

        const batch =
          leads.slice(
            i,
            i + batchSize
          );


        const batchResults =
          await Promise.all(
            batch.map(
              async lead => {

                try {

                  const data =
                    await api(
                      `/leads/${lead.id}/activities`
                    );


                  return (
                    Array.isArray(data)
                      ? data.map(
                          activity => ({
                            ...activity,
                            __lead: lead
                          })
                        )
                      : []
                  );

                }

                catch {
                  return [];
                }

              }
            )
          );


        batchResults.forEach(
          items =>
            results.push(...items)
        );

      }


      results.sort(
        (a, b) =>
          new Date(
            b.created_at || 0
          ) -
          new Date(
            a.created_at || 0
          )
      );


      $("activity-count").textContent =
        `${results.length} activities`;


      $("global-activity").innerHTML =
        results.length

          ? results
              .map(
                activity =>
                  activityHtml(
                    activity,
                    activity.__lead
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
    $("activity-modal").classList.add("open");
    const notes = form.querySelector('[name="notes"]');
    if (notes) notes.focus();

  }


  function closeActivityModal() {

    $("activity-modal")
      .classList
      .remove("open");

  }


  $("activity-form").onsubmit =
    async event => {

      event.preventDefault();


      if (!selectedLeadId) {
        return;
      }


      try {

        const data =
          Object.fromEntries(
            new FormData(
              event.target
            )
          );


        await api(
          `/leads/${selectedLeadId}/activities`,
          {
            method: "POST",
            body: JSON.stringify(data)
          }
        );


        showToast(
          "Activity recorded."
        );


        event.target.reset();

        closeActivityModal();


        await loadLeadActivities(
          selectedLeadId
        );


        if (
          document
            .getElementById(
              "view-activity"
            )
            .classList
            .contains("active")
        ) {
          await loadGlobalActivity();
        }

      }

      catch (error) {

        showToast(
          error.message,
          true
        );

      }

    };


  /* =========================================================
     NEXT ACTION
  ========================================================= */

  function attachNextActionForm(
    lead
  ) {

    const form =
      $("next-action-form");


    if (!form) {
      return;
    }


    form.onsubmit =
      async event => {

        event.preventDefault();


        try {

          const data =
            Object.fromEntries(
              new FormData(form)
            );


          const body = {

            next_action:
              data.next_action ||
              null,

            next_action_at:
              data.next_action_at

                ? new Date(
                    data.next_action_at
                  ).toISOString()

                : null

          };


          await api(
            `/leads/${lead.id}/next-action`,
            {
              method: "PATCH",
              body: JSON.stringify(body)
            }
          );


          showToast(
            "Next sales action saved."
          );


          await refreshAll();

          await openLead(
            lead.id
          );

        }

        catch (error) {

          showToast(
            error.message,
            true
          );

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

        [
          "company_size",
          "annual_revenue",
          "budget"
        ].forEach(
          field => {
            payload[field] =
              Number(
                payload[field]
              );
          }
        );


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

