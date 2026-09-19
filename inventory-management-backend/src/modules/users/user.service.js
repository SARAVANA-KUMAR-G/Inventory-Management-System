const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const env = require('../../config/env');
const { NotFoundError, ConflictError, BusinessRuleError, ValidationError } = require('../../utils/errors');
const { Role } = require('@prisma/client');

function isTombstoneUser(u) {
  if (!u) return false;
  return Boolean(
    u.email &&
    u.email.startsWith('deleted-') &&
    u.email.endsWith('@system.local') &&
    u.firstName === 'Deleted'
  );
}

async function countActiveAdmins() {
  return prisma.user.count({
    where: {
      role: Role.ADMIN,
      isActive: true,
      NOT: {
        email: {
          endsWith: '@system.local'
        }
      }
    }
  });
}

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

  const items = users.map((u) => ({
    ...u,
    isDeleted: isTombstoneUser(u)
  }));

  return {
    items,
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

  return {
    ...user,
    isDeleted: false
  };
}

async function updateUser(id, data) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('User not found');
  }

  if (isTombstoneUser(existing)) {
    throw new BusinessRuleError('Cannot modify a deleted user');
  }

  // Last Admin Protection on Update
  if (existing.role === Role.ADMIN && existing.isActive) {
    const isDeactivating = data.isActive !== undefined && Boolean(data.isActive) === false;
    const isChangingToStaff = data.role !== undefined && data.role !== 'ADMIN';
    if (isDeactivating || isChangingToStaff) {
      const activeAdmins = await countActiveAdmins();
      if (activeAdmins <= 1) {
        throw new BusinessRuleError(
          'Cannot perform this action: system must have at least one active administrator'
        );
      }
    }
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

  return {
    ...updated,
    isDeleted: isTombstoneUser(updated)
  };
}

async function deactivateUser(id) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('User not found');
  }

  if (isTombstoneUser(existing)) {
    throw new BusinessRuleError('Cannot modify a deleted user');
  }

  // Last Admin Protection on Deactivate
  if (existing.role === Role.ADMIN && existing.isActive) {
    const activeAdmins = await countActiveAdmins();
    if (activeAdmins <= 1) {
      throw new BusinessRuleError(
        'Cannot perform this action: system must have at least one active administrator'
      );
    }
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

  return {
    ...updated,
    isDeleted: isTombstoneUser(updated)
  };
}

async function deleteUser(targetId, requestingUser) {
  if (!targetId) {
    throw new ValidationError('User ID is required');
  }

  // Self-deletion check
  if (requestingUser && requestingUser.id === targetId) {
    throw new ValidationError('You cannot delete your own user account');
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId }
  });

  if (!target) {
    throw new NotFoundError('User not found');
  }

  if (isTombstoneUser(target)) {
    throw new BusinessRuleError('User is already deleted');
  }

  // Last Admin Protection on Delete
  if (target.role === Role.ADMIN && target.isActive) {
    const activeAdmins = await countActiveAdmins();
    if (activeAdmins <= 1) {
      throw new BusinessRuleError(
        'Cannot perform this action: system must have at least one active administrator'
      );
    }
  }

  // Check historical business dependencies
  const [salesCount, stockCount] = await Promise.all([
    prisma.sale.count({ where: { userId: targetId } }),
    prisma.stockTransaction.count({ where: { userId: targetId } })
  ]);

  const hasHistory = salesCount > 0 || stockCount > 0;

  if (!hasHistory) {
    // Permanent deletion for users with zero history
    await prisma.user.delete({ where: { id: targetId } });
    return {
      isHardDeleted: true,
      message: 'User deleted successfully.'
    };
  }

  // Anonymization / Tombstoning for users with history
  const salt = await bcrypt.genSalt(env.BCRYPT_ROUNDS || 10);
  const scrambledPasswordHash = await bcrypt.hash(crypto.randomUUID(), salt);
  const tombstoneEmail = `deleted-${targetId}@system.local`;

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: {
      firstName: 'Deleted',
      lastName: 'User',
      email: tombstoneEmail,
      isActive: false,
      passwordHash: scrambledPasswordHash
    },
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

  return {
    isHardDeleted: false,
    user: {
      ...updated,
      isDeleted: true
    },
    message: 'User deleted successfully. Historical records have been preserved as Deleted User.'
  };
}

module.exports = {
  isTombstoneUser,
  countActiveAdmins,
  listUsers,
  createUser,
  updateUser,
  deactivateUser,
  deleteUser
};
