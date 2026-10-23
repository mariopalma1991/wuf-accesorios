/**
 * Wuf! accesorios · Servicio de pedidos (Google Apps Script)
 *
 * Recibe el pedido desde la página, recalcula el precio (el precio de la página NO se toma como bueno),
 * lo guarda en la pestaña "Pedidos" de ESTE archivo y avisa por correo.
 *
 * Instalación: ver README.md → "Pedidos en Google Sheets".
 */

// ── Ajustes ─────────────────────────────────────────────────────────────
var CORREOS = ['mario.palmagonzalez1991@gmail.com', 'laura.aguirre.moreno@gmail.com'];
var HOJA = 'Pedidos';
var PRIMER_PEDIDO = 1001;

// Precios (deben coincidir con los de la página)
var TALLAS = [['CH', 20, 28, 170], ['M', 29, 38, 185], ['G', 39, 48, 200], ['XG', 49, 60, 215]];
var EXTRA_POR_10CM = 15;      // por cada 10 cm arriba de 60
var PRECIO_LETRA = 5;
var PRECIO_PLACA = 180;
var ENVIO = { 1: 30, 2: 45, 3: 60, 4: 80 };

// ── Entrada ─────────────────────────────────────────────────────────────
function doGet() {
  return salida({ ok: true, servicio: 'Wuf! pedidos' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.web) return salida({ ok: false, error: 'rechazado' });          // trampa para robots

    var cliente = limpiar(d.cliente, 30);
    var mascota = limpiar(d.mascota, 30);
    var tel = String(d.tel || '').replace(/\D/g, '').slice(-10);
    var cm = parseInt(d.cm, 10);
    var zona = parseInt(d.zona, 10);
    var direccion = limpiar(d.direccion, 200);

    if (!cliente) return salida({ ok: false, error: 'Falta tu nombre' });
    if (!mascota) return salida({ ok: false, error: 'Falta el nombre de tu mascota' });
    if (tel.length !== 10) return salida({ ok: false, error: 'El teléfono debe tener 10 dígitos' });
    if (!(cm >= 15 && cm <= 80)) return salida({ ok: false, error: 'Medida de cuello no válida' });
    if (!ENVIO[zona]) return salida({ ok: false, error: 'Falta elegir la zona de envío' });
    if (!direccion) return salida({ ok: false, error: 'Falta la dirección' });

    // Límite sencillo: 5 pedidos por hora con el mismo teléfono
    var cache = CacheService.getScriptCache(), k = 'tel_' + tel;
    var n = parseInt(cache.get(k) || '0', 10);
    if (n >= 5) return salida({ ok: false, error: 'Demasiados pedidos seguidos. Escríbenos por WhatsApp.' });
    cache.put(k, String(n + 1), 3600);

    // Precio calculado aquí
    var i = cm <= 28 ? 0 : cm <= 38 ? 1 : cm <= 48 ? 2 : 3;
    var extra = cm > 60 ? Math.ceil((cm - 60) / 10) * EXTRA_POR_10CM : 0;
    var collar = TALLAS[i][3] + extra;
    var nLetras = mascota.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]/g, '').length;
    var letras = nLetras * PRECIO_LETRA;
    var placa = d.placa ? PRECIO_PLACA : 0;
    var envio = ENVIO[zona];
    var total = collar + letras + placa + envio;

    var notas = [];
    if (Number(d.totalPagina) && Number(d.totalPagina) !== total) notas.push('REVISAR: la página mostró $' + Number(d.totalPagina) + ' y el cálculo da $' + total);
    if (Number(d.lat) && Number(d.lon)) notas.push('Mapa: https://www.google.com/maps?q=' + Number(d.lat) + ',' + Number(d.lon));

    var libro = SpreadsheetApp.getActive();
    var hoja = libro.getSheetByName(HOJA);
    if (!hoja) return salida({ ok: false, error: 'Falta la pestaña ' + HOJA });
    var fila = Math.max(hoja.getLastRow() + 1, 2);
    var previo = fila > 2 ? Number(hoja.getRange(fila - 1, 1).getValue()) : 0;
    var pedido = Math.max(previo + 1, PRIMER_PEDIDO);

    hoja.getRange(fila, 6).setNumberFormat('@');
    hoja.getRange(fila, 1, 1, 17).setValues([[
      pedido, new Date(), 'Nuevo', cliente, mascota, tel,
      TALLAS[i][0], cm, limpiar(d.colorA, 40) + ' + ' + limpiar(d.colorB, 40), limpiar(d.estilo, 40),
      nLetras, d.placa ? 'Sí' : 'No', 'Zona ' + zona, envio, total, direccion, notas.join(' · ')
    ]]);
    hoja.getRange(fila, 18).setFormula(
      '=HYPERLINK("https://wa.me/52"&F' + fila + '&"?text="&ENCODEURL("Hola "&D' + fila +
      '&"! Somos Wuf!. Recibimos tu pedido #"&A' + fila + '&" para "&E' + fila +
      '&". Te escribimos para confirmarlo y darte los datos de pago."),"Escribir")');

    avisar(pedido, cliente, mascota, tel, TALLAS[i][0], cm, d, nLetras, zona, envio, total, direccion, notas, libro.getUrl());
    return salida({ ok: true, pedido: pedido, total: total });
  } catch (err) {
    return salida({ ok: false, error: 'No pudimos guardar tu pedido. Escríbenos por WhatsApp.' });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// ── Ayudas ──────────────────────────────────────────────────────────────
function limpiar(v, max) {
  var s = String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;       // evita fórmulas inyectadas en la hoja
}

function salida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function avisar(pedido, cliente, mascota, tel, talla, cm, d, nLetras, zona, envio, total, direccion, notas, url) {
  var lineas = [
    'Pedido #' + pedido,
    'Cliente: ' + cliente + ' · WhatsApp ' + tel,
    'Mascota: ' + mascota,
    'Collar: talla ' + talla + ' · cuello ' + cm + ' cm',
    'Colores: ' + limpiar(d.colorA, 40) + ' + ' + limpiar(d.colorB, 40),
    'Letras: ' + limpiar(d.estilo, 40) + ' · ' + nLetras + ' letras',
    'Placa solidaria: ' + (d.placa ? 'Sí' : 'No'),
    'Envío: Zona ' + zona + ' · $' + envio,
    'Dirección: ' + direccion,
    'TOTAL: $' + total + ' MXN'
  ];
  if (notas.length) lineas.push('Notas: ' + notas.join(' · '));
  lineas.push('', 'Hoja de pedidos: ' + url);
  MailApp.sendEmail({
    to: CORREOS.join(','),
    subject: 'Nuevo pedido #' + pedido + ' · ' + mascota + ' (' + cliente + ') · $' + total,
    body: lineas.join('\n'),
    name: 'Pedidos Wuf!'
  });
}
