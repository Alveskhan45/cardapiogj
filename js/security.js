/* ============================================================
   SEGURANÇA - VALIDAÇÃO, SANITIZAÇÃO E PROTEÇÃO
   ============================================================ */

/**
 * Sistema de segurança robusto para o CardápioGJ
 * - Validação de inputs
 * - Sanitização contra XSS
 * - CSRF protection
 * - Rate limiting
 * - Session management
 * - Password security
 */

/* ============================================================
   1. VALIDAÇÃO DE INPUTS
   ============================================================ */

/**
 * Valida e sanitiza strings para prevenir XSS
 * @param {string} input - String a validar
 * @returns {string} String sanitizada
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  
  // Remove scripts e tags perigosas
  const div = document.createElement('div');
  div.textContent = input;
  let sanitized = div.innerHTML;
  
  // Remove caracteres de controle
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Limita comprimento
  return sanitized.substring(0, 500);
}

/**
 * Valida email
 * @param {string} email - Email a validar
 * @returns {boolean}
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Valida telefone (Brasil)
 * @param {string} phone - Telefone a validar
 * @returns {boolean}
 */
function isValidPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 11 && /^[1-9]\d{9}$/.test(cleaned);
}

/**
 * Valida CEP (Brasil)
 * @param {string} cep - CEP a validar
 * @returns {boolean}
 */
function isValidCEP(cep) {
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.length === 8 && /^\d{8}$/.test(cleaned);
}

/**
 * Valida CPF (Brasil)
 * @param {string} cpf - CPF a validar
 * @returns {boolean}
 */
function isValidCPF(cpf) {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  // Validar primeiro dígito
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(cleaned[9]) !== digit1) return false;
  
  // Validar segundo dígito
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(cleaned[10]) === digit2;
}

/**
 * Valida URL
 * @param {string} url - URL a validar
 * @returns {boolean}
 */
function isValidURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida número de cartão (Luhn algorithm)
 * @param {string} cardNumber - Número do cartão
 * @returns {boolean}
 */
