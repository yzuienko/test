// Конфігурація
const SECRET_API_KEY = "zFieupRVaeMDQmtsMmTwin61vYS4Xwxk62CJ33LX2tBBEfHq";
const firebaseConfig = {
    apiKey: "AIzaSyC7Xv1aMR3kzoO3o7g6MyGPIFQDAiVF0o0",
    authDomain: "mypricetags11.firebaseapp.com",
    projectId: "mypricetags11",
    storageBucket: "mypricetags11.firebasestorage.app",
    messagingSenderId: "244601701796",
    appId: "1:244601701796:web:d917d2e7454654f73d2d31",
    measurementId: "G-HT7BCGGKNT"
};

// Ініціалізація
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let smartKasaToken = null;
let printQueue = [];
let codeReader = null;

// --- ФУНКЦІЇ ІНТЕРФЕЙСУ ---
function render() {
    const qCount = document.getElementById('q-count');
    const qList = document.getElementById('queue-list');
    if (qCount) qCount.innerText = printQueue.length;
    if (qList) {
        qList.innerHTML = printQueue.map((item, i) => `
            <div class="queue-item" onclick="editItem(${i})">
                <div style="flex:1"><b>${item.n}</b><br><small>${item.p} грн / ${item.u}</small></div>
                <div onclick="removeItem(${i}, event)" style="color:#ff4444; padding:10px; font-weight:bold;">✕</div>
            </div>`).join('');
    }
}

function addToQueue() {
    const b = document.getElementById('p-barcode').value;
    const n = document.getElementById('p-name').value;
    const p = Math.round(parseFloat(document.getElementById('p-price').value));
    const u = document.getElementById('p-unit').value;
    const op = document.getElementById('p-old-price').value ? Math.round(parseFloat(document.getElementById('p-old-price').value)) : '';

    if (!b || !n || isNaN(p)) return;

    const idx = printQueue.findIndex(i => i.b === b);
    if (idx > -1) printQueue[idx] = { b, n, p, u, op }; 
    else printQueue.push({ b, n, p, u, op });

    db.collection("products").doc(b).set({ name: n, price: p, unit: u }, { merge: true });
    render();
    ["p-barcode", "p-name", "p-price", "p-old-price"].forEach(id => document.getElementById(id).value = "");
}

function removeItem(i, e) {
    if (e) e.stopPropagation();
    printQueue.splice(i, 1);
    render();
}

function editItem(i) {
    const it = printQueue[i];
    document.getElementById('p-barcode').value = it.b;
    document.getElementById('p-name').value = it.n;
    document.getElementById('p-price').value = it.p;
    document.getElementById('p-unit').value = it.u;
    document.getElementById('p-old-price').value = it.op || '';
    printQueue.splice(i, 1);
    render();
}

// --- ГОЛОВНА ФУНКЦІЯ ДРУКУ ---
function prepareAndPrint() {
    if (!printQueue.length) return;

    let printIframe = document.getElementById('print-iframe');
    if (!printIframe) {
        printIframe = document.createElement('iframe');
        printIframe.id = 'print-iframe';
        printIframe.setAttribute('style', 'position:fixed; visibility:hidden; width:0; height:0;');
        document.body.appendChild(printIframe);
    }

    const itemsHtml = printQueue.map(item => `
        <div style="width:66mm; height:44mm; border:0.3mm dashed #999; padding:4mm; display:flex; flex-direction:column; justify-content:space-between; background:white; box-sizing:border-box; float:left; overflow:hidden;">
            <div style="font-size:13pt; font-weight:800; text-transform:uppercase; height:10mm; line-height:1.1; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${item.n}</div>
            <div style="display:flex; justify-content:space-between; align-items:flex-end; flex-grow:1;">
                <div style="min-width:20mm;">${item.op ? `<div style="font-size:22pt; text-decoration:line-through; color:#444; font-weight:bold; position:relative;">${item.op}</div>` : ''}</div>
                <div style="text-align:right;"><span style="font-size:42pt; font-weight:900; line-height:0.8;">${item.p}</span><span style="font-size:14pt; font-weight:bold;">грн</span></div>
            </div>
            <div style="border-top:1.5pt solid #000; display:flex; justify-content:space-between; font-size:8.5pt; font-weight:bold; padding-top:1mm;">
                <div>За 1 ${item.u}</div><div>${item.b}</div>
            </div>
        </div>
    `).join('');

    const doc = printIframe.contentWindow.document;
    doc.open();
    doc.write(`<html><head><style>@page { size: A4; margin: 0; } body { margin: 0; padding: 8mm 6mm; }</style></head><body>${itemsHtml}</body></html>`);
    doc.close();

    setTimeout(() => {
        printIframe.contentWindow.focus();
        printIframe.contentWindow.print();
    }, 600);
}

// --- АВТОРИЗАЦІЯ ---
async function loginSmartKasa() {
    const user = document.getElementById('l-user').value;
    const pass = document.getElementById('l-pass').value;
    const btn = document.querySelector('#auth-overlay button');
    
    if(!user || !pass) return alert("Введіть дані!");
    
    btn.disabled = true;
    btn.innerText = "Вхід...";

    try {
        const res = await fetch("https://api-v2.smartkasa.ua/api/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Api-Key": SECRET_API_KEY },
            body: JSON.stringify({ grant_type: "password", username: user, password: pass })
        });
        const data = await res.json();
        if (data.access_token) {
            smartKasaToken = data.access_token;
            document.getElementById('auth-overlay').style.display = 'none';
        } else {
            alert("Помилка входу!");
        }
    } catch (e) {
        alert("Помилка мережі");
    } finally {
        btn.disabled = false;
        btn.innerText = "Увійти";
    }
}
