// ui.js — UI描画（ルール設定テーブル・結果テーブル・アラート）

const UI = {
  currentResults: null,
  sortColumn: null,
  sortAsc: true,
  filterAlertOnly: false,

  // ========== ルール設定テーブル ==========

  renderRulesTable(rules) {
    const tbody = document.getElementById('rules-tbody');
    tbody.innerHTML = '';

    rules.forEach((rule, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="rule-id">${rule.id}</td>
        <td>
          <input type="number" class="input-sm" data-field="roasMin" value="${rule.roasMin ?? ''}" step="any">
          <select class="input-xs" data-field="roasMinInclusive">
            <option value="true" ${rule.roasMinInclusive ? 'selected' : ''}>以上</option>
            <option value="false" ${!rule.roasMinInclusive ? 'selected' : ''}>超</option>
          </select>
        </td>
        <td>
          <input type="number" class="input-sm" data-field="roasMax" value="${rule.roasMax ?? ''}" placeholder="上限なし" step="any">
          <select class="input-xs" data-field="roasMaxInclusive">
            <option value="true" ${rule.roasMaxInclusive ? 'selected' : ''}>以下</option>
            <option value="false" ${!rule.roasMaxInclusive ? 'selected' : ''}>未満</option>
          </select>
        </td>
        <td>
          <select class="input-sm" data-field="clickCondition">
            <option value="" ${rule.clickCondition === null ? 'selected' : ''}>条件なし</option>
            <option value="lt" ${rule.clickCondition === 'lt' ? 'selected' : ''}>未満 (&lt;)</option>
            <option value="gte" ${rule.clickCondition === 'gte' ? 'selected' : ''}>以上 (&gt;=)</option>
          </select>
          <input type="number" class="input-sm" data-field="clickThreshold" value="${rule.clickThreshold ?? ''}" placeholder="-" min="0">
        </td>
        <td>
          <input type="number" class="input-sm" data-field="adjustment" value="${rule.adjustment}" step="1">
        </td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="UI.removeRule(${index})">削除</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  collectRulesFromUI() {
    const tbody = document.getElementById('rules-tbody');
    const rows = tbody.querySelectorAll('tr');
    const rules = [];

    rows.forEach((row, index) => {
      const roasMinVal = row.querySelector('[data-field="roasMin"]').value;
      const roasMaxVal = row.querySelector('[data-field="roasMax"]').value;
      const clickCondVal = row.querySelector('[data-field="clickCondition"]').value;
      const clickThreshVal = row.querySelector('[data-field="clickThreshold"]').value;

      rules.push({
        id: index + 1,
        roasMin: roasMinVal !== '' ? Number(roasMinVal) : 0,
        roasMax: roasMaxVal !== '' ? Number(roasMaxVal) : null,
        roasMinInclusive: row.querySelector('[data-field="roasMinInclusive"]').value === 'true',
        roasMaxInclusive: row.querySelector('[data-field="roasMaxInclusive"]').value === 'true',
        clickCondition: clickCondVal || null,
        clickThreshold: clickThreshVal !== '' ? Number(clickThreshVal) : null,
        adjustment: Number(row.querySelector('[data-field="adjustment"]').value) || 0
      });
    });

    return rules;
  },

  addRule() {
    const rules = this.collectRulesFromUI();
    rules.push({
      id: rules.length + 1,
      roasMin: 0, roasMax: null,
      roasMinInclusive: true, roasMaxInclusive: false,
      clickCondition: null, clickThreshold: null,
      adjustment: 0
    });
    this.renderRulesTable(rules);
    this.saveRulesFromUI();
  },

  removeRule(index) {
    const rules = this.collectRulesFromUI();
    if (rules.length <= 1) {
      alert('ルールを1つ以上設定してください');
      return;
    }
    rules.splice(index, 1);
    rules.forEach((r, i) => r.id = i + 1);
    this.renderRulesTable(rules);
    this.saveRulesFromUI();
  },

  saveRulesFromUI() {
    const rules = this.collectRulesFromUI();
    Rules.save(rules);

    const minBid = Number(document.getElementById('min-bid').value) || DEFAULT_MIN_BID;
    const alertRoas = Number(document.getElementById('alert-roas').value) || DEFAULT_ALERT_ROAS;
    Rules.saveMinBid(minBid);
    Rules.saveAlertRoas(alertRoas);
  },

  // ========== 結果テーブル ==========

  renderResultsTable(results) {
    this.currentResults = results;
    const filtered = this.filterAlertOnly
      ? results.filter(r => r.isAlert)
      : results;

    if (this.sortColumn !== null) {
      filtered.sort((a, b) => {
        let va = a[this.sortColumn];
        let vb = b[this.sortColumn];
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return this.sortAsc ? -1 : 1;
        if (va > vb) return this.sortAsc ? 1 : -1;
        return 0;
      });
    }

    const tbody = document.getElementById('results-tbody');
    tbody.innerHTML = '';

    const section = document.getElementById('results-section');
    section.style.display = 'block';

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="text-center">表示するデータがありません</td></tr>';
      return;
    }

    filtered.forEach((row, index) => {
      const tr = document.createElement('tr');
      if (row.isAlert) tr.classList.add('alert-row');

      const adjustmentText = row.adjustment > 0 ? `+${row.adjustment}` : String(row.adjustment);

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td class="cell-id">${this.escapeHTML(row.id)}</td>
        <td class="cell-url"><a href="${this.escapeHTML(row.url)}" target="_blank" rel="noopener">リンク</a></td>
        <td class="text-right">${row.currentBid}</td>
        <td class="text-right">${row.adjustedROAS.toFixed(2)}</td>
        <td class="text-right">${row.adjustedClicks}</td>
        <td class="text-center">${row.ruleId}</td>
        <td class="text-right">${adjustmentText}</td>
        <td class="text-right font-bold">${row.newBid}</td>
        <td class="text-center">${row.isAlert ? '<span class="alert-badge">⚠ 要確認</span>' : '-'}</td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('result-count').textContent =
      `${filtered.length}件表示` + (this.filterAlertOnly ? `（アラート対象のみ / 全${results.length}件）` : `（全${results.length}件）`);
  },

  sortBy(column) {
    if (this.sortColumn === column) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = column;
      this.sortAsc = true;
    }

    // ヘッダーのソートインジケータを更新
    document.querySelectorAll('#results-thead th').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
    });
    const th = document.querySelector(`#results-thead th[data-sort="${column}"]`);
    if (th) {
      th.classList.add(this.sortAsc ? 'sort-asc' : 'sort-desc');
    }

    if (this.currentResults) {
      this.renderResultsTable(this.currentResults);
    }
  },

  toggleAlertFilter() {
    this.filterAlertOnly = !this.filterAlertOnly;
    const btn = document.getElementById('btn-filter-alert');
    btn.classList.toggle('active', this.filterAlertOnly);
    btn.textContent = this.filterAlertOnly ? 'アラートのみ表示中' : 'アラートのみ表示';
    if (this.currentResults) {
      this.renderResultsTable(this.currentResults);
    }
  },

  // ========== 警告・エラー表示 ==========

  showWarnings(warnings) {
    const el = document.getElementById('warnings');
    if (warnings.length === 0) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'block';
    el.innerHTML = warnings.map(w => `<div class="warning-item">⚠ ${this.escapeHTML(w)}</div>`).join('');
  },

  showError(message) {
    const el = document.getElementById('error-message');
    el.style.display = 'block';
    el.textContent = message;
  },

  clearError() {
    const el = document.getElementById('error-message');
    el.style.display = 'none';
    el.textContent = '';
  },

  clearResults() {
    this.currentResults = null;
    this.sortColumn = null;
    this.sortAsc = true;
    this.filterAlertOnly = false;
    document.getElementById('results-section').style.display = 'none';
    document.getElementById('warnings').style.display = 'none';

    const btn = document.getElementById('btn-filter-alert');
    if (btn) {
      btn.classList.remove('active');
      btn.textContent = 'アラートのみ表示';
    }
  },

  // ========== ユーティリティ ==========

  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
