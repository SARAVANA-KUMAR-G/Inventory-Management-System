const prisma = require('../../config/prisma');
const { NotFoundError, ConflictError } = require('../../utils/errors');

async function listCategories(includeInactive = false) {
  const where = includeInactive ? {} : { isActive: true };
  const categories = await prisma.category.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { products: true }
      }
    }
  });

  return categories.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    isActive: c.isActive,
    productCount: c._count.products,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt
  }));
}

async function createCategory(data) {
  const name = data.name.trim();
  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) {
    throw new ConflictError('A category with this name already exists');
  }

  const category = await prisma.category.create({
    data: {
      name,
      description: data.description ? data.description.trim() : null,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true
    }
  });

  return category;
}

async function updateCategory(id, data) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Category not found');

  if (data.name && data.name.trim() !== existing.name) {
    const dup = await prisma.category.findUnique({ where: { name: data.name.trim() } });
    if (dup) throw new ConflictError('A category with this name already exists');
  }

  const updated = await prisma.category.update({
    where: { id },
    data: {
      name: data.name ? data.name.trim() : undefined,
      description: data.description !== undefined ? (data.description ? data.description.trim() : null) : undefined,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined
    }
  });

  return updated;
}

async function deactivateCategory(id) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Category not found');

  const updated = await prisma.category.update({
    where: { id },
    data: { isActive: false }
  });

  return updated;
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deactivateCategory
};
