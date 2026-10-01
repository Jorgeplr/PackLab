const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'packlab-dev-secret';

function signToken(user) {
  return jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, SECRET, { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Debes iniciar sesión.' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }
}

module.exports = { signToken, requireAuth };
