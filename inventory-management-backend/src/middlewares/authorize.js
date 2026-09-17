const { AuthorizationError } = require('../utils/errors');

function authorize(allowedRoles = ['ADMIN']) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('User context missing'));
    }

    // Admin always has full access
    if (req.user.role === 'ADMIN') {
      return next();
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return next(new AuthorizationError(`Access forbidden: required role [${allowedRoles.join(', ')}]`));
  };
}

module.exports = authorize;
