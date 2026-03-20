async function loginSmartKasa() {
    const phone = document.getElementById('auth-phone').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        const r = await fetch('https://core.smartkasa.ua/api/v1/auth/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Api-Key': SECRET_API_KEY },
            body: JSON.stringify({ session: { phone_number: phone, password: pass } })
        });
        const res = await r.json();
        if (r.ok) {
            smartKasaToken = res.data.access;
            document.getElementById('auth-overlay').style.display = 'none';
            document.getElementById('main-ui').style.display = 'block';
            document.getElementById('api-status').classList.add('online');
        } else { alert("Вхід не вдався"); }
    } catch (e) { alert("Помилка API"); }
}

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function triggerFeedback(success) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
    osc.connect(g); g.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(success ? 880 : 220, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    if (navigator.vibrate) navigator.vibrate(success ? 70 : 200);
}
