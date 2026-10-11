(() => {
  'use strict';
  const api = 'https://gipoeflaomhaqplrodus.supabase.co';
  const key = 'sb_publishable_fqCg_TepQMgyEea3cSg8hQ_7IAn-IDF';
  const storageKey = 'lingwen-test-session-v1';
  const form = document.getElementById('login-form');
  const button = document.getElementById('login-button');
  const message = document.getElementById('login-message');
  const loginPanel = document.getElementById('login-panel');
  const accountPanel = document.getElementById('account-panel');
  const userEmail = document.getElementById('user-email');
  const ordersNode = document.getElementById('orders');
  const logoutButton = document.getElementById('logout-button');
  let session = null;

  function announce(text, good = false) {
    message.textContent = text;
    message.classList.toggle('ok', good);
  }
  function saveSession(data) {
    if (!data?.access_token || !data?.refresh_token) throw new Error('登录响应不完整');
    session = {access_token: data.access_token, refresh_token: data.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600)};
    sessionStorage.setItem(storageKey, JSON.stringify(session));
  }
  function clearSession() {
    session = null;
    sessionStorage.removeItem(storageKey);
    userEmail.textContent = '';
    ordersNode.textContent = '';
    accountPanel.classList.add('hidden');
    loginPanel.classList.remove('hidden');
  }
  async function request(path, {method = 'GET', token, body} = {}) {
    const headers = {apikey: key};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body) headers['Content-Type'] = 'application/json';
    const response = await fetch(api + path, {method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store'});
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || data?.error || `请求失败（${response.status}）`);
    return data;
  }
  async function validToken() {
    if (!session) throw new Error('请先登录');
    if (Date.now() / 1000 > session.expires_at - 60) {
      const next = await request('/auth/v1/token?grant_type=refresh_token', {method:'POST', body:{refresh_token:session.refresh_token}});
      saveSession(next);
    }
    return session.access_token;
  }
  async function showAccount() {
    const token = await validToken();
    const user = await request('/auth/v1/user', {token});
    if (!user?.id) throw new Error('无法验证当前账号');
    userEmail.textContent = user.email || '已验证用户';
    loginPanel.classList.add('hidden');
    accountPanel.classList.remove('hidden');
    ordersNode.textContent = '正在读取订单…';
    try {
      const rows = await request('/rest/v1/design_orders?select=id,status,product_code,created_at&order=created_at.desc&limit=20', {token});
      if (!Array.isArray(rows)) throw new Error('订单响应格式不正确');
      ordersNode.replaceChildren();
      if (!rows.length) { ordersNode.textContent = '暂无订单。当前也尚未开放在线购买。'; return; }
      for (const order of rows) {
        const row = document.createElement('div'); row.className = 'order';
        const title = document.createElement('b'); title.textContent = `${order.product_code === 'single_design' ? '单次设计方案' : '设计订单'} · ${order.status || '待核验'}`;
        const date = document.createElement('small'); date.textContent = order.created_at ? new Date(order.created_at).toLocaleString('zh-CN') : '';
        row.append(title, date); ordersNode.append(row);
      }
    } catch (_) { ordersNode.textContent = '暂时无法读取订单，请稍后刷新重试。'; }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    button.disabled = true; announce('正在验证账号…');
    try {
      const email = document.getElementById('email').value.trim();
      const passwordInput = document.getElementById('password');
      const password = passwordInput.value;
      const data = await request('/auth/v1/token?grant_type=password', {method:'POST', body:{email,password}});
      passwordInput.value = '';
      saveSession(data);
      await showAccount();
      announce('登录成功', true);
    } catch (error) {
      document.getElementById('password').value = '';
      clearSession();
      announce(error.message === 'Invalid login credentials' ? '邮箱或密码不正确，或账号尚未完成验证。' : `登录失败：${error.message}`);
    } finally { button.disabled = false; }
  });
  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    let serverConfirmed = false;
    try { if (session) { await request('/auth/v1/logout?scope=local', {method:'POST', token: await validToken()}); serverConfirmed = true; } }
    catch (_) { /* Local tokens are still discarded. */ }
    clearSession();
    announce(serverConfirmed ? '已退出登录' : '已清除本浏览器登录信息，但服务器注销未确认；请勿在共享设备上继续使用。', serverConfirmed);
    logoutButton.disabled = false;
  });
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) { session = JSON.parse(stored); showAccount().catch(() => {clearSession(); announce('登录状态已失效，请重新登录。');}); }
  } catch (_) { clearSession(); }
})();

