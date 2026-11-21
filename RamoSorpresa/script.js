//SCRIPT.JS CON LOS CONTENIDOS DEL JARDÍN

const canvas = document.getElementById("jardin");
const ctx = canvas.getContext("2d");

// PALETA ORIGINAL
const colores = {
    lirio: "#F8F5FF", rosa: "#E66BA8", rosaIntenso: "#C51E66",
    paniculata: "#F3EDC5", paniculataRama: "#DDD5A8", centro: "#FFF0FA",
    negro: "#000000", kraft: "#D8BD91", kraftClaro: "#E8D3AE",
    kraftOscuro: "#B89A70", tallo: "#82966B"
};

const separacionX = 4.5, separacionY = 6.5, tamanoCaracter = 7;
const profundidadFocal = 1050;
let caracteresPetalos = [], ultimoTiempo = 0, tiempoAnimacion = 0;
let anguloRamo = 0;
const velocidadGiro = 0.80;

function ajustarCanvas() {
    const w = window.innerWidth, h = window.innerHeight;
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
    }
}

function aleatorio(min, max) {
    return Math.random() * (max - min) + min;
}

function aleatorioEstable(fila, columna, petalo, flor, capa = 0) {
    const v = Math.sin(
        fila * 127.1 + columna * 311.7 +
        petalo * 74.3 + flor * 192.8 + capa * 53.9
    ) * 43758.5453;
    return v - Math.floor(v);
}

function proyectarElementoFlor(
    xLocal, yLocal, xCentro, yCentro, profundidadFlor, anguloVista
) {
    const cos = Math.cos(anguloVista), sin = Math.sin(anguloVista);
    const xRotado = xLocal * cos, zLocal = -xLocal * sin;
    const profundidadTotal = profundidadFlor + zLocal;
    const factorCentro = profundidadFocal / (profundidadFocal + profundidadFlor);
    const factorLocal = profundidadFocal / (profundidadFocal + profundidadTotal);
    const factorRelativo = factorLocal / factorCentro;

    return {
        x: xCentro + xRotado * factorRelativo,
        y: yCentro + yLocal * factorRelativo,
        profundidad: profundidadTotal,
        escala: factorRelativo
    };
}

function proyectarPaniculata(
    xLocal, yLocal, xCentro, yCentro, profundidadFlor, anguloVista, orientacion
) {
    const c = Math.cos(orientacion), s = Math.sin(orientacion);
    return proyectarElementoFlor(
        xLocal * c - yLocal * s,
        xLocal * s + yLocal * c,
        xCentro, yCentro, profundidadFlor, anguloVista
    );
}

function interpolarColor(a, b, t) {
    t = Math.max(0, Math.min(1, t));
    const rgbA = [
        parseInt(a.slice(1, 3), 16),
        parseInt(a.slice(3, 5), 16),
        parseInt(a.slice(5, 7), 16)
    ];
    const rgbB = [
        parseInt(b.slice(1, 3), 16),
        parseInt(b.slice(3, 5), 16),
        parseInt(b.slice(5, 7), 16)
    ];

    return "#" + rgbA.map((v, i) =>
        Math.round(v + (rgbB[i] - v) * t).toString(16).padStart(2, "0")
    ).join("");
}

// ESTRUCTURAS DE FLORES

function crearEstructuraLirio() {
    const petalos = [], ang = [0, 60, 120, 180, 240, 300];

    for (let i = 0; i < 6; i++) {
        const principal = i % 2 === 0;

        petalos.push({
            angulo: ang[i] + aleatorio(-9, 9),
            longitud: principal ? aleatorio(.88, 1) : aleatorio(.72, .91),
            ancho: principal ? aleatorio(.32, .40) : aleatorio(.27, .36),
            curva: aleatorio(-11, 11),
            forma: aleatorio(.72, .98),
            apertura: aleatorio(-.08, .14),
            asimetria: aleatorio(-.10, .10),
            ondulacion: aleatorio(.15, .65),
            punta: aleatorio(.05, .14),
            pico: aleatorio(.42, .62),
            principal
        });
    }

    return petalos;
}

function crearEstructuraRosaInterior() {
    const pet = [];

    const capas = [
        { cantidad: 7, radioInicio: .02, longitud: [.56, .66], ancho: [.34, .40], rotacion: 0 },
        { cantidad: 6, radioInicio: .13, longitud: [.43, .52], ancho: [.34, .40], rotacion: 24 },
        { cantidad: 5, radioInicio: .22, longitud: [.28, .36], ancho: [.30, .36], rotacion: 51 }
    ];

    capas.forEach((c, k) => {
        for (let i = 0; i < c.cantidad; i++) {
            pet.push({
                capa: k,
                angulo: (360 / c.cantidad) * i + c.rotacion + aleatorio(-14, 14),
                radioInicio: c.radioInicio + aleatorio(-.025, .025),
                longitud: aleatorio(...c.longitud),
                ancho: aleatorio(...c.ancho),
                curva: aleatorio(-7, 7),
                forma: aleatorio(.42, .60),
                apertura: aleatorio(-.08, .08),
                asimetria: aleatorio(-.07, .07),
                ondulacion: aleatorio(.08, .24),
                punta: aleatorio(.02, .08),
                pico: aleatorio(.43, .58)
            });
        }
    });

    return pet;
}

function crearEstructuraRosaLateral() {
    const pet = [];

    for (let i = 0; i < 5; i++) {
        pet.push({
            capa: 0,
            radioInicio: 0,
            angulo: i * 72 - 90 + aleatorio(-5, 5),
            longitud: aleatorio(.88, 1),
            ancho: aleatorio(.46, .54),
            curva: aleatorio(-5, 5),
            forma: aleatorio(.42, .58),
            apertura: aleatorio(-.04, .08),
            asimetria: aleatorio(-.04, .04),
            ondulacion: aleatorio(.05, .20),
            punta: aleatorio(.02, .06),
            pico: aleatorio(.45, .55)
        });
    }

    return pet;
}

function perfilLirio(t, p) {
    return Math.max(
        0,
        Math.pow(Math.sin(Math.PI * t), p.forma) *
        (1 + (t - p.pico) * .20) + p.punta * (1 - t)
    );
}

function perfilRosa(t, p) {
    return Math.max(
        0,
        Math.pow(Math.sin(Math.PI * t), p.forma) *
        (1 + (t - p.pico) * .08)
    );
}

function anchos(t, max, p, perfil) {
    const base = perfil(t, p), ap = 1 + p.apertura * t;
    const onda = Math.sin(t * Math.PI * 2) * p.ondulacion;
    const w = Math.max(0, max * base * ap + onda);

    return {
        izquierda: w * (.5 + p.asimetria),
        derecha: w * (.5 - p.asimetria)
    };
}

function crearEstructuraPaniculata() {
    const ramas = [];
    const cantidad = 5 + Math.floor(aleatorio(0, 4));

    for (let i = 0; i < cantidad; i++) {
        const a = aleatorio(-Math.PI, Math.PI);
        const largo = aleatorio(.42, .88);

        const fx = Math.cos(a) * largo;
        const fy = Math.sin(a) * largo;

        const flores = [];
        const grupos = 2 + Math.floor(aleatorio(0, 3));

        for (let j = 0; j < grupos; j++) {
            const t = aleatorio(.45, 1.08);

            flores.push([
                fx * t + aleatorio(-.12, .12),
                fy * t + aleatorio(-.12, .12)
            ]);
        }

        ramas.push({
            inicioX: aleatorio(-.08, .08),
            inicioY: aleatorio(-.08, .08),
            finalX: fx,
            finalY: fy,
            flores
        });
    }

    return ramas;
}

function dibujarRamaPaniculata(
    x0, y0, x1, y1, esc, idFlor, idRama,
    angVista, prof, orient, xC, yC
) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const pasos = Math.max(2, Math.floor(dist * 30));

    ctx.font = "5px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = colores.paniculataRama;

    for (let i = 0; i <= pasos; i++) {
        const t = i / pasos;
        const x = (x0 + (x1 - x0) * t) * esc;
        const y = (y0 + (y1 - y0) * t) * esc;
        const v = aleatorioEstable(i, idRama, idFlor, 31);
        const p = proyectarPaniculata(x, y, xC, yC, prof, angVista, orient);

        ctx.globalAlpha = .45 + v * .25;
        ctx.fillText(v > .5 ? "1" : "0", p.x, p.y);
    }
    ctx.globalAlpha = 1;
}

function dibujarGrupoPaniculata(
    x, y, esc, idFlor, idGrupo, angVista, prof, orient, xC, yC
) {
    ctx.font = "5px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = colores.paniculata;

    for (let i = 0; i < 7; i++) {
        const a = i * Math.PI * 2 / 7 + aleatorioEstable(i, idGrupo, idFlor, 17) * .7;
        const d = .045 + aleatorioEstable(i, idGrupo, idFlor, 19) * .055;
        const v = aleatorioEstable(i, idGrupo, idFlor, 23);

        const p = proyectarPaniculata(
            (x + Math.cos(a) * d) * esc,
            (y + Math.sin(a) * d) * esc,
            xC, yC, prof, angVista, orient
        );

        ctx.globalAlpha = .75 + v * .25;
        ctx.fillText(v > .5 ? "1" : "0", p.x, p.y);
    }

    const c = proyectarPaniculata(x * esc, y * esc, xC, yC, prof, angVista, orient);
    ctx.globalAlpha = .95;
    ctx.fillText("0", c.x, c.y);
    ctx.globalAlpha = 1;
}

function dibujarPaniculata(x, y, esc, estructura, id, angVista, prof, orient) {
    let grupo = 0;

    estructura.forEach((r, i) =>
        dibujarRamaPaniculata(
            r.inicioX, r.inicioY, r.finalX, r.finalY,
            esc, id, i, angVista, prof, orient, x, y
        )
    );

    estructura.forEach(r =>
        r.flores.forEach(p =>
            dibujarGrupoPaniculata(
                p[0], p[1], esc, id, grupo++, angVista, prof, orient, x, y
            )
        )
    );
}

function calcularCurvatura(t, curva) {
    return curva * Math.sin(Math.PI * t);
}

// DIBUJO DE PÉTALOS BINARIOS

function dibujarPetalo(
    xC, yC, longitud, anchoMax, color, p,
    idPetalo, idFlor, tipo, angVista = 0, prof = 0, orient = 0
) {
    ctx.font = `${tipo === "lirio" ? 9 : tamanoCaracter}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const pasoY = tipo === "lirio" ? 5.0 : separacionY;
    const pasoX = tipo === "lirio" ? 3.4 : separacionX;
    const a = p.angulo * Math.PI / 180;
    const ca = Math.cos(a), sa = Math.sin(a), anguloFlor = angVista + orient;
    let fila = 0;

    for (let d = 3; d < longitud; d += pasoY) {
        const t = d / longitud;
        const desp = calcularCurvatura(t, p.curva);
        const perfil = tipo === "lirio" ? perfilLirio : perfilRosa;
        const an = anchos(t, anchoMax, p, perfil);
        let col = 0;

        for (let xx = -an.izquierda; xx <= an.derecha; xx += pasoX) {
            const v = aleatorioEstable(fila, col, idPetalo, idFlor, p.capa || 0);
            const distB = xx < 0 ? an.izquierda - Math.abs(xx) : an.derecha - xx;
            const borde = distB <= pasoX * 2.0 || t < .12 || t > .88;
            const num = borde ? (v < .90 ? "1" : "0") : (v < .16 ? "1" : "0");

            const xl = xx + desp, yl = -d;
            const xp = xl * ca - yl * sa, yp = xl * sa + yl * ca;
            const pt = proyectarElementoFlor(xp, yp, xC, yC, prof, anguloFlor);
            const c = tipo === "rosaInterior"
                ? interpolarColor(colores.rosaIntenso, colores.rosa, t)
                : color;

            ctx.globalAlpha = borde ? 1 : Math.max(.72, Math.min(1, .94 + v * .06));
            ctx.fillStyle = borde ? colores.negro : c;
            ctx.font = borde ? `bold ${tipo === "lirio" ? 9 : tamanoCaracter}px monospace` : `${tipo === "lirio" ? 9 : tamanoCaracter}px monospace`;
            ctx.fillText(num, pt.x, pt.y);
            caracteresPetalos.push({
                x: pt.x, y: pt.y, numero: num, alpha: ctx.globalAlpha
            });

            col++;
        }

        fila++;
    }

    ctx.globalAlpha = 1;
}

function dibujarCentro(x, y, r, id, color, ang = 0, prof = 0, orient = 0) {
    ctx.font = `${tamanoCaracter}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;

    for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        const p = proyectarElementoFlor(
            Math.cos(a) * r, Math.sin(a) * r,
            x, y, prof, ang + orient
        );

        ctx.globalAlpha = .9;
        ctx.fillText(i % 2 === 0 ? "1" : "0", p.x, p.y);
    }

    const c = proyectarElementoFlor(0, 0, x, y, prof, ang + orient);
    ctx.globalAlpha = 1;
    ctx.fillText("0101", c.x, c.y);
}

function dibujarLirio(x, y, r, est, id, ang = 0, prof = 0, orient = 0) {
    [...est]
        .sort((a, b) => Number(a.principal) - Number(b.principal))
        .forEach((p, i) => {
            dibujarPetalo(
                x, y,
                r * p.longitud * 1.22,
                r * p.ancho * 1.28,
                colores.lirio,
                p, i, id, "lirio", ang, prof, orient
            );
        });

    dibujarCentro(x, y, r * .12, id, colores.lirio, ang, prof, orient);
}

function dibujarRosaInterior(x, y, r, est, id, ang = 0, prof = 0, orient = 0) {
    [...est]
        .sort((a, b) => a.capa - b.capa)
        .forEach((p, i) => {
            const rr = r * p.radioInicio;
            const a = p.angulo * Math.PI / 180;

            dibujarPetalo(
                x + Math.cos(a) * rr,
                y + Math.sin(a) * rr,
                r * p.longitud,
                r * p.ancho,
                colores.rosa,
                p, i, id, "rosaInterior", ang, prof, orient
            );
        });

    dibujarCentro(x, y, r * .055, id, colores.rosaIntenso, ang, prof, orient);
}

function dibujarRosaLateral(x, y, r, est, id, ang = 0, prof = 0, orient = 0) {
    est.forEach((p, i) => {
        dibujarPetalo(
            x, y,
            r * p.longitud,
            r * p.ancho,
            colores.rosa,
            p, i, id, "rosaLateral", ang, prof, orient
        );
    });

    dibujarCentro(x, y, r * .13, id, colores.rosa, ang, prof, orient);
}

// CONTORNO DE LA MASA FLORAL

function crearMapaEspacial(chars, cell) {
    const m = new Map();

    for (const c of chars) {
        const key = `${Math.floor(c.x / cell)},${Math.floor(c.y / cell)}`;

        if (!m.has(key)) m.set(key, []);
        m.get(key).push(c);
    }

    return m;
}

