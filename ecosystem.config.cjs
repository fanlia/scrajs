//
// 只修改env里面的内容即可，其他配置请保持不变
// 专门用于pm2 nvm的联合使用
// 感谢使用
// @fanlia
//

const pkg = require('./package.json')

module.exports = {
  apps : [{
    name      : pkg.name,
    script    : 'index.js',
    interpreter: process.env.NVM_DIR + '/nvm-exec',
    interpreter_args: 'node',
    env: {
      NODE_VERSION: 18,
      PORT: 3456,
    },
  }],
};
