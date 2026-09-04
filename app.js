/* =========================================================
 * 我的课表 - 轻量版
 * 数据保存在 localStorage，纯前端，无需联网
 * ========================================================= */
(function () {
  'use strict';

  /* ---------------- 常量与默认值 ---------------- */
  var STORE_KEY = 'my_timetable_v1';
  var DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  var PALETTE = ['#4c6ef5', '#12b886', '#fab005', '#fa5252', '#be4bdb', '#e649a5',
    '#339af0', '#22b8cf', '#40c057', '#82c91e', '#fd7e14', '#7048e8'];
  var WEEK_TYPES = { all: '每周', odd: '单周', even: '双周' };

  var DEFAULT_TIMES = [
    ['08:00', '08:45'], ['08:55', '09:40'], ['10:00', '10:45'], ['10:55', '11:40'],
    ['14:00', '14:45'], ['14:55', '15:40'], ['16:00', '16:45'], ['16:55', '17:40'],
    ['19:00', '19:45'], ['19:55', '20:40']
  ];

  function defaultData() {
    return {
      termName: '2026 秋季学期',
      termStart: '2026-09-01', // 该日所在周为第 1 周（单周）
      totalWeeks: 16,
      lessonLength: 45,
      showDays: 7,
      times: DEFAULT_TIMES.map(function (t) { return { start: t[0], end: t[1] }; }),
      courses: [
        { id: uid(), name: '高等数学', className: '计科 2301', teacher: '李明', day: 1, start: 1, end: 2, weekType: 'all', color: PALETTE[0] },
        { id: uid(), name: '大学英语', className: '计科 2301', teacher: '王芳', day: 2, start: 3, end: 4, weekType: 'all', color: PALETTE[1] },
        { id: uid(), name: '大学物理', className: '计科 2301', teacher: '张伟', day: 2, start: 5, end: 6, weekType: 'odd', color: PALETTE[4] },
        { id: uid(), name: '体育', className: '计科 2301', teacher: '刘洋', day: 3, start: 7, end: 8, weekType: 'all', color: PALETTE[2] },
        { id: uid(), name: '线性代数', className: '计科 2301', teacher: '陈晨', day: 4, start: 1, end: 2, weekType: 'even', color: PALETTE[5] },
        { id: uid(), name: '程序设计', className: '计科 2301', teacher: '赵磊', day: 5, start: 3, end: 5, weekType: 'odd', color: PALETTE[3] }
      ]
    };
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------------- 数据存储 ---------------- */
  var data = null;

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        data = JSON.parse(raw);
        // 兼容旧数据缺字段
        if (!data.times || !data.times.length) data.times = DEFAULT_TIMES.map(function (t) { return { start: t[0], end: t[1] }; });
        if (!data.courses) data.courses = [];
        if (!data.termStart) data.termStart = defaultData().termStart;
        if (!data.showDays) data.showDays = 7;
        if (data.totalWeeks === undefined) data.totalWeeks = 16;
        if (data.lessonLength === undefined) data.lessonLength = 45;
        return;
      }
    } catch (e) { /* ignore */ }
    data = defaultData();
    save();
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) {} }

  /* ---------------- 日期工具 ---------------- */
  function parseDate(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function fmtDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function addDays(d, n) { var r = new Date(d); r.setDate(r.getDate() + n); return r; }
  function startOfWeek(d) { // 周一为一周开始
    var r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var off = (r.getDay() + 6) % 7;
    r.setDate(r.getDate() - off);
    return r;
  }
  function weekDiff(a, b) { // a 的周一 与 b 的周一 相差周数
    var sa = startOfWeek(a).getTime(), sb = startOfWeek(b).getTime();
    return Math.round((sb - sa) / (7 * 86400000));
  }
  // 某日期属于第几周（1 起），由学期开始日期推算
  function weekIndexOf(d) {
    return weekDiff(parseDate(data.termStart), d) + 1;
  }
  function weekTotal() {
    var v = parseInt(data.totalWeeks, 10);
    if (!v || v < 1) return 16;
    return Math.min(v, 40);
  }
  function isOddWeek(idx) { return ((idx % 2) + 2) % 2 === 1; }
  // 学期第 w 周的周一（w 从 1 开始）
  function termMonday(w) {
    return addDays(startOfWeek(parseDate(data.termStart)), (w - 1) * 7);
  }
  // 学期最后一天（最后一周的周日）
  function termEndStr() {
    return fmtDate(addDays(termMonday(weekTotal()), 6));
  }
  // 课程在某一周是否上课：整学期 / 指定日期区间 × 每周 / 单周 / 双周
  function showsOnWeek(c, weekIdx) {
    if (typeof c.weekFrom === 'number' && weekIdx < c.weekFrom) return false; // 兼容旧版“第X~Y周”
    if (typeof c.weekTo === 'number' && weekIdx > c.weekTo) return false;
    if (c.dateFrom || c.dateTo) {
      if (!c.dateFrom || !c.dateTo) return false;
      var s = fmtDate(addDays(termMonday(weekIdx), c.day - 1)); // 该周“星期几”对应的日期
      if (s < c.dateFrom || s > c.dateTo) return false;
    }
    if (c.weekType === 'all') return true;
    if (c.weekType === 'odd') return isOddWeek(weekIdx);
    return !isOddWeek(weekIdx);
  }
  function courseVisible(c, weekIdx) {
    return weekIdx >= 1 && weekIdx <= weekTotal() && showsOnWeek(c, weekIdx);
  }

  /* ---------------- 全局 UI 状态 ---------------- */
  var viewDate = new Date();          // 当前查看的日期（任意一天，决定所在周）
  var todayStr = fmtDate(new Date());

  /* ---------------- DOM ---------------- */
  var $ = function (id) { return document.getElementById(id); };
  var el = {
    weekLabel: $('weekLabel'), weekRange: $('weekRange'), termName: $('termName'),
    daystrip: $('daystrip'), board: $('board'), emptyHint: $('emptyHint'), footNote: $('footNote'),
    formMask: $('formMask'), settingsMask: $('settingsMask'),
    formTitle: $('formTitle'), fName: $('fName'), fClass: $('fClass'), fTeacher: $('fTeacher'), fDay: $('fDay'),
    fStartSec: $('fStartSec'), fEndSec: $('fEndSec'), fWeekType: $('fWeekType'),
    fDateOn: $('fDateOn'), fDateFrom: $('fDateFrom'), fDateTo: $('fDateTo'), fDateLine: $('fDateLine'),
    fColor: $('fColor'),
    deleteCourse: $('deleteCourse'), sTermName: $('sTermName'), sTermStart: $('sTermStart'),
    sWeeks: $('sWeeks'), sLength: $('sLength'), sCount: $('sCount'),
    sDays: $('sDays'), timeList: $('timeList'), toast: $('toast')
  };

  /* ---------------- 渲染 ---------------- */
  function render() {
    var weekStart = startOfWeek(viewDate);
    var weekIdx = weekIndexOf(viewDate);
    var odd = isOddWeek(weekIdx);
    var tw = weekTotal();
    var inTerm = weekIdx >= 1 && weekIdx <= tw;

    el.termName.textContent = data.termName || '';
    var dateRange = monthDay(weekStart) + ' — ' + monthDay(addDays(weekStart, 6));
    var main, note = '';

    if (!inTerm) {
      if (weekIdx < 1) {
        main = '距开学还有 ' + (1 - weekIdx) + ' 周';
        note = '开学日期 ' + data.termStart + ' 为第 1 周 · 本学期共 ' + tw + ' 周';
      } else {
        main = '学期已结束';
        note = '本学期自 ' + data.termStart + ' 起共 ' + tw + ' 周 · 当前周已超出范围';
      }
    } else {
      var n = coursesInWeek(weekIdx).length;
      main = '第 ' + weekIdx + ' 周 / 共 ' + tw + ' 周';
      note = '本周共 ' + n + ' 节课 · 第 1 周按 ' + data.termStart + ' 推算单双周';
    }

    el.weekLabel.textContent = main;
    el.weekRange.textContent = inTerm ? ((odd ? '单周' : '双周') + ' · ' + dateRange) : dateRange;
    el.footNote.textContent = note;

    renderDayStrip(weekStart, weekIdx);
    renderBoard(weekStart, weekIdx);
  }

  function monthDay(d) {
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function renderDayStrip(weekStart, weekIdx) {
    var total = data.showDays || 7;
    var html = '';
    for (var i = 0; i < total; i++) {
      var d = addDays(weekStart, i);
      var s = fmtDate(d);
      var isToday = s === todayStr;
      var isSel = s === fmtDate(viewDate);
      var cls = 'day-cell';
      if (isToday) cls += ' today';
      if (isSel) cls += ' sel';
      if (weekIdx < 1 || weekIdx > weekTotal()) cls += ' off';
      html += '<div class="' + cls + '" data-date="' + s + '">' +
        '<span class="dw">周' + '日一二三四五六'[d.getDay()] + '</span>' +
        '<span class="dm">' + (d.getMonth() + 1) + '/' + d.getDate() + '</span></div>';
    }
    el.daystrip.innerHTML = html;
  }

  function showHint(html) {
    el.board.innerHTML = '';
    el.emptyHint.hidden = false;
    el.emptyHint.style.display = 'block';
    el.emptyHint.innerHTML = html;
  }
  function hideHint() {
    el.emptyHint.hidden = true;
    el.emptyHint.style.display = 'none';
  }

  function renderBoard(weekStart, weekIdx) {
    var total = data.showDays || 7;
    var times = data.times;
    var tw = weekTotal();
    var inTerm = weekIdx >= 1 && weekIdx <= tw;

    el.board.style.setProperty('--cols', total);

    if (!inTerm) {
      if (weekIdx < 1) showHint('学期还未开始<br>开学日期 <b>' + data.termStart + '</b> 为第 1 周');
      else showHint('已超出本学期范围<br>本学期共 <b>' + tw + '</b> 周');
      return;
    }
    if (!data.courses.length) {
      showHint('课表还是空的<br>点右下角 <b>＋</b> 添加第一节课吧');
      return;
    }
    var lessons = collectLessons(weekIdx);

    // 表头
    var head = '<tr><th class="corner">节次</th>';
    for (var d = 1; d <= total; d++) {
      var dateStr = fmtDate(addDays(weekStart, d - 1));
      var isTodayCol = dateStr === todayStr;
      head += '<th' + (isTodayCol ? ' class="col-today"' : '') + '>周' + '日一二三四五六'[(d % 7)] + '</th>';
    }
    head += '</tr>';

    // 建网格：grid[day][startSec] = course
    var grid = {};
    for (d = 1; d <= total; d++) grid[d] = {};
    lessons.forEach(function (c) {
      if (c.day >= 1 && c.day <= total && c.start >= 1) grid[c.day][c.start] = c;
    });

    function coveredBy(day, sec) {
      var cols = grid[day];
      for (var st in cols) {
        if (cols.hasOwnProperty(st) && +st < sec && cols[st].end >= sec) return true;
      }
      return false;
    }

    var body = '';
    for (var s = 1; s <= times.length; s++) {
      body += '<tr>';
      body += '<td class="time"><b>' + s + '</b>' + times[s - 1].start + '<br>' + times[s - 1].end + '</td>';
      for (d = 1; d <= total; d++) {
        var dateStr2 = fmtDate(addDays(weekStart, d - 1));
        var isToday2 = dateStr2 === todayStr;
        var c = grid[d][s];
        if (c) {
          var span = Math.min(c.end, times.length) - s + 1;
          body += '<td rowspan="' + span + '" class="cell' + (isToday2 ? ' col-today' : '') + '" data-day="' + d + '" data-sec="' + s + '">' + lessonHtml(c) + '</td>';
        } else if (!coveredBy(d, s)) {
          body += '<td class="cell empty' + (isToday2 ? ' col-today' : '') + '" data-day="' + d + '" data-sec="' + s + '"></td>';
        }
        // 已被上方 rowspan 占据则跳过不渲染
      }
      body += '</tr>';
    }

    el.board.innerHTML = '<thead>' + head + '</thead><tbody>' + body + '</tbody>';
    hideHint();
  }

  function lessonHtml(c) {
    var bg = hexToRgba(c.color, 0.14);
    var border = c.color;
    var html = '<div class="lesson" style="background:' + bg + ';box-shadow:inset 2px 0 0 ' + border + '" data-id="' + c.id + '">' +
      '<b>' + esc(c.name) + '</b>';
    if (c.className) html += '<i class="grp">' + esc(c.className) + '</i>';
    if (c.teacher) html += '<i class="tch">' + esc(c.teacher) + '</i>';
    html += '</div>';
    return html;
  }

  function coursesInWeek(weekIdx) {
    return data.courses.filter(function (c) {
      return c.day >= 1 && c.day <= (data.showDays || 7) && courseVisible(c, weekIdx) && c.start >= 1 && c.start <= data.times.length;
    });
  }
  function collectLessons(weekIdx) {
    return data.courses.filter(function (c) {
      return c.start >= 1 && c.start <= data.times.length && courseVisible(c, weekIdx);
    });
  }

  function hexToRgba(hex, a) {
    var h = hex.replace('#', '');
    var n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  /* ---------------- 页面滚动锁定（弹层打开时） ---------------- */
  function lockScroll() { document.body.style.overflow = 'hidden'; }
  function unlockScroll() { document.body.style.overflow = ''; }

  /* ---------------- 课程表单 ---------------- */
  var editingId = null;

  function buildDayChips(sel) {
    var labels = '日一二三四五六';
    var html = '';
    for (var i = 1; i <= 7; i++) {
      html += '<button type="button" data-v="' + i + '" class="' + (i === sel ? 'on' : '') + '">周' + labels[i % 7] + '</button>';
    }
    el.fDay.innerHTML = html;
  }

  function buildSecOptions() {
    var n = data.times.length;
    var opt = '';
    for (var i = 1; i <= n; i++) opt += '<option value="' + i + '">第 ' + i + ' 节</option>';
    el.fStartSec.innerHTML = opt;
    el.fEndSec.innerHTML = opt;
  }

  function openForm(course) {
    buildDayChips(course ? course.day : 1);
    buildSecOptions();

    el.formTitle.textContent = course ? '编辑课程' : '添加课程';
    el.fName.value = course ? course.name : '';
    el.fClass.value = course ? (course.className || '') : '';
    el.fTeacher.value = course ? (course.teacher || '') : '';
    el.fStartSec.value = course ? course.start : 1;
    syncEndOptions();
    if (course) el.fEndSec.value = course.end;
    el.fEndSec.value = el.fEndSec.value || el.fStartSec.value;

    // 指定日期区间（如 10月9日 ~ 10月29日）
    var dateOn = false;
    var dFrom = data.termStart, dTo = termEndStr();
    if (course) {
      if (course.dateFrom && course.dateTo) {
        dFrom = course.dateFrom; dTo = course.dateTo; dateOn = true;
      } else if (typeof course.weekFrom === 'number' || typeof course.weekTo === 'number') {
        // 兼容旧版“第 X~Y 周”：换算为该周的起止日期再编辑
        var wf = Math.max(1, parseInt(course.weekFrom, 10) || 1);
        var wl = Math.min(weekTotal(), Math.max(wf, parseInt(course.weekTo, 10) || weekTotal()));
        dFrom = fmtDate(termMonday(wf));
        dTo = fmtDate(addDays(termMonday(wl), 6));
        dateOn = true;
      }
    }
    el.fDateOn.checked = dateOn;
    el.fDateFrom.value = dFrom;
    el.fDateTo.value = dTo;
    el.fDateLine.hidden = !dateOn;

    // 周类型
    var wt = course ? course.weekType : 'all';
    [].forEach.call(el.fWeekType.querySelectorAll('button'), function (b) {
      b.classList.toggle('on', b.dataset.v === wt);
    });
    // 颜色
    buildPalette(course ? course.color : PALETTE[0]);

    editingId = course ? course.id : null;
    el.deleteCourse.hidden = !course;
    el.formMask.hidden = false;
    lockScroll();
    el.fName.focus();
  }
  function closeForm() { el.formMask.hidden = true; editingId = null; unlockScroll(); }

  function buildPalette(sel) {
    var isPreset = PALETTE.indexOf(sel) >= 0;
    el.fColor.innerHTML = PALETTE.map(function (c) {
      return '<button type="button" class="sw' + (c === sel ? ' on' : '') + '" data-c="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>';
    }).join('') +
      '<label class="sw pick' + (isPreset ? '' : ' on') + '" aria-label="自定义颜色">' +
      '<input type="color" value="' + (isPreset ? PALETTE[0] : sel) + '"></label>';
  }

  function syncEndOptions() {
    var s = parseInt(el.fStartSec.value, 10) || 1;
    var n = data.times.length;
    var cur = parseInt(el.fEndSec.value, 10) || s;
    var opt = '';
    for (var i = s; i <= n; i++) opt += '<option value="' + i + '">第 ' + i + ' 节</option>';
    el.fEndSec.innerHTML = opt;
    if (cur >= s && cur <= n) el.fEndSec.value = cur; else el.fEndSec.value = s;
  }

  function currentDaySel() {
    var b = el.fDay.querySelector('button.on');
    return b ? parseInt(b.dataset.v, 10) : 1;
  }
  function currentWeekType() {
    var b = el.fWeekType.querySelector('button.on');
    return b ? b.dataset.v : 'all';
  }
  function currentColor() {
    var on = el.fColor.querySelector('.sw.on');
    if (on) {
      var btn = on.dataset ? on.dataset.c : null;
      if (btn) return btn;
      var inp = on.querySelector('input[type="color"]');
      if (inp && inp.value) return inp.value;
    }
    return PALETTE[0];
  }

  function saveCourse() {
    var name = el.fName.value.trim();
    if (!name) { toast('请填写课程名称'); return; }
    var day = currentDaySel();
    var start = parseInt(el.fStartSec.value, 10);
    var end = parseInt(el.fEndSec.value, 10);
    if (end < start) { toast('结束节次不能早于开始'); return; }
    var wt = currentWeekType();
    var color = currentColor();
    var className = el.fClass.value.trim();
    var teacher = el.fTeacher.value.trim();

    // 指定日期区间（配合每周/单周/双周）
    var dateOn = el.fDateOn.checked;
    var dFrom = el.fDateFrom.value, dTo = el.fDateTo.value;
    if (dateOn) {
      if (!dFrom || !dTo) { toast('请选择开始与结束日期'); return; }
      if (dFrom > dTo) { toast('结束日期不能早于开始日期'); return; }
    }

    // 时间重叠检测（同一门课编辑时排除自身）
    var cand = { weekType: wt, day: day };
    if (dateOn) { cand.dateFrom = dFrom; cand.dateTo = dTo; }
    var clash = data.courses.some(function (c) {
      if (editingId && c.id === editingId) return false;
      if (c.day !== day) return false;
      if (c.start > end || c.end < start) return false;
      return weekOverlap(cand, c);
    });
    if (clash) { toast('该时段已有课程，请调整节次或周次'); return; }

    var rec = {
      id: editingId || uid(),
      name: name, className: className, teacher: teacher, day: day, start: start, end: end,
      weekType: wt, color: color
    };
    if (dateOn) { rec.dateFrom = dFrom; rec.dateTo = dTo; }
    if (editingId) {
      data.courses = data.courses.map(function (c) { return c.id === editingId ? rec : c; });
      toast('已保存修改');
    } else {
      data.courses.push(rec);
      toast('已添加「' + name + '」');
    }
    save();
    closeForm();
    render();
  }

  // 两门课是否存在至少一周同时上课（逐周判断，兼容日期区间 / 旧周次区间）
  function weekOverlap(a, b) {
    for (var w = 1; w <= weekTotal(); w++) {
      if (showsOnWeek(a, w) && showsOnWeek(b, w)) return true;
    }
    return false;
  }

  function deleteCourse() {
    var c = data.courses.find(function (x) { return x.id === editingId; });
    if (!c) return;
    if (!confirm('确定删除课程「' + c.name + '」吗？')) return;
    data.courses = data.courses.filter(function (x) { return x.id !== editingId; });
    save();
    closeForm();
    toast('已删除');
    render();
  }

  /* ---------------- 设置 ---------------- */
  function currentLen() {
    var v = parseInt(el.sLength.value, 10);
    if (!v || v < 20 || v > 180) v = data.lessonLength || 45;
    return v;
  }

  function openSettings() {
    el.sTermName.value = data.termName || '';
    el.sTermStart.value = data.termStart;
    el.sWeeks.value = weekTotal();
    el.sLength.value = data.lessonLength || 45;
    [].forEach.call(el.sDays.querySelectorAll('button'), function (b) {
      b.classList.toggle('on', parseInt(b.dataset.v, 10) === data.showDays);
    });
    renderTimeList();
    el.settingsMask.hidden = false;
    lockScroll();
  }
  function renderTimeList() {
    el.timeList.innerHTML = '';
    el.sCount.value = data.times.length;
    data.times.forEach(function (t, i) {
      var row = document.createElement('div');
      row.className = 'time-row';
      row.innerHTML =
        '<span class="n">第 ' + (i + 1) + ' 节</span>' +
        '<input type="time" value="' + t.start + '" data-idx="' + i + '" aria-label="上课时间">' +
        '<span class="to">→</span>' +
        '<span class="end">' + t.end + '</span>' +
        '<button class="del" data-idx="' + i + '" aria-label="删除该节次">✕</button>';
      el.timeList.appendChild(row);
    });
  }
  // 一键设置每日节数：多了就续排，少了则去掉末尾的节次
  function setTimeCount(n) {
    n = Math.max(1, Math.min(16, parseInt(n, 10) || 1));
    var cur = data.times.length;
    if (n > cur) {
      while (data.times.length < n) {
        if (data.times.length >= 16) break;
        var last = data.times[data.times.length - 1];
        var s = last ? last.end : '08:00';
        if (s === '23:59') break;
        data.times.push({ start: s, end: shiftTime(s, currentLen()) });
      }
      toast(data.times.length < n ? '最多只能排到 ' + data.times.length + ' 节（已到当天末尾）' : '已设为每日 ' + n + ' 节');
    } else if (n < cur) {
      data.times.length = n;
      toast('已设为每日 ' + n + ' 节');
    }
    renderTimeList();
  }
  function addTime() {
    if (data.times.length >= 16) { toast('节次最多 16 节'); return; }
    setTimeCount(data.times.length + 1);
  }
  function shiftTime(t, min) {
    var p = t.split(':').map(Number);
    var m = p[0] * 60 + p[1] + min;
    var h = Math.floor(m / 60);
    if (h >= 24) return '23:59';
    return String(h).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }

  // 把当前表格里每一节的“下课时间”按新时长重算
  function applyLen() {
    var len = currentLen();
    data.times.forEach(function (t) { t.end = shiftTime(t.start, len); });
    [].forEach.call(el.timeList.querySelectorAll('.time-row'), function (r) {
      var inp = r.querySelector('input[type="time"]');
      var lab = r.querySelector('.end');
      if (inp && lab && data.times[+inp.dataset.idx]) lab.textContent = data.times[+inp.dataset.idx].end;
    });
    toast('已按每节 ' + len + ' 分钟重算下课时间');
  }

  function saveSettings() {
    var name = el.sTermName.value.trim();
    var start = el.sTermStart.value;
    var weeks = parseInt(el.sWeeks.value, 10);
    var len = parseInt(el.sLength.value, 10);
    if (!start) { toast('请选择学期开始日期'); return; }
    if (!weeks || weeks < 1 || weeks > 40) { toast('学期周数请填写 1 ~ 40'); return; }
    if (!len || len < 20 || len > 180) { toast('每节时长请填写 20 ~ 180 分钟'); return; }
    data.termName = name;
    data.termStart = start;
    data.totalWeeks = weeks;
    data.lessonLength = len;

    // 读取节次“上课时间”，下课时间按时长自动生成
    var rows = el.timeList.querySelectorAll('.time-row');
    var times = [];
    var bad = false;
    [].forEach.call(rows, function (r, i) {
      var s = r.querySelector('input[type="time"]').value;
      if (!s) { bad = true; toast('请填写第 ' + (i + 1) + ' 节的上课时间'); return; }
      var e = shiftTime(s, len);
      if (e <= s) { bad = true; toast('第 ' + (i + 1) + ' 节时间超出当天范围'); return; }
      times.push({ start: s, end: e });
    });
    if (bad) return;
    data.times = times;

    // 节次变少时清理越界的课程
    var removed = 0;
    data.courses = data.courses.filter(function (c) {
      if (c.start > data.times.length) { removed++; return false; }
      if (c.end > data.times.length) c.end = data.times.length;
      return true;
    });

    // 显示天数
    var seg = el.sDays.querySelector('button.on');
    data.showDays = seg ? parseInt(seg.dataset.v, 10) : 7;

    save();
    el.settingsMask.hidden = true;
    unlockScroll();
    toast(removed ? '设置已保存（清理了 ' + removed + ' 节超范围课程）' : '设置已保存');
    render();
  }

  function clearAllCourses() {
    if (!data.courses.length) { toast('课表已经是空的'); return; }
    if (!confirm('确定清空全部课程吗？此操作不可恢复。')) return;
    data.courses = [];
    save();
    el.settingsMask.hidden = true;
    unlockScroll();
    toast('已清空课表');
    render();
  }

  /* ---------------- 交互绑定 ---------------- */
  function bind() {
    // 周导航
    $('prevWeek').addEventListener('click', function () { viewDate = addDays(viewDate, -7); render(); });
    $('nextWeek').addEventListener('click', function () { viewDate = addDays(viewDate, 7); render(); });
    $('goToday').addEventListener('click', function () { viewDate = new Date(); render(); });
    $('weekPick').addEventListener('click', function () { $('datePicker').showPicker ? $('datePicker').showPicker() : $('datePicker').click(); });
    $('datePicker').addEventListener('change', function () {
      if (this.value) { viewDate = parseDate(this.value); render(); }
    });
    // 日期条点击
    el.daystrip.addEventListener('click', function (e) {
      var cell = e.target.closest('.day-cell');
      if (cell) { viewDate = parseDate(cell.dataset.date); render(); }
    });

    // 课表点击：空单元 -> 预填添加；课程 -> 编辑
    el.board.addEventListener('click', function (e) {
      var lesson = e.target.closest('.lesson');
      var cell = e.target.closest('.cell');
      if (lesson) {
        var c = data.courses.find(function (x) { return x.id === lesson.dataset.id; });
        if (c) openForm(c);
      } else if (cell) {
        var day = parseInt(cell.dataset.day, 10);
        var sec = parseInt(cell.dataset.sec, 10);
        if (day >= 1 && day <= (data.showDays || 7) && sec >= 1 && sec <= data.times.length) {
          openForm({ name: '', className: '', teacher: '', day: day, start: sec, end: sec, weekType: 'all', color: PALETTE[0], id: null });
        }
      }
    });

    // 表单
    el.fDay.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      [].forEach.call(el.fDay.children, function (x) { x.classList.remove('on'); });
      b.classList.add('on');
    });
    el.fWeekType.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      [].forEach.call(el.fWeekType.children, function (x) { x.classList.remove('on'); });
      b.classList.add('on');
    });
    el.fColor.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      [].forEach.call(el.fColor.children, function (x) { x.classList.remove('on'); });
      b.classList.add('on');
    });
    // 自定义取色：选好颜色后把高亮切到“取色”按钮上
    el.fColor.addEventListener('change', function (e) {
      if (!e.target || e.target.type !== 'color') return;
      var lbl = e.target.closest('label');
      [].forEach.call(el.fColor.children, function (x) { x.classList.remove('on'); });
      if (lbl) lbl.classList.add('on');
    });
    el.fStartSec.addEventListener('change', syncEndOptions);
    // 日期区间开关与联动（结束日期不低于开始日期）
    el.fDateOn.addEventListener('change', function () { el.fDateLine.hidden = !el.fDateOn.checked; });
    el.fDateFrom.addEventListener('change', function () {
      if (el.fDateTo.value && el.fDateFrom.value > el.fDateTo.value) el.fDateTo.value = el.fDateFrom.value;
    });
    el.fDateTo.addEventListener('change', function () {
      if (el.fDateFrom.value && el.fDateTo.value < el.fDateFrom.value) el.fDateFrom.value = el.fDateTo.value;
    });
    $('closeForm').addEventListener('click', closeForm);
    el.formMask.addEventListener('click', function (e) { if (e.target === el.formMask) closeForm(); });
    $('saveCourse').addEventListener('click', saveCourse);
    $('deleteCourse').addEventListener('click', deleteCourse);
    $('fabAdd').addEventListener('click', function () { openForm(null); });

    // 设置
    $('openSettings').addEventListener('click', openSettings);
    $('closeSettings').addEventListener('click', function () { el.settingsMask.hidden = true; unlockScroll(); });
    el.settingsMask.addEventListener('click', function (e) { if (e.target === el.settingsMask) { el.settingsMask.hidden = true; unlockScroll(); } });
    el.sDays.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      [].forEach.call(el.sDays.children, function (x) { x.classList.remove('on'); });
      b.classList.add('on');
    });
    $('addTime').addEventListener('click', addTime);
    $('applyLen').addEventListener('click', applyLen);
    el.timeList.addEventListener('click', function (e) {
      var del = e.target.closest('button.del');
      if (!del) return;
      var idx = parseInt(del.dataset.idx, 10);
      if (data.times.length <= 1) { toast('至少保留 1 节'); return; }
      data.times.splice(idx, 1);
      renderTimeList();
    });
    // 填写“上课时间”后，下课时间自动延展（= 上课时间 + 每节时长）
    el.timeList.addEventListener('input', function (e) {
      var t = e.target.closest('input[type="time"]');
      if (!t || !t.value) return;
      var idx = parseInt(t.dataset.idx, 10);
      if (!data.times[idx]) return;
      data.times[idx].start = t.value;
      data.times[idx].end = shiftTime(t.value, currentLen());
      var lab = t.closest('.time-row').querySelector('.end');
      if (lab) lab.textContent = data.times[idx].end;
    });
    // 步进按钮（按 data-for 指向对应输入框）
    [].forEach.call(document.querySelectorAll('.step'), function (b) {
      b.addEventListener('click', function () {
        var inp = $(b.dataset.for);
        if (!inp) return;
        var min = parseInt(inp.min, 10) || 1;
        var max = parseInt(inp.max, 10) || 99;
        var v = (parseInt(inp.value, 10) || min) + parseInt(b.dataset.d, 10);
        if (v < min) v = min;
        if (v > max) v = max;
        inp.value = v;
        if (inp.id === 'sCount') setTimeCount(v);
      });
    });
    // 直接输入每日节数后生效（失焦 / 回车时）
    el.sCount.addEventListener('change', function () { setTimeCount(el.sCount.value); });
    $('saveSettings').addEventListener('click', saveSettings);
    $('clearAll').addEventListener('click', clearAllCourses);

    // 键盘回车在课程名输入框保存
    el.fName.addEventListener('keydown', function (e) { if (e.key === 'Enter') saveCourse(); });
    // Esc 关闭弹层
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!el.settingsMask.hidden) { el.settingsMask.hidden = true; unlockScroll(); }
      else if (!el.formMask.hidden) { el.formMask.hidden = true; editingId = null; unlockScroll(); }
    });
  }

  /* ---------------- Toast ---------------- */
  var toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.hidden = true; }, 1600);
  }

  /* ---------------- PWA / 启动 ---------------- */
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:/.test(location.protocol)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    });
  }

  function boot() {
    load();
    bind();
    registerSW();
    render();
  }
  document.addEventListener('DOMContentLoaded', boot);
})();
