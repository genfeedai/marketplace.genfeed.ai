"""Use real disposable Git history to verify approval and release identity."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT=Path(__file__).with_name('validate-release.sh').resolve()


class ReleaseValidationTests(unittest.TestCase):
    def setUp(self):
        self.directory=tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root=Path(self.directory.name)
        self.git('init','-q')
        self.git('config','user.name','Release fixture')
        self.git('config','user.email','release-fixture@example.invalid')
        self.git('commit','--allow-empty','-qm','first fixture')
        self.old=self.git('rev-parse','HEAD').strip()
        self.git('commit','--allow-empty','-qm','reviewed fixture')
        self.sha=self.git('rev-parse','HEAD').strip()
        self.git('update-ref','refs/remotes/origin/master',self.sha)

    def git(self,*arguments):
        return subprocess.check_output(['git',*arguments],cwd=self.root,text=True,stderr=subprocess.DEVNULL)

    def validate(self,**overrides):
        output=self.root/'output'
        values={'PATH':os.environ['PATH'],'GITHUB_REF':'refs/heads/master',
            'SOURCE_SHA':self.sha,'WORKFLOW_SHA':self.sha,'VERSION':'v1.2.3',
            'APPROVAL':'deploy-production','GITHUB_OUTPUT':str(output)}
        values.update(overrides)
        result=subprocess.run(['bash',str(SCRIPT)],cwd=self.root,env=values,
            capture_output=True,text=True,timeout=10)
        return result,output.read_text() if output.exists() else ''

    def test_approved_exact_source_and_version_pass(self):
        result,output=self.validate()
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(output,f'source_sha={self.sha}\nversion=v1.2.3\n')

    def test_master_moving_since_review_blocks_deployment(self):
        result,output=self.validate(SOURCE_SHA=self.old)
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(output,'')

    def test_missing_explicit_approval_blocks_deployment(self):
        result,output=self.validate(APPROVAL='')
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(output,'')

    def test_non_master_dispatch_blocks_deployment(self):
        result,_=self.validate(GITHUB_REF='refs/heads/unreviewed')
        self.assertNotEqual(result.returncode,0)

    def test_version_at_another_commit_cannot_be_overwritten(self):
        self.git('tag','v1.2.3',self.old)
        result,output=self.validate()
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(output,'')

    def test_recovery_at_same_version_and_sha_is_allowed(self):
        self.git('tag','v1.2.3',self.sha)
        result,_=self.validate()
        self.assertEqual(result.returncode,0,result.stderr)


if __name__=='__main__':
    unittest.main()
