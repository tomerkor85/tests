
const path = require('path');
const root = path.resolve(__dirname);

module.exports = {
  root,
  core: path.join(root, 'core'),
  api: path.join(root, 'api'),
  utils: path.join(root, 'utils'),
  middlewares: path.join(root, 'api/middlewares'),
  routes: path.join(root, 'api/routes'),
  db: {
    postgres: path.join(root, 'core/db/postgres-db.js'),
    clickhouse: path.join(root, 'core/db/clickhouse-db.js'),
  },
};
