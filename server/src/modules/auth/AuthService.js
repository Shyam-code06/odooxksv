import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import UserRepository from '../user/UserRepository.js';
import SessionRepository from './SessionRepository.js';
import AuditLogRepository from '../auditlog/AuditLogRepository.js';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError
} from '../../utils/customErrors.js';

const userRepo = new UserRepository();
const sessionRepo = new SessionRepository();
const auditRepo = new AuditLogRepository();

export default class AuthService {
  /**
   * Log user in, generate tokens, and audit session
   */
  async login(username, password) {
    if (!username || !password) {
      throw new BadRequestError('Username and password are required.');
    }

    // 1. Fetch user by username
    const user = await userRepo.findByUsername(username);
    if (!user) {
      throw new UnauthorizedError('Invalid username or password.');
    }

    // 2. Check active status
    if (!user.isactive) {
      throw new ForbiddenError('Your account is deactivated. Please contact your administrator.');
    }

    // 3. Verify password
    const isMatch = await bcrypt.compare(password, user.passwordhash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid username or password.');
    }

    // 4. Fetch roles and permissions
    const permissions = await userRepo.getUserPermissions(user.roleid);

    // 5. Generate tokens
    const accessToken = this.generateAccessToken(user, permissions);
    const refreshToken = this.generateRefreshToken(user);

    // 6. Record Session in Database
    const jwtDecoded = jwt.decode(refreshToken);
    const expiresAt = jwtDecoded && jwtDecoded.exp 
      ? new Date(jwtDecoded.exp * 1000) 
      : new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years fallback

    await sessionRepo.create({
      userid: user.id,
      refreshtoken: refreshToken,
      expiresat: expiresAt,
      isrevoked: false
    });

    await auditRepo.logEvent({
      userid: user.id,
      action: 'login',
      module: 'auth'
    });

    // Remove password hash from response user object
    const { passwordhash, ...safeUser } = user;
    safeUser.permissions = permissions;

    return {
      accessToken,
      refreshToken,
      user: safeUser
    };
  }

  /**
   * Log user out, invalidate refresh token, and log audit event
   */
  async logout(refreshToken) {
    if (!refreshToken) {
      throw new BadRequestError('Refresh token is required for logout.');
    }

    // 1. Find session
    const session = await sessionRepo.findByRefreshToken(refreshToken);
    if (!session || session.isrevoked) {
      // Return success anyway to keep logout idempotent
      return { message: 'Logged out successfully' };
    }

    // 2. Revoke session
    await sessionRepo.revokeRefreshToken(refreshToken);

    await auditRepo.logEvent({
      userid: session.userid,
      action: 'logout',
      module: 'auth'
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Generate new access token using a valid refresh token
   */
  async refresh(refreshToken) {
    if (!refreshToken) {
      throw new BadRequestError('Refresh token is required.');
    }

    // 1. Verify Refresh Token JWT signature
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWTREFRESHSECRET || 'supersecurerefreshjwtsecretkeyvendorbridge2026');
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired session.');
    }

    // 2. Check session in database
    const session = await sessionRepo.findByRefreshToken(refreshToken);
    if (!session || session.isrevoked || new Date(session.expiresat) < new Date()) {
      throw new UnauthorizedError('Session is invalid or has expired.');
    }

    // 3. Find User
    const user = await userRepo.findById(session.userid);
    if (!user) {
      throw new UnauthorizedError('User not found.');
    }

    if (!user.isactive) {
      throw new ForbiddenError('User account is deactivated.');
    }

    // 4. Load permissions
    const permissions = await userRepo.getUserPermissions(user.roleid);

    // 5. Generate new access token
    // Attach role name by querying role or from user object
    const userWithRole = await userRepo.findByUsername(user.username);
    const accessToken = this.generateAccessToken(userWithRole, permissions);

    return { accessToken };
  }

  /**
   * Change user password, revoke all active sessions, and log audit event
   */
  async changePassword(userid, oldPassword, newPassword) {
    if (!oldPassword || !newPassword) {
      throw new BadRequestError('Old password and new password are required.');
    }

    // 1. Verify user exists
    const user = await userRepo.findById(userid);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    // 2. Compare old password
    const isMatch = await bcrypt.compare(oldPassword, user.passwordhash);
    if (!isMatch) {
      throw new BadRequestError('Incorrect current password.');
    }

    // 3. Hash and save new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    await userRepo.update(userid, { passwordhash: newPasswordHash });

    // 4. Revoke all active sessions for this user (force re-login on all devices)
    await sessionRepo.revokeUserSessions(userid);

    await auditRepo.logEvent({
      userid,
      action: 'changepassword',
      module: 'auth'
    });

    return { message: 'Password changed successfully.' };
  }

  // Helper: Create Access Token JWT
  generateAccessToken(user, permissions) {
    const payload = {
      id: user.id,
      username: user.username,
      roleid: user.roleid,
      rolename: user.rolename,
      permissions
    };
    return jwt.sign(payload, process.env.JWTSECRET || 'supersecurejwtsecretkeyvendorbridge2026');
  }

  // Helper: Create Refresh Token JWT
  generateRefreshToken(user) {
    const payload = {
      id: user.id,
      jti: crypto.randomUUID()
    };
    return jwt.sign(payload, process.env.JWTREFRESHSECRET || 'supersecurerefreshjwtsecretkeyvendorbridge2026');
  }
}