function existeCaracterCerca(m, x, y, cell, tol) {
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
    const r = Math.ceil(tol / cell);

    for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
            const cel = m.get(`${cx + dx},${cy + dy}`);

            if (cel) {
                for (const c of cel) {
                    if (Math.hypot(c.x - x, c.y - y) <= tol) {
                        return true;
                    }
                }
            }
        }
    }

    return false;
}

function esCaracterExterior(c, m, cell) {
    const dirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [.707, .707], [-.707, .707],
        [.707, -.707], [-.707, -.707]
    ];

    for (const [dx, dy] of dirs) {
        if (!existeCaracterCerca(m, c.x + dx * 8, c.y + dy * 8, cell, 6.2)) {
            return true;
        }
    }

    return false;
}

function dibujarContorno() {
    if (!caracteresPetalos.length) return;

    const cell = 10, m = crearMapaEspacial(caracteresPetalos, cell);
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = colores.negro;

    for (const c of caracteresPetalos) {
        if (esCaracterExterior(c, m, cell)) {
            ctx.globalAlpha = 1;
            ctx.fillText(c.numero, c.x, c.y);
        }
    }

    ctx.globalAlpha = 1;
}
// TALLOS: convergen hacia el cuello del ramo

function dibujarTallos(flores, centroX, centroY, esc) {
    ctx.lineWidth = 2 * esc;
    ctx.lineCap = "round";

    for (const f of flores) {
        const start = {
            x: f.x,
            y: f.y + f.radio * f.escalaActual * .28
        };

        const end = {
            x: centroX + (f.posicionXRotada ?? f.posicionX) * .12 * esc,
            y: centroY + 205 * esc
        };

        ctx.strokeStyle = colores.tallo;
        ctx.globalAlpha = .48;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.quadraticCurveTo(
            start.x * .55 + end.x * .45,
            start.y + 65 * esc,
            end.x, end.y
        );
        ctx.stroke();
    }

    ctx.globalAlpha = 1;
}

// PAPEL: base y dos hojas superpuestas de kraft

function dibujarEnvoltura(cx, cy, esc) {
    const top = cy + 88 * esc, bottom = cy + 320 * esc;
    const w = 225 * esc, neck = 52 * esc;

    function hoja(offset, ancho, tono, alpha) {
        ctx.beginPath();
        ctx.moveTo(cx - ancho + offset, top + 12 * esc);
        ctx.quadraticCurveTo(
            cx - ancho * .78 + offset, top - 30 * esc,
            cx + ancho * .72 + offset, top + 8 * esc
        );
        ctx.lineTo(cx + neck + offset * .25, bottom);
        ctx.quadraticCurveTo(cx + offset, bottom + 18 * esc, cx - neck + offset * .25, bottom);
        ctx.lineTo(cx - ancho * .88 + offset, top + 45 * esc);
        ctx.closePath();
        ctx.fillStyle = tono;
        ctx.globalAlpha = alpha;
        ctx.fill();
    }

    hoja(-24 * esc, w * .92, colores.kraftOscuro, .42);
    hoja(20 * esc, w, colores.kraftClaro, .72);
    hoja(0, w * .88, colores.kraft, .96);

    ctx.globalAlpha = .38;
    ctx.fillStyle = colores.kraftOscuro;
    ctx.beginPath();
    ctx.moveTo(cx - w * .55, top + 35 * esc);
    ctx.lineTo(cx - 12 * esc, bottom);
    ctx.lineTo(cx - 70 * esc, top + 70 * esc);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + w * .55, top + 35 * esc);
    ctx.lineTo(cx + 12 * esc, bottom);
    ctx.lineTo(cx + 70 * esc, top + 70 * esc);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
}

