async function startScanner(turbo) {
    document.getElementById('scanner-wrapper').style.display = 'block';
    document.querySelector('.scan-modes').style.display = 'none';
    document.getElementById('stop-btn').style.display = 'block';
    if (!codeReader) codeReader = new ZXing.BrowserMultiFormatReader();
    
    const constraints = { video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 }, focusMode: "continuous" } };

    codeReader.decodeFromConstraints(constraints, 'video', (res) => {
        if (res) {
            const code = res.getText();
            if (code !== lastCode || (Date.now() - lastTime > 2000)) {
                lastCode = code; lastTime = Date.now();
                handleScan(code, turbo);
            }
        }
    });
}

async function handleScan(code, turbo) {
    let found = null;
    try {
        const url = `https://core.smartkasa.ua/api/v1/inventory/products?number=${code}`;
        const r = await fetch(url, { headers: { 'X-Api-Key': SECRET_API_KEY, 'Authorization': `Bearer ${smartKasaToken}` }});
        const res = await r.json();
        if (r.ok && res.data?.length > 0) {
            const item = res.data[0];
            found = { name: item.title, price: Math.round(parseFloat(item.price)), unit: 'шт' };
        }
    } catch (e) {}

    if (!found) {
        const doc = await db.collection("products").doc(code).get();
        if (doc.exists) {
            const d = doc.data();
            found = { ...d, price: Math.round(parseFloat(d.price)) };
        }
    }

    if (found) {
        if (turbo) {
            if (!printQueue.some(i => i.b === code)) {
                printQueue.push({b:code, n:found.name, p:found.price, u:found.unit||'шт', op:''});
                render();
            }
            notify('success', found.name);
        } else {
            fillForm(code, found.name, found.price, found.unit);
            resetScanner();
            notify('success', found.name);
        }
    } else {
        fillForm(code, '', '', '-');
        resetScanner();
        notify('error', 'Новий товар!');
    }
}

function resetScanner() { if(codeReader) codeReader.reset(); document.getElementById('scanner-wrapper').style.display='none'; document.querySelector('.scan-modes').style.display='grid'; document.getElementById('stop-btn').style.display='none'; }
function notify(state, text) { const w = document.getElementById('scanner-wrapper'), i = document.getElementById('scan-info'); w.className = 'state-' + state; i.innerText = text; i.style.display = 'block'; triggerFeedback(state === 'success'); setTimeout(() => { w.className = ''; i.style.display = 'none'; }, 2000); }
function toggleTorch() { const videoTrack = document.querySelector('video').srcObject.getVideoTracks()[0]; isTorchOn = !isTorchOn; videoTrack.applyConstraints({ advanced: [{ torch: isTorchOn }] }).catch(()=>{}); }
