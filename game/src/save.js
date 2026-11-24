// Save system: one localStorage slot (mission index + money).
(function () {
  'use strict';
  var G = window.IB = window.IB || {};
  var KEY = 'ironbayou-save-v1';
  G.Save = {
    read: function () {
      try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s && typeof s.mission === 'number' ? s : null; }
      catch (e) { return null; }
    },
    write: function (data) {
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
    },
    clear: function () { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
  };
})();
