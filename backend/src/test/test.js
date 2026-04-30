const API = 'http://localhost:8080/api';
let currentUser = null;

/* ── 로그 기록 ── */
function addLog(tag, msg, type = 'info') {
    const box = document.getElementById('log-box');
    const time = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    const tagClass = { ok: 'tag-ok', err: 'tag-err', info: 'tag-info', warn: 'tag-warn' }[type] || 'tag-info';
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = `<span class="log-time">${time}</span><span class="log-tag ${tagClass}">${tag}</span><span class="log-text">${msg}</span>`;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
}

/* ── Toast 알림 ── */
function showToast(title, msg, type = 'info') {
    const wrap = document.getElementById('toast-wrap');
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || 'ℹ'}</div>
        <div class="toast-body">
            <div class="toast-title">${title}</div>
            <div class="toast-msg">${msg}</div>
        </div>`;
    wrap.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.4s';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

/* ── 에러 메시지 표시 ── */
function showError(id, msg) {
    const box = document.getElementById(id);
    box.style.display = 'block';
    box.textContent = `⚠ ${msg}`;
}

function clearError(id) {
    const box = document.getElementById(id);
    box.style.display = 'none';
    box.textContent = '';
}

/* ── 서버 에러 메시지 파싱 ── */
async function parseServerError(response) {
    try {
        const data = await response.json();
        if (data?.message) return data.message;
    } catch (_) {}

    switch (response.status) {
        case 400: return '입력 정보를 다시 확인해주세요.';
        case 401: return '아이디 또는 비밀번호가 올바르지 않습니다.';
        case 403: return '접근 권한이 없습니다.';
        case 404: return '존재하지 않는 계정입니다.';
        case 409: return '이미 사용 중인 아이디입니다.';
        case 500: return '서버 내부 오류가 발생했습니다.';
        default:  return `알 수 없는 오류 (HTTP ${response.status})`;
    }
}

/* ── 회원가입 실행 ── */
async function handleSignUp() {
    clearError('signup-error');
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const role     = document.getElementById('reg-role').value;

    if (!username || !password) {
        showError('signup-error', '아이디와 비밀번호를 입력해주세요.');
        return;
    }

    addLog('SIGNUP', `요청: username=${username}, role=${role}`, 'info');

    try {
        const res = await fetch(`${API}/members/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role }),
        });

        if (res.ok) {
            const data = await res.json();
            addLog('SIGNUP', `성공 → id=${data.id}, role=${data.role}`, 'ok');
            showToast('회원가입 성공', `${username} 계정이 생성되었습니다.`, 'success');
            document.getElementById('reg-username').value = '';
            document.getElementById('reg-password').value = '';
        } else {
            const msg = await parseServerError(res);
            addLog('SIGNUP', `실패 [${res.status}] ${msg}`, 'err');
            showError('signup-error', msg);
            showToast('회원가입 실패', msg, 'error');
        }
    } catch (e) {
        const msg = '서버에 연결할 수 없습니다.';
        addLog('SIGNUP', msg, 'err');
        showError('signup-error', msg);
    }
}

/* ── 로그인 실행 ── */
async function handleLogin() {
    clearError('login-error');
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        showError('login-error', '아이디와 비밀번호를 입력해주세요.');
        return;
    }

    addLog('LOGIN', `요청: username=${username}`, 'info');

    try {
        const res = await fetch(`${API}/members/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (res.ok) {
            const data = await res.json();
            currentUser = data;
            addLog('LOGIN', `성공 → id=${data.id}, role=${data.role}`, 'ok');
            showToast('로그인 성공', `${data.username}님 환영합니다.`, 'success');
            updateSession();
            document.getElementById('login-username').value = '';
            document.getElementById('login-password').value = '';
        } else {
            const msg = await parseServerError(res);
            addLog('LOGIN', `실패 [${res.status}] ${msg}`, 'err');
            showError('login-error', msg);
            showToast('로그인 실패', msg, 'error');
        }
    } catch (e) {
        const msg = '서버에 연결할 수 없습니다.';
        addLog('LOGIN', msg, 'err');
        showError('login-error', msg);
    }
}

/* ── 모니터링 이벤트 전송 ── */
async function sendEvent(type) {
    if (!currentUser) {
        showToast('인증 필요', '먼저 로그인을 진행해주세요.', 'error');
        addLog('EVENT', '로그인이 필요합니다.', 'warn');
        return;
    }

    addLog('EVENT', `전송: employeeId=${currentUser.id}, type=${type}`, 'info');

    try {
        const res = await fetch(`${API}/monitoring/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId: currentUser.id, eventType: type }),
        });

        const text = await res.text();
        if (res.ok) {
            addLog('EVENT', `응답: ${text || 'OK'}`, 'ok');
            if (type === 'NORMAL') addLog('EVENT', 'NORMAL 상태는 DB에 저장되지 않습니다.', 'warn');
            showToast('이벤트 전송', `${type} 상태가 전송되었습니다.`, type === 'NORMAL' ? 'info' : 'success');
        } else {
            addLog('EVENT', `실패 [${res.status}] ${text}`, 'err');
            showToast('이벤트 실패', `[${res.status}] ${text}`, 'error');
        }
    } catch (e) {
        addLog('EVENT', '서버에 연결할 수 없습니다.', 'err');
    }
}

/* ── 세션 UI 업데이트 ── */
function updateSession() {
    const banner = document.getElementById('session-banner');
    const logoutBtn = document.getElementById('logout-btn');

    if (!currentUser) {
        banner.innerHTML = `<span class="session-empty">// 로그인이 필요합니다. 아래에서 회원가입 후 로그인을 진행하세요.</span>`;
        logoutBtn.style.display = 'none';
        return;
    }

    const isManager = currentUser.role === 'MANAGER';
    const roleClass = isManager ? 'manager' : 'employee';
    const balance = (currentUser.virtualBalance ?? currentUser.balance ?? 0).toLocaleString();

    banner.innerHTML = `
        <div class="session-info">
            <div class="session-chip">
                <span class="chip-label">ID</span>
                <span class="chip-value id">#${currentUser.id}</span>
            </div>
            <div class="session-chip">
                <span class="chip-label">User</span>
                <span class="chip-value name">${currentUser.username}</span>
            </div>
            <div class="session-chip">
                <span class="chip-label">Role</span>
                <span class="chip-value role-${roleClass}">
                    <span class="role-dot ${roleClass}"></span>${currentUser.role}
                </span>
            </div>
            <div class="session-chip">
                <span class="chip-label">Balance</span>
                <span class="chip-value balance">${balance} L</span>
            </div>
        </div>`;
    logoutBtn.style.display = 'flex';
}

/* ── 로그아웃 ── */
function logout() {
    addLog('AUTH', `로그아웃: ${currentUser?.username}`, 'warn');
    showToast('로그아웃', '세션이 종료되었습니다.', 'info');
    currentUser = null;
    updateSession();
}

/* Enter 키 이벤트 리스너 */
document.getElementById('reg-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleSignUp(); });
document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });