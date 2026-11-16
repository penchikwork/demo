/* Удобства, общие для всех демо-сайтов (один файл, копируется в каждую папку, как style.css):
   — липкое меню разделов с подсветкой текущего;
   — поиск по прайсу;
   — тап по строке прайса подставляет услугу в форму записи;
   — «Яндекс Карты» и «Скопировать адрес» в контактах;
   — фокус не уходит из окна «Заявка готова».
   Без скрипта сайт работает как раньше. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var smooth = reduce ? 'auto' : 'smooth';

  /* ---------- Всплывающая подсказка ---------- */
  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }

  function copyText(text, okMsg) {
    var done = function () { toast(okMsg); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else fallback();
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) done();
      } catch (e) {}
    }
  }

  /* ---------- Липкое меню разделов ---------- */
  var labels = { booking: 'Запись', prices: 'Цены', steps: 'Как проходит', reviews: 'Отзывы', faq: 'Вопросы', contacts: 'Контакты' };
  var bar = document.querySelector('.demo-bar');
  var hero = document.querySelector('.hero');
  var sections = [].slice.call(document.querySelectorAll('main > section[id]')).filter(function (s) { return labels[s.id]; });
  var nav, links = [];

  function setStickyH() {
    var h = (bar ? bar.offsetHeight : 0) + (nav ? nav.offsetHeight : 0);
    root.style.setProperty('--bar-h', (bar ? bar.offsetHeight : 0) + 'px');
    root.style.setProperty('--sticky-h', h + 'px');
  }

  if (sections.length > 2) {
    nav = document.createElement('nav');
    nav.className = 'secnav';
    nav.setAttribute('aria-label', 'Разделы страницы');
    var inner = document.createElement('div');
    inner.className = 'secnav__in';
    sections.forEach(function (s) {
      var a = document.createElement('a');
      a.href = '#' + s.id;
      a.textContent = labels[s.id];
      inner.appendChild(a);
      links.push(a);
    });
    nav.appendChild(inner);
    (bar || document.body.firstChild).insertAdjacentElement(bar ? 'afterend' : 'beforebegin', nav);

    var active = -1;
    var spyQueued = false;
    function spy() {
      spyQueued = false;
      var heroBottom = hero ? hero.getBoundingClientRect().bottom : 0;
      var show = heroBottom < (bar ? bar.offsetHeight : 0) + 8;
      nav.classList.toggle('is-shown', show);
      var line = (parseFloat(getComputedStyle(root).getPropertyValue('--sticky-h')) || 100) + 90;
      var idx = -1;
      for (var i = 0; i < sections.length; i++) if (sections[i].getBoundingClientRect().top <= line) idx = i;
      /* в самом низу страницы подсвечиваем последний раздел */
      if (innerHeight + scrollY >= root.scrollHeight - 4) idx = sections.length - 1;
      if (idx !== active) {
        if (links[active]) { links[active].classList.remove('is-active'); links[active].removeAttribute('aria-current'); }
        active = idx;
        if (links[idx]) {
          links[idx].classList.add('is-active');
          links[idx].setAttribute('aria-current', 'true');
          var a = links[idx];
          var left = a.offsetLeft - (inner.clientWidth - a.offsetWidth) / 2;
          inner.scrollTo({ left: Math.max(0, left), behavior: smooth });
        }
      }
    }
    function onScroll() { if (!spyQueued) { spyQueued = true; requestAnimationFrame(spy); } }
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', function () { setStickyH(); onScroll(); });
    addEventListener('load', function () { setStickyH(); spy(); });
    setStickyH();
    spy();
  } else {
    setStickyH();
  }

  /* ---------- Прайс: поиск и запись по тапу ---------- */
  var prices = document.getElementById('prices');
  var form = document.getElementById('bform');
  var bookingSec = document.getElementById('booking');
  var select = form && form.elements.service;

  function norm(s) { return s.toLowerCase().replace(/ё/g, 'е'); }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function chooseService(name, price) {
    if (!select) return;
    var label = price ? name + ' — ' + price : name;
    var opt = select.querySelector('option[data-from-price]');
    if (!opt) {
      opt = document.createElement('option');
      opt.setAttribute('data-from-price', '');
      select.insertBefore(opt, select.options[1] || null);
    }
    opt.value = label;
    opt.textContent = label;
    select.value = label;
    select.classList.remove('is-bad');
    var err = document.getElementById('bform-err');
    if (err) err.hidden = true;
    var target = bookingSec || form;
    if (target.classList.contains('rv')) target.classList.add('is-in');
    target.scrollIntoView({ behavior: smooth, block: 'start' });
    var box = form.closest('.booking') || form;
    box.classList.remove('is-flash');
    void box.offsetWidth;
    box.classList.add('is-flash');
    toast('Услуга добавлена в заявку');
    /* на компьютере сразу ставим курсор в первое пустое поле; на телефоне не открываем клавиатуру */
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var empty = [form.elements.car, form.elements.phone].filter(function (el) { return el && !el.value.trim(); })[0];
      if (empty) setTimeout(function () { empty.focus({ preventScroll: true }); }, reduce ? 0 : 450);
    }
  }

  if (prices) {
    var rows = [].slice.call(prices.querySelectorAll('.price li'));
    var groups = [].slice.call(prices.querySelectorAll('.group'));

    rows.forEach(function (li) {
      var nameEl = li.querySelector('span'), priceEl = li.querySelector('b');
      if (!nameEl) return;
      var name = nameEl.textContent.trim(), price = priceEl ? priceEl.textContent.trim() : '';
      li._name = name;
      li._nameEl = nameEl;
      li._key = norm(name + ' ' + (li.closest('.group') ? li.closest('.group').querySelector('.group__title').textContent : ''));
      if (!select) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'price__btn';
      btn.setAttribute('aria-label', 'Записаться: ' + name + (price ? ', ' + price : ''));
      while (li.firstChild) btn.appendChild(li.firstChild);
      var add = document.createElement('span');
      add.className = 'price__add';
      add.setAttribute('aria-hidden', 'true');
      add.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 6v12M6 12h12"/></svg>';
      btn.appendChild(add);
      li.appendChild(btn);
      li.classList.add('price__item');
      btn.addEventListener('click', function () { chooseService(name, price); });
    });

    var intro = prices.querySelector('.muted');
    if (select && intro) {
      var tip = document.createElement('p');
      tip.className = 'price-tip';
      tip.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11.5V5.5a1.5 1.5 0 0 1 3 0v5M12 10V4.5a1.5 1.5 0 0 1 3 0V10M15 10V6a1.5 1.5 0 0 1 3 0v7.5a6.5 6.5 0 0 1-6.5 6.5h-.6a6 6 0 0 1-4.9-2.6L3.5 13a1.5 1.5 0 0 1 2.4-1.8L9 14"/></svg> Нажмите на услугу — она сама подставится в заявку';
      intro.insertAdjacentElement('afterend', tip);
    }

    /* поиск — только если позиций достаточно, чтобы в них можно было потеряться */
    if (rows.length >= 8 && groups.length) {
      var wasOpen = groups.map(function (g) { return g.open; });
      var box = document.createElement('div');
      box.className = 'psearch';
      box.innerHTML =
        '<svg class="psearch__icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>' +
        '<input class="psearch__input" type="search" enterkeyhint="search" autocomplete="off" placeholder="Найти услугу: масло, развал, колодки…" aria-label="Поиск по прайсу">' +
        '<button class="psearch__x" type="button" aria-label="Очистить поиск" hidden>×</button>';
      var empty = document.createElement('p');
      empty.className = 'psearch__empty';
      empty.hidden = true;
      var tel = document.querySelector('a[href^="tel:"]');
      empty.innerHTML = 'Такой услуги нет в прайсе. Это не значит, что её не делают — ' +
        (tel ? '<a href="' + tel.getAttribute('href') + '">уточните по телефону</a>.' : 'уточните по телефону.');
      var count = document.createElement('p');
      count.className = 'psearch__count';
      count.setAttribute('aria-live', 'polite');
      groups[0].insertAdjacentElement('beforebegin', box);
      box.insertAdjacentElement('afterend', count);
      groups[groups.length - 1].insertAdjacentElement('afterend', empty);
      var input = box.querySelector('input'), clear = box.querySelector('.psearch__x');

      var run = function () {
        var q = norm(input.value.trim());
        /* грубое отсечение окончаний: «масло» найдёт «масла», «колодки» — «колодок» */
        var words = q.split(/[\s,.;]+/).filter(Boolean).map(function (w) { return w.length > 4 ? w.slice(0, Math.max(4, w.length - 2)) : w; });
        clear.hidden = !q;
        var total = 0;
        rows.forEach(function (li) {
          if (!li._nameEl) return;
          var hit = !words.length || words.every(function (w) { return li._key.indexOf(w) !== -1; });
          li.hidden = !hit;
          if (hit) total++;
          /* подсветка совпадений в названии */
          var html = esc(li._name);
          if (words.length) {
            var n = norm(li._name), marks = [];
            words.forEach(function (w) { var i = n.indexOf(w); if (i !== -1) marks.push([i, i + w.length]); });
            marks.sort(function (a, b) { return a[0] - b[0]; });
            var out = '', pos = 0;
            marks.forEach(function (m) {
              if (m[0] < pos) return;
              out += esc(li._name.slice(pos, m[0])) + '<mark>' + esc(li._name.slice(m[0], m[1])) + '</mark>';
              pos = m[1];
            });
            html = out + esc(li._name.slice(pos));
          }
          li._nameEl.innerHTML = html;
        });
        groups.forEach(function (g, i) {
          var vis = g.querySelectorAll('.price li:not([hidden])').length;
          g.hidden = words.length > 0 && vis === 0;
          g.open = words.length ? vis > 0 : wasOpen[i];
          var small = g.querySelector('summary small');
          if (small) small.textContent = words.length ? vis : g.querySelectorAll('.price li').length;
        });
        empty.hidden = !words.length || total > 0;
        count.textContent = words.length && total ? 'Найдено: ' + total : '';
      };
      input.addEventListener('input', run);
      input.addEventListener('keydown', function (e) { if (e.key === 'Escape' && input.value) { input.value = ''; run(); } });
      clear.addEventListener('click', function () { input.value = ''; run(); input.focus(); });
      /* пока пользователь не ищет, запоминаем, какие группы он сам открыл */
      groups.forEach(function (g, i) { g.addEventListener('toggle', function () { if (!input.value.trim()) wasOpen[i] = g.open; }); });
    }
  }

  /* ---------- Контакты: карты и копирование адреса ---------- */
  var contacts = document.getElementById('contacts');
  if (contacts) {
    var addr = '';
    [].forEach.call(contacts.querySelectorAll('.info dt'), function (dt) {
      if (dt.textContent.trim() === 'Адрес' && dt.nextElementSibling) addr = dt.nextElementSibling.textContent.trim();
    });
    var gis = contacts.querySelector('a.btn--wide[href*="2gis"]');
    if (addr && gis) {
      var row = document.createElement('div');
      row.className = 'map-actions';
      gis.parentNode.insertBefore(row, gis);
      gis.classList.remove('btn--wide');
      gis.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg> ' + gis.textContent.trim();
      var ya = document.createElement('a');
      ya.className = 'btn btn--ghost';
      ya.href = 'https://yandex.ru/maps/?text=' + encodeURIComponent(addr);
      ya.target = '_blank';
      ya.rel = 'noopener nofollow';
      ya.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 6.5 5-2 7 2.5 5-2v13l-5 2-7-2.5-5 2z"/><path d="M8.5 4.5v13M15.5 7v13"/></svg> Яндекс Карты';
      var cp = document.createElement('button');
      cp.type = 'button';
      cp.className = 'btn btn--ghost map-actions__copy';
      cp.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M15.5 8.5V6.7a2.2 2.2 0 0 0-2.2-2.2H6.7a2.2 2.2 0 0 0-2.2 2.2v6.6a2.2 2.2 0 0 0 2.2 2.2h1.8"/></svg> Скопировать адрес';
      cp.addEventListener('click', function () { copyText(addr, 'Адрес скопирован'); });
      row.appendChild(gis);
      row.appendChild(ya);
      row.appendChild(cp);
    }
  }

  /* ---------- Окно заявки: Tab не уходит за его пределы ---------- */
  var modal = document.getElementById('bmodal');
  if (modal) {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || modal.hidden) return;
      var f = [].filter.call(modal.querySelectorAll('a[href], button:not([disabled])'), function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (!modal.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
})();