// HOJAS VERDES BINARIAS: relleno de huecos entre flores
function dibujarHoja(cx, cy, esc, angulo, longitud, ancho, id) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angulo);
    ctx.font = `${Math.max(5, 6.5 * esc)}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const paso = Math.max(4, 5.2 * esc);
    const filas = Math.max(5, Math.floor(longitud / paso));
    for (let fila = 0; fila < filas; fila++) {
        const t = fila / Math.max(1, filas - 1);
        const perfil = Math.sin(Math.PI * t) * ancho;
        for (let x = -perfil; x <= perfil; x += paso) {
            const borde = Math.abs(x) >= perfil - paso * 1.2 || fila === 0 || fila === filas - 1;
            const v = aleatorioEstable(fila, Math.round(x / paso), id, 47);
            ctx.fillStyle = borde ? "#063D18" : (v > 0.5 ? "#087A2E" : "#20A844");
            ctx.globalAlpha = borde ? 1 : 0.96;
            ctx.fillText(v > 0.5 ? "1" : "0", x, -t * longitud + longitud / 2);
        }
    }
    // Nervio central de la hoja
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#052E12";
    for (let i = 0; i < filas; i += 2) {
        const t = i / Math.max(1, filas - 1);
        ctx.fillText(i % 4 === 0 ? "1" : "0", 0, -t * longitud + longitud / 2);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
}

function dibujarHojas(cx, cy, esc) {
    // Hojas en zonas intermedias y laterales para que no tapen
    // el centro de las flores ni conviertan el ramo en una masa verde.
    const posiciones = [
        [-145, -75, -0.55, 72, 21], [-115, -135, -0.85, 68, 20],
        [-55, -155, -1.15, 62, 19], [55, -150, -1.9, 66, 20],
        [125, -125, -2.35, 70, 21], [155, -45, -2.65, 72, 21],
        [-160, 35, 0.35, 76, 22], [145, 70, 2.8, 74, 21],
        [-125, 115, 0.8, 68, 20], [-65, 140, 1.35, 66, 20],
        [65, 135, 1.9, 66, 20], [125, 110, 2.25, 70, 21],
        [-100, 5, 0.2, 65, 19], [100, 10, 2.9, 65, 19],
        [-35, -45, -0.5, 58, 18], [40, 50, 2.4, 60, 18]
    ];
    posiciones.forEach((p, i) => dibujarHoja(
        cx + p[0] * esc, cy + p[1] * esc, esc, p[2], p[3] * esc, p[4] * esc, i
    ));
}

// COMPOSICIÓN: silueta ancha, centro denso y flores solapadas.
const flores = [
    // Trasera: extremos y altura
    {tipo:"paniculata",posicionX:-235,posicionY:-110,profundidad:145,orientacion:-.65,radio:46,estructura:crearEstructuraPaniculata()},
    {tipo:"lirio",posicionX:-145,posicionY:-100,profundidad:115,orientacion:-.48,radio:74,estructura:crearEstructuraLirio()},
    {tipo:"paniculata",posicionX:230,posicionY:-135,profundidad:130,orientacion:.8,radio:48,estructura:crearEstructuraPaniculata()},
    {tipo:"lirio",posicionX:145,posicionY:-115,profundidad:105,orientacion:.62,radio:78,estructura:crearEstructuraLirio()},
    {tipo:"rosaLateral",posicionX:-65,posicionY:-160,profundidad:100,orientacion:-.25,radio:57,estructura:crearEstructuraRosaLateral()},

    // Plano medio: núcleo de rosas
    {tipo:"rosaInterior",posicionX:-155,posicionY:-30,profundidad:45,orientacion:-.5,radio:62,estructura:crearEstructuraRosaInterior()},
    {tipo:"lirio",posicionX:-250,posicionY:35,profundidad:35,orientacion:-.8,radio:70,estructura:crearEstructuraLirio()},
    {tipo:"rosaInterior",posicionX:-65,posicionY:-35,profundidad:5,orientacion:.35,radio:69,estructura:crearEstructuraRosaInterior()},
    {tipo:"rosaLateral",posicionX:95,posicionY:-35,profundidad:20,orientacion:.7,radio:64,estructura:crearEstructuraRosaLateral()},
    {tipo:"rosaInterior",posicionX:175,posicionY:35,profundidad:55,orientacion:.1,radio:60,estructura:crearEstructuraRosaInterior()},
    {tipo:"lirio",posicionX:255,posicionY:40,profundidad:40,orientacion:.35,radio:72,estructura:crearEstructuraLirio()},
    {tipo:"paniculata",posicionX:-230,posicionY:145,profundidad:60,orientacion:-.35,radio:45,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:225,posicionY:150,profundidad:70,orientacion:.45,radio:48,estructura:crearEstructuraPaniculata()},

    // Frontal
    {tipo:"rosaInterior",posicionX:-115,posicionY:105,profundidad:-95,orientacion:-.35,radio:58,estructura:crearEstructuraRosaInterior()},
    {tipo:"rosaLateral",posicionX:65,posicionY:95,profundidad:-110,orientacion:.5,radio:61,estructura:crearEstructuraRosaLateral()},
    {tipo:"paniculata",posicionX:0,posicionY:-190,profundidad:-75,orientacion:.1,radio:44,estructura:crearEstructuraPaniculata()},
    {tipo:"lirio",posicionX:0,posicionY:5,profundidad:-135,orientacion:.15,radio:83,estructura:crearEstructuraLirio()},

    // Refuerzo de densidad
    {tipo:"rosaInterior",posicionX:-205,posicionY:-125,profundidad:65,orientacion:-.65,radio:55,estructura:crearEstructuraRosaInterior()},
    {tipo:"rosaLateral",posicionX:-90,posicionY:-105,profundidad:75,orientacion:-.35,radio:58,estructura:crearEstructuraRosaLateral()},
    {tipo:"rosaInterior",posicionX:65,posicionY:-125,profundidad:60,orientacion:.2,radio:58,estructura:crearEstructuraRosaInterior()},
    {tipo:"rosaInterior",posicionX:195,posicionY:-105,profundidad:65,orientacion:.55,radio:55,estructura:crearEstructuraRosaInterior()},
    {tipo:"lirio",posicionX:-205,posicionY:-65,profundidad:20,orientacion:-.55,radio:64,estructura:crearEstructuraLirio()},
    {tipo:"rosaLateral",posicionX:-175,posicionY:65,profundidad:-20,orientacion:-.4,radio:58,estructura:crearEstructuraRosaLateral()},
    {tipo:"rosaInterior",posicionX:-105,posicionY:25,profundidad:15,orientacion:-.2,radio:59,estructura:crearEstructuraRosaInterior()},
    {tipo:"rosaInterior",posicionX:15,posicionY:-65,profundidad:30,orientacion:.15,radio:62,estructura:crearEstructuraRosaInterior()},
    {tipo:"rosaLateral",posicionX:145,posicionY:-5,profundidad:-25,orientacion:.55,radio:58,estructura:crearEstructuraRosaLateral()},
    {tipo:"rosaInterior",posicionX:205,posicionY:100,profundidad:-35,orientacion:.45,radio:57,estructura:crearEstructuraRosaInterior()},
    {tipo:"lirio",posicionX:215,posicionY:-65,profundidad:15,orientacion:.45,radio:65,estructura:crearEstructuraLirio()},
    {tipo:"rosaInterior",posicionX:-205,posicionY:145,profundidad:-65,orientacion:-.5,radio:53,estructura:crearEstructuraRosaInterior()},
    {tipo:"rosaLateral",posicionX:-55,posicionY:155,profundidad:-90,orientacion:-.1,radio:56,estructura:crearEstructuraRosaLateral()},
    {tipo:"rosaInterior",posicionX:125,posicionY:155,profundidad:-70,orientacion:.35,radio:56,estructura:crearEstructuraRosaInterior()},

    // Paniculata lateral
    {tipo:"paniculata",posicionX:-285,posicionY:-25,profundidad:100,orientacion:-.7,radio:42,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:285,posicionY:-20,profundidad:100,orientacion:.7,radio:42,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:-155,posicionY:-190,profundidad:120,orientacion:-.5,radio:42,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:155,posicionY:-190,profundidad:120,orientacion:.5,radio:42,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:-280,posicionY:105,profundidad:85,orientacion:-.45,radio:43,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:280,posicionY:105,profundidad:85,orientacion:.45,radio:43,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:-135,posicionY:205,profundidad:-40,orientacion:-.3,radio:42,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:135,posicionY:205,profundidad:-40,orientacion:.3,radio:42,estructura:crearEstructuraPaniculata()},

    {tipo:"rosaInterior",posicionX:0,posicionY:145,profundidad:-75,orientacion:0,radio:54,estructura:crearEstructuraRosaInterior()},
    {tipo:"rosaLateral",posicionX:0,posicionY:-115,profundidad:-45,orientacion:.1,radio:57,estructura:crearEstructuraRosaLateral()},
    {tipo:"lirio",posicionX:-95,posicionY:-205,profundidad:95,orientacion:-.25,radio:62,estructura:crearEstructuraLirio()},
    {tipo:"lirio",posicionX:95,posicionY:-205,profundidad:95,orientacion:.25,radio:62,estructura:crearEstructuraLirio()},
    {tipo:"rosaInterior",posicionX:-255,posicionY:55,profundidad:-40,orientacion:-.7,radio:52,estructura:crearEstructuraRosaInterior()},
    {tipo:"rosaInterior",posicionX:255,posicionY:55,profundidad:-40,orientacion:.7,radio:52,estructura:crearEstructuraRosaInterior()},
    {tipo:"rosaLateral",posicionX:-235,posicionY:-5,profundidad:-55,orientacion:-.65,radio:53,estructura:crearEstructuraRosaLateral()},
    {tipo:"rosaLateral",posicionX:235,posicionY:-5,profundidad:-55,orientacion:.65,radio:53,estructura:crearEstructuraRosaLateral()},

    // Lirios adicionales
    {tipo:"lirio",posicionX:-185,posicionY:-155,profundidad:80,orientacion:-.7,radio:62,estructura:crearEstructuraLirio()},
    {tipo:"lirio",posicionX:-45,posicionY:-145,profundidad:35,orientacion:-.15,radio:67,estructura:crearEstructuraLirio()},
    {tipo:"lirio",posicionX:175,posicionY:-165,profundidad:85,orientacion:.6,radio:65,estructura:crearEstructuraLirio()},
    {tipo:"lirio",posicionX:-275,posicionY:5,profundidad:45,orientacion:-.8,radio:63,estructura:crearEstructuraLirio()},
    {tipo:"lirio",posicionX:275,posicionY:5,profundidad:45,orientacion:.8,radio:63,estructura:crearEstructuraLirio()},
    {tipo:"lirio",posicionX:-155,posicionY:115,profundidad:-35,orientacion:-.45,radio:61,estructura:crearEstructuraLirio()},
    {tipo:"lirio",posicionX:155,posicionY:120,profundidad:-45,orientacion:.45,radio:61,estructura:crearEstructuraLirio()},
    {tipo:"lirio",posicionX:-45,posicionY:185,profundidad:-80,orientacion:-.1,radio:58,estructura:crearEstructuraLirio()},
    {tipo:"lirio",posicionX:55,posicionY:175,profundidad:-85,orientacion:.15,radio:59,estructura:crearEstructuraLirio()},
    {tipo:"lirio",posicionX:-220,posicionY:-95,profundidad:-15,orientacion:-.55,radio:58,estructura:crearEstructuraLirio()},
    {tipo:"lirio",posicionX:225,posicionY:-90,profundidad:-15,orientacion:.55,radio:59,estructura:crearEstructuraLirio()},
    {tipo:"lirio",posicionX:0,posicionY:-225,profundidad:105,orientacion:0,radio:60,estructura:crearEstructuraLirio()},
    {tipo:"lirio",posicionX:-95,posicionY:65,profundidad:-55,orientacion:-.3,radio:58,estructura:crearEstructuraLirio()},
    {tipo:"lirio",posicionX:95,posicionY:55,profundidad:-65,orientacion:.3,radio:58,estructura:crearEstructuraLirio()},

    // Paniculata entre flores
    {tipo:"paniculata",posicionX:-125,posicionY:-165,profundidad:90,orientacion:-.35,radio:38,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:95,posicionY:-155,profundidad:80,orientacion:.35,radio:39,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:-245,posicionY:-75,profundidad:65,orientacion:-.6,radio:38,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:245,posicionY:-75,profundidad:65,orientacion:.6,radio:38,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:-80,posicionY:80,profundidad:-20,orientacion:-.2,radio:37,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:80,posicionY:85,profundidad:-30,orientacion:.2,radio:37,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:0,posicionY:35,profundidad:-100,orientacion:0,radio:38,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:-180,posicionY:175,profundidad:-60,orientacion:-.4,radio:37,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:185,posicionY:175,profundidad:-60,orientacion:.4,radio:37,estructura:crearEstructuraPaniculata()},

    // Lirios repartidos por el núcleo
    {tipo:"lirio",posicionX:-135,posicionY:-35,profundidad:10,orientacion:-.3,radio:67,estructura:crearEstructuraLirio()},
    {tipo:"lirio",posicionX:135,posicionY:-45,profundidad:5,orientacion:.35,radio:68,estructura:crearEstructuraLirio()},
    {tipo:"lirio",posicionX:-35,posicionY:65,profundidad:-20,orientacion:-.1,radio:70,estructura:crearEstructuraLirio()},
    {tipo:"lirio",posicionX:35,posicionY:115,profundidad:-65,orientacion:.1,radio:66,estructura:crearEstructuraLirio()},
    {tipo:"lirio",posicionX:-175,posicionY:25,profundidad:-25,orientacion:-.5,radio:64,estructura:crearEstructuraLirio()},
    {tipo:"lirio",posicionX:175,posicionY:25,profundidad:-25,orientacion:.5,radio:64,estructura:crearEstructuraLirio()},

    // Paniculata irregular
    {tipo:"paniculata",posicionX:-75,posicionY:-115,profundidad:20,orientacion:.8,radio:35,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:145,posicionY:-105,profundidad:30,orientacion:-.9,radio:34,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:-185,posicionY:-25,profundidad:15,orientacion:.25,radio:35,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:185,posicionY:80,profundidad:-15,orientacion:-.25,radio:36,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:-45,posicionY:155,profundidad:-80,orientacion:.7,radio:34,estructura:crearEstructuraPaniculata()},
    {tipo:"paniculata",posicionX:90,posicionY:-5,profundidad:-75,orientacion:-.8,radio:34,estructura:crearEstructuraPaniculata()}
];
// REFUERZO 3D: flores distribuidas por el volumen
(function agregarFloresVolumetricas() {
    const extras = [];

    const tipos = [
        "rosaInterior", "rosaInterior", "rosaLateral",
        "lirio", "lirio", "rosaInterior", "paniculata"
    ];

    for (let i = 0; i < 44; i++) {
        const a = aleatorio(0, Math.PI * 2);
        // Distribución más exterior: evita acumular flores en el núcleo.
        const radio = 0.72 + Math.random() * 0.28;
        const x = Math.cos(a) * radio * 225;
        const y = Math.sin(a) * radio * 165;
        const z = aleatorio(-155, 155);
        const tipo = tipos[Math.floor(aleatorio(0, tipos.length))];

        let estructura;

        if (tipo === "lirio") estructura = crearEstructuraLirio();
        else if (tipo === "rosaLateral") estructura = crearEstructuraRosaLateral();
        else if (tipo === "paniculata") estructura = crearEstructuraPaniculata();
        else estructura = crearEstructuraRosaInterior();

        extras.push({
            tipo,
            posicionX: x,
            posicionY: y,
            profundidad: z,
            orientacion: aleatorio(-Math.PI, Math.PI),
            radio: tipo === "paniculata" ? aleatorio(30, 42) : aleatorio(48, 67),
            estructura
        });
    }

    flores.push(...extras);
})();

// ============================================================
// SISTEMA DE VISTAS: FRONTAL Y TRASERA
// ============================================================

// Vista inicial
let vistaActual = "frontal";

// Estado de la animación del giro
let girando = false;
let progresoGiro = 0;
let vistaInicioGiro = "frontal";

const duracionGiro = 4200;

// ------------------------------------------------------------
// CREAR COMPOSICIÓN TRASERA
// ------------------------------------------------------------

// La composición trasera utiliza las mismas flores, pero con una
// distribución espacial diferente, generada una sola vez.
// No se modifica ni se mueve la composición frontal.

const floresTrasera = flores.map(f => ({
    ...f,
    // Reflejo horizontal: la distribución trasera queda distinta
    // sin alterar la composición frontal original.
    posicionX: -f.posicionX,
    posicionY: f.posicionY,
    profundidad: f.profundidad,
    orientacion: -f.orientacion
}));

// ------------------------------------------------------------
// INTERFAZ
// ------------------------------------------------------------

const estilosInterfaz = document.createElement("style");

estilosInterfaz.textContent = `
    .controles-ramo {
        position: fixed;
        left: 50%;
        bottom: max(24px, env(safe-area-inset-bottom));
        transform: translateX(-50%);
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 12px;
        z-index: 10;
        width: max-content;
        max-width: calc(100vw - 30px);
    }

    .boton-ramo {
        border: 1px solid rgba(232, 211, 174, 0.55);
        background: rgba(25, 17, 24, 0.88);
        color: #F4E6D5;
        padding: 12px 20px;
        border-radius: 30px;
        font-family: inherit;
        font-size: 14px;
        letter-spacing: 0.3px;
        cursor: pointer;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        transition:
            background 0.25s ease,
            transform 0.25s ease,
            opacity 0.25s ease;
        white-space: nowrap;
    }

    .boton-ramo:hover {
        background: rgba(100, 67, 83, 0.9);
        transform: translateY(-2px);
    }

    .boton-ramo:active {
        transform: scale(0.96);
    }

    .boton-ramo:disabled {
        opacity: 0.55;
        cursor: default;
        transform: none;
    }

    @media (max-width: 480px) {
        .controles-ramo {
            gap: 8px;
        }

        .boton-ramo {
            padding: 11px 15px;
            font-size: 12px;
        }
    }
