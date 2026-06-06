import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/customErrors.js';

export default function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token is missing or invalid.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Access token is missing.');
    }

    jwt.verify(token, process.env.JWTSECRET || 'supersecurejwtsecretkeyvendorbridge2026', (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return next(new UnauthorizedError('Access token has expired.'));
        }
        return next(new UnauthorizedError('Access token is invalid.'));
      }

      // Attach decoded payload (contains id, username, roleid, rolename, permissions)
      req.user = decoded;
      next();
    });
  } catch (error) {
    next(error);
  }
}
