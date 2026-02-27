const {
  createRequestContext,
  runWithRequestContext,
} = require("../lib/requestContext");

function requestContextMiddleware(req, res, next) {
  const context = createRequestContext(req);
  req.requestId = context.requestId;
  res.setHeader("X-Request-Id", context.requestId);
  runWithRequestContext(context, next);
}

module.exports = {
  requestContextMiddleware,
};