`;

document.head.appendChild(estilosInterfaz);

// Contenedor
const controlesRamo = document.createElement("div");
controlesRamo.className = "controles-ramo";

// Botón de cambio de vista
const botonVista = document.createElement("button");
botonVista.className = "boton-ramo";
botonVista.textContent = "Ver vista trasera";

// Botón de giro
const botonGirar = document.createElement("button");
botonGirar.className = "boton-ramo";
botonGirar.textContent = "Girar ramo ↻";

controlesRamo.appendChild(botonVista);
controlesRamo.appendChild(botonGirar);
document.body.appendChild(controlesRamo);

// ------------------------------------------------------------
// CAMBIO DE VISTA
// ------------------------------------------------------------

function actualizarBotonVista() {
    botonVista.textContent =
        vistaActual === "frontal"
            ? "Ver vista trasera"
            : "Ver vista delantera";
}

botonVista.addEventListener("click", () => {
    if (girando) return;

    vistaActual = vistaActual === "frontal"
        ? "trasera"
        : "frontal";

    actualizarBotonVista();
    dibujarEscena();
});

// ------------------------------------------------------------
// DIBUJO DE UNA COMPOSICIÓN
// ------------------------------------------------------------

function dibujarComposicion(listaFlores, cx, cy, escalaBase) {
    const floresPreparadas = listaFlores.map((f, i) => {
        const x = f.posicionX * 0.84;
        const y = f.posicionY * 0.84;

        return {
            ...f,
            id: i,
            x: cx + x * escalaBase,
            y: cy + y * escalaBase,
            escalaActual: 1,
            posicionXRotada: x,
            profundidadActual: 0
        };
    });

    // Al no existir profundidad, el orden se conserva estable.
    // Las flores se dibujan de atrás hacia delante según su
    // posición vertical, creando un solapamiento más natural.
    floresPreparadas.sort((a, b) => a.y - b.y);

    dibujarTallos(
        floresPreparadas,
        cx,
        cy,
        escalaBase
    );

    dibujarEnvoltura(cx, cy, escalaBase);
    dibujarHojas(cx, cy, escalaBase);

    for (const f of floresPreparadas) {
        const r = f.radio * escalaBase;

        if (f.tipo === "paniculata") {
            dibujarPaniculata(
                f.x, f.y, r,
                f.estructura, f.id,
                0, 0, f.orientacion
            );
        } else if (f.tipo === "rosaLateral") {
            dibujarRosaLateral(
                f.x, f.y, r,
                f.estructura, f.id,
                0, 0, f.orientacion
            );
        } else if (f.tipo === "rosaInterior") {
            dibujarRosaInterior(
                f.x, f.y, r,
                f.estructura, f.id,
                0, 0, f.orientacion
            );
        } else {
            dibujarLirio(
                f.x, f.y, r,
                f.estructura, f.id,
                0, 0, f.orientacion
            );
        }
    }

    dibujarContorno();
}

// ------------------------------------------------------------
// MENSAJE DE LA VISTA TRASERA
// ------------------------------------------------------------

function dibujarMensajeTrasero(cx, cy, escalaBase) {
    ctx.save();

    const x = cx;
    const y = cy + 345 * escalaBase;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = colores.kraftOscuro;
    ctx.globalAlpha = 0.96;

    ctx.font = `italic ${Math.max(13, 19 * escalaBase)}px Georgia, serif`;
        ctx.fillText("Feliz cumpleaños Jhanna,", x, y);

    ctx.font = `italic ${Math.max(16, 24 * escalaBase)}px Georgia, serif`;
    ctx.fillText("TE AMO", x, y + 27 * escalaBase);

    ctx.restore();
}

// ------------------------------------------------------------
// DIBUJO GENERAL
// ------------------------------------------------------------

function dibujarEscena() {
    ajustarCanvas();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    caracteresPetalos = [];

    const cx = canvas.width / 2;
    const cy = canvas.height / 2 - 35;

    const escalaBase = Math.min(
        canvas.width / 900,
        canvas.height / 1050,
        1
    );

    if (girando) {
        // Loop vertical tipo montaña rusa: el ramo recorre una
        // circunferencia completa y gira acompañando la trayectoria.
        // El texto se dibuja aparte y permanece completamente fijo.
        const angulo = progresoGiro * Math.PI * 2;
        const radioLoop = 175 * escalaBase;
        const escalaLoop = 0.52;
        const desplazamientoX = radioLoop * Math.sin(angulo);
        const desplazamientoY = radioLoop * (1 - Math.cos(angulo));

        ctx.save();
        ctx.translate(cx + desplazamientoX, cy + desplazamientoY);
        ctx.rotate(angulo);
        ctx.scale(escalaLoop, escalaLoop);

        if (vistaActual === "frontal") {
            dibujarComposicion(flores, 0, 0, escalaBase);
        } else {
            dibujarComposicion(floresTrasera, 0, 0, escalaBase);
        }
        ctx.restore();
    } else {
        if (vistaActual === "frontal") {
            dibujarComposicion(flores, cx, cy, escalaBase);
        } else {
            dibujarComposicion(floresTrasera, cx, cy, escalaBase);
        }
    }


    // El mensaje no participa en el loop y nunca se transforma.
    if (vistaActual === "trasera") {
        dibujarMensajeTrasero(cx, cy, escalaBase);
    }
}


// ------------------------------------------------------------
// GIRO COMPLETO DE 360º SOBRE EL CENTRO DEL RAMO
// ------------------------------------------------------------

function girarRamo() {
    if (girando) return;

    girando = true;
    progresoGiro = 0;
    botonGirar.disabled = true;
    botonVista.disabled = true;

    // El ramo está centrado en cx, cy. Animamos el propio canvas con
    // aceleración por hardware, en vez de capturar/redibujar fotogramas.
    ajustarCanvas();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 - 35;
    canvas.style.transformOrigin = `${cx}px ${cy}px`;
    canvas.style.transform = "rotate(0deg)";

    const animacion = canvas.animate(
        [
            { transform: "rotate(0deg)" },
            { transform: "rotate(-360deg)" }
        ],
        {
            duration: duracionGiro,
            easing: "linear",
            fill: "forwards"
        }
    );

    const inicio = performance.now();

    function actualizarProgreso(t) {
        progresoGiro = Math.min((t - inicio) / duracionGiro, 1);
        if (progresoGiro < 1 && girando) {
            requestAnimationFrame(actualizarProgreso);
        }
    }
    requestAnimationFrame(actualizarProgreso);

    animacion.onfinish = () => {
        animacion.cancel();
        canvas.style.transform = "rotate(0deg)";
        canvas.style.transformOrigin = "50% 50%";

        progresoGiro = 0;
        girando = false;
        botonGirar.disabled = false;
        botonVista.disabled = false;

        dibujarEscena();
        lanzarFuegosCorazon();
    };

    animacion.oncancel = () => {
        // Evita dejar los controles bloqueados si la animación se cancela.
        if (girando) {
            canvas.style.transform = "rotate(0deg)";
            progresoGiro = 0;
            girando = false;
            botonGirar.disabled = false;
            botonVista.disabled = false;
            dibujarEscena();
        }
    };
}


// ------------------------------------------------------------
// FUEGOS ARTIFICIALES DE CORAZONES
// ------------------------------------------------------------

let canvasCorazones = document.getElementById("fuegos-corazon");
if (!canvasCorazones) {
    canvasCorazones = document.createElement("canvas");
    canvasCorazones.id = "fuegos-corazon";
    canvasCorazones.style.cssText = `
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 0;
    `;
    document.body.appendChild(canvasCorazones);
}
canvas.style.position = "relative";
canvas.style.zIndex = "1";
const ctxCorazones = canvasCorazones.getContext("2d");
let rafCorazones = null;


function ajustarCanvasCorazones() {
    canvasCorazones.width = window.innerWidth;
    canvasCorazones.height = window.innerHeight;
}


function dibujarCorazon(ctx, x, y, tamano, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + tamano * 0.30);
    ctx.bezierCurveTo(x - tamano, y - tamano * 0.45, x - tamano * 0.55, y - tamano, x, y - tamano * 0.48);
    ctx.bezierCurveTo(x + tamano * 0.55, y - tamano, x + tamano, y - tamano * 0.45, x, y + tamano * 0.30);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}


function lanzarFuegosCorazon() {
    ajustarCanvasCorazones();
    if (rafCorazones) cancelAnimationFrame(rafCorazones);

    const coloresFuego = ["#FF5C9D", "#FF8BC2", "#FFD1E8", "#FFFFFF", "#E64D85"];
    const particulas = [];
    const cantidadExplosiones = 5;

    for (let e = 0; e < cantidadExplosiones; e++) {
        const centroX = canvasCorazones.width * (0.15 + Math.random() * 0.70);
        const centroY = canvasCorazones.height * (0.15 + Math.random() * 0.55);
        const escala = 9 + Math.random() * 13;
        const color = coloresFuego[Math.floor(Math.random() * coloresFuego.length)];
        const cantidad = 45;

        for (let i = 0; i < cantidad; i++) {
            const t = (Math.PI * 2 * i) / cantidad;
            // Curva paramétrica de corazón, usada como forma de explosión.
            const hx = 16 * Math.pow(Math.sin(t), 3);
            const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
            particulas.push({
                x: centroX,
                y: centroY,
                vx: hx * escala * 0.10 + (Math.random() - 0.5) * 1.8,
                vy: hy * escala * 0.10 + (Math.random() - 0.5) * 1.8,
                color,
                tamano: 2 + Math.random() * 3.5,
                vida: 1,
                decremento: 0.006 + Math.random() * 0.005
            });
        }
    }


    function animarFuegos() {
        ctxCorazones.clearRect(0, 0, canvasCorazones.width, canvasCorazones.height);
        let quedan = false;

        for (const p of particulas) {
            if (p.vida <= 0) continue;
            quedan = true;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.012;
            p.vx *= 0.992;
            p.vy *= 0.992;
            p.vida -= p.decremento;

            dibujarCorazon(ctxCorazones, p.x, p.y, p.tamano, p.color, Math.max(0, p.vida));
        }

        if (quedan) {
            rafCorazones = requestAnimationFrame(animarFuegos);
        } else {
            ctxCorazones.clearRect(0, 0, canvasCorazones.width, canvasCorazones.height);
            rafCorazones = null;
        }
    }


    animarFuegos();
}


botonGirar.addEventListener("click", girarRamo);


// ------------------------------------------------------------
// INICIALIZACIÓN
// ------------------------------------------------------------

ajustarCanvas();
actualizarBotonVista();
dibujarEscena();

window.addEventListener("resize", () => {
    dibujarEscena();
    ajustarCanvasCorazones();
});


// ============================================================
// FOCO CINEMATOGRÁFICO + PÉTALOS BINARIOS DE ROSA
// ============================================================

// Foco: canvas independiente detrás del ramo.
let canvasFoco = document.getElementById("foco-ramo");
if (!canvasFoco) {
    canvasFoco = document.createElement("canvas");
    canvasFoco.id = "foco-ramo";
    canvasFoco.style.cssText = `
        position: fixed; inset: 0; width: 100vw; height: 100vh;
        pointer-events: none; z-index: 0;
    `;
    document.body.appendChild(canvasFoco);
}
const ctxFoco = canvasFoco.getContext("2d");


function ajustarCanvasFoco() {
    canvasFoco.width = window.innerWidth;
    canvasFoco.height = window.innerHeight;
}


function dibujarFocoCinematografico() {
    ajustarCanvasFoco();
    const w = canvasFoco.width, h = canvasFoco.height;
    ctxFoco.clearRect(0, 0, w, h);

    // Viñeta ambiental suave, sin apagar por completo el fondo.
    const viñeta = ctxFoco.createRadialGradient(w * 0.5, h * 0.56, h * 0.12, w * 0.5, h * 0.56, Math.max(w, h) * 0.72);
    viñeta.addColorStop(0, "rgba(8, 3, 10, 0.02)");
    viñeta.addColorStop(0.72, "rgba(8, 3, 10, 0.15)");
    viñeta.addColorStop(1, "rgba(4, 2, 8, 0.40)");
    ctxFoco.fillStyle = viñeta;
    ctxFoco.fillRect(0, 0, w, h);

    // Haz de luz cálida desde arriba hacia el centro del ramo.
    const cx = w * 0.5;
    const cy = h * 0.50 - 35;
    ctxFoco.save();
    ctxFoco.globalCompositeOperation = "screen";
    const haz = ctxFoco.createLinearGradient(cx, 0, cx, cy + 80);
    haz.addColorStop(0, "rgba(255, 244, 218, 0.035)");
    haz.addColorStop(0.45, "rgba(255, 232, 194, 0.075)");
    haz.addColorStop(1, "rgba(255, 222, 185, 0.015)");
    ctxFoco.fillStyle = haz;
    ctxFoco.beginPath();
    ctxFoco.moveTo(cx - w * 0.10, 0);
    ctxFoco.lineTo(cx + w * 0.10, 0);
    ctxFoco.lineTo(cx + w * 0.30, cy + 120);
    ctxFoco.lineTo(cx - w * 0.30, cy + 120);
    ctxFoco.closePath();
    ctxFoco.fill();

    // Resplandor concentrado en la zona floral.
    const glow = ctxFoco.createRadialGradient(cx, cy - 35, 10, cx, cy, Math.min(w, h) * 0.43);
    glow.addColorStop(0, "rgba(255, 238, 211, 0.19)");
    glow.addColorStop(0.32, "rgba(255, 224, 191, 0.085)");
    glow.addColorStop(0.68, "rgba(255, 212, 180, 0.025)");
    glow.addColorStop(1, "rgba(255, 212, 180, 0)");
    ctxFoco.fillStyle = glow;
    ctxFoco.fillRect(0, 0, w, h);
    ctxFoco.restore();
}

// ============================================================
// PÉTALOS BINARIOS DE ROSA CON FORMA DE CORAZÓN
// ============================================================

// Modelos de pétalos: matrices binarias con forma de corazón.
// Modelos de pétalos con silueta de corazón estable.
// Modelos binarios con una silueta de corazón reconocible.
const modelosPetalosRosa = Array.from({ length: 10 }, (_, modelo) => {
    const filas = 35;
    const columnas = 35;
    const matriz = [];

    // Contorno matemático del corazón.
    const puntosCorazon = [];

    for (let t = 0; t <= Math.PI * 2; t += 0.025) {
        const x = 16 * Math.pow(Math.sin(t), 3);

        const y =
            13 * Math.cos(t) -
            5 * Math.cos(2 * t) -
            2 * Math.cos(3 * t) -
            Math.cos(4 * t);

        puntosCorazon.push({ x, y });
    }

    // Normalizamos las coordenadas para centrar y encajar el corazón.
    const minX = -16;
    const maxX = 16;
    const minY = -17;
    const maxY = 12;

    function dentroCorazon(px, py) {
        let dentro = false;

        for (
            let i = 0, j = puntosCorazon.length - 1;
            i < puntosCorazon.length;
            j = i++
        ) {
            const a = puntosCorazon[i];
            const b = puntosCorazon[j];

            const interseccion =
                ((a.y > py) !== (b.y > py)) &&
                (px < (b.x - a.x) * (py - a.y) / (b.y - a.y) + a.x);

            if (interseccion) dentro = !dentro;
        }

        return dentro;
    }

    for (let y = 0; y < filas; y++) {
        const fila = [];

        for (let x = 0; x < columnas; x++) {
            const px = minX + (x / (columnas - 1)) * (maxX - minX);
            const py = maxY - (y / (filas - 1)) * (maxY - minY);

            if (dentroCorazon(px, py)) {
                const patron = (x * 3 + y * 5 + modelo) % 4;
                fila.push(patron === 0 ? "0" : "1");
            } else {
                fila.push(" ");
            }
        }

        matriz.push(fila);
    }

    return {
        matriz,
        ancho: aleatorio(22, 30),
        alto: aleatorio(22, 30),
        variacion: modelo
    };
});

// Canvas transparente por encima del ramo.
let canvasPetalos = document.getElementById("petalos-rosa");

if (!canvasPetalos) {
    canvasPetalos = document.createElement("canvas");
    canvasPetalos.id = "petalos-rosa";

    canvasPetalos.style.cssText = `
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 2;
    `;

    document.body.appendChild(canvasPetalos);
}

const ctxPetalos = canvasPetalos.getContext("2d");

let particulasPetalos = [];
let rafPetalos = null;
let tiempoUltimoPetalo = 0;
let inicioPetalos = null;
let petalosInicializados = false;


// CONFIGURACIÓN DE LOS PÉTALOS

const maxPetalosSimultaneos = 55;
const minimoPetalosVisibles = 30;
const retrasoInicioPetalos = 2500;
const alphaPetaloVisible = 0.78;


// ============================================================
// AJUSTAR CANVAS
// ============================================================

function ajustarCanvasPetalos() {
    canvasPetalos.width = window.innerWidth;
    canvasPetalos.height = window.innerHeight;
}


// ============================================================
// CREAR PÉTALO
// ============================================================

function crearPetaloRosa() {
    const modelo = modelosPetalosRosa[
        Math.floor(Math.random() * modelosPetalosRosa.length)
    ];

    const alto = modelo.alto * aleatorio(1.8, 2.35);
    const ancho = modelo.ancho * aleatorio(1.8, 2.35);

    return {
        modelo,

        x: aleatorio(0, canvasPetalos.width),
        y: -alto - aleatorio(20, 180),

        vx: aleatorio(-25, 25),
        vy: aleatorio(145, 210),

        ancho,
        alto,

        // Rotación más contenida para conservar la lectura de corazón.
        angulo: aleatorio(-0.65, 0.65),
        velocidadAngular: aleatorio(-0.20, 0.20),

        fase: aleatorio(0, Math.PI * 2),
        amplitud: aleatorio(8, 20),

        tiempo: 0,
        duracion: aleatorio(7000, 9500),

        alpha: 0,

        sprite: crearSpritePetalo(modelo, ancho, alto)
    };
}

function crearSpritePetalo(modelo, ancho, alto) {
    const escala = 3;

    const sprite = document.createElement("canvas");
    sprite.width = Math.ceil(ancho * escala);
    sprite.height = Math.ceil(alto * escala);

    const ctx = sprite.getContext("2d");
    const matriz = modelo.matriz;

    const celdaX = sprite.width / matriz[0].length;
    const celdaY = sprite.height / matriz.length;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.min(celdaX, celdaY) * 1.15}px monospace`;

    for (let y = 0; y < matriz.length; y++) {
        for (let x = 0; x < matriz[y].length; x++) {
            const caracter = matriz[y][x];

            if (caracter === " ") continue;

            const borde =
                x === 0 ||
                y === 0 ||
                x === matriz[y].length - 1 ||
                y === matriz.length - 1 ||
                matriz[y][x - 1] === " " ||
                matriz[y][x + 1] === " " ||
                matriz[y - 1]?.[x] === " " ||
                matriz[y + 1]?.[x] === " ";

            ctx.fillStyle = borde
                ? "#B51D45"
                : caracter === "0"
                    ? "#F6B2C8"
                    : "#E86B91";

            ctx.fillText(
                caracter,
                (x + 0.5) * celdaX,
                (y + 0.5) * celdaY
            );
        }
    }

    return sprite;
}

