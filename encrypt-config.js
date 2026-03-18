const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');
const configKeyPath = path.join(__dirname, '.key');

function getEncryptionKey() {
  if (fs.existsSync(configKeyPath)) {
    return fs.readFileSync(configKeyPath, 'utf8');
  }
  const key = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(configKeyPath, key, { mode: 0o600 });
  return key;
}

function encrypt(text) {
  if (!text) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

// 读取配置
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log('开始加密服务器数据...\n');

// 加密管理员密码
if (config.admin && config.admin.password && !config.admin.password.includes(':')) {
  config.admin.password = encrypt(config.admin.password);
  console.log('✓ 管理员密码已加密');
}

// 加密所有服务器敏感字段
if (config.servers) {
  config.servers = config.servers.map(s => {
    console.log(`处理服务器: ${s.name}`);
    
    // 加密 host (IP/域名)
    if (s.host) {
      s._host = s.host;
      s.host = encrypt(s.host);
      console.log(`  - host: ${s._host} → 已加密`);
    }
    
    // 加密 port
    if (s.port) {
      s._port = s.port;
      s.port = encrypt(String(s.port));
      console.log(`  - port: ${s._port} → 已加密`);
    }
    
    // 加密 username
    if (s.username) {
      s._username = s.username;
      s.username = encrypt(s.username);
      console.log(`  - username: ${s._username} → 已加密`);
    }
    
    // 加密 password
    if (s.password && !s.password.includes(':')) {
      s._plainPassword = s.password;
      s.password = encrypt(s.password);
      console.log(`  - password: *** → 已加密`);
    }
    
    // 加密 privateKey
    if (s.privateKey && !s.privateKey.includes(':')) {
      s._plainKey = s.privateKey;
      s.privateKey = encrypt(s.privateKey);
      console.log(`  - privateKey: *** → 已加密`);
    }
    
    // 加密 passphrase
    if (s.passphrase && !s.passphrase.includes(':')) {
      s.passphrase = encrypt(s.passphrase);
      console.log(`  - passphrase: *** → 已加密`);
    }
    
    return s;
  });
}

// 保存
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('\n✅ 加密完成！');
