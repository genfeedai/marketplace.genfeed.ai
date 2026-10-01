"""Exercise task failure, interruption, and success without AWS credentials."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).with_name('run-task.sh')
TASK = 'arn:aws:ecs:us-west-1:111122223333:task/marketplace/owned-task'
FAKE_AWS = '''#!/usr/bin/env python3
import json,os,sys
from pathlib import Path
args=sys.argv[1:]
with open(os.environ['FAKE_LOG'],'a') as log: log.write(json.dumps(args)+'\\n')
mode=os.environ['FAKE_MODE']
task='arn:aws:ecs:us-west-1:111122223333:task/marketplace/owned-task'
if args[1]=='run-task':
 if mode=='launch-failure': print(json.dumps({'failures':[{'reason':'no capacity'}],'tasks':[]}))
 else: print(json.dumps({'failures':[],'tasks':[{'taskArn':task}]}))
elif args[1]=='describe-tasks':
 if mode=='api-error': sys.exit(42)
 count=Path(os.environ['FAKE_COUNTER']); n=int(count.read_text()) if count.exists() else 0; count.write_text(str(n+1))
 if mode=='running-then-success' and n==0:
  print(json.dumps({'failures':[],'tasks':[{'lastStatus':'RUNNING','containers':[]}]}))
 else:
  container={} if mode=='missing-exit' else {'exitCode':17 if mode=='task-failure' else 0}
  print(json.dumps({'failures':[],'tasks':[{'lastStatus':'STOPPED','containers':[container],'stoppedReason':'fixture'}]}))
elif args[1]=='stop-task': print('{}')
else: sys.exit(99)
'''


class TaskRunnerTests(unittest.TestCase):
    def run_task(self, mode, timeout='60', group='sg-abc123'):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            for name,text in [('aws',FAKE_AWS),('sleep','#!/bin/sh\nexit 0\n')]:
                executable=root/name
                executable.write_text(text)
                executable.chmod(0o755)
            log=root/'calls.jsonl'
            result=subprocess.run(['bash',str(SCRIPT),'marketplace','definition',
                'subnet-abc123,subnet-def456',group,timeout],capture_output=True,text=True,
                timeout=10,env={'PATH':str(root)+os.pathsep+os.environ['PATH'],
                    'FAKE_MODE':mode,'FAKE_LOG':str(log),'FAKE_COUNTER':str(root/'counter')})
            calls=[json.loads(line) for line in log.read_text().splitlines()] if log.exists() else []
            return result,calls

    def test_running_task_is_polled_until_success(self):
        result,calls=self.run_task('running-then-success')
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(sum(c[1]=='describe-tasks' for c in calls),2)
        self.assertFalse(any(c[1]=='stop-task' for c in calls))

    def test_container_failure_blocks_release(self):
        result,calls=self.run_task('task-failure')
        self.assertEqual(result.returncode,1)
        self.assertFalse(any(c[1]=='stop-task' for c in calls))

    def test_missing_exit_code_is_failure(self):
        result,_=self.run_task('missing-exit')
        self.assertEqual(result.returncode,1)

    def test_failed_launch_does_not_stop_an_unrelated_task(self):
        result,calls=self.run_task('launch-failure')
        self.assertEqual(result.returncode,1)
        self.assertFalse(any(c[1]=='stop-task' for c in calls))

    def test_timeout_stops_only_the_owned_task(self):
        result,calls=self.run_task('success',timeout='0')
        self.assertEqual(result.returncode,1)
        stopped=[c for c in calls if c[1]=='stop-task']
        self.assertEqual(len(stopped),1)
        self.assertIn(TASK,stopped[0])

    def test_api_error_stops_the_task_and_preserves_failure(self):
        result,calls=self.run_task('api-error')
        self.assertEqual(result.returncode,42)
        self.assertEqual(sum(c[1]=='stop-task' for c in calls),1)

    def test_invalid_network_is_rejected_before_any_aws_call(self):
        result,calls=self.run_task('success',group='invalid')
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(calls,[])


if __name__=='__main__':
    unittest.main()
