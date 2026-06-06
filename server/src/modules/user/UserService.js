import BaseService from '../../common/BaseService.js';
import UserRepository from './UserRepository.js';
import SessionRepository from '../auth/SessionRepository.js';
import AuditLogRepository from '../auditlog/AuditLogRepository.js';
import bcrypt from 'bcrypt';
import { ConflictError, BadRequestError, NotFoundError } from '../../utils/customErrors.js';

const userRepo = new UserRepository();
const sessionRepo = new SessionRepository();
const auditRepo = new AuditLogRepository();

export default class UserService extends BaseService {
  constructor() {
    super(userRepo);
  }

  async create(data, actorUserId) {
    const { username, email, password, roleid, firstname, lastname, phonenumber } = data;

    if (!username || !email || !password || !roleid) {
      throw new BadRequestError('Username, email, password, and role are required.');
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestError('Invalid or incomplete email format.');
    }

    if (phonenumber) {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phonenumber)) {
        throw new BadRequestError('Mobile number must be exactly 10 digits.');
      }
    }

    const existingUsername = await this.repository.findByUsername(username);
    if (existingUsername) {
      throw new ConflictError('Username is already taken.');
    }

    const existingEmail = await this.repository.findByEmail(email);
    if (existingEmail) {
      throw new ConflictError('Email is already registered.');
    }

    const saltRounds = 10;
    const passwordhash = await bcrypt.hash(password, saltRounds);

    const newUser = await this.repository.create({
      firstname,
      lastname,
      email,
      phonenumber,
      username,
      passwordhash,
      roleid,
      isactive: true
    });

    const { passwordhash: _, ...safeUser } = newUser;

    await auditRepo.logEvent({
      userid: actorUserId,
      action: 'create_user',
      module: 'user',
      newvalue: safeUser
    });

    return safeUser;
  }

  async update(id, data, actorUserId) {
    const { firstname, lastname, email, phonenumber, username, roleid, isactive } = data;
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (email && !emailRegex.test(email)) {
      throw new BadRequestError('Invalid or incomplete email format.');
    }

    if (phonenumber) {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phonenumber)) {
        throw new BadRequestError('Mobile number must be exactly 10 digits.');
      }
    }
    
    const currentUser = await this.findById(id);

    if (email && email !== currentUser.email) {
      const existingEmail = await this.repository.findByEmail(email);
      if (existingEmail) {
        throw new ConflictError('Email is already registered to another account.');
      }
    }

    if (username && username !== currentUser.username) {
      const existingUsername = await this.repository.findByUsername(username);
      if (existingUsername) {
        throw new ConflictError('Username is already taken by another account.');
      }
    }

    const updatedUser = await this.repository.update(id, {
      firstname,
      lastname,
      email,
      phonenumber,
      username,
      roleid,
      isactive
    });

    const { passwordhash: _, ...safeUser } = updatedUser;

    await auditRepo.logEvent({
      userid: actorUserId,
      action: 'update_user',
      module: 'user',
      oldvalue: currentUser,
      newvalue: safeUser
    });

    return safeUser;
  }

  async toggleStatus(id, isactive, actorUserId) {
    const user = await this.findById(id);
    const updatedUser = await this.repository.update(id, { isactive });

    if (!isactive) {
      await sessionRepo.revokeUserSessions(id);
    }

    const { passwordhash: _, ...safeUser } = updatedUser;

    await auditRepo.logEvent({
      userid: actorUserId,
      action: isactive ? 'activate_user' : 'deactivate_user',
      module: 'user',
      oldvalue: { isactive: user.isactive },
      newvalue: { isactive }
    });

    return safeUser;
  }

  async resetPassword(id, newPassword, actorUserId) {
    if (!newPassword) {
      throw new BadRequestError('New password is required for reset.');
    }

    await this.findById(id);
    
    const saltRounds = 10;
    const passwordhash = await bcrypt.hash(newPassword, saltRounds);

    await this.repository.update(id, { passwordhash });
    await sessionRepo.revokeUserSessions(id);

    await auditRepo.logEvent({
      userid: actorUserId,
      action: 'reset_password',
      module: 'user',
      newvalue: { targetuserid: id }
    });

    return { message: 'User password reset successfully.' };
  }

  /**
   * Override findById to exclude passwordhash from response
   */
  async findById(id) {
    const user = await super.findById(id);
    const { passwordhash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Find user details by username
   */
  async findByUsername(username) {
    return this.repository.findByUsername(username);
  }

  /**
   * Find user details by email
   */
  async findByEmail(email) {
    return this.repository.findByEmail(email);
  }
}
