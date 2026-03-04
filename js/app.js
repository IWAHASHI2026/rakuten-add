// app.js — メインアプリケーション（初期化・イベント制御）

const App = {
  itemFile: null,
  keywordFile: null,
  lastResults: null,

  init() {
    // ルール復元
    const rules = Rules.load();
    const minBid = Rules.loadMinBid();
    const alertRoas = Rules.loadAlertRoas();

    UI.renderRulesTable(rules);
    document.getElementById('min-bid').value = minBid;
    document.getElementById('alert-roas').value = alertRoas;

    // ファイル選択イベント
    document.getElementById('file-item').addEventListener('change', (e) => {
      this.itemFile = e.target.files[0] || null;
      this.updateFileStatus('item', this.itemFile);
      this.updateExecuteButton();
    });

    document.getElementById('file-keyword').addEventListener('change', (e) => {
      this.keywordFile = e.target.files[0] || null;
      this.updateFileStatus('keyword', this.keywordFile);
      this.updateExecuteButton();
    });

    // ルール変更時の自動保存
    document.getElementById('rules-tbody').addEventListener('change', () => {
      UI.saveRulesFromUI();
    });
  },

  updateFileStatus(type, file) {
    const el = document.getElementById(`status-${type}`);
    if (file) {
      el.textContent = file.name;
      el.classList.add('ready');
    } else {
      el.textContent = '';
      el.classList.remove('ready');
    }
  },

  updateExecuteButton() {
    const btn = document.getElementById('btn-execute');
    btn.disabled = !(this.itemFile && this.keywordFile);
  },

  async execute() {
    UI.clearError();
    UI.clearResults();

    if (!this.itemFile || !this.keywordFile) {
      UI.showError('商品別レポートとキーワード別レポートの両方を選択してください');
      return;
    }

    const btn = document.getElementById('btn-execute');
    btn.disabled = true;
    btn.textContent = '処理中...';

    try {
      // CSVパース
      const itemResult = await CsvParser.parse(this.itemFile);
      const keywordResult = await CsvParser.parse(this.keywordFile);

      // ファイルタイプ検証
      if (itemResult.type !== 'item') {
        throw new Error('商品別レポートとして選択されたファイルは、キーワード別レポートのフォーマットです。ファイルの選択を確認してください');
      }
      if (keywordResult.type !== 'keyword') {
        throw new Error('キーワード別レポートとして選択されたファイルは、商品別レポートのフォーマットです。ファイルの選択を確認してください');
      }

      // 集計期間の一致チェック
      if (itemResult.period && keywordResult.period && itemResult.period !== keywordResult.period) {
        throw new Error(`商品別レポートとキーワード別レポートの集計期間が異なります。\n商品別: ${itemResult.period}\nキーワード別: ${keywordResult.period}`);
      }

      // ルール取得
      const rules = UI.collectRulesFromUI();
      const minBid = Number(document.getElementById('min-bid').value) || DEFAULT_MIN_BID;
      const alertRoas = Number(document.getElementById('alert-roas').value) || DEFAULT_ALERT_ROAS;

      if (rules.length === 0) {
        throw new Error('ルールを1つ以上設定してください');
      }

      // データ処理
      const { results, warnings } = Processor.process(
        itemResult.data,
        keywordResult.data,
        rules,
        minBid,
        alertRoas
      );

      // パース時の警告も合わせる
      const allWarnings = [
        ...itemResult.warnings,
        ...keywordResult.warnings,
        ...warnings
      ];

      this.lastResults = results;

      // 結果表示
      UI.showWarnings(allWarnings);
      UI.renderResultsTable(results);

    } catch (error) {
      UI.showError(error.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '実行';
      this.updateExecuteButton();
    }
  },

  exportCSV() {
    if (!this.lastResults || this.lastResults.length === 0) {
      UI.showError('出力するデータがありません');
      return;
    }

    try {
      CsvExport.download(this.lastResults);
    } catch (error) {
      UI.showError('CSV出力に失敗しました: ' + error.message);
    }
  },

  resetRules() {
    Rules.resetToDefault();
    const rules = Rules.getDefaultRules();
    UI.renderRulesTable(rules);
    document.getElementById('min-bid').value = DEFAULT_MIN_BID;
    document.getElementById('alert-roas').value = DEFAULT_ALERT_ROAS;
  }
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