// ============================================================
// DIBUJAR PÉTALO
// ============================================================

function dibujarModeloPetalo(p, alpha) {
    if (!p.sprite || alpha <= 0) return;

    ctxPetalos.save();

    ctxPetalos.translate(p.x, p.y);
    ctxPetalos.rotate(p.angulo);

    // Evita transparencias acumuladas o heredadas.
    ctxPetalos.globalAlpha = Math.max(0, Math.min(1, alpha));

    ctxPetalos.drawImage(
        p.sprite,
        -p.ancho / 2,
        -p.alto / 2,
        p.ancho,
        p.alto
    );

    ctxPetalos.restore();
}


// ============================================================
// CONTAR PÉTALOS VISIBLES
// ============================================================

function contarPetalosVisibles() {
    return particulasPetalos.filter(p =>
        p.alpha >= 0.15 &&
        p.x >= -p.ancho &&
        p.x <= canvasPetalos.width + p.ancho &&
        p.y >= -p.alto &&
        p.y <= canvasPetalos.height + p.alto
    ).length;
}


// ============================================================
// ANIMACIÓN DE PÉTALOS
// ============================================================

function animarPetalosRosa(t) {
    if (!canvasPetalos.width || !canvasPetalos.height) {
        ajustarCanvasPetalos();
    }

    ctxPetalos.clearRect(
        0, 0,
        canvasPetalos.width,
        canvasPetalos.height
    );

    if (inicioPetalos === null) inicioPetalos = t;

    const tiempoTranscurrido = t - inicioPetalos;
    const delta = Math.min(32, t - (tiempoUltimoPetalo || t));

    tiempoUltimoPetalo = t;

    // Espera inicial de 2,5 segundos.
    if (
        !petalosInicializados &&
        tiempoTranscurrido >= retrasoInicioPetalos
    ) {
        petalosInicializados = true;

        // Los primeros pétalos también nacen por encima de la pantalla.
        for (let i = 0; i < maxPetalosSimultaneos; i++) {
            particulasPetalos.push(crearPetaloRosa());
        }
    }

    if (petalosInicializados) {
        // Elimina pétalos que han terminado su recorrido.
        particulasPetalos = particulasPetalos.filter(
            p => p.tiempo < p.duracion &&
                 p.y < canvasPetalos.height + p.alto
        );

        // Mantiene el número de partículas sin crear una cantidad excesiva.
        while (particulasPetalos.length < maxPetalosSimultaneos) {
            particulasPetalos.push(crearPetaloRosa());
        }
    }

    for (const p of particulasPetalos) {
        p.tiempo += delta;

        const progreso = p.tiempo / p.duracion;

        // Caída vertical.
        p.x += p.vx * delta / 1000;
        p.y += p.vy * delta / 1000;

        // Oscilación natural.
        p.x += Math.sin(t * 0.001 + p.fase)
            * p.amplitud * delta / 1000;

        p.y += Math.sin(t * 0.0018 + p.fase)
            * p.amplitud * delta / 1000;

        // Rotación.
        p.angulo += p.velocidadAngular * delta / 1000;

        // Entrada y desaparición gradual.
        const entrada = Math.min(1, progreso * 5);
        const salida = Math.min(1, (1 - progreso) * 4);

        p.alpha = Math.min(entrada, salida) * alphaPetaloVisible;

        dibujarModeloPetalo(p, p.alpha);
    }

    rafPetalos = requestAnimationFrame(animarPetalosRosa);
}


// ============================================================
// INICIALIZACIÓN
// ============================================================

ajustarCanvasFoco();
dibujarFocoCinematografico();

ajustarCanvasPetalos();

rafPetalos = requestAnimationFrame(
    animarPetalosRosa
);


// ============================================================
// REDIMENSIONAR VENTANA
// ============================================================

window.addEventListener("resize", () => {
    ajustarCanvasFoco();
    dibujarFocoCinematografico();

    ajustarCanvasPetalos();
});