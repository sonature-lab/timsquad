/**
 * Daemon Entry Point
 * fork()로 실행되는 자식 프로세스의 진입점.
 * 환경변수에서 설정을 읽고 runDaemon을 호출한다.
 */

import { runDaemon } from './index.js';

const jsonlPath = process.env.TSQ_DAEMON_JSONL;
const projectRoot = process.env.TSQ_DAEMON_PROJECT;

if (!jsonlPath || !projectRoot) {
  console.error('Missing TSQ_DAEMON_JSONL or TSQ_DAEMON_PROJECT');
  process.exit(1);
}

runDaemon({ jsonlPath, projectRoot }).catch((err) => {
  console.error('Daemon fatal:', err);
  process.exit(1);
});
