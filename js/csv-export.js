// csv-export.js — CSV出力（Shift-JISエンコード・ダウンロード）

const CsvExport = {
  generateCSV(results) {
    const lines = [];
    lines.push('コントロールカラム,商品管理番号,商品CPC');
    for (const row of results) {
      lines.push(',' + row.id + ',' + row.newBid);
    }
    return lines.join('\r\n');
  },

  encodeShiftJIS(text) {
    const unicodeArray = Encoding.stringToCode(text);
    const sjisArray = Encoding.convert(unicodeArray, {
      to: 'SJIS',
      from: 'UNICODE'
    });
    return new Uint8Array(sjisArray);
  },

  download(results, filename) {
    if (!filename) {
      filename = 'upload_' + new Date().toISOString().slice(0, 10) + '.csv';
    }

    const csvText = this.generateCSV(results);
    const encoded = this.encodeShiftJIS(csvText);
    const blob = new Blob([encoded], { type: 'text/csv;charset=shift-jis' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
