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

function prepareAndPrint() {
    if(!printQueue.length) return;
    
    // Створюємо тимчасовий контейнер для друку, якщо його ще немає
    let printArea = document.getElementById('print-area');
    if (!printArea) {
        printArea = document.createElement('div');
        printArea.id = 'print-area';
        document.body.appendChild(printArea);
    }
    
    let htmlContent = '';

    // Геруємо контент (по 18 штук на А4)
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

    printArea.innerHTML = htmlContent;

    // Запускаємо друк
    window.print();
    
    // Очищуємо після друку
    printArea.innerHTML = '';
}
