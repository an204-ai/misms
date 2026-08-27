const cheerio = require('cheerio');

/**
 * Đảm bảo mọi phần tử trong <body> có data-eid.
 * CHỈ gắn thêm cho phần tử còn thiếu — TUYỆT ĐỐI không đổi số eid của phần tử đã có,
 * để không phá vỡ các phiên editor đang mở dở trên trình duyệt khác.
 * Trả về { html, changed } — changed=true nếu có gắn mới, cần ghi đè lại file.
 */
function ensureEidAssigned(html) {
  const $ = cheerio.load(html, { decodeEntities: false });

  let maxEid = -1;
  $('[data-eid]').each((_, el) => {
    const v = parseInt($(el).attr('data-eid'), 10);
    if (!isNaN(v) && v > maxEid) maxEid = v;
  });

  let nextEid = maxEid + 1;
  let changed = false;

  $('body *').each((_, el) => {
    if (!$(el).attr('data-eid')) {
      $(el).attr('data-eid', String(nextEid++));
      changed = true;
    }
  });

  if (!changed) return { html, changed: false };

  let finalHtml = $.html();
  if (!/^<!DOCTYPE html>/i.test(finalHtml)) {
    finalHtml = '<!DOCTYPE html>\n' + finalHtml;
  }
  return { html: finalHtml, changed: true };
}

module.exports = { ensureEidAssigned };
