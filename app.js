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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let smartKasaToken = null, printQueue = [], codeReader = null, lastCode = null, lastTime = 0, audioCtx = null, isTorchOn = false;

function capitalizeInput(el) { if (el.value.length > 0) el.value = el.value.charAt(0).toUpperCase() + el.value.slice(1); }

function render() {
    document.getElementById('q-count').innerText = printQueue.length;
    document.getElementById('queue-list').innerHTML = printQueue.map((item, i) => `
        <div class="queue-item" onclick="editItem(${i})">
            <div style="flex:1"><b>${item.n}</b><br><small>${item.p} грн / ${item.u}</small></div>
            <div onclick="removeItem(${i}, event)" style="color:var(--danger); padding:10px; font-weight:bold;">✕</div>
        </div>`).join('');
}

function addToQueue() {
    const b = document.getElementById('p-barcode').value, 
          n = document.getElementById('p-name').value, 
          p = Math.round(parseFloat(document.getElementById('p-price').value)), 
          u = document.getElementById('p-unit').value, 
          op = document.getElementById('p-old-price').value ? Math.round(parseFloat(document.getElementById('p-old-price').value)) : '';
    
    if(!b || !n || isNaN(p)) return;
    const idx = printQueue.findIndex(i => i.b === b);
    if (idx > -1) printQueue[idx] = {b,n,p,u,op}; else printQueue.push({b,n,p,u,op});
    
    db.collection("products").doc(b).set({name:n, price:p, unit:u}, {merge:true});
    render();
    ["p-barcode", "p-name", "p-price", "p-old-price"].forEach(id => document.getElementById(id).value = "");
}

function removeItem(i, e) { e.stopPropagation(); printQueue.splice(i, 1); render(); }

function editItem(i) {
    const it = printQueue[i];
    fillForm(it.b, it.n, it.p, it.u);
    document.getElementById('p-old-price').value = it.op;
    printQueue.splice(i, 1);
    render();
}

function fillForm(b,n,p,u) {
    document.getElementById('p-barcode').value = b;
    document.getElementById('p-name').value = n;
    document.getElementById('p-price').value = p ? Math.round(p) : '';
    document.getElementById('p-unit').value = u || '-';
    setTimeout(() => document.getElementById('p-name').focus(), 300);
}

ffunction prepareAndPrint() {
    if(!printQueue.length) return;

    // Створюємо тимчасовий iframe для друку (якщо його немає)
    let printIframe = document.getElementById('print-iframe');
    if (!printIframe) {
        printIframe = document.createElement('iframe');
        printIframe.id = 'print-iframe';
        printIframe.style.position = 'absolute';
        printIframe.style.width = '0';
        printIframe.style.height = '0';
        printIframe.style.border = 'none';
        document.body.appendChild(printIframe);
    }

    let htmlContent = `
    <html>
    <head>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: sans-serif; }
            @page { size: A4; margin: 0; }
            body { background: #fff; width: 210mm; }
            .page { 
                width: 210mm; height: 290mm; padding: 8mm 6mm; 
                display: flex; flex-wrap: wrap; align-content: flex-start; 
                page-break-after: always; overflow: hidden; 
            }
            .price-tag { 
                width: 66mm; height: 44mm; border: 0.3mm dashed #999; 
                padding: 4mm; display: flex; flex-direction: column; 
                justify-content: space-between; background: white; 
            }
            .tag-name { 
                font-size: 13pt; font-weight: 800; text-transform: uppercase; 
                height: 10mm; line-height: 1.1; display: -webkit-box; 
                -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; 
            }
            .tag-body { display: flex; justify-content: space-between; align-items: flex-end; flex-grow: 1; margin-bottom: 1mm; }
            .tag-old-val { font-size: 28pt; color: #1c1c1c; font-weight: bold; position: relative; margin-left: 10mm; }
            .tag-old-val::after { content: ""; position: absolute; left: -10%; top: 50%; width: 120%; height: 1.5pt; background: #000; transform: rotate(-15deg); }
            .tag-price-big { font-size: 42pt; font-weight: 900; line-height: 0.8; letter-spacing: -1pt; }
            .tag-curr { font-size: 14pt; font-weight: bold; }
            .tag-footer { border-top: 1.5pt solid #000; display: flex; justify-content: space-between; font-size: 8.5pt; font-weight: bold; padding-top: 1mm; }
        </style>
    </head>
    <body>`;

    for (let i = 0; i < printQueue.length; i += 18) {
        const pageItems = printQueue.slice(i, i + 18);
        htmlContent += `<div class="page">`;
        htmlContent += pageItems.map(item => `
            <div class="price-tag">
                <div class="tag-name">${item.n}</div>
                <div class="tag-body">
                    <div class="tag-left">${item.op ? `<div class="tag-old-val">${item.op}</div>` : ''}</div>
                    <div class="tag-right"><span class="tag-price-big">${item.p}</span><span class="tag-curr">грн</span></div>
                </div>
                <div class="tag-footer"><div>За 1 ${item.u}</div><div>${item.b}</div></div>
            </div>`).join('');
        htmlContent += `</div>`;
    }

    htmlContent += `</body></html>`;

    // Записуємо контент в iframe
    const doc = printIframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Викликаємо друк після завантаження контенту в iframe
    printIframe.onload = function() {
        setTimeout(() => {
            printIframe.contentWindow.focus();
            printIframe.contentWindow.print();
        }, 500);
    };
    
    // Для Safari дублюємо виклик, якщо onload не спрацював миттєво
    setTimeout(() => {
        printIframe.contentWindow.focus();
        printIframe.contentWindow.print();
    }, 1000);
}
