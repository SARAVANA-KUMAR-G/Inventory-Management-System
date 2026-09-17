const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const env = require('../../config/env');
const { NotFoundError, ConflictError, BusinessRuleError } = require('../../utils/errors');
const { Role } = require('@prisma/client');

async function listUsers({ page = 1, pageSize = 20, search = '', role = '', status = '' }) {
  const skip = (page - 1) * pageSize;
  const where = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (status === 'active') where.isActive = true;
  if (status === 'inactive') where.isActive = false;
  if (role && (role === 'ADMIN' || role === 'STAFF')) {
    where.role = role;
  }

  const [totalItems, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })
  ]);

  return {
    items: users,
    meta: {
      page: Number(page),
      pageSize: Number(pageSize),
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize)
    }
  };
}

async function createUser(data) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase().trim() }
  });

  if (existing) {
    throw new ConflictError('A user with this email already exists');
  }

  const salt = await bcrypt.genSalt(env.BCRYPT_ROUNDS);
  const passwordHash = await bcrypt.hash(data.password, salt);

  const role = data.role === 'ADMIN' ? Role.ADMIN : Role.STAFF;

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      passwordHash,
      firstName: data.firstName.trim(),
      lastName: data.lastName ? data.lastName.trim() : null,
      role,
      isActive: true
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  return user;
}

async function updateUser(id, data) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('User not found');
  }

  const updateData = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName.trim();
  if (data.lastName !== undefined) updateData.lastName = data.lastName ? data.lastName.trim() : null;
  if (data.role && (data.role === 'ADMIN' || data.role === 'STAFF')) {
    updateData.role = data.role;
  }
  if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

  if (data.password) {
    const salt = await bcrypt.genSalt(env.BCRYPT_ROUNDS);
    updateData.passwordHash = await bcrypt.hash(data.password, salt);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return updated;
}

async function deactivateUser(id) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('User not found');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true
    }
  });

  return updated;
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deactivateUser
};