function isValidCardNumber(cardNumber) {
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (cleaned.length < 13 || cleaned.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Valida valores monetários
 * @param {number|string} value - Valor a validar
 * @returns {boolean}
 */
function isValidPrice(value) {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0 && num <= 999999.99;
}

/**
 * Valida quantidade
 * @param {number|string} qty - Quantidade a validar
 * @returns {boolean}
 */
function isValidQuantity(qty) {
  const num = parseInt(qty);
  return !isNaN(num) && num >= 1 && num <= 10000;
}

/**
 * Valida senha
 * Requisitos: mín. 8 caracteres, 1 maiúscula, 1 número
 * @param {string} password - Senha a validar
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validatePassword(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Pelo menos 1 letra maiúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Pelo menos 1 número');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Pelo menos 1 caractere especial (!@#$%^&*)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/* ============================================================
   2. SANITIZAÇÃO CONTRA XSS
   ============================================================ */

/**
 * Escapa caracteres HTML
 * @param {string} text - Texto a escapar
 * @returns {string}
 */
function escapeHTML(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Remove scripts e tags perigosas
 * @param {string} html - HTML a sanitizar
 * @returns {string}
 */
function sanitizeHTML(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // Remove scripts
  div.querySelectorAll('script, style, iframe, object, embed').forEach(el => {
    el.remove();
  });
  
  // Remove event handlers
  div.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(attr => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  
  return div.innerHTML;
}

/**
 * Remove tags HTML mantendo apenas texto
 * @param {string} html - HTML a processar
 * @returns {string}
 */
function stripHTML(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/* ============================================================
   3. PROTEÇÃO CSRF
   ============================================================ */

/**
 * Gera token CSRF
 * @returns {string}
 */
function generateCSRFToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Valida token CSRF
 * @param {string} token - Token a validar
 * @param {string} stored - Token armazenado
 * @returns {boolean}
 */
function validateCSRFToken(token, stored) {
  if (!token || !stored) return false;
  return token === stored && token.length === 64;
}

/**
 * Inicializa proteção CSRF
 */
function initCSRFProtection() {
  // Gera token na inicialização
  let csrfToken = sessionStorage.getItem('csrf-token');
  
  if (!csrfToken) {
    csrfToken = generateCSRFToken();
    sessionStorage.setItem('csrf-token', csrfToken);
  }
  
  // Adiciona token em todos os formulários
  document.querySelectorAll('form').forEach(form => {
    if (!form.querySelector('input[name="csrf-token"]')) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'csrf-token';
      input.value = csrfToken;
      form.appendChild(input);
    }
  });
}

/**
 * Retorna token CSRF para requisições
 * @returns {string}
 */
function getCSRFToken() {
  return sessionStorage.getItem('csrf-token') || '';
}

/* ============================================================
   4. RATE LIMITING
   ============================================================ */

class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }
  
  /**
   * Verifica se está dentro do limite
   * @param {string} key - Identificador único
   * @returns {object} { allowed: boolean, remaining: number, resetTime: number }
   */
  check(key) {
    const now = Date.now();
    const record = this.attempts.get(key);
    
    if (!record) {
      this.attempts.set(key, { count: 1, startTime: now });
      return { allowed: true, remaining: this.maxAttempts - 1, resetTime: now + this.windowMs };
    }
    
    // Reseta se passou a janela de tempo
    if (now - record.startTime > this.windowMs) {
      this.attempts.set(key, { count: 1, startTime: now });
      return { allowed: true, remaining: this.maxAttempts - 1, resetTime: now + this.windowMs };
    }
    
    record.count++;
    
    if (record.count > this.maxAttempts) {
      return { allowed: false, remaining: 0, resetTime: record.startTime + this.windowMs };
    }
    
    return { allowed: true, remaining: this.maxAttempts - record.count, resetTime: record.startTime + this.windowMs };
  }
  
  /**
   * Reseta o contador para uma chave
   * @param {string} key
   */
  reset(key) {
    this.attempts.delete(key);
  }
  
  /**
   * Limpa entradas expiradas
   */
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.attempts) {
      if (now - record.startTime > this.windowMs) {
        this.attempts.delete(key);
      }
    }
  }
}

// Limitadores por tipo
const loginLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 tentativas em 15 min
const apiBLimiter = new RateLimiter(30, 60 * 1000);      // 30 requisições em 1 min
const checkoutLimiter = new RateLimiter(10, 5 * 60 * 1000); // 10 checkouts em 5 min

/**
 * Valida tentativa de login
 * @param {string} identifier - Email ou username
 * @returns {object}
 */
function checkLoginAttempt(identifier) {
  const limiter = loginLimiter.check(identifier);
  
  if (!limiter.allowed) {
    const minutesLeft = Math.ceil((limiter.resetTime - Date.now()) / 1000 / 60);
    return {
      allowed: false,
      message: `Muitas tentativas. Tente novamente em ${minutesLeft} minuto(s)`,
      resetTime: limiter.resetTime
    };
  }
  
  return { allowed: true, remaining: limiter.remaining };
}

/* ============================================================
   5. GERENCIAMENTO DE SESSÃO
   ============================================================ */

class SessionManager {
  constructor(timeoutMs = 30 * 60 * 1000) {
    this.timeoutMs = timeoutMs;
    this.lastActivity = Date.now();
    this.sessionId = this.generateSessionId();
    this.initializeListeners();
  }
  
  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  initializeListeners() {
    // Atualiza atividade em mousemove e keypress
    document.addEventListener('mousemove', () => this.recordActivity());
    document.addEventListener('keypress', () => this.recordActivity());
    document.addEventListener('click', () => this.recordActivity());
    
    // Verifica timeout periodicamente
    setInterval(() => this.checkTimeout(), 60000); // A cada 1 minuto
  }
  
  recordActivity() {
    this.lastActivity = Date.now();
    this.updateSessionStorage();
  }
  
