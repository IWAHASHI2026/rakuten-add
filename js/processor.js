// processor.js — データ前処理（KW差し引き・ROAS再計算・ルール適用）

const Processor = {
  aggregateKeywords(keywordData) {
    const map = {};
    for (const row of keywordData) {
      const id = row['商品管理番号'];
      if (!id) continue;
      if (!map[id]) {
        map[id] = { clicks: 0, cost: 0, sales: 0 };
      }
      map[id].clicks += row['_クリック数'];
      map[id].cost += row['_実績額'];
      map[id].sales += row['_売上金額12h'];
    }
    return map;
  },

  process(itemData, keywordData, rules, minBid, alertRoas) {
    const kwMap = this.aggregateKeywords(keywordData);
    const results = [];
    const warnings = [];

    for (const item of itemData) {
      const id = item['商品管理番号'];
      if (!id) continue;

      const kw = kwMap[id] || { clicks: 0, cost: 0, sales: 0 };

      let adjustedClicks = item['_クリック数'] - kw.clicks;
      let adjustedCost = item['_実績額'] - kw.cost;
      let adjustedSales = item['_売上金額12h'] - kw.sales;

      // マイナス値チェック
      if (adjustedClicks < 0) {
        warnings.push(`${id}: 差し引き後のクリック数がマイナスになりました`);
        adjustedClicks = 0;
      }
      if (adjustedCost < 0) {
        warnings.push(`${id}: 差し引き後の実績額がマイナスになりました`);
        adjustedCost = 0;
      }
      if (adjustedSales < 0) {
        warnings.push(`${id}: 差し引き後の売上金額がマイナスになりました`);
        adjustedSales = 0;
      }

      // ROAS再計算
      const adjustedROAS = adjustedCost > 0
        ? (adjustedSales / adjustedCost) * 100
        : 0;

      // ルールマッチング
      const currentBid = item['_入札単価'];
      const matchedRule = Rules.matchRule(adjustedROAS, adjustedClicks, rules);
      const adjustment = matchedRule ? matchedRule.adjustment : 0;
      const ruleId = matchedRule ? matchedRule.id : '-';

      // 新入札単価計算
      let newBid = currentBid + adjustment;
      if (newBid < minBid) {
        newBid = minBid;
      }

      // アラートチェック
      const isAlert = (newBid === minBid) && (adjustedROAS <= alertRoas);

      results.push({
        id: id,
        url: item['商品ページURL'] || '',
        currentBid: currentBid,
        adjustedROAS: Math.round(adjustedROAS * 100) / 100,
        adjustedClicks: adjustedClicks,
        adjustedCost: adjustedCost,
        adjustedSales: adjustedSales,
        ruleId: ruleId,
        adjustment: adjustment,
        newBid: newBid,
        isAlert: isAlert
      });
    }

    return { results, warnings };
  }
};
