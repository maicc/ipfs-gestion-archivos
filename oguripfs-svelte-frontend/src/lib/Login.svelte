<script>
  let email = '';
  let password = '';
  let loading = false;
  let error = '';
  let showPassword = false;

  // Cambia esta URL por la de tu backend TypeScript
  const AUTH_URL = 'https://tu-auth-backend.com';

  async function handleLogin() {
    if (!email || !password) {
      error = 'Completa todos los campos';
      return;
    }

    loading = true;
    error = '';

    try {
      const res = await fetch(`${AUTH_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        error = data.message || 'Credenciales incorrectas';
        return;
      }

      // Guarda el JWT en localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirige al drive
     window.location.href = '/#/drive';

    } catch (e) {
      error = 'Error de conexión. Intenta de nuevo.';
    } finally {
      loading = false;
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') handleLogin();
  }
</script>

<div class="root">
  <!-- Panel izquierdo decorativo -->
  <div class="panel-left">
    <div class="brand">
      <div class="logo">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="3" fill="white" fill-opacity="0.9"/>
          <rect x="18" y="2" width="12" height="12" rx="3" fill="white" fill-opacity="0.5"/>
          <rect x="2" y="18" width="12" height="12" rx="3" fill="white" fill-opacity="0.5"/>
          <rect x="18" y="18" width="12" height="12" rx="3" fill="white" fill-opacity="0.2"/>
        </svg>
      </div>
      <span class="brand-name">Vaultex</span>
    </div>

    <div class="panel-content">
      <h1 class="panel-title">Tu almacenamiento,<br/>para siempre.</h1>
      <p class="panel-sub">Archivos protegidos en la blockchain. Sin servidores centrales. Sin sorpresas.</p>

      <div class="features">
        <div class="feature">
          <div class="feature-icon">⛓</div>
          <div>
            <div class="feature-title">Inmutable</div>
            <div class="feature-desc">Tus archivos viven en la red descentralizada</div>
          </div>
        </div>
        <div class="feature">
          <div class="feature-icon">🔒</div>
          <div>
            <div class="feature-title">Garantizado</div>
            <div class="feature-desc">Contrato on-chain con fecha de expiración visible</div>
          </div>
        </div>
        <div class="feature">
          <div class="feature-icon">⚡</div>
          <div>
            <div class="feature-title">Rápido</div>
            <div class="feature-desc">Gateway propio con cache de alta velocidad</div>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-footer">
      Almacenamiento descentralizado · Desde $3/mes
    </div>

    <!-- Decoración de fondo -->
    <div class="bg-circle c1"></div>
    <div class="bg-circle c2"></div>
    <div class="bg-circle c3"></div>
  </div>

  <!-- Panel derecho: formulario -->
  <div class="panel-right">
    <div class="form-wrapper">
      <div class="form-header">
        <h2 class="form-title">Bienvenido de nuevo</h2>
        <p class="form-sub">Ingresa a tu drive seguro</p>
      </div>

      <div class="form">
        <div class="field">
          <label for="email">Correo electrónico</label>
          <div class="input-wrap" class:focused={email}>
            <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
            <input
              id="email"
              type="email"
              placeholder="tu@correo.com"
              bind:value={email}
              on:keydown={handleKeydown}
              disabled={loading}
            />
          </div>
        </div>

        <div class="field">
          <label for="password">Contraseña</label>
          <div class="input-wrap" class:focused={password}>
            <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              bind:value={password}
              on:keydown={handleKeydown}
              disabled={loading}
            />
            <button
              class="toggle-pw"
              type="button"
              on:click={() => showPassword = !showPassword}
              tabindex="-1"
            >
              {#if showPassword}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              {:else}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              {/if}
            </button>
          </div>
        </div>

        {#if error}
          <div class="error-msg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        {/if}

        <button
          class="btn-login"
          on:click={handleLogin}
          disabled={loading}
        >
          {#if loading}
            <span class="spinner"></span>
            Verificando...
          {:else}
            Entrar al drive
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          {/if}
        </button>

        <div class="divider">
          <span>¿No tienes cuenta?</span>
        </div>

        <a href="/register" class="btn-register">
          Crear cuenta gratis
        </a>
      </div>

      <p class="legal">
        Al continuar aceptas nuestros <a href="/terms">Términos</a> y <a href="/privacy">Privacidad</a>
      </p>
    </div>
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    background: #0a0a0f;
  }

  .root {
    display: flex;
    min-height: 100vh;
    font-family: 'DM Sans', sans-serif;
  }

  /* ── Panel izquierdo ── */
  .panel-left {
    position: relative;
    width: 48%;
    background: linear-gradient(145deg, #0d1b3e 0%, #0a0f2e 40%, #050818 100%);
    display: flex;
    flex-direction: column;
    padding: 48px;
    overflow: hidden;
    color: white;
  }

  .bg-circle {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
  }
  .c1 {
    width: 400px; height: 400px;
    background: rgba(99, 102, 241, 0.18);
    top: -100px; left: -100px;
  }
  .c2 {
    width: 300px; height: 300px;
    background: rgba(16, 185, 129, 0.1);
    bottom: 100px; right: -80px;
  }
  .c3 {
    width: 200px; height: 200px;
    background: rgba(245, 158, 11, 0.08);
    bottom: -60px; left: 60px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 1;
  }

  .brand-name {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 20px;
    letter-spacing: -0.5px;
    color: white;
  }

  .panel-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    z-index: 1;
    max-width: 420px;
  }

  .panel-title {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: clamp(28px, 3vw, 42px);
    line-height: 1.15;
    letter-spacing: -1px;
    color: white;
    margin-bottom: 16px;
  }

  .panel-sub {
    font-size: 15px;
    color: rgba(255,255,255,0.55);
    line-height: 1.6;
    margin-bottom: 48px;
    font-weight: 300;
  }

  .features {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .feature {
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }

  .feature-icon {
    font-size: 20px;
    margin-top: 2px;
    flex-shrink: 0;
  }

  .feature-title {
    font-family: 'Syne', sans-serif;
    font-weight: 600;
    font-size: 14px;
    color: white;
    margin-bottom: 3px;
  }

  .feature-desc {
    font-size: 13px;
    color: rgba(255,255,255,0.45);
    font-weight: 300;
    line-height: 1.5;
  }

  .panel-footer {
    font-size: 12px;
    color: rgba(255,255,255,0.25);
    z-index: 1;
    font-weight: 300;
  }

  /* ── Panel derecho ── */
  .panel-right {
    flex: 1;
    background: #f8f7f4;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 32px;
  }

  .form-wrapper {
    width: 100%;
    max-width: 380px;
  }

  .form-header {
    margin-bottom: 36px;
  }

  .form-title {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 26px;
    color: #0d0d14;
    letter-spacing: -0.5px;
    margin-bottom: 6px;
  }

  .form-sub {
    font-size: 14px;
    color: #888;
    font-weight: 300;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  label {
    font-size: 13px;
    font-weight: 500;
    color: #444;
    letter-spacing: 0.01em;
  }

  .input-wrap {
    display: flex;
    align-items: center;
    background: white;
    border: 1.5px solid #e5e3de;
    border-radius: 10px;
    padding: 0 14px;
    gap: 10px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .input-wrap:focus-within {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
  }

  .input-icon {
    color: #aaa;
    flex-shrink: 0;
  }

  input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    color: #0d0d14;
    padding: 13px 0;
  }

  input::placeholder {
    color: #bbb;
    font-weight: 300;
  }

  input:disabled {
    opacity: 0.5;
  }

  .toggle-pw {
    background: none;
    border: none;
    cursor: pointer;
    color: #aaa;
    padding: 0;
    display: flex;
    align-items: center;
    transition: color 0.2s;
  }

  .toggle-pw:hover { color: #555; }

  .error-msg {
    display: flex;
    align-items: center;
    gap: 7px;
    background: #fff1f1;
    border: 1px solid #fecaca;
    color: #dc2626;
    font-size: 13px;
    padding: 10px 14px;
    border-radius: 8px;
    font-weight: 400;
  }

  .btn-login {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    background: #0d1b3e;
    color: white;
    border: none;
    border-radius: 10px;
    font-family: 'Syne', sans-serif;
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    margin-top: 4px;
  }

  .btn-login:hover:not(:disabled) {
    background: #162550;
    box-shadow: 0 4px 20px rgba(13,27,62,0.3);
    transform: translateY(-1px);
  }

  .btn-login:active:not(:disabled) {
    transform: translateY(0);
  }

  .btn-login:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .spinner {
    width: 15px;
    height: 15px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .divider {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #bbb;
    font-size: 13px;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e5e3de;
  }

  .btn-register {
    display: block;
    text-align: center;
    width: 100%;
    padding: 13px;
    background: transparent;
    color: #0d1b3e;
    border: 1.5px solid #d4d0c8;
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    font-size: 14px;
    text-decoration: none;
    transition: border-color 0.2s, background 0.2s;
  }

  .btn-register:hover {
    border-color: #0d1b3e;
    background: rgba(13,27,62,0.04);
  }

  .legal {
    margin-top: 24px;
    font-size: 12px;
    color: #aaa;
    text-align: center;
    font-weight: 300;
    line-height: 1.6;
  }

  .legal a {
    color: #6366f1;
    text-decoration: none;
  }

  .legal a:hover { text-decoration: underline; }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .panel-left { display: none; }
    .panel-right {
      background: #f8f7f4;
      padding: 32px 24px;
    }
  }
</style>