  checkTimeout() {
    const elapsed = Date.now() - this.lastActivity;
    
    if (elapsed > this.timeoutMs) {
      this.logout('Sua sessão expirou por inatividade');
    }
  }
  
  updateSessionStorage() {
    sessionStorage.setItem('session-id', this.sessionId);
    sessionStorage.setItem('last-activity', this.lastActivity.toString());
  }
  
  logout(message = 'Você foi desconectado') {
    sessionStorage.clear();
    localStorage.removeItem('auth-token');
    showAlert('warning', message);
    window.location.reload();
  }
  
  isActive() {
    return (Date.now() - this.lastActivity) < this.timeoutMs;
  }
}

const sessionManager = new SessionManager(30 * 60 * 1000); // 30 minutos

/* ============================================================
   6. PROTEÇÃO DE SENHA
   ============================================================ */

/**
 * Valida força da senha
 * @param {string} password - Senha a validar
 * @returns {object} { score: number, strength: string, feedback: string[] }
 */
function checkPasswordStrength(password) {
  let score = 0;
  const feedback = [];
  
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 25;
  
  if (password.length < 8) feedback.push('Use pelo menos 8 caracteres');
  if (!/[a-z]/.test(password)) feedback.push('Adicione letras minúsculas');
  if (!/[A-Z]/.test(password)) feedback.push('Adicione letras maiúsculas');
  if (!/[0-9]/.test(password)) feedback.push('Adicione números');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    feedback.push('Adicione caracteres especiais');
  }
  
  let strength = 'Fraca';
  if (score >= 80) strength = 'Muito Forte';
  else if (score >= 60) strength = 'Forte';
  else if (score >= 40) strength = 'Média';
  
  return { score: Math.min(score, 100), strength, feedback };
}

/**
 * Gera senha segura aleatória
 * @param {number} length - Comprimento da senha
 * @returns {string}
 */
function generateSecurePassword(length = 16) {
  const chars = {
    lower: 'abcdefghijklmnopqrstuvwxyz',
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    special: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };
  
  const allChars = chars.lower + chars.upper + chars.numbers + chars.special;
  let password = '';
  
  // Garante pelo menos um de cada tipo
  password += chars.lower[Math.floor(Math.random() * chars.lower.length)];
  password += chars.upper[Math.floor(Math.random() * chars.upper.length)];
  password += chars.numbers[Math.floor(Math.random() * chars.numbers.length)];
  password += chars.special[Math.floor(Math.random() * chars.special.length)];
  
  // Preenche o resto aleatoriamente
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Embaralha
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/* ============================================================
   7. VALIDAÇÃO DE CARRINHO (Server-side simulation)
   ============================================================ */

/**
 * Valida carrinho e recalcula valores
 * IMPORTANTE: Isso é simulação. Sempre validar no servidor!
 * @param {array} items - Itens do carrinho
 * @param {object} products - Produtos disponíveis
 * @param {string} coupon - Código do cupom
 * @returns {object} { valid: boolean, errors: string[], total: number }
 */
function validateCart(items, products, coupon = '') {
  const errors = [];
  
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('Carrinho vazio');
    return { valid: false, errors, total: 0 };
  }
  
  let total = 0;
  
  // Valida cada item
  for (const item of items) {
    if (!item.id || !isValidQuantity(item.qty)) {
      errors.push(`Item inválido: ${item.name || 'desconhecido'}`);
      continue;
    }
    
    const product = products.find(p => p.id === item.id);
    if (!product) {
      errors.push(`Produto não encontrado: ${item.id}`);
      continue;
    }
    
    if (product.stock < item.qty) {
      errors.push(`${product.name}: apenas ${product.stock} disponível(is)`);
      continue;
    }
    
    if (!isValidPrice(product.price)) {
      errors.push(`${product.name}: preço inválido`);
      continue;
    }
    
    total += product.price * item.qty;
  }
  
  return {
    valid: errors.length === 0,
    errors,
    total
  };
}

/* ============================================================
   8. LOG DE SEGURANÇA
   ============================================================ */

class SecurityLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100;
  }
  
  log(event, level = 'info', details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      level, // 'info', 'warning', 'error', 'critical'
      userAgent: navigator.userAgent,
      url: window.location.href,
      details
    };
    
    this.logs.push(entry);
    
    // Mantém apenas os últimos logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Também envia para console em desenvolvimento
    if (level === 'critical' || level === 'error') {
      console.error(`[${level.toUpperCase()}] ${event}`, details);
    } else {
      console.log(`[${level.toUpperCase()}] ${event}`, details);
    }
  }
  
  getLogs() {
    return this.logs;
  }
  
  sendToServer() {
    // Envia logs críticos para o servidor
    if (this.logs.some(l => l.level === 'critical')) {
      const criticalLogs = this.logs.filter(l => l.level === 'critical');
      // Aqui você enviaria para um endpoint
      console.log('Enviando logs críticos para o servidor:', criticalLogs);
    }
  }
}

const securityLogger = new SecurityLogger();

/* ============================================================
   9. INICIALIZAÇÃO DE SEGURANÇA
   ============================================================ */

function initializeSecurity() {
  // Inicia proteção CSRF
  initCSRFProtection();
  
  // Inicia gerenciamento de sessão
  const session = new SessionManager();
  
  // Log de inicialização
  securityLogger.log('Security initialized', 'info', {
    csrfToken: getCSRFToken().substring(0, 8) + '...',
    sessionId: session.sessionId.substring(0, 8) + '...'
  });
  
  // Limpeza periódica de rate limiters
  setInterval(() => {
    loginLimiter.cleanup();
    apiLimiter.cleanup();
    checkoutLimiter.cleanup();
  }, 5 * 60 * 1000); // A cada 5 minutos
}

// Inicia segurança quando DOM está pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSecurity);
} else {
  initializeSecurity();
}

/* ============================================================
   10. UTILITÁRIOS DE SEGURANÇA
   ============================================================ */

/**
 * Exibe alerta de segurança
 * @param {string} type - 'success', 'info', 'warning', 'error'
 * @param {string} message - Mensagem
 * @param {number} duration - Duração em ms
 */
function showSecurityAlert(type, message, duration = 5000) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <div class="alert-icon">
      ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
    </div>
    <div class="alert-content">
      <p>${escapeHTML(message)}</p>
    </div>
  `;
  
  document.body.appendChild(alert);
  
  setTimeout(() => {
    alert.style.animation = 'slideUp 0.3s ease';
    setTimeout(() => alert.remove(), 300);
  }, duration);
}

/**
 * Verifica se é HTTPS
 * @returns {boolean}
 */
function isSecureConnection() {
  return window.location.protocol === 'https:' || window.location.hostname === 'localhost';
}

/**
 * Avisa sobre conexão insegura
 */
function checkSecureConnection() {
  if (!isSecureConnection() && window.location.hostname !== 'localhost') {
    securityLogger.log('Insecure connection detected', 'warning');
    console.warn('⚠️ Você está usando uma conexão não segura. Use HTTPS em produção!');
  }
}

checkSecureConnection();

/* ============================================================
   EXPORTS (para uso em outros módulos)
   ============================================================ */

const SECURITY = {
  // Validação
  sanitizeInput,
  isValidEmail,
  isValidPhone,
  isValidCEP,
  isValidCPF,
  isValidURL,
  isValidCardNumber,
  isValidPrice,
  isValidQuantity,
  validatePassword,
  
  // Sanitização
  escapeHTML,
  sanitizeHTML,
  stripHTML,
  
  // CSRF
  generateCSRFToken,
  validateCSRFToken,
  getCSRFToken,
  
  // Rate Limiting
  loginLimiter,
  apiLimiter,
  checkoutLimiter,
  checkLoginAttempt,
  
  // Sessão
  sessionManager,
  
  // Senha
  checkPasswordStrength,
  generateSecurePassword,
  
  // Validação do Carrinho
  validateCart,
  
  // Logging
  securityLogger,
  
  // Utilitários
  showSecurityAlert,
  isSecureConnection
};
