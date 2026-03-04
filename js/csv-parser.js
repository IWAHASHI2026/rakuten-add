// csv-parser.js — CSV読み込み・パース処理

const CsvParser = {
  // 期待するヘッダーカラム（商品別）
  ITEM_REQUIRED_HEADERS: ['商品管理番号', '入札単価', 'クリック数(合計)', '実績額(合計)', '売上金額(合計12時間)'],
  // 期待するヘッダーカラム（キーワード別）
  KEYWORD_REQUIRED_HEADERS: ['商品管理番号', 'キーワード', 'クリック数(合計)', '実績額(合計)', '売上金額(合計12時間)'],

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
      reader.readAsArrayBuffer(file);
    });
  },

  decodeShiftJIS(buffer) {
    const decoder = new TextDecoder('shift-jis');
    return decoder.decode(buffer);
  },

  parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          fields.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    fields.push(current);
    return fields;
  },

  parseNumber(value) {
    if (value === '' || value === undefined || value === null) return 0;
    const cleaned = String(value).replace(/,/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  },

  detectFileType(headers) {
    const hasKeyword = headers.includes('キーワード');
    if (hasKeyword) return 'keyword';
    if (headers.includes('入札単価')) return 'item';
    return null;
  },

  validateHeaders(headers, type) {
    const required = type === 'item' ? this.ITEM_REQUIRED_HEADERS : this.KEYWORD_REQUIRED_HEADERS;
    const missing = required.filter(h => !headers.includes(h));
    if (missing.length > 0) {
      throw new Error(`ファイルのフォーマットが正しくありません。楽天市場からダウンロードしたCSVか確認してください（不足カラム: ${missing.join(', ')}）`);
    }
  },

  async parse(file) {
    const buffer = await this.readFile(file);
    const text = this.decodeShiftJIS(buffer);
    const lines = text.split(/\r?\n/);

    // 1-6行目スキップ、7行目ヘッダー、8行目以降データ
    if (lines.length < 7) {
      throw new Error('データが見つかりません');
    }

    const headerLine = lines[6];
    const headers = this.parseCSVLine(headerLine);

    const type = this.detectFileType(headers);
    if (!type) {
      throw new Error('ファイルのフォーマットが正しくありません。楽天市場からダウンロードしたCSVか確認してください');
    }

    this.validateHeaders(headers, type);

    const data = [];
    const warnings = [];

    for (let i = 7; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const fields = this.parseCSVLine(line);
      const row = {};

      headers.forEach((header, idx) => {
        row[header] = fields[idx] !== undefined ? fields[idx] : '';
      });

      // 数値フィールドの変換
      try {
        if (type === 'item') {
          row['_入札単価'] = this.parseNumber(row['入札単価']);
          row['_クリック数'] = this.parseNumber(row['クリック数(合計)']);
          row['_実績額'] = this.parseNumber(row['実績額(合計)']);
          row['_売上金額12h'] = this.parseNumber(row['売上金額(合計12時間)']);
          row['_ROAS'] = this.parseNumber(row['ROAS(合計12時間)(%)']);
        } else {
          row['_クリック数'] = this.parseNumber(row['クリック数(合計)']);
          row['_実績額'] = this.parseNumber(row['実績額(合計)']);
          row['_売上金額12h'] = this.parseNumber(row['売上金額(合計12時間)']);
        }
      } catch (e) {
        warnings.push(`行${i + 1}: 数値の変換に失敗しました`);
        continue;
      }

      data.push(row);
    }

    if (data.length === 0) {
      throw new Error('データが見つかりません');
    }

    return { type, headers, data, warnings };
  }
};
