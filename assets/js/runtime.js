/*
 * Mini runtime para las páginas de Wuf!
 * Interpreta la plantilla <template id="tpl"> con:
 *   {{ruta}}            texto o atributo
 *   onClick="{{fn}}"    eventos (onClick, onInput, onChange)
 *   <sc-for list="{{lista}}" as="x">  repeticiones ($index disponible)
 *   <sc-if value="{{cond}}">          condicionales
 * La lógica de cada página es una clase `Component extends DCLogic`
 * con state / setState() y renderVals().
 */
(function () {
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\{\{\s*([^}]+?)\s*\}\}$/;

  function lookup(path, scope) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return parseFloat(path);
    var parts = path.split('.');
    var v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }

  function interp(str, scope) {
    return str.replace(HOLE, function (_, p) {
      var v = lookup(p, scope);
      return v == null ? '' : String(v);
    });
  }

  var EVENTS = { onclick: 'click', oninput: 'input', onchange: 'change' };

  function renderChildren(src, scope, out) {
    for (var n = src.firstChild; n; n = n.nextSibling) renderNode(n, scope, out);
  }

  function renderNode(node, scope, out) {
    if (node.nodeType === 3) {
      out.appendChild(document.createTextNode(interp(node.nodeValue, scope)));
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.localName.toLowerCase();

    if (tag === 'sc-for') {
      var list = lookup((node.getAttribute('list') || '').replace(/[{}]/g, ''), scope) || [];
      var as = node.getAttribute('as') || 'item';
      for (var i = 0; i < list.length; i++) {
        var child = Object.create(scope);
        child[as] = list[i];
        child.$index = i;
        renderChildren(node, child, out);
      }
      return;
    }
    if (tag === 'sc-if') {
      var cond = lookup((node.getAttribute('value') || '').replace(/[{}]/g, ''), scope);
      if (cond) renderChildren(node, scope, out);
      return;
    }

    var el = document.createElementNS(node.namespaceURI, node.localName);
    for (var a = 0; a < node.attributes.length; a++) {
      var attr = node.attributes[a];
      var name = attr.name, val = attr.value;
      if (name.indexOf('hint-') === 0) continue;
      var ev = EVENTS[name.toLowerCase()];
      var whole = val.match(WHOLE);
      if (ev && whole) {
        var fn = lookup(whole[1], scope);
        if (typeof fn === 'function') el.addEventListener(ev, fn);
        continue;
      }
      var v = interp(val, scope);
      if (name === 'value' && (tag === 'input' || tag === 'textarea')) { el.value = v; el.setAttribute('value', v); continue; }
      if (name === 'checked' && tag === 'input') { if (whole ? lookup(whole[1], scope) : v) el.checked = true; continue; }
      el.setAttribute(name, v);
    }
    var src = tag === 'template' ? node.content : node;
    renderChildren(src, scope, el);
    out.appendChild(el);
  }

  function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  }
  DCLogic.prototype.setState = function (patch) {
    var p = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = Object.assign({}, this.state, p);
    this.forceUpdate();
  };
  DCLogic.prototype.forceUpdate = function () { if (this.__render) this.__render(); };
  window.DCLogic = DCLogic;

  window.mountPage = function (Component, props) {
    var tpl = document.getElementById('tpl');
    var root = document.getElementById('app');
    var comp = new Component(props || {});
    comp.__render = function () {
      // conservar el foco y el cursor de los campos de texto
      var act = document.activeElement, focusId = act && act.id, s0 = null, s1 = null;
      if (focusId && act.selectionStart != null) { try { s0 = act.selectionStart; s1 = act.selectionEnd; } catch (e) {} }
      var frag = document.createDocumentFragment();
      renderChildren(tpl.content, comp.renderVals(), frag);
      root.replaceChildren(frag);
      if (focusId) {
        var el = document.getElementById(focusId);
        if (el) {
          el.focus({ preventScroll: true });
          if (s0 != null) { try { el.setSelectionRange(s0, s1); } catch (e) {} }
        }
      }
    };
    comp.__render();
    if (comp.componentDidMount) comp.componentDidMount();
    return comp;
  };
})();
