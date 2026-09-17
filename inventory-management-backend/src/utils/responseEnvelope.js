function sendSuccess(res, data = null, meta = null, statusCode = 200) {
  const response = {
    success: true,
    data
  };
  if (meta) {
    response.meta = meta;
  }
  return res.status(statusCode).json(response);
}

function sendError(res, error, statusCode = 500, requestId = null) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred.',
      details: error.details || null,
      requestId
    }
  });
}

module.exports = {
  sendSuccess,
  sendError
};

