(function () {
  'use strict';

  // 🔴 版を あげるときは sw.js の CACHE（kids-points-v◯）と いっしょに かえる
  var VERSION = 'v2';
  var app = document.getElementById('app');
  var KEY = 'pc-data';

  // ---------- ほぞん（この iPad の なかだけ） ----------
  function defaults() {
    return {
      v: 1,
      pinHash: null,
      yenPerPoint: 10,
      acts: [
        { id: 'help', icon: '🧹', name: 'おてつだい', unit: 'かい', pts: 1, steps: [1, 2, 3] },
        { id: 'kumon', icon: '📚', name: 'くもんの しゅくだい', unit: 'ぷん', per: 10, pts: 1, steps: [10, 20, 30, 40] },
      ],
      rewards: [{ id: 'r1', icon: '🏎️', name: 'マリオカート8 ついかパック', yen: 3000 }],
      entries: [],
      seen: 0,
    };
  }
  function load() {
    try { var d = JSON.parse(localStorage.getItem(KEY)); if (d && d.v) return d; } catch (e) {}
    return defaults();
  }
  var D = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { toast('ほぞんできませんでした'); } }

  // ---------- 小道具 ----------
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'onclick') el.addEventListener('click', attrs[k]);
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function screen(nodes) { app.innerHTML = ''; nodes.forEach(function (n) { if (n) app.appendChild(n); }); window.scrollTo(0, 0); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function when(t) { var d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2); }
  function toast(msg) {
    var t = h('div', { class: 'toast', text: msg });
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  function confetti() {
    var em = ['⭐', '🪙', '🎉', '✨', '🌟'];
    for (var j = 0; j < 36; j++) {
      var c = h('div', { class: 'confetti', text: em[Math.floor(Math.random() * em.length)] });
      c.style.left = Math.random() * 100 + 'vw';
      c.style.animationDuration = (2 + Math.random() * 2) + 's';
      c.style.animationDelay = (Math.random() * 0.6) + 's';
      document.body.appendChild(c);
      setTimeout(function (el) { return function () { el.remove(); }; }(c), 5000);
    }
  }
  function modal(nodes) {
    var m = h('div', { class: 'modal' }, [h('div', { class: 'card' }, nodes)]);
    document.body.appendChild(m);
    return { close: function () { m.remove(); }, el: m };
  }

  // ---------- けいさん ----------
  function total() { return D.entries.reduce(function (s, e) { return s + (e.status === 'ok' ? e.pts : 0); }, 0); }
  function pendingPts() { return D.entries.reduce(function (s, e) { return s + (e.status === 'wait' ? e.pts : 0); }, 0); }
  function rewardPts(r) { return Math.ceil(r.yen / (D.yenPerPoint || 1)); }
  function actPts(a, step) { return a.per ? Math.floor(step / a.per) * a.pts : step * a.pts; }

  // ---------- こどもの がめん ----------
  function home() {
    var tot = total(), wait = pendingPts();
    var goal = D.rewards[0];
    var pending = D.entries.filter(function (e) { return e.status === 'wait'; });
    var recent = D.entries.filter(function (e) { return e.status !== 'wait'; }).slice(-5).reverse();
    screen([
      h('div', { class: 'top' }, [h('h1', { text: '🪙 ポイントちょきん' }), h('button', { class: 'pill', text: '🔒 おうちのひと', onclick: parentGate })]),
      h('div', { class: 'panel total' }, [
        h('div', { class: 'lbl', text: 'いまの ポイント' }),
        h('div', { class: 'num', html: tot + '<small>ポイント</small>' }),
        wait ? h('div', { class: 'wait', text: '⏳ OK まち ' + wait + ' ポイント' }) : null,
      ]),
      goal ? goalPanel(goal, tot) : null,
      h('div', { class: 'acts' }, D.acts.map(function (a) {
        var ds = a.per ? a.per + a.unit + 'で ' + a.pts + 'ポイント' : '1' + a.unit + 'で ' + a.pts + 'ポイント';
        return h('button', { class: 'act', onclick: function () { ask(a); } }, [
          h('div', { class: 'ic', text: a.icon }), h('div', { class: 'nm', text: a.name + ' した！' }), h('div', { class: 'ds', text: ds }),
        ]);
      })),
      pending.length ? h('div', { class: 'panel' }, [
        h('h2', { text: '⏳ おうちのひとの OK まち' }),
        h('div', { class: 'list' }, pending.map(entryRow)),
        h('p', { class: 'note', style: 'margin:8px 0 0', text: 'おうちのひとに「みて！」って いってね' }),
      ]) : null,
      h('div', { class: 'panel' }, [
        h('h2', { text: '📒 さいきんの きろく' }),
        recent.length ? h('div', { class: 'list' }, recent.map(entryRow)) : h('div', { class: 'empty', text: 'まだ ないよ。おてつだいや しゅくだいを したら ボタンを おしてね' }),
        D.entries.length > 5 ? h('div', { style: 'text-align:center;margin-top:10px' }, [h('button', { class: 'btn sm', text: 'ぜんぶ みる', onclick: historyScreen })]) : null,
      ]),
      versionNote(),
    ]);
    celebrate();
  }
  function goalPanel(goal, tot) {
    var need = rewardPts(goal), pct = Math.min(100, Math.round(tot / need * 100));
    return h('div', { class: 'panel goal' }, [
      h('div', { class: 'ic', text: goal.icon }),
      h('div', { class: 'body' }, [
        h('div', { class: 'nm', text: '🎯 ' + goal.name }),
        h('div', { class: 'bar' }, [h('i', { style: 'width:' + pct + '%' })]),
        h('div', { class: 'rest', html: tot >= need ? '🎉 こうかん できるよ！ おうちのひとに いってね' : 'あと <b>' + (need - tot) + '</b> ポイント（' + tot + ' / ' + need + '）' }),
      ]),
    ]);
  }
  function entryRow(e) {
    var cls = e.status === 'wait' ? 'wait' : e.status === 'ng' ? 'ng' : e.pts < 0 ? 'minus' : 'plus';
    var st = e.status === 'wait' ? '⏳ OK まち' : e.status === 'ng' ? 'こんかいは なし' : '';
    return h('div', { class: 'row' }, [
      h('div', { class: 'ic', text: e.icon }),
      h('div', { class: 'tx', html: esc(e.name) + '<small>' + when(e.t) + (st ? '　' + st : '') + (e.memo ? '　' + esc(e.memo) : '') + '</small>' }),
      h('div', { class: 'pt ' + cls, text: (e.pts > 0 ? '+' : '') + e.pts }),
    ]);
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // こどもが ボタンを おしたとき：どれくらい やったか えらんで おくる
  function ask(a) {
    var pick = a.steps[0];
    var choices = h('div', { class: 'choices' });
    function draw() {
      choices.innerHTML = '';
      a.steps.forEach(function (s) {
        choices.appendChild(h('button', { class: 'choice' + (s === pick ? ' on' : ''), text: s + a.unit, onclick: function () { pick = s; draw(); upd(); } }));
      });
    }
    var info = h('div', { style: 'font-size:22px;margin-bottom:12px' });
    function upd() { info.innerHTML = '<b style="font-size:32px;color:var(--gold-d)">+' + actPts(a, pick) + '</b> ポイント'; }
    var m = modal([
      h('div', { class: 'big', text: a.icon }),
      h('div', { class: 'q', text: a.per ? 'なんぷん やった？' : 'なんかい やった？' }),
      choices, info,
      h('div', { class: 'btns', style: 'justify-content:center' }, [
        h('button', { class: 'btn', text: 'やめる', onclick: function () { m.close(); } }),
        h('button', { class: 'btn go', text: '📮 おくる！', onclick: function () {
          var pts = actPts(a, pick);
          if (pts <= 0) return;
          D.entries.push({ id: uid(), t: Date.now(), kind: 'act', act: a.id, icon: a.icon, name: a.name + '（' + pick + a.unit + '）', pts: pts, status: 'wait' });
          save(); m.close(); home();
          toast('おくったよ！ おうちのひとに OK を もらってね');
        } }),
      ]),
    ]);
    draw(); upd();
  }

  // しょうにんされた ポイントを、つぎに みたとき おいわい する
  function celebrate() {
    var news = D.entries.filter(function (e) { return e.status === 'ok' && e.pts > 0 && (e.decidedAt || 0) > (D.seen || 0); });
    D.seen = Date.now(); save();
    if (!news.length) return;
    var sum = news.reduce(function (s, e) { return s + e.pts; }, 0);
    confetti();
    var m = modal([
      h('div', { class: 'big', text: '🎉' }),
      h('div', { class: 'q', html: 'やったね！<br><span style="font-size:44px;color:var(--gold-d)">+' + sum + ' ポイント</span><br>もらえたよ' }),
      h('button', { class: 'btn go wide', text: 'うれしい！', onclick: function () { m.close(); } }),
    ]);
  }

  function historyScreen() {
    var all = D.entries.slice().reverse();
    screen([
      h('div', { class: 'top' }, [h('button', { class: 'pill', text: '← もどる', onclick: home }), h('h1', { text: '📒 ぜんぶの きろく' })]),
      h('div', { class: 'panel' }, [all.length ? h('div', { class: 'list' }, all.map(entryRow)) : h('div', { class: 'empty', text: 'まだ ないよ' })]),
    ]);
  }

  // ---------- あんしょうばんごう ----------
  function hash(pin) {
    var data = new TextEncoder().encode('kids-points:' + pin);
    return crypto.subtle.digest('SHA-256', data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }
  function pinPad(title, onDone, onCancel) {
    var typed = '';
    var dots = h('div', { class: 'dots' }), err = h('div', { class: 'err' });
    function drawDots() { dots.innerHTML = ''; for (var i = 0; i < 4; i++) dots.appendChild(h('i', { class: i < typed.length ? 'on' : '' })); }
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'cancel', '0', 'del'];
    var m = modal([
      h('div', { class: 'q', text: title }), dots, err,
      h('div', { class: 'pad' }, keys.map(function (k) {
        return h('button', { class: 'key' + (k === 'cancel' || k === 'del' ? ' sub' : ''), text: k === 'cancel' ? 'やめる' : k === 'del' ? 'けす' : k, onclick: function () {
          if (k === 'cancel') { m.close(); if (onCancel) onCancel(); return; }
          if (k === 'del') typed = typed.slice(0, -1);
          else if (typed.length < 4) typed += k;
          drawDots();
          if (typed.length === 4) {
            var v = typed;
            setTimeout(function () {
              onDone(v, {
                close: m.close,
                retry: function (msg) { typed = ''; drawDots(); err.textContent = msg || ''; },
              });
            }, 120);
          }
        } });
      })),
    ]);
    drawDots();
  }
  function parentGate() {
    if (!window.crypto || !crypto.subtle) { toast('この がめんでは あんしょうばんごうが つかえません'); return; }
    if (!D.pinHash) return setupPin(parentHome);
    pinPad('🔒 おうちのひと の あんしょうばんごう', function (v, p) {
      hash(v).then(function (hv) {
        if (hv === D.pinHash) { p.close(); parentHome(); }
        else p.retry('ちがいます');
      });
    });
  }
  function setupPin(next) {
    pinPad('あたらしい あんしょうばんごう（4けた）', function (v1, p1) {
      p1.close();
      pinPad('もういちど いれてください', function (v2, p2) {
        if (v1 !== v2) { p2.retry('さいしょと ちがいます。もういちど'); return; }
        hash(v1).then(function (hv) { D.pinHash = hv; save(); p2.close(); toast('あんしょうばんごうを きめました'); next(); });
      });
    });
  }

  // ---------- おうちのひとの がめん ----------
  function parentHome() {
    var pending = D.entries.filter(function (e) { return e.status === 'wait'; });
    var tot = total();
    screen([
      h('div', { class: 'top' }, [h('button', { class: 'pill', text: '🔓 おわる', onclick: home }), h('h1', { text: 'おうちのひと' })]),
      h('div', { class: 'panel' }, [
        h('h2', { text: '✅ しょうにん（' + pending.length + 'けん）' }),
        pending.length ? h('div', { class: 'list' }, pending.map(function (e) {
          return h('div', { class: 'row' }, [
            h('div', { class: 'ic', text: e.icon }),
            h('div', { class: 'tx', html: esc(e.name) + '<small>' + when(e.t) + '</small>' }),
            h('div', { class: 'pt wait', text: '+' + e.pts }),
            h('button', { class: 'btn sm ok', text: 'OK', onclick: function () { decide(e, 'ok'); } }),
            h('button', { class: 'btn sm ng', text: 'なし', onclick: function () { decide(e, 'ng'); } }),
          ]);
        })) : h('div', { class: 'empty', text: 'OK まちは ありません' }),
        pending.length > 1 ? h('div', { style: 'margin-top:12px' }, [h('button', { class: 'btn ok wide', text: 'ぜんぶ OK', onclick: function () {
          pending.forEach(function (e) { e.status = 'ok'; e.decidedAt = Date.now(); }); save(); parentHome();
        } })]) : null,
      ]),
      h('div', { class: 'panel' }, [
        h('h2', { text: '🎁 ごほうびと こうかん（いま ' + tot + ' ポイント）' }),
        h('div', { class: 'list' }, D.rewards.map(function (r) {
          var need = rewardPts(r);
          return h('div', { class: 'row' }, [
            h('div', { class: 'ic', text: r.icon }),
            h('div', { class: 'tx', html: esc(r.name) + '<small>' + need + ' ポイント（' + r.yen.toLocaleString() + '円）</small>' }),
            h('button', { class: 'btn sm go', text: 'こうかん', disabled: tot < need ? 'disabled' : false, onclick: function () {
              if (tot < need || !confirm(r.name + ' と ' + need + ' ポイントを こうかんしますか？')) return;
              D.entries.push({ id: uid(), t: Date.now(), kind: 'reward', icon: r.icon, name: r.name + ' と こうかん', pts: -need, status: 'ok', decidedAt: Date.now() });
              save(); confetti(); parentHome();
            } }),
          ]);
        })),
      ]),
      h('div', { class: 'panel' }, [
        h('h2', { text: '✏️ ポイントを てで ふやす・へらす' }),
        adjustForm(),
      ]),
      h('div', { class: 'panel' }, [
        h('h2', { text: '⚙️ せってい' }),
        h('div', { class: 'btns' }, [
          h('button', { class: 'btn sm', text: 'ポイントの もらえかた', onclick: editActs }),
          h('button', { class: 'btn sm', text: 'ごほうび', onclick: editRewards }),
          h('button', { class: 'btn sm', text: 'あんしょうばんごう', onclick: function () { setupPin(parentHome); } }),
          h('button', { class: 'btn sm', text: '💾 バックアップ', onclick: exportData }),
          h('button', { class: 'btn sm', text: '📂 よみこみ', onclick: importData }),
        ]),
        h('p', { class: 'note', style: 'text-align:left', text: 'きろくは この iPad の なかだけに あります。アプリを けすと きえるので、ときどき バックアップ してください。' }),
      ]),
    ]);
  }
  function decide(e, st) { e.status = st; e.decidedAt = Date.now(); save(); parentHome(); }
  function adjustForm() {
    var n = h('input', { class: 'num', type: 'number', inputmode: 'numeric', value: '1' });
    var memo = h('input', { class: 'nm', type: 'text', placeholder: 'りゆう（れい：ボーナス）' });
    function add(sign) {
      var v = Math.abs(parseInt(n.value, 10) || 0);
      if (!v) return;
      D.entries.push({ id: uid(), t: Date.now(), kind: 'adjust', icon: sign > 0 ? '🎁' : '✏️', name: memo.value.trim() || (sign > 0 ? 'ボーナス' : 'ちょうせい'), pts: sign * v, status: 'ok', decidedAt: Date.now() });
      save(); parentHome();
    }
    return h('div', {}, [
      h('div', { class: 'field' }, [n, h('label', { text: 'ポイント' }), memo]),
      h('div', { class: 'btns' }, [h('button', { class: 'btn sm ok', text: '＋ ふやす', onclick: function () { add(1); } }), h('button', { class: 'btn sm ng', text: '− へらす', onclick: function () { add(-1); } })]),
    ]);
  }

  // ポイントの もらえかた（なまえ・アイコン・なんポイント）
  function editActs() {
    var rows = D.acts.map(function (a) {
      var ic = h('input', { class: 'ic', value: a.icon }), nm = h('input', { class: 'nm', value: a.name });
      var per = a.per ? h('input', { class: 'num', type: 'number', inputmode: 'numeric', value: a.per }) : null;
      var pts = h('input', { class: 'num', type: 'number', inputmode: 'numeric', value: a.pts });
      return { a: a, ic: ic, nm: nm, per: per, pts: pts, node: h('div', { class: 'field' }, [ic, nm, per, per ? h('label', { text: a.unit + 'で' }) : h('label', { text: '1' + a.unit + 'で' }), pts, h('label', { text: 'ポイント' })]) };
    });
    var newIc = h('input', { class: 'ic', value: '⭐' }), newNm = h('input', { class: 'nm', placeholder: 'あたらしく ふやす（れい：はみがき）' }), newPts = h('input', { class: 'num', type: 'number', inputmode: 'numeric', value: '1' });
    screen([
      h('div', { class: 'top' }, [h('button', { class: 'pill', text: '← もどる', onclick: parentHome }), h('h1', { text: 'ポイントの もらえかた' })]),
      h('div', { class: 'panel' }, rows.map(function (r) { return r.node; }).concat([
        h('h2', { style: 'margin-top:16px', text: '➕ ふやす（1かいで ◯ポイント）' }),
        h('div', { class: 'field' }, [newIc, newNm, newPts, h('label', { text: 'ポイント' })]),
        h('button', { class: 'btn go wide', text: 'ほぞん', onclick: function () {
          rows.forEach(function (r) {
            r.a.icon = r.ic.value.trim() || r.a.icon; r.a.name = r.nm.value.trim() || r.a.name;
            if (r.per) r.a.per = Math.max(1, parseInt(r.per.value, 10) || r.a.per);
            r.a.pts = Math.max(1, parseInt(r.pts.value, 10) || r.a.pts);
            if (r.a.per) r.a.steps = [1, 2, 3, 4].map(function (k) { return k * r.a.per; });
          });
          if (newNm.value.trim()) D.acts.push({ id: uid(), icon: newIc.value.trim() || '⭐', name: newNm.value.trim(), unit: 'かい', pts: Math.max(1, parseInt(newPts.value, 10) || 1), steps: [1, 2, 3] });
          save(); toast('ほぞんしました'); parentHome();
        } }),
      ])),
      h('p', { class: 'note', text: 'けしたい ものが あったら おしえてください（いまは けせない つくりです。まちがって けさないため）' }),
    ]);
  }
  function editRewards() {
    var yen = h('input', { class: 'num', type: 'number', inputmode: 'numeric', value: D.yenPerPoint });
    var rows = D.rewards.map(function (r) {
      var ic = h('input', { class: 'ic', value: r.icon }), nm = h('input', { class: 'nm', value: r.name }), y = h('input', { class: 'num', type: 'number', inputmode: 'numeric', value: r.yen });
      return { r: r, ic: ic, nm: nm, y: y, node: h('div', { class: 'field' }, [ic, nm, y, h('label', { text: '円' })]) };
    });
    var newIc = h('input', { class: 'ic', value: '🎁' }), newNm = h('input', { class: 'nm', placeholder: 'あたらしい ごほうび' }), newY = h('input', { class: 'num', type: 'number', inputmode: 'numeric', value: '500' });
    screen([
      h('div', { class: 'top' }, [h('button', { class: 'pill', text: '← もどる', onclick: parentHome }), h('h1', { text: 'ごほうび' })]),
      h('div', { class: 'panel' }, [
        h('div', { class: 'field' }, [h('label', { text: '1ポイント ＝' }), yen, h('label', { text: '円' })]),
        h('h2', { style: 'margin-top:16px', text: 'ごほうび（いちばん うえが こどもの がめんの 🎯 に でます）' }),
      ].concat(rows.map(function (r) { return r.node; })).concat([
        h('h2', { style: 'margin-top:16px', text: '➕ ふやす' }),
        h('div', { class: 'field' }, [newIc, newNm, newY, h('label', { text: '円' })]),
        h('button', { class: 'btn go wide', text: 'ほぞん', onclick: function () {
          D.yenPerPoint = Math.max(1, parseInt(yen.value, 10) || D.yenPerPoint);
          rows.forEach(function (x) { x.r.icon = x.ic.value.trim() || x.r.icon; x.r.name = x.nm.value.trim() || x.r.name; x.r.yen = Math.max(1, parseInt(x.y.value, 10) || x.r.yen); });
          if (newNm.value.trim()) D.rewards.push({ id: uid(), icon: newIc.value.trim() || '🎁', name: newNm.value.trim(), yen: Math.max(1, parseInt(newY.value, 10) || 500) });
          save(); toast('ほぞんしました'); parentHome();
        } }),
      ])),
    ]);
  }

  // ---------- バックアップ ----------
  function exportData() {
    var d = new Date(), name = 'points-backup-' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '.json';
    var text = JSON.stringify(D, null, 1);
    try {
      var file = new File([text], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: name }).catch(function () {});
        return;
      }
    } catch (e) {}
    var a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name });
    document.body.appendChild(a); a.click(); a.remove();
  }
  function importData() {
    var inp = h('input', { type: 'file', accept: '.json,application/json' });
    inp.addEventListener('change', function () {
      var f = inp.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var d = JSON.parse(rd.result);
          if (!d || !d.v || !Array.isArray(d.entries)) throw 0;
          if (!confirm('いまの きろくを、この ファイルの なかみで おきかえますか？')) return;
          D = d; save(); toast('よみこみました'); parentHome();
        } catch (e) { alert('この ファイルは よみこめません'); }
      };
      rd.readAsText(f);
    });
    inp.click();
  }

  // ---------- ばん ----------
  function versionNote() {
    var saved = h('span', { text: '' }), tries = 0;
    function check() {
      if (!document.body.contains(saved) && tries) return;
      try {
        caches.keys().then(function (ks) {
          var k = ks.filter(function (x) { return /^kids-points-/.test(x); }).map(function (x) { return x.replace('kids-points-', ''); });
          saved.textContent = k.length ? '／ ほぞん ' + k.join(',') : navigator.onLine ? '／ ほぞん ちゅう…' : '／ ほぞん なし';
          if (!k.length && tries++ < 30) setTimeout(check, 1000);
          else if (!k.length) saved.textContent = '／ ほぞん なし';
        });
      } catch (e) {}
    }
    check();
    return h('p', { class: 'note', style: 'font-size:13px' }, ['ばん ' + VERSION + ' ', saved]);
  }

  home();
})();
