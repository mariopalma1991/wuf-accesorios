/*
 * Inventario de Wuf! desde Google Sheets.
 *
 * La hoja "Inventario Wuf!" tiene dos pestañas que la página lee:
 *   Cordones:          Color | Disponible | Tono para la vista previa | Foto (enlace, opcional)
 *   Estilos de letra:  Estilo | Precio por letra | Disponible | Foto (enlace, opcional) | Descripción
 *
 * La hoja debe estar compartida como "Cualquier persona con el enlace: Lector".
 * Si no se puede leer (sin internet, permisos, etc.), la página usa la lista
 * de respaldo que trae cada página.
 */
(function () {
  var SHEET_ID = '1fWaucEib62vsoysqcRvrUL3UbK-8eM08gnnpvczXZIg';

  function csvUrl(tab) {
    return 'https://docs.google.com/spreadsheets/d/' + SHEET_ID +
      '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(tab);
  }

  // CSV sencillo con comillas
  function parseCSV(text) {
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; } else q = false;
        } else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (ch !== '\r') cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  function toObjects(rows) {
    if (!rows.length) return [];
    var head = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    return rows.slice(1).map(function (r) {
      var o = {};
      head.forEach(function (h, i) { o[h] = (r[i] || '').trim(); });
      return o;
    });
  }

  function yes(v) {
    v = String(v || '').trim().toLowerCase();
    return v === 'true' || v === 'verdadero' || v === 'sí' || v === 'si' || v === 'x' || v === '1';
  }

  function hex(v) {
    v = String(v || '').trim();
    if (/^#?[0-9a-f]{6}$/i.test(v)) return (v[0] === '#' ? v : '#' + v).toUpperCase();
    return null;
  }

  function price(v) {
    var n = parseFloat(String(v || '').replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n;
  }

  // Enlaces de Google Drive -> imagen directa
  function photo(v) {
    v = String(v || '').trim();
    if (!v) return null;
    var m = v.match(/\/d\/([\w-]{20,})/) || v.match(/[?&]id=([\w-]{20,})/);
    if (/drive\.google\.com/.test(v) && m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w400';
    return /^https?:\/\//.test(v) ? v : null;
  }

  function getTab(tab) {
    return fetch(csvUrl(tab), { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (t) {
      if (/^\s*</.test(t)) throw new Error('La hoja no es pública');
      return toObjects(parseCSV(t));
    });
  }

  window.loadInventario = function () {
    return Promise.all([getTab('Cordones'), getTab('Estilos de letra')]).then(function (res) {
      var cords = res[0].filter(function (o) { return o['color']; }).map(function (o) {
        return {
          name: o['color'],
          available: yes(o['disponible']),
          hex: hex(o['tono para la vista previa']),
          photo: photo(o['foto (enlace, opcional)'])
        };
      });
      var styles = res[1].filter(function (o) { return o['estilo']; }).map(function (o) {
        return {
          name: o['estilo'],
          price: price(o['precio por letra']),
          available: yes(o['disponible']),
          photo: photo(o['foto (enlace, opcional)']),
          desc: o['descripción'] || o['descripcion'] || ''
        };
      });
      if (!cords.length) throw new Error('Inventario vacío');
      return { cords: cords, styles: styles };
    });
  };
})();
